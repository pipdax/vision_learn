
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Square, PenTool, Eraser, Sparkles, Undo2, Circle, Upload, ClipboardPaste, Crop, Check, X } from 'lucide-react';
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
  const [tool, setTool] = useState<ToolType>(ToolType.RECT);
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropArea, setCropArea] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setScreenshot(imageSrc);
      setAnnotations([]);
      setCropArea(null);
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setScreenshot(result);
        setAnnotations([]);
        setCropArea(null);
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
            };
            reader.readAsDataURL(blob);
            foundImage = true;
            return;
          }
        }
      }
      if (!foundImage) {
        alert("剪贴板中没有发现图片数据。请先截图或复制图片。");
      }
    } catch (err: any) {
      console.error('Failed to read clipboard:', err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.message.includes('permissions policy')) {
        alert("由于浏览器安全策略限制，无法直接读取剪贴板。请直接在页面上按 Ctrl+V (或 Cmd+V) 进行粘贴。");
      } else {
        alert("无法读取剪贴板。请尝试手动使用 Ctrl+V 粘贴。");
      }
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
      
      // Draw previous annotations
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
            // Shade outer area
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, start.y);
            ctx.fillRect(0, end.y, canvas.width, canvas.height - end.y);
            ctx.fillRect(0, start.y, start.x, end.y - start.y);
            ctx.fillRect(end.x, start.y, canvas.width - end.x, end.y - start.y);
        }
      });
      
      // Draw confirmed crop area if any (static)
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
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
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
      if (tool === ToolType.RECT || tool === ToolType.CROP) {
        return { ...prev, points: [prev.points[0], coords] };
      }
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
        if (w > 10 && h > 10) {
          setCropArea({ x, y, w, h });
        }
      } else {
        setAnnotations(prev => [...prev, currentAnnotation]);
      }
    }
    setCurrentAnnotation(null);
    setIsDrawing(false);
  };

  const applyCrop = () => {
    if (!cropArea || !screenshot) return;
    const canvas = document.createElement('canvas');
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;

    // We need to calculate the actual image area to crop from the original source pixels
    const img = new Image();
    img.src = screenshot;
    img.onload = () => {
      const hRatio = sourceCanvas.width / img.width;
      const vRatio = sourceCanvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (sourceCanvas.width - img.width * ratio) / 2;
      const centerShiftY = (sourceCanvas.height - img.height * ratio) / 2;

      // Map canvas cropArea back to original image coordinates
      const sourceX = (cropArea.x - centerShiftX) / ratio;
      const sourceY = (cropArea.y - centerShiftY) / ratio;
      const sourceW = cropArea.w / ratio;
      const sourceH = cropArea.h / ratio;

      canvas.width = sourceW;
      canvas.height = sourceH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        setScreenshot(canvas.toDataURL('image/png'));
        setAnnotations([]);
        setCropArea(null);
        setTool(ToolType.RECT);
      }
    };
  };

  const handleProcess = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onProcess(canvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative border-r border-slate-700">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />
      
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 gap-6">
        {!screenshot ? (
          <>
            <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-700 group">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/png"
                className="w-full h-full object-cover transition-opacity duration-500"
                videoConstraints={{ facingMode: "environment", width: 1280, height: 720 }}
              />
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg pointer-events-none" />
            </div>
            
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <p className="text-white/80 text-base font-medium flex items-center justify-center gap-2">
                 <Sparkles size={16} className="text-blue-400" />
                 准备开始你的探索之旅
               </p>
               <div className="flex flex-col items-center gap-1">
                 <p className="text-white/40 text-xs">通过下方按钮捕捉画面，或直接在页面按 <span className="text-white/60 font-mono bg-white/10 px-1.5 py-0.5 rounded">Ctrl+V</span> 粘贴图片</p>
               </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
             <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="max-w-full max-h-full aspect-video rounded-2xl shadow-2xl bg-black cursor-crosshair touch-none transition-all duration-300"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {cropArea && tool === ToolType.CROP && !isDrawing && (
                <div 
                  className="absolute z-10 flex gap-2"
                  style={{ 
                    left: `${(cropArea.x / 1280) * 100}%`, 
                    top: `${((cropArea.y + cropArea.h + 10) / 720) * 100}%` 
                  }}
                >
                  <button 
                    onClick={applyCrop}
                    className="bg-emerald-500 text-white p-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
                    title="确定裁剪"
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => setCropArea(null)}
                    className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    title="取消"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {!screenshot ? (
            <div className="flex gap-2">
              <button
                onClick={capture}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
              >
                <Camera size={18} />
                捕捉画面
              </button>
              <button
                onClick={triggerUpload}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg active:scale-95"
              >
                <Upload size={18} />
                本地文件
              </button>
              <button
                onClick={triggerPaste}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg active:scale-95"
              >
                <ClipboardPaste size={18} />
                剪贴板
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={reset}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                title="重新选择图片"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={undo}
                disabled={annotations.length === 0}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                title="撤销 (Ctrl+Z)"
              >
                <Undo2 size={20} />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-2" />
              
              <button
                onClick={() => { setTool(ToolType.CROP); setCropArea(null); }}
                className={`p-2.5 rounded-lg transition-all ${tool === ToolType.CROP ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-700'}`}
                title="裁剪工具"
              >
                <Crop size={20} />
              </button>
              
              <button
                onClick={() => setTool(ToolType.RECT)}
                className={`p-2.5 rounded-lg transition-all ${tool === ToolType.RECT ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-700'}`}
                title="矩形标注"
              >
                <Square size={20} />
              </button>
              <button
                onClick={() => setTool(ToolType.PEN)}
                className={`p-2.5 rounded-lg transition-all ${tool === ToolType.PEN ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-700'}`}
                title="画笔标注"
              >
                <PenTool size={20} />
              </button>
              
              <div className="w-px h-6 bg-slate-700 mx-2" />
              
              <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg">
                {[2, 4, 8].map(w => (
                  <button
                    key={w}
                    onClick={() => setLineWidth(w)}
                    className={`p-1.5 rounded transition-all ${lineWidth === w ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <div 
                      className="rounded-full bg-current" 
                      style={{ width: w + 4, height: w + 4 }} 
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 px-2">
                {['#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {screenshot && (
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
                <Sparkles size={18} />
            )}
            分析内容
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraCanvas;
