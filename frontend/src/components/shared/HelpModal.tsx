import React from 'react';
import { X, HelpCircle } from 'lucide-react';

export const HelpModal = ({ content, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <HelpCircle className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">Help & Information</h3>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
        <div className="text-gray-700 whitespace-pre-line prose">
          {content}
        </div>
      </div>
    </div>
  );
};