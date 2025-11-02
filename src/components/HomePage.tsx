import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Mic, Brain, CheckCircle, FileStack, AlertCircle, Lock, Shield, Database, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { motion } from 'motion/react';
import Footer from './Footer';
import { processUploadedFile, processPastedText } from '../utils/fileProcessing';
import { toast } from 'sonner@2.0.3';
import { HomePageProps } from '../types';

export default function HomePage({ setDocumentData }: HomePageProps) {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    try {
      setProcessing(true);
      setProgress(0);
      
      // Process the file with OCR and other processing
      const documentData = await processUploadedFile(
        file,
        (stage, progress) => {
          setProcessingStage(stage);
          setProgress(progress);
        }
      );

      // Set the processed document data
      setDocumentData(documentData);
      navigate('/results');
    } catch (error: any) {
      console.error('File processing error:', error);
      toast.error(error?.message || 'Failed to process file. Please try again.');
      setProcessing(false);
      setProgress(0);
    }
  };

  const handlePastedText = async () => {
    if (!pastedText.trim()) {
      toast.error('Please enter some text to process.');
      return;
    }
    
    // 🔴 CRITICAL: Prevent system crashes from huge text input
    const MAX_TEXT_LENGTH = 50000;
    if (pastedText.length > MAX_TEXT_LENGTH) {
      toast.error(`Text is too long (${pastedText.length.toLocaleString()} characters). Maximum allowed is ${MAX_TEXT_LENGTH.toLocaleString()} characters. Please split into smaller sections.`);
      return;
    }
    
    try {
      setProcessing(true);
      setProgress(0);
      
      // Process the pasted text
      const documentData = await processPastedText(
        pastedText,
        (stage, progress) => {
          setProcessingStage(stage);
          setProgress(progress);
        }
      );

      // Set the processed document data
      setDocumentData(documentData);
      navigate('/results');
    } catch (error: any) {
      console.error('Text processing error:', error);
      toast.error(error?.message || 'Failed to process text. Please try again.');
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        toast.success('Recording stopped. Processing audio...');
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
          
          // Convert to file and process
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
          await handleFile(audioFile);
        };

        mediaRecorder.start();
        setIsRecording(true);
        toast.success('Recording started. Speak clearly...');
      } catch (error) {
        console.error('Microphone access error:', error);
        toast.error('Could not access microphone. Please check your permissions.');
      }
    }
  };

  const getMockData = () => ({
    original: `Patient: John Smith, Age 65
    
DISCHARGE SUMMARY

Diagnosis: Acute myocardial infarction (AMI), hypertension, type 2 diabetes mellitus

Hospital Course: The patient presented to the emergency department with severe chest pain and dyspnea. Electrocardiogram revealed ST-segment elevation consistent with anterior wall myocardial infarction. Patient underwent emergency percutaneous coronary intervention with stent placement in the left anterior descending artery. Post-procedure recovery was uncomplicated.

Medications:
- Aspirin 81mg PO daily
- Clopidogrel 75mg PO daily for 12 months
- Atorvastatin 80mg PO daily
- Metoprolol 25mg PO BID
- Lisinopril 10mg PO daily
- Metformin 1000mg PO BID

Instructions: Patient advised to follow cardiac rehabilitation program. Monitor blood pressure and glucose levels regularly. Avoid strenuous activity for 2 weeks. Follow up with cardiologist in 1 week and primary care physician in 2 weeks.

Warning Signs: Seek immediate medical attention if experiencing chest pain, severe shortness of breath, palpitations, or syncope.`,
    simplified: `Patient: John Smith, Age 65
    
WHAT HAPPENED

You had: A heart attack, high blood pressure, and diabetes

What we did: You came to the hospital with severe chest pain and trouble breathing. Tests showed you were having a heart attack. We performed a procedure to open the blocked artery in your heart and placed a small tube (called a stent) to keep it open. Your recovery after the procedure went well.

Your Medicines (Take These Every Day):
- Aspirin 81mg - Take 1 pill by mouth every morning (blood thinner)
- Clopidogrel 75mg - Take 1 pill by mouth every morning for the next year (prevents blood clots)
- Atorvastatin 80mg - Take 1 pill by mouth every evening (lowers cholesterol)
- Metoprolol 25mg - Take 1 pill by mouth twice a day, morning and evening (controls heart rate and blood pressure)
- Lisinopril 10mg - Take 1 pill by mouth every morning (lowers blood pressure)
- Metformin 1000mg - Take 1 pill by mouth twice a day with meals (controls blood sugar)

What You Need to Do: Join a heart recovery program. Check your blood pressure and blood sugar levels at home regularly. Don't do heavy exercise or lifting for 2 weeks. See your heart doctor in 1 week and your regular doctor in 2 weeks.

Warning Signs - Call 911 or Go to ER If You Have: Chest pain, severe trouble breathing, irregular or racing heartbeat, or if you faint.`,
    terms: {
      'acute myocardial infarction': 'heart attack',
      'hypertension': 'high blood pressure',
      'type 2 diabetes mellitus': 'diabetes (high blood sugar disease)',
      'dyspnea': 'trouble breathing',
      'electrocardiogram': 'heart test (ECG)',
      'ST-segment elevation': 'a pattern on the heart test showing heart damage',
      'percutaneous coronary intervention': 'a procedure to open blocked heart arteries',
      'stent': 'a small tube that keeps the artery open',
      'left anterior descending artery': 'a major blood vessel that supplies the front of the heart',
      'PO': 'by mouth',
      'BID': 'twice a day',
      'cardiac rehabilitation': 'heart recovery program',
      'palpitations': 'irregular or racing heartbeat',
      'syncope': 'fainting'
    }
  });

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-teal-50 via-blue-50 to-emerald-50 relative overflow-hidden">
        {/* Animated background orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-full blur-3xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-card rounded-3xl shadow-2xl p-10 space-y-8 border-2 border-white/50">
            <div className="flex justify-center">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="bg-gradient-to-r from-teal-500 via-emerald-500 to-blue-500 p-6 rounded-full shadow-2xl"
                >
                  <Activity className="h-14 w-14 text-white" />
                </motion.div>
                {/* Pulsing ring effect */}
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-teal-400"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-emerald-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: 0.5,
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center"
              >
                <span className="text-gray-700 font-medium">{processingStage}</span>
                <motion.span
                  key={progress}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-teal-600 font-bold text-lg"
                >
                  {progress}%
                </motion.span>
              </motion.div>
              <div className="relative">
                <Progress value={progress} className="h-3 bg-gray-200" />
                <motion.div
                  className="absolute inset-0 h-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full opacity-20 blur-sm"
                  animate={{
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </div>
            
            <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-center space-y-2"
            >
              <p className="text-gray-600">
                Analyzing your document with medical-grade AI
              </p>
              <p className="text-gray-500 text-sm">
                Estimated time: {Math.ceil((100 - progress) / 25)}s
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 space-y-20 sm:space-y-24 lg:space-y-32">
      {/* Hero Section */}
      <div className="relative text-center space-y-8 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-blue-50 to-emerald-50 -z-10 animated-gradient" />
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <motion.div
            className="absolute top-1/4 left-1/4 w-32 h-32 bg-teal-300 rounded-full blur-2xl opacity-20"
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
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-300 rounded-full blur-2xl opacity-20"
            animate={{
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Welcome to CareBridge - New top heading */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative"
          >
            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl px-4 font-display"
              initial={{ backgroundPosition: '0% 50%' }}
              animate={{ backgroundPosition: '100% 50%' }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                repeatType: 'reverse',
                ease: 'easeInOut'
              }}
              style={{
                backgroundImage: 'linear-gradient(120deg, #10B981, #3B82F6, #10B981)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Welcome to CareBridge
            </motion.h1>
            
            {/* Decorative glow */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-teal-400 to-blue-400 rounded-full blur-3xl opacity-20 -z-10"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.35, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Subtitle - now smaller */}
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-gray-700 max-w-4xl mx-auto text-xl sm:text-2xl md:text-3xl px-4 font-heading"
            style={{ fontWeight: 600, letterSpacing: '-0.015em' }}
          >
            Bridge the Gap Between Medical Complexity and Clear Understanding
          </motion.h2>
          
          {/* AI-powered text with solid color */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-gray-900 max-w-4xl mx-auto text-3xl sm:text-4xl lg:text-5xl xl:text-6xl leading-tight px-4 font-heading"
            style={{ fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            AI-powered simplification for better patient understanding
          </motion.p>
        </motion.div>
      </div>

      {/* Feature Showcase */}
      <div id="features-section" className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 space-y-4 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group"
        >
          <motion.div
            className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg relative z-10 group-hover:shadow-2xl transition-shadow"
          >
            <FileStack className="h-9 w-9 text-white" />
          </motion.div>
          <h3 className="text-gray-900 relative z-10 font-heading" style={{ fontWeight: 700 }}>Multi-Format Upload</h3>
          <p className="text-gray-600 relative z-10 leading-relaxed font-body">
            Upload PDF, images, audio, or paste text
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="glass-card bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 space-y-4 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group"
        >
          <motion.div
            className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 rounded-full blur-3xl opacity-20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          <motion.div
            whileHover={{ rotate: [0, 10, -10, 0], scale: 1.15 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg relative z-10 group-hover:shadow-2xl transition-shadow pulse-glow"
          >
            <Brain className="h-9 w-9 text-white" />
          </motion.div>
          <h3 className="text-gray-900 relative z-10 font-heading" style={{ fontWeight: 700 }}>AI Simplification</h3>
          <p className="text-gray-600 relative z-10 leading-relaxed font-body">
            Medical-grade AI converts complex terms to patient-friendly language
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          whileHover={{ y: -12, scale: 1.03 }}
          className="glass-card bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl p-8 space-y-4 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden group"
        >
          <motion.div
            className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full blur-3xl opacity-20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg relative z-10 group-hover:shadow-2xl transition-shadow"
          >
            <CheckCircle className="h-9 w-9 text-white" />
          </motion.div>
          <h3 className="text-gray-900 relative z-10 font-heading" style={{ fontWeight: 700 }}>Smart Care Guide</h3>
          <p className="text-gray-600 relative z-10 leading-relaxed font-body">
            Get personalized do's, don'ts, and care instructions
          </p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        </motion.div>
      </div>

      {/* Upload Interface */}
      <div id="upload-section" className="space-y-6 scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center"
        >
          <h2 className="text-gray-900 font-heading" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Upload Your Medical Document</h2>
        </motion.div>

        {/* Main Upload Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-3 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-500 overflow-hidden glass-card ${
            dragActive
              ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-emerald-50 scale-105 shadow-2xl'
              : 'border-gray-300 hover:border-teal-400 hover:bg-gradient-to-br hover:from-teal-50/50 hover:to-emerald-50/30 shadow-xl hover:shadow-2xl'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.mp3,.wav,.txt"
            onChange={handleFileInput}
          />
          
          {/* Animated background elements */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-teal-300 to-emerald-300 rounded-full blur-3xl opacity-10"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full blur-3xl opacity-10"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
          
          <motion.div
            animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
            className="space-y-6 relative z-10"
          >
            <div className="flex justify-center">
              <div className="relative">
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-600 p-10 rounded-full shadow-2xl relative"
                >
                  <Upload className="h-16 w-16 text-white" />
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full shimmer" />
                </motion.div>
                {/* Floating ring animation */}
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-teal-400/50"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <motion.p
                className="text-gray-900 text-2xl font-semibold"
                animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
              >
                Drop your medical document here
              </motion.p>
              <p className="text-gray-500 text-lg">or click to browse files</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 bg-white/50 rounded-2xl p-4 backdrop-blur-sm">
              <FileText className="h-6 w-6 text-teal-600" />
              <span className="text-lg text-gray-600">PDF, JPG, PNG, MP3, WAV, TXT</span>
            </div>

            <p className="text-gray-500 text-sm">Maximum 10MB per file</p>
          </motion.div>
        </motion.div>

        {/* Alternative Input Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Paste Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            whileHover={{ y: -4 }}
            className="glass-card bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 space-y-4 shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
          >
            <motion.div
              className="absolute top-0 right-0 w-40 h-40 bg-blue-300 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
            />
            <div className="flex items-center space-x-3 relative z-10">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg"
              >
                <FileText className="h-6 w-6 text-white" />
              </motion.div>
              <h3 className="text-gray-900">Paste Text Directly</h3>
            </div>
            
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your medical document text here..."
              className="min-h-[120px] resize-none bg-white/80 backdrop-blur-sm border-2 focus:border-blue-400 transition-colors relative z-10"
            />
            
            <div className="flex justify-between items-center relative z-10">
              <span className="text-gray-500 text-sm">
                <span className={pastedText.length > 0 ? 'text-blue-600 font-medium' : ''}>
                  {pastedText.length}
                </span> characters
              </span>
              <Button
                onClick={handlePastedText}
                disabled={!pastedText.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                Process Text
              </Button>
            </div>
          </motion.div>

          {/* Voice Recording */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={{ y: -4 }}
            className="glass-card bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl p-8 space-y-4 shadow-lg hover:shadow-2xl transition-all relative overflow-hidden group"
          >
            <motion.div
              className="absolute top-0 right-0 w-40 h-40 bg-pink-300 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
            />
            <div className="flex items-center space-x-3 relative z-10">
              <motion.div
                animate={isRecording ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                } : {}}
                transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                className="bg-gradient-to-br from-red-500 to-pink-500 p-3 rounded-xl shadow-lg"
              >
                <Mic className="h-6 w-6 text-white" />
              </motion.div>
              <h3 className="text-gray-900">Voice Recording</h3>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 min-h-[120px] flex flex-col items-center justify-center space-y-4 border-2 border-white/50 relative z-10">
              {isRecording && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex space-x-2"
                >
                  {[...Array(7)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ['24px', '56px', '24px'] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      className="w-3 bg-gradient-to-t from-red-500 via-pink-500 to-red-400 rounded-full shadow-lg"
                    />
                  ))}
                </motion.div>
              )}
              
              {isRecording && (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-red-600 font-medium"
                >
                  Recording in progress...
                </motion.span>
              )}
              
              {!isRecording && (
                <p className="text-gray-400 text-center">
                  Click below to start recording your medical document
                </p>
              )}
            </div>
            
            <Button
              onClick={handleRecording}
              className={`w-full shadow-lg hover:shadow-xl transition-all relative z-10 ${
                isRecording
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              } text-white`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </motion.div>
        </div>

      </div>

      {/* Trust & Compliance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Medical Disclaimer:</strong> CareBridge is designed for educational purposes and to improve health literacy. This tool should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical decisions and concerns. In case of medical emergencies, contact emergency services immediately.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center space-x-3 text-gray-600">
            <Database className="h-5 w-5 text-teal-600" />
            <span>No Data Storage</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-600">
            <Shield className="h-5 w-5 text-teal-600" />
            <span>Secure Processing</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-600">
            <Lock className="h-5 w-5 text-teal-600" />
            <span>HIPAA-Compliant Design</span>
          </div>
        </div>
      </motion.div>
    </div>
    
    <Footer />
    </>
  );
}
