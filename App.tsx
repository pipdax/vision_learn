
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
  X
} from 'lucide-react';
import CameraCanvas from './components/CameraCanvas';
import SettingsModal from './components/SettingsModal';
import HistoryDrawer from './components/HistoryDrawer';
import { UserSettings, HistoryItem, LessonType } from './types';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('visionlearn_settings');
    return saved ? JSON.parse(saved) : { age: 8 };
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
  
  // Workspace / Displayed States
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.SVG);

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

  // Layout States
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const gemini = useMemo(() => new GeminiService(), []);

  // Effects
  useEffect(() => {
    localStorage.setItem('visionlearn_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('visionlearn_history', JSON.stringify(history));
  }, [history]);

  // Resizing Handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftPanelWidth(newWidth);
      }
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
  }, [isResizing, resize, stopResizing]);

  // Handlers
  const handleProcessImage = async (base64Image: string) => {
    setIsProcessing(true);
    const newScreenshot = base64Image;
    const newHtml = null;
    const newTopics: string[] = [];
    
    setCurrentScreenshot(newScreenshot);
    setCurrentHtml(newHtml);
    setTopics(newTopics);
    setSelectedTopics([]);

    setWorkspace({
      currentScreenshot: newScreenshot,
      currentHtml: newHtml,
      topics: newTopics,
      selectedTopics: []
    });

    try {
      const extractedTopics = await gemini.analyzeImage(base64Image, settings.age);
      setTopics(extractedTopics);
      setWorkspace(prev => ({ ...prev, topics: extractedTopics }));
    } catch (error) {
      console.error(error);
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
      console.error(error);
      alert("知识点下钻失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteTopic = (topicToDelete: string) => {
    setTopics(prev => {
      const next = prev.filter(t => t !== topicToDelete);
      setWorkspace(w => ({ ...w, topics: next }));
      return next;
    });
    setSelectedTopics(prev => prev.filter(t => t !== topicToDelete));
  };

  const handleGenerateLesson = async () => {
    if (selectedTopics.length === 0) return;

    setIsProcessing(true);
    try {
      const html = await gemini.generateLesson(selectedTopics, settings.age, lessonType);
      setCurrentHtml(html);
      setWorkspace(prev => ({ ...prev, currentHtml: html }));

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topics: selectedTopics,
        htmlContent: html,
        thumbnail: currentScreenshot || ''
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
    } catch (error) {
      console.error(error);
      alert("讲解内容生成失败");
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
    setIsHistoryOpen(false);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-50 font-sans select-none ${isResizing ? 'cursor-col-resize' : ''}`}>
      <main ref={containerRef} className="flex flex-1 w-full overflow-hidden relative">
        <div 
          className={`h-full overflow-hidden bg-slate-900 transition-[width] duration-300 ease-in-out relative flex-shrink-0`}
          style={{ width: isCollapsed ? '0%' : `${leftPanelWidth}%` }}
        >
          <div className={`w-full h-full min-w-[400px] ${isCollapsed ? 'invisible opacity-0' : 'visible opacity-100'}`}>
            <CameraCanvas onProcess={handleProcessImage} isProcessing={isProcessing} />
          </div>
        </div>

        <div 
          onMouseDown={startResizing}
          className={`group w-1.5 h-full bg-slate-200 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors relative z-10 flex-shrink-0 ${isCollapsed ? 'hidden' : ''}`}
        >
           <div className="absolute inset-y-0 -left-1 -right-1" />
           <GripVertical size={12} className="text-slate-400 group-hover:text-white" />
           
           <button
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
              className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 text-slate-500 z-20 group-hover:scale-110 transition-transform"
              title="折叠左侧"
           >
              <ChevronLeft size={16} />
           </button>
        </div>

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-white border border-l-0 border-slate-200 rounded-r-xl flex items-center justify-center shadow-xl hover:bg-blue-50 text-blue-600 z-30 transition-all group animate-in slide-in-from-left duration-300"
            title="展开左侧"
          >
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
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 pr-3 border-r border-slate-200">
                  <button
                    onClick={handleSubdivide}
                    disabled={selectedTopics.length === 0 || isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-30 whitespace-nowrap"
                    title="拆解为基础知识"
                  >
                    <Layers size={14} />
                    知识下钻
                  </button>
                  <button
                    onClick={() => setIsDeleteMode(!isDeleteMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                      isDeleteMode ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="删除知识点"
                  >
                    <Trash2 size={14} />
                    {isDeleteMode ? '完成删除' : '管理列表'}
                  </button>
                </div>
                <div className="flex gap-2 pl-1">
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="查看历史记录"
                  >
                    <HistoryIcon size={18} />
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                    title="偏好设置"
                  >
                    <SettingsIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.length === 0 ? (
                <p className="text-slate-400 text-sm italic">
                  {isProcessing ? "正在分析图像内容..." : "拍照并标注感兴趣的部分，点击拆解获取知识点"}
                </p>
              ) : (
                topics.map(topic => (
                  <div key={topic} className="relative group/pill">
                    <button
                      onClick={() => toggleTopic(topic)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTopics.includes(topic)
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } ${isDeleteMode ? 'pr-8 cursor-default' : ''}`}
                    >
                      {topic}
                    </button>
                    {isDeleteMode && (
                      <button
                        onClick={() => deleteTopic(topic)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 bg-red-400 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-4 min-h-0 relative">
            {currentHtml ? (
              <div className={`
                bg-white shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-500 transition-all
                ${isContentFullscreen 
                  ? 'fixed inset-0 z-[150] rounded-none' 
                  : 'w-full h-full rounded-2xl'
                }
              `}>
                <button
                  onClick={() => setIsContentFullscreen(!isContentFullscreen)}
                  className="absolute top-4 right-4 z-[160] p-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg hover:bg-white text-slate-600 transition-all hover:scale-105 active:scale-95 group"
                  title={isContentFullscreen ? "退出全屏" : "全屏显示"}
                >
                  {isContentFullscreen ? (
                    <Minimize2 size={20} className="group-hover:text-blue-600" />
                  ) : (
                    <Maximize2 size={20} className="group-hover:text-blue-600" />
                  )}
                </button>
                <iframe
                  srcDoc={currentHtml}
                  className="w-full h-full border-none"
                  title="Lesson content"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-400 text-center max-w-xs">
                <div className="p-8 bg-white rounded-full shadow-sm border border-slate-100">
                    <BookOpen size={48} className="opacity-20" />
                </div>
                <p className="text-sm">选择左侧捕获的知识点，AI 将为你生成互动式可视化教学课件</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 flex flex-col gap-4 items-center bg-white flex-shrink-0">
             <div className="flex p-1 bg-slate-100 rounded-xl w-full max-w-sm">
                {[
                  { id: LessonType.IMAGE, icon: <Palette size={16} />, label: "形象绘图" },
                  { id: LessonType.HTML, icon: <FileCode size={16} />, label: "视觉图解" },
                  { id: LessonType.SVG, icon: <Activity size={16} />, label: "交互动画" }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setLessonType(type.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      lessonType === type.id 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
             </div>

             <button
                onClick={handleGenerateLesson}
                disabled={selectedTopics.length === 0 || isProcessing}
                className="group relative flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-10 py-3.5 rounded-full font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl active:scale-95 w-full max-w-sm justify-center"
             >
                {isProcessing ? (
                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                   <PlayCircle size={22} className="group-hover:text-blue-400" />
                )}
                开始生成讲解
             </button>
          </div>
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(s) => {
            setSettings(s);
            setIsSettingsOpen(false);
          }}
        />
      )}

      {isHistoryOpen && (
        <HistoryDrawer
          items={history}
          workspace={workspace}
          onClose={() => setIsHistoryOpen(false)}
          onSelect={selectHistoryItem}
          onSelectWorkspace={restoreWorkspace}
          onDelete={(id) => setHistory(prev => prev.filter(i => i.id !== id))}
        />
      )}

      {isProcessing && (
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-md pointer-events-none transition-opacity">
             <div className="relative">
                <div className="w-24 h-24 border-4 border-white/20 rounded-full animate-ping" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-white animate-bounce" size={40} />
                </div>
             </div>
             <p className="mt-8 text-white font-bold text-xl tracking-widest animate-pulse">
                AI 正在生成内容...
             </p>
          </div>
      )}
    </div>
  );
};

export default App;
