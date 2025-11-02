import { FileText, Upload, Search, Shield, Lock, Mail, Book, Video, HelpCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Footer from './Footer';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const categories = [
    {
      title: 'Getting Started',
      icon: Upload,
      description: 'Learn how to upload and process your documents',
      color: 'blue'
    },
    {
      title: 'Document Processing',
      icon: FileText,
      description: 'Understanding how CareBridge simplifies medical documents',
      color: 'emerald'
    },
    {
      title: 'Understanding Results',
      icon: Book,
      description: 'How to read and use your simplified documents',
      color: 'purple'
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      description: 'Learn about our data protection measures',
      color: 'amber'
    }
  ];

  const helpArticles = [
    {
      id: 'item-1',
      category: 'Getting Started',
      question: 'How do I upload a medical document?',
      answer: 'You can upload documents in several ways: 1) Drag and drop files directly onto the upload zone on the homepage, 2) Click the upload zone to browse your files, 3) Paste text directly into the text area, or 4) Use voice recording to dictate your document. We support PDF, JPG, PNG, MP3, WAV, and TXT files up to 10MB.'
    },
    {
      id: 'item-2',
      category: 'Getting Started',
      question: 'What file formats are supported?',
      answer: 'CareBridge supports multiple formats including PDF documents, image files (JPG, PNG), audio files (MP3, WAV), and plain text (TXT). You can also paste text directly or use voice recording. Maximum file size is 10MB per upload.'
    },
    {
      id: 'item-3',
      category: 'Document Processing',
      question: 'How long does it take to process my document?',
      answer: 'Processing typically takes 30-60 seconds depending on the document length and complexity. You\'ll see a progress indicator showing the processing stages: analyzing document, extracting medical terms, generating simplified version, and creating care guidance.'
    },
    {
      id: 'item-4',
      category: 'Understanding Results',
      question: 'What do the highlighted terms mean?',
      answer: 'Medical terms are highlighted in red in the original document and green in the simplified version. Click any highlighted term to open a detailed explanation modal that shows the medical term, its simple translation, and a comprehensive explanation.'
    },
    {
      id: 'item-5',
      category: 'Understanding Results',
      question: 'How do I use the Care Guidance tab?',
      answer: 'The Care Guidance tab provides a checklist of important care tasks. Click the checkbox next to each item to mark it complete. Your progress is tracked at the top. Items are color-coded by priority (red for high priority, yellow for medium) to help you prioritize your care.'
    },
    {
      id: 'item-6',
      category: 'Privacy & Security',
      question: 'Is my medical information safe and private?',
      answer: 'Yes. CareBridge is designed with privacy as a priority. We do not permanently store your documents or personal health information. Processing is done in real-time, and data is cleared when you close the browser or navigate away. However, CareBridge is designed for educational purposes and should not be used for storing sensitive medical records.'
    },
    {
      id: 'item-7',
      category: 'Privacy & Security',
      question: 'Can I download my simplified documents?',
      answer: 'Yes! Click the "Download" button on the results page to save your simplified document as a text file. This allows you to keep a copy for reference or share it with family members or caregivers.'
    }
  ];

  const filteredArticles = helpArticles.filter(article =>
    article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-6 relative">
        {/* Background decoration */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-20" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <motion.h1 
            className="text-5xl sm:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 mb-6 font-display"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ fontWeight: 800, letterSpacing: '-0.04em' }}
          >
            How Can We Help You?
          </motion.h1>
          <p className="text-gray-700 text-xl sm:text-2xl max-w-3xl mx-auto leading-relaxed font-heading" style={{ fontWeight: 600 }}>
            Find answers to common questions about using CareBridge
          </p>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-3xl mx-auto"
      >
        <div className="relative">
          <motion.div
            className="absolute left-5 top-1/2 transform -translate-y-1/2"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Search className="h-6 w-6 text-teal-500" />
          </motion.div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help articles..."
            className="pl-14 pr-6 h-16 bg-white shadow-2xl border-2 border-gray-200 hover:border-teal-400 focus:border-teal-500 transition-all rounded-2xl text-lg font-medium"
          />
        </div>
      </motion.div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -8, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="glass-card hover:shadow-2xl transition-all duration-300 cursor-pointer h-full border-2 border-white/50 rounded-3xl overflow-hidden group relative">
                <motion.div
                  className={`absolute top-0 right-0 w-32 h-32 bg-${category.color}-300 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity`}
                />
                <CardHeader className="p-8">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className={`bg-gradient-to-br from-${category.color}-100 to-${category.color}-200 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
                  >
                    <Icon className={`h-8 w-8 text-${category.color}-600`} />
                  </motion.div>
                  <CardTitle className="text-xl text-gray-900 mb-2 font-heading" style={{ fontWeight: 700 }}>{category.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed text-gray-600 font-body">{category.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Help Articles */}
      <div>
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl text-gray-900 mb-8 font-display"
          style={{ fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Frequently Asked Questions
        </motion.h2>
        <Accordion type="single" collapsible className="space-y-6">
          {filteredArticles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.01 }}
            >
              <AccordionItem
                value={article.id}
                className="glass-card bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-white/50 hover:shadow-2xl transition-all duration-300"
              >
                <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-blue-50/50 transition-all">
                  <div className="text-left w-full">
                    <div className="flex items-center space-x-3 mb-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="bg-gradient-to-br from-teal-500 to-emerald-500 p-2 rounded-xl shadow-lg"
                      >
                        <HelpCircle className="h-5 w-5 text-white" />
                      </motion.div>
                      <span className="text-teal-600 font-bold text-sm uppercase tracking-wide">{article.category}</span>
                    </div>
                    <p className="text-gray-900 text-lg leading-relaxed font-heading" style={{ fontWeight: 700 }}>{article.question}</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-8">
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-l-4 border-teal-500">
                    <p className="text-gray-700 leading-relaxed text-base font-body">{article.answer}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {filteredArticles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 glass-card bg-white rounded-3xl shadow-xl"
          >
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No help articles found matching your search.</p>
            <p className="text-gray-400 mt-2">Try different keywords or browse all categories above.</p>
          </motion.div>
        )}
      </div>

      {/* Contact Support */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 rounded-3xl p-12 text-white text-center shadow-2xl relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-white opacity-10 shimmer"
        />
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"
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
        <div className="relative z-10">
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Mail className="h-16 w-16 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-white text-4xl mb-4 font-display" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Still Need Help?</h2>
          <p className="text-white/90 text-xl mb-8 max-w-2xl mx-auto leading-relaxed font-heading" style={{ fontWeight: 600 }}>
            Our support team is here to assist you with any questions or concerns about using CareBridge.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="bg-white text-teal-600 hover:bg-gray-100 shadow-2xl text-lg px-8 py-6 font-bold rounded-2xl"
            >
              Contact Support
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Additional Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -6 }}
        >
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 h-full border-2 border-white/50 rounded-3xl overflow-hidden group">
            <motion.div
              className="absolute top-0 right-0 w-48 h-48 bg-purple-300 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"
            />
            <CardHeader className="p-8">
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-purple-100 to-purple-200 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              >
                <Video className="h-8 w-8 text-purple-600" />
              </motion.div>
              <CardTitle className="text-2xl text-gray-900 mb-2 font-heading" style={{ fontWeight: 700 }}>Video Tutorials</CardTitle>
              <CardDescription className="text-base leading-relaxed text-gray-600 font-body">
                Watch step-by-step guides on how to use CareBridge effectively
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-12 text-lg font-bold border-2 hover:bg-purple-50 hover:border-purple-500 transition-all rounded-xl">
                  Watch Tutorials
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ y: -6 }}
        >
          <Card className="glass-card hover:shadow-2xl transition-all duration-300 h-full border-2 border-white/50 rounded-3xl overflow-hidden group">
            <motion.div
              className="absolute top-0 right-0 w-48 h-48 bg-blue-300 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"
            />
            <CardHeader className="p-8">
              <motion.div
                whileHover={{ rotate: -360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-blue-100 to-blue-200 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              >
                <Book className="h-8 w-8 text-blue-600" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">User Guide</CardTitle>
              <CardDescription className="text-base leading-relaxed text-gray-600">
                Comprehensive documentation covering all CareBridge features
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full h-12 text-lg font-bold border-2 hover:bg-blue-50 hover:border-blue-500 transition-all rounded-xl">
                  Read Documentation
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    
    <Footer />
    </>
  );
}
