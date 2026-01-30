
import React, { useEffect, useState } from 'react';
import { X, Settings, User, Zap, Sparkles, Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { UserSettings } from '../types';
import { GeminiService } from '../services/geminiService';

interface SettingsModalProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasSelectedKey, setHasSelectedKey] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasSelectedKey(hasKey);
      } catch (e) {
        console.error("Failed to check API key status", e);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      setHasSelectedKey(true);
    } catch (e) {
      console.error("Failed to open key selection dialog", e);
    }
  };

  const toggleProMode = async () => {
    const turningOn = !localSettings.isProMode;
    
    if (turningOn) {
      setIsValidating(true);
      setValidationError(null);
      
      // 实例化服务进行一次轻量级的 Pro 能力验证
      const gemini = new GeminiService();
      gemini.setApiKey(localSettings.manualApiKey);
      
      const isCapable = await gemini.validateProKey();
      
      if (!isCapable) {
        setValidationError("当前 Key 无法调用 Pro 模型，请确保已启用付费结算。");
        setIsValidating(false);
        return;
      }
      
      setIsValidating(false);
    }
    
    setLocalSettings({ ...localSettings, isProMode: turningOn });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Settings className="text-blue-600" size={20} />
            系统设置
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Age Setting */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} /> 学习者年龄
            </label>
            <input
              type="number"
              value={localSettings.age}
              onChange={e => setLocalSettings({ ...localSettings, age: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Manual API Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Key size={16} /> 手动输入 API Key
            </label>
            <div className="relative group">
              <input
                type="password"
                value={localSettings.manualApiKey || ''}
                onChange={e => {
                  setLocalSettings({ ...localSettings, manualApiKey: e.target.value });
                  setValidationError(null);
                }}
                placeholder="在此输入您的 Gemini API Key"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                {localSettings.manualApiKey ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Pencil size={16} />}
              </div>
            </div>
            <p className="text-[10px] text-slate-400">若留空，将默认使用系统环境提供的 Key。</p>
          </div>

          {/* Platform Key Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                {hasSelectedKey ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={20} className="text-slate-300" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {hasSelectedKey ? '平台已选中付费 Key' : '平台未选定 Key'}
                  </div>
                  <p className="text-[10px] text-slate-400">Pro 模式建议通过平台安全选定</p>
                </div>
              </div>
              <button
                onClick={handleOpenSelectKey}
                className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-all shadow-sm"
              >
                {hasSelectedKey ? '更换 Key' : '平台选 key'}
              </button>
            </div>
          </div>

          {/* Pro Mode Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${validationError ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Sparkles size={16} className={localSettings.isProMode ? "text-purple-500" : "text-slate-400"} />
                开启 Pro 模式
              </div>
              <p className="text-[10px] text-slate-400">支持 2K/4K 插图及全量 Pro 能力</p>
            </div>
            <button
              onClick={toggleProMode}
              disabled={isValidating}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${localSettings.isProMode ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-slate-300'} ${isValidating ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 flex items-center justify-center ${localSettings.isProMode ? 'translate-x-6' : 'translate-x-0'}`}>
                {isValidating && <Loader2 size={10} className="animate-spin text-indigo-600" />}
              </div>
            </button>
          </div>

          {validationError && (
            <p className="text-[11px] text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              {validationError}
            </p>
          )}

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed flex items-center gap-2">
              <Zap size={12} className="flex-shrink-0" />
              Pro 模式将调用更高级的模型，生成的图像更精细。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors text-sm"
          >
            取消
          </button>
          <button
            onClick={() => onSave(localSettings)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 text-sm"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

const Pencil: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
  </svg>
);

export default SettingsModal;
