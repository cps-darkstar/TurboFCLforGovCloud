import React from 'react';
import { Bot, X, MessageSquare } from 'lucide-react';

export const AIChat = ({ onClose }) => {
  // We will add state and logic for chat messages later
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 animate-fade-in-up">
      <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold text-gray-900">TurboFCL AI Assistant</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Chat messages will be rendered here */}
        <div className="text-center text-gray-500 text-sm p-8">
          Ask me anything about FCL requirements, FOCI mitigation, or DCSA processes!
        </div>
      </div>
      <footer className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question..."
            className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};