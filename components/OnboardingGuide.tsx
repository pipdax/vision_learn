
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Sparkles, MousePointer2, Camera, Lightbulb, PlayCircle, Settings } from 'lucide-react';

interface Step {
  id: string;
  targetId?: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    id: 'welcome',
    title: '欢迎使用 VisionLearn AI',
    content: '这是一款将现实世界转化为互动学习课件的 AI 引擎。让我们花 1 分钟了解如何开启你的探索之旅。',
    icon: <Sparkles className="text-amber-500" size={32} />
  },
  {
    id: 'capture',
    targetId: 'capture-panel',
    title: '1. 捕捉素材',
    content: '通过左侧面板，你可以开启摄像头实时拍照、上传本地图片、粘贴剪贴板内容，或者直接输入一段文字供 AI 分析。',
    icon: <Camera className="text-blue-500" size={24} />
  },
  {
    id: 'topics',
    targetId: 'topics-area',
    title: '2. 知识拆解',
    content: '素材上传后，AI 会自动为你提取核心知识点。你可以点击“知识下钻”来进一步探索更深层的原理。',
    icon: <Lightbulb className="text-amber-400" size={24} />
  },
  {
    id: 'types',
    targetId: 'lesson-types',
    title: '3. 呈现形式',
    content: '选择你喜欢的学习方式：无论是专业插图、学术杂志排版，还是启发式对话或精美动画。',
    icon: <Sparkles className="text-indigo-500" size={24} />
  },
  {
    id: 'generate',
    targetId: 'generate-button',
    title: '4. 开启生成',
    content: '点击这里，AI 将根据你选中的知识点和偏好的形式，生成沉浸式的可视化教学课件。',
    icon: <PlayCircle className="text-emerald-500" size={24} />
  },
  {
    id: 'settings',
    targetId: 'settings-button',
    title: '5. 个性化配置',
    content: '在此设置学习者年龄，或配置你的个人付费 API Key 以解锁 2K 高清绘图和 Pro 模式能力。',
    icon: <Settings className="text-slate-600" size={24} />
  }
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const step = steps[currentStep];
    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      if (element) {
        setSpotlightRect(element.getBoundingClientRect());
      }
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden select-none pointer-events-auto">
      {/* Dynamic Masking Layer */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-all duration-500"
           style={{
             clipPath: spotlightRect 
               ? `polygon(0% 0%, 0% 100%, ${spotlightRect.left}px 100%, ${spotlightRect.left}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.bottom}px, ${spotlightRect.left}px ${spotlightRect.bottom}px, ${spotlightRect.left}px 100%, 100% 100%, 100% 0%)`
               : 'none'
           }}
      />

      {/* Spotlight Border */}
      {spotlightRect && (
        <div 
          className="absolute border-2 border-blue-400 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-500 pointer-events-none"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
          }}
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg animate-bounce">
            <MousePointer2 size={12} />
            关注这里
          </div>
        </div>
      )}

      {/* Tooltip Card */}
      <div 
        className={`absolute flex flex-col items-center transition-all duration-500 ease-out transform ${
          !spotlightRect 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm' 
            : 'w-80'
        }`}
        style={spotlightRect ? {
          // If tall sidebar (likely capture-panel), center vertically.
          top: spotlightRect.height > window.innerHeight * 0.8
            ? Math.max(20, window.innerHeight / 2 - 160)
            : (spotlightRect.bottom + 24 > window.innerHeight - 300 ? Math.max(20, spotlightRect.top - 280) : spotlightRect.bottom + 24),
          // If sidebar on left, place to right. If target is wide, center horizontally.
          left: spotlightRect.height > window.innerHeight * 0.8 && spotlightRect.left < 50
            ? spotlightRect.right + 24
            : Math.max(20, Math.min(window.innerWidth - 340, spotlightRect.left + spotlightRect.width / 2 - 160))
        } : {}}
      >
        <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-white/20 relative w-full group overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            {React.cloneElement(step.icon as React.ReactElement, { size: 120 })}
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                {step.icon}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{step.title}</h3>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              {step.content}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-blue-600' : 'w-1 bg-slate-200'}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-slate-900/20"
              >
                {currentStep === steps.length - 1 ? "立即开始" : "下一步"}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onComplete}
          className="mt-6 text-white/50 hover:text-white text-xs font-medium underline underline-offset-4 transition-colors"
        >
          跳过引导
        </button>
      </div>
    </div>
  );
};

export default OnboardingGuide;
