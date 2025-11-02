import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { motion } from 'motion/react';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 glass-card shadow-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 transition-all duration-300 group"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 p-3 rounded-xl shadow-lg group-hover:shadow-2xl group-hover:from-teal-600 group-hover:to-emerald-600 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity shimmer" />
              <Activity className="h-7 w-7 text-white relative z-10" />
            </motion.div>
            <span className="text-gray-900 text-2xl tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text group-hover:text-transparent transition-all duration-300 font-display" style={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              CareBridge
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {isHomePage && (
              <>
                <motion.button
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section');
                    featuresSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-700 hover:text-gray-900 transition-colors px-6 py-3 relative group text-lg font-bold"
                >
                  Features
                  <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300 group-hover:w-full rounded-full shadow-lg"></span>
                </motion.button>
                <motion.button
                  onClick={() => {
                    const uploadSection = document.getElementById('upload-section');
                    uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-700 hover:text-gray-900 transition-colors px-6 py-3 relative group text-lg font-bold"
                >
                  Upload
                  <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300 group-hover:w-full rounded-full shadow-lg"></span>
                </motion.button>
              </>
            )}
            <motion.button
              onClick={() => navigate('/help')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-gray-700 hover:text-gray-900 transition-colors px-6 py-3 relative group text-lg font-bold"
            >
              Help
              <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300 group-hover:w-full rounded-full shadow-lg"></span>
            </motion.button>
            {!isHomePage && (
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                New Document
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {isHomePage && (
              <>
                <button
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section');
                    featuresSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Features
                </button>
                <button
                  onClick={() => {
                    const uploadSection = document.getElementById('upload-section');
                    uploadSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Upload
                </button>
              </>
            )}
            <button
              onClick={() => {
                navigate('/help');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-gray-600 hover:bg-gray-50 font-bold"
            >
              Help
            </button>
            {!isHomePage && (
              <button
                onClick={() => {
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-teal-600 hover:bg-teal-50 font-bold"
              >
                New Document
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
