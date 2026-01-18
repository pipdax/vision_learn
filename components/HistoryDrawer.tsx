
import React from 'react';
import { X, Clock, Trash2, History, LayoutPanelLeft, Sparkles } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  items: HistoryItem[];
  workspace: {
    topics: string[],
    currentScreenshot: string | null,
    currentHtml: string | null
  };
  onSelect: (item: HistoryItem) => void;
  onSelectWorkspace: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ items, workspace, onSelect, onSelectWorkspace, onDelete, onClose }) => {
  const hasWorkspaceContent = workspace.currentScreenshot || workspace.topics.length > 0;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[100] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <History className="text-indigo-600" size={18} />
          学习历史
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Current Workspace Option */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">正在进行</div>
          {hasWorkspaceContent ? (
            <div
              className="group relative bg-blue-50 border-2 border-blue-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer p-0.5"
              onClick={onSelectWorkspace}
            >
              <div className="aspect-video w-full overflow-hidden bg-slate-200 rounded-t-[14px]">
                {workspace.currentScreenshot ? (
                   <img src={workspace.currentScreenshot} alt="Current workspace" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                      <LayoutPanelLeft size={32} strokeWidth={1.5} />
                   </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                      <Sparkles size={12} />
                      当前工作区
                   </div>
                   <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">LIVE</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {workspace.topics.length === 0 ? (
                    <span className="text-[10px] text-blue-400 italic">准备中...</span>
                  ) : (
                    workspace.topics.slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] px-2 py-0.5 bg-white text-blue-600 border border-blue-100 rounded-full font-medium">
                        {t}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
               当前没有正在进行的任务
            </div>
          )}
        </div>

        {/* Saved Items */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">已保存记录</div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <Clock size={32} className="mb-2 opacity-20" />
              <p className="text-xs">暂无存档</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-100">
                  <img src={item.thumbnail} alt="Lesson screenshot" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.topics.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium border border-indigo-100">
                        {t}
                      </span>
                    ))}
                    {item.topics.length > 2 && <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">+{item.topics.length - 2}</span>}
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-sm border border-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;
