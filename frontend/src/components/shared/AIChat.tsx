import { Bot, MessageSquare, X } from 'lucide-react';
import React from 'react';

interface AIChatProps {
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  // We will add state and logic for chat messages later
  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-background-primary rounded-lg shadow-2xl border border-border-subtle flex flex-col z-50 animate-fade-in-up">
      <header className="flex items-center justify-between p-4 border-b border-border-subtle bg-background-secondary rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary-accent" />
          <h3 className="font-semibold text-text-primary">TurboFCL AI Assistant</h3>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary">
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Chat messages will be rendered here */}
        <div className="text-center text-text-tertiary text-sm p-8">
          Ask me anything about FCL requirements, FOCI mitigation, or DCSA processes!
        </div>
      </div>
      <footer className="p-4 border-t border-border-subtle">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question..."
            className="input-primary"
          />
          <button className="button-primary">
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};