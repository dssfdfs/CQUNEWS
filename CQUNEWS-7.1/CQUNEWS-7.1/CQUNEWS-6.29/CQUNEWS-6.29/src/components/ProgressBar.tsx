interface ProgressBarProps {
  currentStep: number;
}

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const steps = [
    { id: 1, label: '内容上传' },
    { id: 2, label: '摘要生成' },
    { id: 3, label: '标题生成' },
    { id: 4, label: '质量校验' },
    { id: 5, label: '数据可视化' },
  ];

  return (
    <div className="flex items-center justify-center gap-8 py-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                currentStep >= step.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep > step.id ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`mt-3 text-sm font-medium transition-colors duration-300 ${
                currentStep >= step.id ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-1.5 mx-4 rounded-full transition-all duration-300 ${
                currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}