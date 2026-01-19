
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Settings as SettingsIcon, 
  History as HistoryIcon, 
  Lightbulb, 
  PlayCircle, 
  BookOpen, 
  Sparkles, 
  Palette, 
  FileCode, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  GripVertical,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
  X,
  Plus,
  Check,
  AlignLeft,
  Pencil,
  MessageCircle
} from 'lucide-react';
import CameraCanvas from './components/CameraCanvas';
import SettingsModal from './components/SettingsModal';
import HistoryDrawer from './components/HistoryDrawer';
import { UserSettings, HistoryItem, LessonType } from './types';
import { GeminiService } from './services/geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // FIX: All declarations of 'aistudio' must have identical modifiers. 
    // Making it optional resolves potential conflicts with other declarations.
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('visionlearn_settings');
    return saved ? JSON.parse(saved) : { age: 8, isProMode: false };
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('visionlearn_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContentFullscreen, setIsContentFullscreen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicValue, setNewTopicValue] = useState('');
  const [extraRequirement, setExtraRequirement] = useState('');
  
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.DIALOGUE);

  const [workspace, setWorkspace] = useState<{
    topics: string[],
    selectedTopics: string[],
    currentHtml: string | null,
    currentScreenshot: string | null
  }>({
    topics: [],
    selectedTopics: [],
    currentHtml: null,
    currentScreenshot: null
  });

  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const gemini = useMemo(() => new GeminiService(), []);

  useEffect(() => {
    localStorage.setItem('visionlearn_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('visionlearn_history', JSON.stringify(history));
  }, [history]);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => setIsResizing(false);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize]);

  const handleProcessImage = async (base64Image: string) => {
    setIsProcessing(true);
    setCurrentScreenshot(base64Image);
    setCurrentHtml(null);
    setTopics([]);
    setSelectedTopics([]);
    setWorkspace({ currentScreenshot: base64Image, currentHtml: null, topics: [], selectedTopics: [] });

    try {
      const extractedTopics = await gemini.analyzeImage(base64Image, settings.age);
      setTopics(extractedTopics);
      setWorkspace(prev => ({ ...prev, topics: extractedTopics }));
    } catch (error) {
      alert("知识点拆解失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubdivide = async () => {
    if (selectedTopics.length === 0) return;
    setIsProcessing(true);
    try {
      const newSubTopics = await gemini.subdivideTopics(selectedTopics, settings.age);
      setTopics(prev => {
        const next = [...new Set([...prev, ...newSubTopics])];
        setWorkspace(w => ({ ...w, topics: next }));
        return next;
      });
      setSelectedTopics(newSubTopics);
      setWorkspace(w => ({ ...w, selectedTopics: newSubTopics }));
    } catch (error) {
      alert("知识点下钻失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteTopic = (topicToDelete: string) => {
    setTopics(prev => prev.filter(t => t !== topicToDelete));
    setSelectedTopics(prev => prev.filter(t => t !== topicToDelete));
    setWorkspace(w => ({ ...w, topics: w.topics.filter(t => t !== topicToDelete), selectedTopics: w.selectedTopics.filter(t => t !== topicToDelete) }));
  };

  // FIX: Implemented handleAddManualTopic to allow manual addition of knowledge points.
  const handleAddManualTopic = () => {
    const trimmed = newTopicValue.trim();
    if (trimmed) {
      if (!topics.includes(trimmed)) {
        const updatedTopics = [...topics, trimmed];
        setTopics(updatedTopics);
        setWorkspace(prev => ({ ...prev, topics: updatedTopics }));
      }
    }
    setNewTopicValue('');
    setIsAddingTopic(false);
  };

  const handleGenerateLesson = async () => {
    if (selectedTopics.length === 0) return;

    if (settings.isProMode) {
      try {
        const hasKey = await window.aistudio?.hasSelectedApiKey();
        if (!hasKey) await window.aistudio?.openSelectKey();
      } catch (e) {}
    }

    setIsProcessing(true);
    try {
      const html = await gemini.generateLesson(selectedTopics, settings.age, lessonType, settings.isProMode, extraRequirement);
      setCurrentHtml(html);
      setWorkspace(prev => ({ ...prev, currentHtml: html }));

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topics: selectedTopics,
        htmlContent: html,
        thumbnail: currentScreenshot || '',
        lessonType: lessonType
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
    } catch (error: any) {
      alert("内容生成失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTopic = (topic: string) => {
    if (isDeleteMode) return;
    setSelectedTopics(prev => {
      const next = prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic];
      setWorkspace(w => ({ ...w, selectedTopics: next }));
      return next;
    });
  };

  const restoreWorkspace = () => {
    setTopics(workspace.topics);
    setSelectedTopics(workspace.selectedTopics);
    setCurrentHtml(workspace.currentHtml);
    setCurrentScreenshot(workspace.currentScreenshot);
    setIsHistoryOpen(false);
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setCurrentHtml(item.htmlContent);
    setCurrentScreenshot(item.thumbnail);
    setTopics(item.topics);
    setSelectedTopics(item.topics);
    setLessonType(item.lessonType);
    setIsHistoryOpen(false);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-50 font-sans select-none ${isResizing ? 'cursor-col-resize' : ''}`}>
      <main ref={containerRef} className="flex flex-1 w-full overflow-hidden relative">
        <div className={`h-full overflow-hidden bg-slate-900 transition-[width] duration-300 ease-in-out relative flex-shrink-0`} style={{ width: isCollapsed ? '0%' : `${leftPanelWidth}%` }}>
          <div className={`w-full h-full min-w-[400px] ${isCollapsed ? 'invisible opacity-0' : 'visible opacity-100'}`}>
            <CameraCanvas onProcess={handleProcessImage} isProcessing={isProcessing} />
          </div>
        </div>

        <div onMouseDown={startResizing} className={`group w-1.5 h-full bg-slate-200 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors relative z-10 flex-shrink-0 ${isCollapsed ? 'hidden' : ''}`}>
           <GripVertical size={12} className="text-slate-400 group-hover:text-white" />
           <button onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }} className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 text-slate-500 z-20 transition-transform">
              <ChevronLeft size={16} />
           </button>
        </div>

        {isCollapsed && (
          <button onClick={() => setIsCollapsed(false)} className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-white border border-l-0 border-slate-200 rounded-r-xl flex items-center justify-center shadow-xl hover:bg-blue-50 text-blue-600 z-30 transition-all group">
            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        <div className="flex-1 flex flex-col bg-white overflow-hidden relative min-w-0">
          <div className="p-6 border-b border-slate-100 min-h-[140px]">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold flex-shrink-0">
                <Lightbulb className="text-amber-500" size={18} />
                核心知识点
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSubdivide} disabled={selectedTopics.length === 0 || isProcessing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-30">
                  <Layers size={14} /> 知识下钻
                </button>
                <button onClick={() => setIsDeleteMode(!isDeleteMode)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isDeleteMode ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Trash2 size={14} /> {isDeleteMode ? '完成管理' : '管理列表'}
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1" />
                <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><HistoryIcon size={18} /></button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><SettingsIcon size={18} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {topics.map(topic => (
                <div key={topic} className="relative group/pill">
                  <button onClick={() => toggleTopic(topic)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedTopics.includes(topic) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {topic}
                  </button>
                  {isDeleteMode && (
                    <button onClick={() => deleteTopic(topic)} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 bg-red-400 text-white rounded-full hover:bg-red-600"><X size={12} /></button>
                  )}
                </div>
              ))}
              {isAddingTopic ? (
                <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-full pl-3 pr-1 py-0.5 shadow-sm">
                  <input autoFocus type="text" value={newTopicValue} onChange={(e) => setNewTopicValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddManualTopic()} placeholder="输入知识点..." className="bg-transparent border-none outline-none text-sm w-32" />
                  <button onClick={handleAddManualTopic} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full"><Check size={14} /></button>
                  <button onClick={() => { setIsAddingTopic(false); setNewTopicValue(''); }} className="p-1 text-slate-400 hover:bg-slate-50 rounded-full"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setIsAddingTopic(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-slate-400 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-500">
                  <Plus size={14} /> 添加
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-4 min-h-0 relative">
            {currentHtml ? (
              <div className={`bg-white shadow-xl overflow-hidden border border-slate-200 transition-all ${isContentFullscreen ? 'fixed inset-0 z-[150] rounded-none' : 'w-full h-full rounded-2xl'}`}>
                <button onClick={() => setIsContentFullscreen(!isContentFullscreen)} className="absolute top-4 right-4 z-[160] p-2 bg-white/80 border border-slate-200 rounded-xl shadow-lg hover:bg-white text-slate-600">
                  {isContentFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <iframe srcDoc={currentHtml} className="w-full h-full border-none" title="Lesson" sandbox="allow-scripts" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <BookOpen size={48} className="opacity-20" />
                <p className="text-sm">选择核心知识点，AI 将生成带有“划重点气泡”的可视化讲解</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 flex flex-col gap-4 items-center bg-white">
             <div className="w-full max-w-lg space-y-4">
               <div className="relative group">
                 <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input type="text" value={extraRequirement} onChange={(e) => setExtraRequirement(e.target.value)} placeholder="额外要求（如：用森林工厂做比喻...）" className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div className="flex p-1 bg-slate-100 rounded-xl w-full">
                  {[
                    { id: LessonType.IMAGE, icon: <Palette size={16} />, label: "画图" },
                    { id: LessonType.TEXT, icon: <AlignLeft size={16} />, label: "文字" },
                    { id: LessonType.DIALOGUE, icon: <MessageCircle size={16} />, label: "对话" },
                    { id: LessonType.HTML, icon: <FileCode size={16} />, label: "图文" },
                    { id: LessonType.SVG, icon: <Activity size={16} />, label: "动画" }
                  ].map((type) => (
                    <button key={type.id} onClick={() => setLessonType(type.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${lessonType === type.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                      {type.icon} {type.label}
                    </button>
                  ))}
               </div>
               <button onClick={handleGenerateLesson} disabled={selectedTopics.length === 0 || isProcessing} className="group relative flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-10 py-3.5 rounded-full font-bold transition-all disabled:opacity-30 w-full justify-center shadow-xl active:scale-95">
                  {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <PlayCircle size={22} />}
                  开始生成讲解
               </button>
             </div>
          </div>
        </div>
      </main>

      {isSettingsOpen && <SettingsModal settings={settings} onClose={() => setIsSettingsOpen(false)} onSave={(s) => { setSettings(s); setIsSettingsOpen(false); }} />}
      {isHistoryOpen && <HistoryDrawer items={history} workspace={workspace} onClose={() => setIsHistoryOpen(false)} onSelect={selectHistoryItem} onSelectWorkspace={restoreWorkspace} onDelete={(id) => setHistory(prev => prev.filter(i => i.id !== id))} />}
      {isProcessing && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md transition-opacity">
             <div className="relative">
                <div className="w-24 h-24 border-4 border-white/20 rounded-full animate-ping" />
                <Sparkles className="absolute inset-0 m-auto text-white animate-bounce" size={40} />
             </div>
             <p className="mt-8 text-white font-bold text-xl tracking-widest animate-pulse">AI 正在捕捉核心要点...</p>
          </div>
      )}
    </div>
  );
};

export default App;
