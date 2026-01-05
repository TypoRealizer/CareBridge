import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Download, 
  FileText, 
  Info, 
  Search,
  AlertCircle,
  Globe,
  Pill,
  Calendar,
  Activity,
  Utensils,
  Heart
} from 'lucide-react';
import MedicalTermModal from './MedicalTermModal';
import Footer from './Footer';
import { ResultsPageProps, FAQ, CareGuidanceItem } from '../types';
import { loadMedicalTermsGlossary, explainMedicalTerm } from '../services/medicalTermsService';
import { toast } from 'sonner@2.0.3';

interface SelectedTermData {
  term: string;
  simplified: string;
  explanation: string;
}

export default function ResultsPage({ documentData }: ResultsPageProps) {
  const navigate = useNavigate();
  const [selectedTerm, setSelectedTerm] = useState<SelectedTermData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openAccordion, setOpenAccordion] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [medicalGlossary, setMedicalGlossary] = useState<{ [key: string]: { simple: string; explanation: string } }>({});
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [translatedCareGuidance, setTranslatedCareGuidance] = useState<CareGuidanceItem[]>([]);
  const [translatedFaqs, setTranslatedFaqs] = useState<FAQ[]>([]);
  const [translationMethod, setTranslationMethod] = useState<string>('');
  // ✅ ADD: Translation cache to prevent re-translating
  const [translationCache, setTranslationCache] = useState<{
    [key: string]: {
      summary: string;
      careGuidance: CareGuidanceItem[];
      faqs: FAQ[];
      method: string;
    }
  }>({});

  useEffect(() => {
    if (!documentData) {
      navigate('/');
    }
  }, [documentData, navigate]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Load medical terms glossary on mount
  useEffect(() => {
    const loadGlossary = async () => {
      try {
        const glossary = await loadMedicalTermsGlossary();
        setMedicalGlossary(glossary);
        console.log('[ResultsPage] Medical glossary loaded with', Object.keys(glossary).length, 'terms');
      } catch (error) {
        console.error('[ResultsPage] Failed to load medical glossary:', error);
      }
    };
    
    loadGlossary();
  }, []);

  // ✅ Load voices for TTS (sometimes loads asynchronously)
  useEffect(() => {
    // Load voices initially
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('[TTS] Voices loaded:', voices.length);
    };
    
    loadVoices();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Handle language translation for summary, care guidance, and FAQs
  useEffect(() => {
    const performTranslation = async () => {
      if (!documentData) return;
      
      // ✅ English: No translation needed
      if (selectedLanguage === 'en') {
        setTranslatedText(documentData.simplified);
        setTranslatedCareGuidance(careGuidance);
        setTranslatedFaqs(faqs);
        setShowOriginal(false);
        return;
      }

      // ✅ Check cache first (prevent retranslation)
      const cacheKey = `${selectedLanguage}_${documentData.simplified.substring(0, 100)}`;
      if (translationCache[cacheKey]) {
        console.log(`[Translation] Using cached translation for ${selectedLanguage}`);
        setTranslatedText(translationCache[cacheKey].summary);
        setTranslatedCareGuidance(translationCache[cacheKey].careGuidance);
        setTranslatedFaqs(translationCache[cacheKey].faqs);
        setTranslationMethod(translationCache[cacheKey].method);
        setShowOriginal(false);
        return;
      }

      setIsTranslating(true);
      const translationStartTime = Date.now();
      
      try {
        console.log(`[Translation] Starting translation to ${selectedLanguage}...`);
        
        // ✅ OPTIMIZATION: Combine ALL texts into a SINGLE batch API call
        // Instead of 3 separate calls (summary, care guidance, FAQs)
        const textsToTranslate: string[] = [];
        
        // 1. Add summary - SPLIT INTO SECTIONS to avoid timeouts with large text
        // Split by section headers (e.g., **PATIENT HISTORY**, **DIAGNOSIS**, etc.)
        const summarySections = documentData.simplified.split(/\*\*([A-Z][A-Z\s]+)\*\*/g).filter(s => s.trim());
        
        // If splitting worked, add each section separately; otherwise add as one text
        if (summarySections.length > 1) {
          console.log(`[Translation] Split summary into ${summarySections.length} sections`);
          summarySections.forEach(section => {
            if (section.trim()) {
              textsToTranslate.push(section.trim());
            }
          });
        } else {
          // No section headers found, split by paragraphs (double newlines)
          const paragraphs = documentData.simplified.split('\n\n').filter(p => p.trim());
          if (paragraphs.length > 1) {
            console.log(`[Translation] Split summary into ${paragraphs.length} paragraphs`);
            paragraphs.forEach(para => textsToTranslate.push(para.trim()));
          } else {
            // Last resort: send as single text
            textsToTranslate.push(documentData.simplified);
          }
        }
        
        const summaryTextCount = textsToTranslate.length;
        
        // 2. Add care guidance (title + description for each)
        careGuidance.forEach(item => {
          textsToTranslate.push(item.title);
          textsToTranslate.push(item.description);
        });
        
        // 3. Add FAQs (question + answer + additionalInfo if present)
        const faqHasAdditionalInfo: boolean[] = [];
        faqs.forEach(faq => {
          textsToTranslate.push(faq.question);
          textsToTranslate.push(faq.answer);
          if (faq.additionalInfo && faq.additionalInfo.trim() !== '') {
            textsToTranslate.push(faq.additionalInfo);
            faqHasAdditionalInfo.push(true);
          } else {
            faqHasAdditionalInfo.push(false);
          }
        });
        
        console.log(`[Translation] Translating ${textsToTranslate.length} texts (${summaryTextCount} summary sections) in ONE batch call...`);
        
        // ✅ ONE API CALL for everything
        const { translateBatch } = await import('../services/batchTranslationService');
        const result = await translateBatch(textsToTranslate, selectedLanguage as 'en' | 'hi');
        
        let translationIndex = 0;
        
        // 1. Extract summary translation - REJOIN the sections
        const translatedSummaryParts: string[] = [];
        for (let i = 0; i < summaryTextCount; i++) {
          translatedSummaryParts.push(result.translatedTexts[translationIndex++]);
        }
        const translatedSummary = translatedSummaryParts.join('\n\n');
        
        // 2. Extract care guidance translations
        const translatedGuidance = careGuidance.map(item => ({
          ...item,
          title: result.translatedTexts[translationIndex++],
          description: result.translatedTexts[translationIndex++],
        }));
        
        // 3. Extract FAQ translations
        const translatedFaqList = faqs.map((faq, index) => {
          const question = result.translatedTexts[translationIndex++];
          const answer = result.translatedTexts[translationIndex++];
          const additionalInfo = faqHasAdditionalInfo[index]
            ? result.translatedTexts[translationIndex++]
            : faq.additionalInfo;
          
          return {
            ...faq,
            question,
            answer,
            additionalInfo,
          };
        });
        
        // ✅ Update state
        setTranslatedText(translatedSummary);
        setTranslatedCareGuidance(translatedGuidance);
        setTranslatedFaqs(translatedFaqList);
        setTranslationMethod(result.method);
        setShowOriginal(false);
        
        // ✅ Cache the results
        setTranslationCache(prev => ({
          ...prev,
          [cacheKey]: {
            summary: translatedSummary,
            careGuidance: translatedGuidance,
            faqs: translatedFaqList,
            method: result.method,
          }
        }));
        
        const duration = Date.now() - translationStartTime;
        console.log(`[Translation] ✅ Completed in ${duration}ms using ${result.method}`);
        console.log(`[Translation] 📊 Stats: ${result.count} texts, ${result.originalTotalLength} → ${result.translatedTotalLength} chars`);
        
      } catch (error) {
        console.error('[Translation] ❌ Error:', error);
        toast.error('Translation failed — showing original English');
        setTranslatedText(documentData.simplified);
        setTranslatedCareGuidance(careGuidance);
        setTranslatedFaqs(faqs);
      } finally {
        setIsTranslating(false);
      }
    };

    performTranslation();
  }, [selectedLanguage]); // ✅ ONLY selectedLanguage dependency (not documentData!)

  if (!documentData) {
    return null;
  }

  // Use care guidance from documentData or provide defaults
  const careGuidance = documentData.careGuidance || [
    {
      id: 1,
      title: 'Take Your Medications',
      description: 'Take all prescribed medications exactly as directed. Set reminders if needed and never skip doses.',
      icon: Pill,
      priority: 'High' as const,
      color: 'red'
    },
    {
      id: 2,
      title: 'Schedule Follow-up Appointments',
      description: 'Book all recommended follow-up appointments with your doctors as soon as possible.',
      icon: Calendar,
      priority: 'High' as const,
      color: 'blue'
    },
    {
      id: 3,
      title: 'Monitor Your Symptoms',
      description: 'Keep track of how you feel and watch for any warning signs mentioned in your discharge instructions.',
      icon: Activity,
      priority: 'Medium' as const,
      color: 'orange'
    },
    {
      id: 4,
      title: 'Follow Dietary Guidelines',
      description: 'Stick to the recommended diet plan to help manage your condition and support recovery.',
      icon: Utensils,
      priority: 'Medium' as const,
      color: 'yellow'
    },
    {
      id: 5,
      title: 'Know When to Seek Help',
      description: 'Contact your doctor or emergency services if you experience severe symptoms or feel worse.',
      icon: Heart,
      priority: 'High' as const,
      color: 'red'
    }
  ];

  // Use FAQs from documentData or provide defaults
  const faqs = documentData.faqs || [
    {
      id: 'item-1',
      question: 'How often should I take my blood pressure medication?',
      category: 'Medication',
      answer: 'Take your blood pressure medication exactly as prescribed, typically once daily at the same time each day. Never skip doses or stop taking it without consulting your doctor.',
      additionalInfo: 'If you miss a dose, take it as soon as you remember, but don\'t double up on doses.'
    },
    {
      id: 'item-2',
      question: 'What should I do if my blood sugar levels are too high or too low?',
      category: 'Blood Sugar',
      answer: 'If your blood sugar is above 180 mg/dL consistently, contact your doctor. For levels below 70 mg/dL, eat or drink 15 grams of fast-acting carbohydrates (like juice or glucose tablets) and recheck in 15 minutes.',
      additionalInfo: 'Keep a log of your blood sugar readings to share with your healthcare provider.'
    },
    {
      id: 'item-3',
      question: 'When should I call my doctor or go to the emergency room?',
      category: 'Emergency',
      answer: 'Call 911 immediately if you experience chest pain, severe shortness of breath, sudden weakness on one side of your body, severe headache, or loss of consciousness.',
      additionalInfo: 'For non-emergency concerns, contact your doctor during office hours or use the after-hours emergency line.'
    },
    {
      id: 'item-4',
      question: 'Can I exercise with my current medical conditions?',
      category: 'Lifestyle',
      answer: 'Light walking is generally safe and encouraged. However, avoid strenuous activity for 2 weeks as recommended. Always consult your doctor before starting any new exercise program.',
      additionalInfo: 'Cardiac rehabilitation programs can provide safe, supervised exercise tailored to your condition.'
    },
    {
      id: 'item-5',
      question: 'What foods should I avoid with diabetes and high blood pressure?',
      category: 'Diet',
      answer: 'Limit foods high in sodium (salt), saturated fats, and added sugars. Avoid processed foods, sugary drinks, and excessive red meat. Focus on fruits, vegetables, whole grains, and lean proteins.',
      additionalInfo: 'Consider meeting with a registered dietitian for a personalized meal plan.'
    },
    {
      id: 'item-6',
      question: 'How do I monitor my blood pressure at home?',
      category: 'Monitoring',
      answer: 'Use a validated home blood pressure monitor. Take readings at the same time each day, while seated and relaxed. Record your readings and bring them to your doctor appointments.',
      additionalInfo: 'Your doctor can recommend specific blood pressure monitors and target ranges for you.'
    },
    {
      id: 'item-7',
      question: 'What are the side effects of my medications?',
      category: 'Medication',
      answer: 'Common side effects may include dizziness, fatigue, or upset stomach. These often improve over time. Contact your doctor if you experience severe side effects like difficulty breathing, severe rash, or persistent symptoms.',
      additionalInfo: 'Never stop taking your medications without consulting your healthcare provider first.'
    }
  ];

  // Use translated FAQs when language is Hindi and not showing original
  const displayFaqs = selectedLanguage === 'hi' && !showOriginal ? translatedFaqs : faqs;
  
  const filteredFaqs = displayFaqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTask = (id: number) => {
    setCompletedTasks(prev =>
      prev.includes(id) ? prev.filter(taskId => taskId !== id) : [...prev, id]
    );
  };

  const handleTermClick = async (term: string, simplified: string) => {
    // First check if we have it in the loaded glossary
    const termLower = term.toLowerCase();
    if (medicalGlossary[termLower]) {
      setSelectedTerm({
        term,
        simplified: medicalGlossary[termLower].simple,
        explanation: medicalGlossary[termLower].explanation
      });
      return;
    }
    
    // If not in glossary, try to get explanation from backend
    try {
      const explanation = await explainMedicalTerm(term);
      setSelectedTerm({
        term,
        simplified: explanation.simple || simplified,
        explanation: explanation.explanation || 'This is a medical term. Please consult your healthcare provider for more information.'
      });
    } catch (error) {
      console.error('[ResultsPage] Failed to fetch term explanation:', error);
      // Fallback to simplified text only
      setSelectedTerm({
        term,
        simplified,
        explanation: 'This is a medical term. Please consult your healthcare provider for more information.'
      });
    }
  };

  const highlightTerms = (text: string, isOriginal: boolean = true): JSX.Element => {
    // Ensure text is a string
    if (typeof text !== 'string') {
      console.warn('highlightTerms received non-string value:', typeof text);
      return <div>{String(text)}</div>;
    }
    
    // Combine terms from both document extraction and medical glossary
    const allTerms: { [key: string]: string } = {};
    
    // Add document-specific terms (from backend extraction)
    if (documentData.terms) {
      Object.entries(documentData.terms).forEach(([term, simple]) => {
        allTerms[term.toLowerCase()] = simple;
      });
    }
    
    // Add all terms from medical glossary (616 terms)
    Object.entries(medicalGlossary).forEach(([term, data]) => {
      const termLower = term.toLowerCase();
      // Only add if not already present (document terms take precedence)
      if (!allTerms[termLower]) {
        allTerms[termLower] = data.simple;
      }
    });
    
    console.log(`[Highlighting] Using ${Object.keys(allTerms).length} terms (${Object.keys(documentData.terms || {}).length} from doc + ${Object.keys(medicalGlossary).length} from glossary)`);
    
    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = Object.keys(allTerms).sort((a, b) => b.length - a.length);
    
    let result = text;
    const bgColor = isOriginal ? 'bg-red-100' : 'bg-green-100';
    const textColor = isOriginal ? 'text-red-600' : 'text-green-600';
    
    // Replace each term with highlighted version
    sortedTerms.forEach(term => {
      const simplified = allTerms[term];
      // Use word boundaries and case-insensitive matching
      const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      
      result = result.replace(
        regex,
        (match) => `<span class="medical-term ${bgColor} ${textColor} px-1 rounded cursor-pointer hover:shadow-md transition-shadow" data-term="${match}" data-simplified="${simplified}">${match}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: result }} />;
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('medical-term')) {
        const term = target.dataset.term;
        const simplified = target.dataset.simplified;
        if (term && simplified) {
          handleTermClick(term, simplified);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleTextToSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Use original English if showing original, otherwise use translated text
      const textToSpeak = (selectedLanguage === 'hi' && !showOriginal) 
        ? (translatedText || documentData.simplified)
        : documentData.simplified;
      
      // 🔴 CRITICAL: Limit TTS text length to prevent browser crashes
      const MAX_TTS_LENGTH = 5000; // 5000 characters max for TTS
      if (textToSpeak.length > MAX_TTS_LENGTH) {
        toast.error(`Text is too long for audio playback (${textToSpeak.length} chars). Maximum is ${MAX_TTS_LENGTH} characters. Please use the download feature instead.`);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      // Set language for speech synthesis
      const isHindi = selectedLanguage === 'hi' && !showOriginal;
      
      if (isHindi) {
        // ✅ FIX: Check if Hindi voices are available
        const voices = window.speechSynthesis.getVoices();
        const hindiVoices = voices.filter(voice => 
          voice.lang.startsWith('hi') || 
          voice.lang.startsWith('hi-IN')
        );
        
        console.log('[TTS] Available voices:', voices.length);
        console.log('[TTS] Hindi voices found:', hindiVoices.length, hindiVoices.map(v => `${v.name} (${v.lang})`));
        
        if (hindiVoices.length === 0) {
          // No Hindi voices available
          toast.error(
            'Hindi voice not available on your device. Please:\n' +
            '1. Use English audio instead, or\n' +
            '2. Install Hindi language pack in your OS settings, or\n' +
            '3. Try a different browser (Chrome/Edge recommended)',
            { duration: 6000 }
          );
          return;
        }
        
        // Use the first Hindi voice found
        utterance.voice = hindiVoices[0];
        utterance.lang = hindiVoices[0].lang;
        console.log('[TTS] Using Hindi voice:', hindiVoices[0].name, hindiVoices[0].lang);
      } else {
        // English voices (always available)
        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter(voice => 
          voice.lang.startsWith('en')
        );
        
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
          utterance.lang = englishVoices[0].lang;
        } else {
          utterance.lang = 'en-US';
        }
      }
      
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (event) => {
        setIsPlaying(false);
        console.error('[TTS] Error:', event);
        toast.error('Audio playback failed. Try downloading the text instead.');
      };
      
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    // Use original English if showing original, otherwise use translated text
    const textToDownload = (selectedLanguage === 'hi' && !showOriginal)
      ? (translatedText || documentData.simplified)
      : documentData.simplified;
    const languageLabel = (selectedLanguage === 'hi' && !showOriginal) ? 'Hindi' : 'English';
    
    const content = `
CAREBRIDGE - SIMPLIFIED MEDICAL DOCUMENT
Language: ${languageLabel}

${textToDownload}

---
Generated by CareBridge
This document is for educational purposes only.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carebridge-simplified-document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const completionPercentage = (completedTasks.length / careGuidance.length) * 100;

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Output Language Selector */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-6 shadow-xl border border-white/50 relative overflow-hidden group"
      >
        <motion.div
          className="absolute top-0 right-0 w-32 h-32 bg-teal-300 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
        />
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-teal-500 to-blue-500 p-2.5 rounded-xl shadow-lg"
              >
                <Globe className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h3 className="text-gray-900 font-heading" style={{ fontWeight: 700 }}>Output Language</h3>
                {selectedLanguage === 'hi' && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-orange-600 text-sm">🇮🇳 हिंदी Active</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select 
                value={selectedLanguage} 
                onValueChange={setSelectedLanguage}
                disabled={isTranslating}
              >
                <SelectTrigger className="w-full md:w-64 bg-white/90 backdrop-blur-sm border-2 hover:border-teal-400 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="hi">🇮🇳 हिंदी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
              {isTranslating && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500"></div>
                  <span className="text-sm text-gray-600">Translating...</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Powered by JigsawStack hint */}
          {selectedLanguage === 'hi' && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {translationMethod === 'jigsawstack' && <span>Powered by JigsawStack Translation API</span>}
              {translationMethod === 'ollama' && <span>Powered by Ollama AI (Local Processing)</span>}
              {!translationMethod && <span>Powered by JigsawStack Translation API</span>}
            </div>
          )}
        </div>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-gray-500 mb-2">
            <span className="hover:text-gray-700 cursor-pointer" onClick={() => navigate('/')}>Home</span>
            <span className="mx-2">›</span>
            <span>Results</span>
            <span className="mx-2">›</span>
            <span>Document Analysis</span>
          </nav>
          <h1 className="text-gray-900 font-display" style={{ fontWeight: 800, letterSpacing: '-0.03em' }}>Discharge Summary - Simplified</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleTextToSpeech}
              variant="outline"
              className="bg-blue-50 border-2 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 shadow-md hover:shadow-lg transition-all"
            >
              {isPlaying ? <VolumeX className="h-5 w-5 mr-2" /> : <Volume2 className="h-5 w-5 mr-2" />}
              {isPlaying ? 'Stop' : 'Listen'}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Download className="h-5 w-5 mr-2" />
              Download
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 via-purple-600 to-blue-500 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-white opacity-10 shimmer"
        />
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="flex items-center space-x-4 relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shadow-xl"
          >
            <CheckCircle2 className="h-8 w-8" />
          </motion.div>
          <div>
            <h2 className="text-white text-2xl font-heading" style={{ fontWeight: 700 }}>Document Analysis Complete</h2>
            <p className="text-white/90 mt-1 font-body">Your medical document has been processed and simplified for better understanding</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="simplified" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 h-20 p-2 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl shadow-lg border-2 border-white/50">
          <TabsTrigger 
            value="simplified" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-xl h-full rounded-xl transition-all duration-300 hover:scale-[1.02] data-[state=active]:scale-105"
          >
            <FileText className="h-6 w-6 mr-2 hidden sm:block" />
            <span className="font-ui" style={{ fontWeight: 600 }}>Simplified View</span>
          </TabsTrigger>
          <TabsTrigger 
            value="care" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-xl h-full rounded-xl transition-all duration-300 hover:scale-[1.02] data-[state=active]:scale-105"
          >
            <CheckCircle2 className="h-6 w-6 mr-2 hidden sm:block" />
            <span className="font-ui" style={{ fontWeight: 600 }}>Care Guidance</span>
          </TabsTrigger>
          <TabsTrigger 
            value="faq" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-xl h-full rounded-xl transition-all duration-300 hover:scale-[1.02] data-[state=active]:scale-105"
          >
            <Info className="h-6 w-6 mr-2 hidden sm:block" />
            <span className="font-ui" style={{ fontWeight: 600 }}>FAQ</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Simplified View */}
        <TabsContent value="simplified" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="glass-card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
              <Info className="h-6 w-6 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>How to Use This View:</strong> Click on any highlighted medical term in the original text or simplified explanation to see detailed definitions and explanations.
              </AlertDescription>
            </Alert>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Original Document */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 glass-card rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50"
            >
              <div className="bg-gradient-to-r from-red-500 via-pink-500 to-red-600 px-8 py-5 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-white opacity-10 shimmer"
                />
                <h3 className="text-white text-xl relative z-10">Original Medical Document</h3>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white max-h-[800px] overflow-y-auto red-scrollbar">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {highlightTerms(documentData.original, true)}
                </div>
              </div>
            </motion.div>

            {/* Simplified Version */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3 glass-card rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50 relative"
            >
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-8 py-5 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-white opacity-10 shimmer"
                />
                <div className="flex items-center justify-between relative z-10 flex-wrap gap-2">
                  <h3 className="text-white text-xl">Simplified for You</h3>
                  <div className="flex items-center gap-2">
                    {selectedLanguage === 'hi' && !showOriginal && (
                      <Button
                        onClick={() => setShowOriginal(true)}
                        variant="outline"
                        size="sm"
                        className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white text-xs"
                      >
                        View Original (English)
                      </Button>
                    )}
                    {selectedLanguage === 'hi' && showOriginal && (
                      <Button
                        onClick={() => setShowOriginal(false)}
                        variant="outline"
                        size="sm"
                        className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white text-xs"
                      >
                        View हिंदी Translation
                      </Button>
                    )}
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="bg-white/20 px-3 py-1 rounded-full text-white text-sm backdrop-blur-sm"
                    >
                      ✨ AI Enhanced
                    </motion.div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-teal-50/50 to-white max-h-[800px] overflow-y-auto">
                {isTranslating ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
                      <p className="text-gray-600">Translating...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="prose prose-lg max-w-none whitespace-pre-wrap leading-relaxed">
                      {selectedLanguage === 'en' || showOriginal 
                        ? highlightTerms(documentData.simplified, false) 
                        : <div>{translatedText || documentData.simplified}</div>
                      }
                    </div>
                    
                    {/* Warning note for translated text */}
                    {selectedLanguage === 'hi' && !showOriginal && (
                      <Alert className="border-amber-200 bg-amber-50/50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 text-sm">
                          <strong>AI translation</strong> — verify medication names with a clinician.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* Tab 2: Care Guidance */}
        <TabsContent value="care" className="space-y-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-500 via-purple-600 to-blue-500 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-white opacity-10 shimmer"
            />
            <motion.div
              className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <div className="flex items-center space-x-6 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="bg-white/20 backdrop-blur-sm p-5 rounded-3xl shadow-2xl"
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
              <div>
                <h2 className="text-white text-3xl mb-2">Your Care Plan</h2>
                <p className="text-white/90 text-lg">Follow these important steps to ensure a smooth recovery and maintain your health</p>
              </div>
            </div>
          </motion.div>

          {/* Progress Overview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card bg-gradient-to-br from-white to-teal-50/30 rounded-3xl p-8 shadow-xl border-2 border-white/50 relative overflow-hidden"
          >
            <motion.div
              className="absolute top-0 right-0 w-64 h-64 bg-teal-300 rounded-full blur-3xl opacity-10"
              animate={{
                x: [0, 50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <div className="space-y-4 relative z-10">
              <h3 className="text-gray-900 text-xl">Progress Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    <span className="text-teal-600 font-bold text-lg">{completedTasks.length}</span> of {careGuidance.length} completed
                  </span>
                  <motion.span
                    key={completionPercentage}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-teal-600 font-bold text-2xl"
                  >
                    {Math.round(completionPercentage)}%
                  </motion.span>
                </div>
                <div className="relative">
                  <Progress value={completionPercentage} className="h-4 bg-gray-200" />
                  <motion.div
                    className="absolute inset-0 h-4 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full opacity-20 blur-sm"
                    animate={{
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Care Items */}
          <div className="space-y-5">
            {(selectedLanguage === 'hi' && !showOriginal ? translatedCareGuidance : careGuidance).map((item, index) => {
              const Icon = item.icon;
              const isCompleted = completedTasks.includes(item.id);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`glass-card rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden border-2 ${
                    isCompleted ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30' : 'border-white/50 bg-white/80'
                  }`}
                  onClick={() => toggleTask(item.id)}
                >
                  {/* Background decoration */}
                  <motion.div
                    className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 ${
                      isCompleted ? 'bg-emerald-400' :
                      item.color === 'red' ? 'bg-red-400' :
                      item.color === 'blue' ? 'bg-blue-400' :
                      item.color === 'orange' ? 'bg-orange-400' :
                      item.color === 'yellow' ? 'bg-yellow-400' :
                      'bg-gray-400'
                    }`}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.2,
                    }}
                  />
                  
                  <div className="flex items-start space-x-5 relative z-10">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 mt-1">
                      <motion.div
                        animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={`w-8 h-8 rounded-full border-3 flex items-center justify-center transition-all shadow-lg ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500'
                            : 'border-gray-300 bg-white hover:border-teal-400'
                        }`}
                      >
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-white" />
                          </motion.div>
                        )}
                      </motion.div>
                    </div>

                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                      className={`flex-shrink-0 p-4 rounded-2xl shadow-lg border-2 ${
                        item.color === 'red' ? 'bg-red-100 border-red-200' :
                        item.color === 'blue' ? 'bg-blue-100 border-blue-200' :
                        item.color === 'orange' ? 'bg-orange-100 border-orange-200' :
                        item.color === 'yellow' ? 'bg-yellow-100 border-yellow-200' :
                        'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${
                        item.color === 'red' ? 'text-red-600' :
                        item.color === 'blue' ? 'text-blue-600' :
                        item.color === 'orange' ? 'text-orange-600' :
                        item.color === 'yellow' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`} />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`text-gray-900 text-lg ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {item.title}
                        </h3>
                        <Badge
                          variant={item.priority === 'High' ? 'destructive' : 'secondary'}
                          className={`flex-shrink-0 px-3 py-1 shadow-md ${
                            item.priority === 'High' 
                              ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                              : 'bg-gradient-to-r from-orange-400 to-amber-400'
                          }`}
                        >
                          {item.priority} Priority
                        </Badge>
                      </div>
                      <p className={`text-gray-600 mt-3 leading-relaxed ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: FAQ */}
        <TabsContent value="faq" className="space-y-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-white opacity-10 shimmer"
            />
            <motion.div
              className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <div className="flex items-center space-x-6 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="bg-white/20 backdrop-blur-sm p-5 rounded-3xl shadow-2xl"
              >
                <Info className="h-10 w-10" />
              </motion.div>
              <div>
                <h2 className="text-white text-3xl mb-2">Frequently Asked Questions</h2>
                <p className="text-white/90 text-lg">Get instant answers to common questions about your medical document and care instructions</p>
              </div>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <motion.div
              className="absolute left-4 top-1/2 transform -translate-y-1/2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Search className="h-6 w-6 text-blue-500" />
            </motion.div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your questions..."
              className="pl-14 pr-6 h-16 bg-white shadow-xl border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 transition-all rounded-2xl text-lg font-medium"
            />
          </motion.div>

          {/* FAQ Accordion */}
          <Accordion
            type="single"
            collapsible
            value={openAccordion}
            onValueChange={setOpenAccordion}
            className="space-y-6"
          >
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                <AccordionItem
                  value={faq.id}
                  className="glass-card bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-white/50 hover:shadow-2xl transition-all duration-300"
                >
                  <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all">
                    <div className="flex items-start space-x-5 text-left w-full">
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                        className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-2xl w-12 h-12 flex items-center justify-center flex-shrink-0 shadow-lg font-bold text-lg"
                      >
                        Q{index + 1}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-lg font-bold leading-relaxed mb-3">{faq.question}</p>
                        <Badge variant="outline" className="border-2 border-blue-200 text-blue-700 font-semibold px-3 py-1">
                          {faq.category}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8 space-y-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-2xl p-6 shadow-md">
                      <div className="flex items-start space-x-4">
                        <Info className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-800 leading-relaxed text-base">{faq.answer}</p>
                      </div>
                    </div>
                    {faq.additionalInfo && faq.additionalInfo.trim() !== '' && (
                      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-2xl p-6 shadow-md">
                        <div className="flex items-start space-x-4">
                          <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-900 leading-relaxed text-base">
                              <strong className="font-bold">Additional Info:</strong> {faq.additionalInfo}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>

          {filteredFaqs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 glass-card bg-white rounded-3xl shadow-xl"
            >
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No questions found matching your search.</p>
              <p className="text-gray-400 mt-2">Try different keywords or clear your search.</p>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Medical Term Modal */}
      <MedicalTermModal
        isOpen={!!selectedTerm}
        onClose={() => setSelectedTerm(null)}
        term={selectedTerm?.term}
        simplified={selectedTerm?.simplified}
        explanation={selectedTerm?.explanation}
      />
    </div>
    
    <Footer />
    </>
  );
}