import { HelpCircle, X } from 'lucide-react';

export const HelpModal = ({ content, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-background-primary rounded-lg max-w-lg w-full p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <HelpCircle className="h-6 w-6 text-primary-accent" />
          <h3 className="text-xl font-semibold text-text-primary">Help & Information</h3>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-text-tertiary hover:text-text-secondary">
          <X className="h-6 w-6" />
        </button>
        <div className="text-text-secondary whitespace-pre-line prose">
          {content}
        </div>
      </div>
    </div>
  );
};