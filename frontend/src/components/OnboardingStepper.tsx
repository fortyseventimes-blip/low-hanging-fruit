interface OnboardingStepperProps {
  stepCount: number;
  currentStep: number; // 0-indexed
}

export function OnboardingStepper({ stepCount, currentStep }: OnboardingStepperProps) {
  return (
    <div className="flex gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={stepCount} aria-valuenow={currentStep + 1}>
      {Array.from({ length: stepCount }, (_, index) => (
        <div
          key={index}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            index <= currentStep ? "bg-violet-500" : "bg-slate-800"
          }`}
        />
      ))}
    </div>
  );
}
