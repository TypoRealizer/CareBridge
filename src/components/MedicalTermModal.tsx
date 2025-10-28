import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MedicalTermModal({ isOpen, onClose, term, simplified, explanation }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white">Medical Term Explanation</h3>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Medical Term */}
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-gray-600 mb-2">Medical Term:</p>
                  <p className="text-red-600">{term}</p>
                </div>

                {/* Simple Explanation */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <p className="text-gray-600 mb-2">Simple Explanation:</p>
                  <p className="text-green-600">{simplified}</p>
                </div>

                {/* Detailed Explanation */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-600 mb-2">Detailed Explanation:</p>
                  <p className="text-gray-800 leading-relaxed">{explanation}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
