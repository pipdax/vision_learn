
import React from 'react';
import { X, Settings, User, Zap, Sparkles } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = React.useState(settings);

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
            <p className="text-xs text-slate-400">AI 将根据年龄调整讲解的难度与风格</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Sparkles size={16} className="text-purple-500" />
                开启 Pro 模式
              </div>
              <p className="text-[10px] text-slate-400">解锁 4K 高清手绘图及更强大的生成能力</p>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, isProMode: !localSettings.isProMode })}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${localSettings.isProMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${localSettings.isProMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 leading-relaxed flex items-center gap-2">
              <Zap size={12} />
              API 配置已自动管理。Pro 模式需授权付费项目 Key。
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(localSettings)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
