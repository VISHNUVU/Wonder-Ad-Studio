import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Scene, AssetStatus, ProductionConfig } from '../types';
import { Play, Pause, RotateCcw, Download, Repeat, FileText, X } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface AdPlayerProps {
  scenes: Scene[];
  assets: AssetStatus[];
  productionConfig?: ProductionConfig;
  onClose?: () => void;
  initialSceneIndex?: number;
}

export const AdPlayer: React.FC<AdPlayerProps> = ({ scenes, assets, productionConfig, onClose, initialSceneIndex = 0 }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(initialSceneIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // New features
  const [isLooping, setIsLooping] = useState(false);
  const [showScript, setShowScript] = useState(false);
  
  // Timeline State
  const [playedPercentage, setPlayedPercentage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const seekOnLoadRef = useRef<number | null>(null);

  const currentScene = scenes[currentSceneIndex];
  const currentAsset = assets.find(a => a.sceneId === currentScene.id);

  // Derived Metrics
  const totalDuration = useMemo(() => 
    scenes.reduce((acc, s) => acc + s.estimated_duration, 0), 
  [scenes]);

  const sceneStartTimes = useMemo(() => {
    let acc = 0;
    return scenes.map(s => {
      const current = acc;
      acc += s.estimated_duration;
      return current;
    });
  }, [scenes]);

  // Sync initial index prop
  useEffect(() => {
    if (initialSceneIndex >= 0 && initialSceneIndex < scenes.length) {
      setCurrentSceneIndex(initialSceneIndex);
      setPlayedPercentage(0);
      setIsPlaying(false);
      setIsFinished(false);
    }
  }, [initialSceneIndex, scenes.length]);

  // Load assets when scene changes
  useEffect(() => {
    if (videoRef.current && audioRef.current && currentAsset?.videoUrl && currentAsset?.audioUrl) {
        // Only reload if source actually changes (avoid flickering on re-renders)
        const vidSrc = currentAsset.videoUrl;
        const audSrc = currentAsset.audioUrl;
        
        if (videoRef.current.getAttribute('src') !== vidSrc) {
           videoRef.current.src = vidSrc;
           videoRef.current.load();
        }
        if (audioRef.current.getAttribute('src') !== audSrc) {
           audioRef.current.src = audSrc;
           audioRef.current.load();
        }
    }
  }, [currentSceneIndex, currentAsset]);

  // Apply volume settings
  useEffect(() => {
    if (productionConfig?.audio && audioRef.current) {
        audioRef.current.volume = productionConfig.audio.voiceVolume;
    }
  }, [productionConfig, currentSceneIndex]);

  // Handle seek after load (for cross-scene scrubbing)
  const handleLoadedData = () => {
      if (seekOnLoadRef.current !== null) {
          const seekTime = Math.min(seekOnLoadRef.current, videoRef.current?.duration || Infinity);
          
          if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
             videoRef.current.currentTime = seekTime;
          }
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
             audioRef.current.currentTime = seekTime;
          }
          
          if (isPlaying) {
              videoRef.current?.play().catch(() => {});
              audioRef.current?.play().catch(() => {});
          }
          
          seekOnLoadRef.current = null;
      }
  };

  const handlePlay = () => {
    if (isFinished) {
      setCurrentSceneIndex(0);
      setIsFinished(false);
      setPlayedPercentage(0);
      setTimeout(() => {
        videoRef.current?.play();
        audioRef.current?.play();
        setIsPlaying(true);
      }, 100);
      return;
    }

    if (videoRef.current && audioRef.current) {
      videoRef.current.play();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetScene = () => {
    if (videoRef.current) videoRef.current.currentTime = 0;
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (isPlaying) {
        videoRef.current?.play();
        audioRef.current?.play();
    }
  };

  const handleSceneEnd = () => {
    if (isLooping) {
        resetScene();
        return;
    }

    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
      // Autoplay next
      setTimeout(() => {
        if (videoRef.current && audioRef.current) {
          videoRef.current.play();
          audioRef.current.play();
        }
      }, 200);
    } else {
      setIsPlaying(false);
      setIsFinished(true);
      setPlayedPercentage(100);
    }
  };

  // Sync loop: Update global progress
  const handleTimeUpdate = () => {
    if (isDragging || !videoRef.current) return;
    
    const currentSceneStartTime = sceneStartTimes[currentSceneIndex];
    const currentVideoTime = videoRef.current.currentTime;
    
    // Calculate global time
    const globalTime = currentSceneStartTime + currentVideoTime;
    const percent = Math.min((globalTime / totalDuration) * 100, 100);
    
    setPlayedPercentage(percent);
  };

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;

    const onAudioEnded = () => {
      handleSceneEnd();
    };

    if (audio) {
      audio.addEventListener('ended', onAudioEnded);
    }
    
    if (video) {
        video.loop = true; 
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadeddata', handleLoadedData);
    }

    return () => {
      if (audio) audio.removeEventListener('ended', onAudioEnded);
      if (video) {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('loadeddata', handleLoadedData);
      }
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneIndex, isDragging, sceneStartTimes, totalDuration, isLooping]);


  // Scrubbing Logic
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Don't fully pause state, just pause video elements to prevent jitter while dragging
    videoRef.current?.pause();
    audioRef.current?.pause();

    const processScrub = (clientX: number, commit: boolean) => {
         const rect = timelineRef.current?.getBoundingClientRect();
         if(!rect) return;
         
         const x = clientX - rect.left;
         const p = Math.max(0, Math.min(1, x / rect.width));
         
         setPlayedPercentage(p * 100);
         
         const targetGlobalTime = p * totalDuration;
         
         // Find target scene
         let targetIndex = 0;
         for(let i = 0; i < sceneStartTimes.length; i++) {
             // If this scene starts before the target time, it might be the one
             if (targetGlobalTime >= sceneStartTimes[i]) {
                 targetIndex = i;
             } else {
                 break;
             }
         }
         
         const offset = targetGlobalTime - sceneStartTimes[targetIndex];
         
         if (targetIndex === currentSceneIndex) {
             // If same scene, update immediately for live preview
             if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
                videoRef.current.currentTime = offset;
             }
             if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
                audioRef.current.currentTime = offset;
             }
         } else if (commit || !isDragging) {
             // If different scene, switch
             seekOnLoadRef.current = offset;
             setCurrentSceneIndex(targetIndex);
             setIsFinished(false);
         }
    };

    // Initial click
    processScrub(e.clientX, true); // true to allow immediate jump on click

    const onMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        processScrub(ev.clientX, false);
    };

    const onMouseUp = (ev: MouseEvent) => {
        processScrub(ev.clientX, true);
        setIsDragging(false);
        // Resume if we were playing
        if (isPlaying) {
            videoRef.current?.play();
            audioRef.current?.play();
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const hasMedia = currentAsset?.videoUrl && currentAsset?.audioUrl;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      <ExportModal 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        scenes={scenes}
        assets={assets}
        projectTitle="My Ad"
      />

      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700 mb-6 group">
        
        {/* Close Button (for preview mode) */}
        {onClose && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            >
                <X className="w-5 h-5" />
            </button>
        )}

        {/* Video or Placeholder */}
        {currentAsset?.videoUrl ? (
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
             <div className="mb-4 p-4 bg-slate-800 rounded-full">
                <Download className="w-8 h-8 opacity-50" />
             </div>
             <p>Asset Pending...</p>
             <p className="text-xs mt-2 opacity-50">Video not generated for this scene yet.</p>
          </div>
        )}
        
        {/* Audio Element */}
        <audio ref={audioRef} />

        {/* Script Overlay */}
        {showScript && (
          <div className="absolute inset-x-0 bottom-0 top-0 bg-black/60 backdrop-blur-sm p-8 flex flex-col justify-center items-center text-center z-20 animate-in fade-in duration-200">
            <h4 className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-2">Visual Prompt</h4>
            <p className="text-white text-lg mb-8 max-w-2xl font-light">{currentScene.visual_prompt}</p>
            
            <h4 className="text-pink-300 text-sm font-bold uppercase tracking-wider mb-2">Voiceover</h4>
            <p className="text-white text-2xl font-serif italic max-w-2xl">"{currentScene.voiceover_text}"</p>
          </div>
        )}

        {/* Controls Overlay */}
        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} ${showScript ? 'opacity-100' : ''}`}>
           {hasMedia ? (
               <>
                {!isPlaying && !isFinished && (
                    <button onClick={handlePlay} className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-6 rounded-full transition-transform transform hover:scale-110">
                    <Play className="w-12 h-12 text-white fill-current" />
                    </button>
                )}
                {isPlaying && (
                    <button onClick={handlePause} className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-6 rounded-full transition-transform transform hover:scale-110">
                    <Pause className="w-12 h-12 text-white fill-current" />
                    </button>
                )}
                {isFinished && (
                    <button onClick={handlePlay} className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-6 rounded-full transition-transform transform hover:scale-110">
                    <RotateCcw className="w-12 h-12 text-white" />
                    </button>
                )}
               </>
           ) : null}
        </div>
        
        {/* Scene Badge */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded text-white text-xs font-mono">
          SCENE {currentSceneIndex + 1} / {scenes.length}
        </div>
      </div>

      <div className="w-full bg-slate-800 p-6 rounded-xl border border-slate-700 select-none">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-4">
               <div>
                    <h3 className="text-white font-bold text-lg">Ad Preview</h3>
                    <p className="text-slate-400 text-sm truncate max-w-[300px]">
                        {currentScene.visual_prompt}
                    </p>
               </div>
               
               {/* Player Controls */}
               <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setIsLooping(!isLooping)}
                        className={`p-2 rounded-md transition-all ${isLooping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        title="Loop Current Scene"
                    >
                        <Repeat className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setShowScript(!showScript)}
                        className={`p-2 rounded-md transition-all ${showScript ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        title="Toggle Script Overlay"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
               </div>
           </div>
           
           {!onClose && (
             <button 
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-lg transition-colors"
             >
                <Download className="w-4 h-4" />
                Export
             </button>
           )}
        </div>

        {/* Scrubbable Timeline */}
        <div 
           ref={timelineRef}
           className="relative h-6 py-2 cursor-pointer group"
           onMouseDown={handleTimelineMouseDown}
        >
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-700 rounded-full overflow-hidden">
                {/* Scene dividers */}
                {sceneStartTimes.map((start, i) => i > 0 && (
                    <div 
                        key={i} 
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900/50 z-10" 
                        style={{ left: `${(start / totalDuration) * 100}%` }} 
                    />
                ))}
                
                {/* Progress Bar */}
                <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                    style={{ width: `${playedPercentage}%` }} 
                />
            </div>
            
            {/* Thumb Handle */}
            <div 
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-indigo-600 transition-transform ${isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'}`}
                style={{ left: `${playedPercentage}%`, transform: 'translate(-50%, -50%)' }}
            />
        </div>
        
        {/* Scene Labels / Quick Jump */}
        <div className="flex gap-1 mt-2">
           {scenes.map((scene, idx) => (
             <div 
                key={scene.id} 
                onClick={() => {
                  setCurrentSceneIndex(idx);
                  seekOnLoadRef.current = 0; // Reset to start of scene
                  setIsFinished(false);
                  setIsPlaying(false);
                }}
                className={`flex-1 text-center py-1 rounded cursor-pointer transition-colors text-[10px] font-mono truncate px-1 ${
                  idx === currentSceneIndex ? 'text-white font-bold bg-slate-700' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={scene.visual_prompt}
             >
                SCENE {idx + 1}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};