import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const Navigation = ({ onNext, onBack, isFirstStep, isLastStep }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-8">
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isFirstStep}
          className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-md text-sm font-medium text-text-primary bg-background-primary hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2 bg-primary-accent text-text-on-primary rounded-md text-sm font-medium hover:bg-primary-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span>{isLastStep ? 'Submit to DCSA' : 'Continue'}</span>
          {isLastStep ? <CheckCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};