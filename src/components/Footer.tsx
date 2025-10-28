import { Heart, Mail, Github, Twitter, Linkedin, Shield, FileText, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex items-center space-x-2"
            >
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-2.5 rounded-xl shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-display" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>CareBridge</span>
            </motion.div>
            <p className="text-gray-300 text-sm leading-relaxed font-body">
              Bridging the gap between medical complexity and clear understanding through AI-powered simplification.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg text-white font-heading" style={{ fontWeight: 700 }}>Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Home
                </a>
              </li>
              <li>
                <a href="/help" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Help & FAQ
                </a>
              </li>
              <li>
                <a href="#about" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#features" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-lg text-white font-heading" style={{ fontWeight: 700 }}>Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#privacy" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#disclaimer" className="text-gray-300 hover:text-teal-400 transition-colors text-sm">
                  Medical Disclaimer
                </a>
              </li>
              <li>
                <a href="#compliance" className="text-gray-300 hover:text-teal-400 transition-colors text-sm flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>HIPAA Compliance</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div className="space-y-4">
            <h4 className="text-lg text-white font-heading" style={{ fontWeight: 700 }}>Connect With Us</h4>
            <div className="space-y-3">
              <a
                href="mailto:support@carebridge.com"
                className="flex items-center space-x-2 text-gray-300 hover:text-teal-400 transition-colors text-sm"
              >
                <Mail className="h-4 w-4" />
                <span>support@carebridge.com</span>
              </a>
              
              {/* Social Links */}
              <div className="flex space-x-4 pt-2">
                <motion.a
                  whileHover={{ scale: 1.1, y: -2 }}
                  href="#twitter"
                  className="bg-gray-800 p-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.1, y: -2 }}
                  href="#github"
                  className="bg-gray-800 p-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <Github className="h-5 w-5" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.1, y: -2 }}
                  href="#linkedin"
                  className="bg-gray-800 p-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </motion.a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {currentYear} CareBridge. All rights reserved.
            </p>
            <div className="flex items-center space-x-1 text-gray-400 text-sm">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500 mx-1" />
              <span>for better healthcare accessibility</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-xs leading-relaxed text-center">
            <FileText className="h-4 w-4 inline-block mr-1" />
            <strong>Medical Disclaimer:</strong> CareBridge is for educational purposes only. This tool does not replace professional medical advice. 
            Always consult qualified healthcare providers for medical decisions. In emergencies, contact emergency services immediately.
          </p>
        </div>
      </div>
    </footer>
  );
}
