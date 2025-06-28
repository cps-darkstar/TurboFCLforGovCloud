import { Bot, Database, Shield } from 'lucide-react';

export const Header = ({ onHelpClick }) => {
  return (
    <header className="bg-background-primary shadow-sm border-b border-border-subtle sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary-accent" />
            <div>
              <h1 className="text-xl font-bold text-text-primary">TurboFCL</h1>
              <p className="text-xs text-text-secondary -mt-1">AI-Powered FCL Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Database className="h-4 w-4" />
              <span>AWS GovCloud</span>
            </div>
            <button
              onClick={onHelpClick}
              className="bg-primary-accent text-text-on-primary px-3 py-2 rounded-md hover:bg-primary-accent-hover flex items-center gap-2 text-sm"
            >
              <Bot className="h-4 w-4" />
              <span>AI Help</span>
            </button>
            <div className="h-9 w-9 bg-primary-accent rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-gray-400">
              <span className="text-text-on-primary text-sm font-medium">CS</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};