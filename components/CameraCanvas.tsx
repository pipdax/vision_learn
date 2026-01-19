
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Square, PenTool, Eraser, Sparkles, Undo2, Circle, Upload, ClipboardPaste, Crop, Check, X, CameraOff, Video } from 'lucide-react';
import { ToolType, Annotation } from '../types';

interface CameraCanvasProps {
  onProcess: (finalImage: string) => void;
  isProcessing: boolean;
}

const CameraCanvas: React.FC<CameraCanvasProps> = ({ onProcess, isProcessing }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [tool, setTool] = useState<ToolType>(ToolType.RECT);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropArea, setCropArea] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const capture = useCallback(() => {
    if (!isCameraOn) {
      setIsCameraOn(true);
      // 给摄像头一点启动时间
      setTimeout(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
          setScreenshot(imageSrc);
          setAnnotations([]);
          setCropArea(null);
        }
      }, 800);
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setScreenshot(imageSrc);
      setAnnotations([]);
      setCropArea(null);
    }
  }, [isCameraOn]);

  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setScreenshot(result);
        setAnnotations([]);
        setCropArea(null);
        setIsCameraOn(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              setScreenshot(result);
              setAnnotations([]);
              setCropArea(null);
              setIsCameraOn(false);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerPaste = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error("Clipboard API not supported");
      }
      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              setScreenshot(result);
              setAnnotations([]);
              setCropArea(null);
              setIsCameraOn(false);
            };
            reader.readAsDataURL(blob);
            foundImage = true;
            return;
          }
        }
      }
      if (!foundImage) alert("剪贴板中没有图片。");
    } catch (err: any) {
      alert("无法读取剪贴板，请尝试 Ctrl+V 手动粘贴。");
    }
  };

  const reset = () => {
    setScreenshot(null);
    setAnnotations([]);
    setCropArea(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const undo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = screenshot;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      
      [...annotations, ...(currentAnnotation ? [currentAnnotation] : [])].forEach(ann => {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
        if (ann.type === ToolType.RECT && ann.points.length >= 2) {
          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (ann.type === ToolType.PEN && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          ann.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        } else if (ann.type === ToolType.CROP && ann.points.length >= 2) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            const start = ann.points[0];
            const end = ann.points[ann.points.length - 1];
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, start.y);
            ctx.fillRect(0, end.y, canvas.width, canvas.height - end.y);
            ctx.fillRect(0, start.y, start.x, end.y - start.y);
            ctx.fillRect(end.x, start.y, canvas.width - end.x, end.y - start.y);
        }
      });
      if (cropArea && tool !== ToolType.CROP) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.w, cropArea.h);
      }
    };
  }, [screenshot, annotations, currentAnnotation, cropArea, tool]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!screenshot) return;
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setCurrentAnnotation({
      type: tool,
      color: tool === ToolType.CROP ? '#3b82f6' : color,
      lineWidth: tool === ToolType.CROP ? 2 : lineWidth,
      points: [coords]
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    const coords = getCanvasCoordinates(e);
    setCurrentAnnotation(prev => {
      if (!prev) return null;
      if (tool === ToolType.RECT || tool === ToolType.CROP) return { ...prev, points: [prev.points[0], coords] };
      return { ...prev, points: [...prev.points, coords] };
    });
  };

  const handleMouseUp = () => {
    if (currentAnnotation) {
      if (tool === ToolType.CROP) {
        const start = currentAnnotation.points[0];
        const end = currentAnnotation.points[currentAnnotation.points.length - 1];
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        if (w > 10 && h > 10) setCropArea({ x, y, w, h });
      } else {
        setAnnotations(prev => [...prev, currentAnnotation]);
      }
    }
    setCurrentAnnotation(null);
    setIsDrawing(false);
  };

  const applyCrop = () => {
    if (!cropArea || !screenshot) return;
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;
    const img = new Image();
    img.src = screenshot;
    img.onload = () => {
      const ratio = Math.min(sourceCanvas.width / img.width, sourceCanvas.height / img.height);
      const centerShiftX = (sourceCanvas.width - img.width * ratio) / 2;
      const centerShiftY = (sourceCanvas.height - img.height * ratio) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.w / ratio;
      canvas.height = cropArea.h / ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, (cropArea.x - centerShiftX) / ratio, (cropArea.y - centerShiftY) / ratio, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        setScreenshot(canvas.toDataURL('image/png'));
        setAnnotations([]);
        setCropArea(null);
        setTool(ToolType.RECT);
      }
    };
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative border-r border-slate-700">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
      
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 gap-6">
        {!screenshot ? (
          <>
            <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-700 group">
              {isCameraOn ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/png"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: "environment", width: 1280, height: 720 }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500 gap-4">
                   <div className="p-6 bg-slate-900/50 rounded-full">
                      <CameraOff size={48} className="opacity-20" />
                   </div>
                   <p className="text-sm font-medium opacity-60">摄像头已关闭</p>
                </div>
              )}

              {/* 右上角开关 */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 group-hover:bg-black/60 transition-colors shadow-lg">
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isCameraOn ? 'text-blue-400' : 'text-white/40'}`}>
                  {isCameraOn ? 'Live' : 'Off'}
                </span>
                <button
                  onClick={toggleCamera}
                  className={`relative w-8 h-4 rounded-full transition-all duration-300 focus:outline-none ${isCameraOn ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isCameraOn ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* 装饰边角 */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none" />
            </div>
            
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <p className="text-white/80 text-base font-medium flex items-center justify-center gap-2">
                 <Sparkles size={16} className="text-blue-400" />
                 准备开始你的探索之旅
               </p>
               <p className="text-white/40 text-xs">捕捉画面，或直接在页面按 <span className="text-white/60 font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl+V</span> 粘贴图片</p>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
             <canvas ref={canvasRef} width={1280} height={720} className="max-w-full max-h-full aspect-video rounded-2xl shadow-2xl bg-black cursor-crosshair touch-none transition-all duration-300" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} />
              {cropArea && tool === ToolType.CROP && !isDrawing && (
                <div className="absolute z-10 flex gap-2" style={{ left: `${(cropArea.x / 1280) * 100}%`, top: `${((cropArea.y + cropArea.h + 10) / 720) * 100}%` }}>
                  <button onClick={applyCrop} className="bg-emerald-500 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"><Check size={20} /></button>
                  <button onClick={() => setCropArea(null)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"><X size={20} /></button>
                </div>
              )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {!screenshot ? (
            <div className="flex gap-2">
              <button onClick={capture} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                <Camera size={18} />捕捉画面
              </button>
              <button onClick={triggerUpload} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg active:scale-95">
                <Upload size={18} />本地文件
              </button>
              <button onClick={triggerPaste} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg active:scale-95">
                <ClipboardPaste size={18} />剪贴板
              </button>
            </div>
          ) : (
            <>
              <button onClick={reset} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors" title="重选"><RefreshCw size={20} /></button>
              <button onClick={undo} disabled={annotations.length === 0} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30" title="撤销"><Undo2 size={20} /></button>
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <button onClick={() => { setTool(ToolType.CROP); setCropArea(null); }} className={`p-2.5 rounded-lg transition-all ${tool === ToolType.CROP ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`} title="裁剪"><Crop size={20} /></button>
              <button onClick={() => setTool(ToolType.RECT)} className={`p-2.5 rounded-lg transition-all ${tool === ToolType.RECT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`} title="矩形"><Square size={20} /></button>
              <button onClick={() => setTool(ToolType.PEN)} className={`p-2.5 rounded-lg transition-all ${tool === ToolType.PEN ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700'}`} title="画笔"><PenTool size={20} /></button>
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg">
                {[2, 4, 8].map(w => (
                  <button key={w} onClick={() => setLineWidth(w)} className={`p-1.5 rounded transition-all ${lineWidth === w ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><div className="rounded-full bg-current" style={{ width: w + 4, height: w + 4 }} /></button>
                ))}
              </div>
              <div className="flex items-center gap-2 px-2">
                {['#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </>
          )}
        </div>
        {screenshot && (
          <button onClick={() => onProcess(canvasRef.current!.toDataURL('image/png'))} disabled={isProcessing} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-full font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Sparkles size={18} />}分析内容
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraCanvas;
