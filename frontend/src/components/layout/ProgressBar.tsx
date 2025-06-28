
export const ProgressBar = ({ currentStep, totalSteps, title }) => {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="bg-background-primary border-b border-border-subtle">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
          <span className="font-medium">{title}</span>
          <span className="font-semibold text-text-primary">{Math.round(progressPercentage)}% Complete</span>
        </div>
        <div className="w-full bg-background-tertiary rounded-full h-2.5">
          <div
            className="bg-primary-accent h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};