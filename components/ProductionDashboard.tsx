import React, { useEffect } from 'react';
import { AssetStatus, Scene } from '../types';
import { Loader2, CheckCircle2, AlertCircle, Video, Music, RefreshCw, Play } from 'lucide-react';

interface ProductionDashboardProps {
  scenes: Scene[];
  assets: AssetStatus[];
  onComplete: () => void;
  onRetry: (sceneId: number, type: 'video' | 'audio') => void;
  onPreview?: (sceneId: number) => void;
  title?: string;
  hideProgress?: boolean;
}

export const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ 
  scenes, 
  assets, 
  onComplete, 
  onRetry,
  onPreview,
  title = "Production in Progress",
  hideProgress = false
}) => {
  const isAllComplete = assets.every(
    a => a.videoStatus === 'completed' && a.audioStatus === 'completed'
  );

  useEffect(() => {
    if (isAllComplete) {
      onComplete();
    }
  }, [isAllComplete, onComplete]);

  const getStatusDisplay = (status: string, type: 'video' | 'audio', sceneId: number, error?: string) => {
    switch (status) {
      case 'pending': 
        return <div className="w-5 h-5 rounded-full border-2 border-slate-600" title="Pending" />;
      case 'generating': 
        return (
          <div title="Generating...">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        );
      case 'completed': 
        return (
          <div className="flex items-center gap-2 group">
            <div title="Completed">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <button 
              onClick={() => onRetry(sceneId, type)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-indigo-400 transition-all"
              title={`Regenerate ${type}`}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        );
      case 'error': 
        return (
          <div className="flex items-center gap-2">
            <div className="group relative flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 cursor-help" />
              {error && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-900/90 text-red-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-red-700">
                  {error}
                </div>
              )}
            </div>
            <button 
              onClick={() => onRetry(sceneId, type)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wide bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        );
      default: 
        return null;
    }
  };

  const completedCount = assets.reduce((acc, curr) => {
    let count = 0;
    if (curr.videoStatus === 'completed') count++;
    if (curr.audioStatus === 'completed') count++;
    return acc + count;
  }, 0);
  
  const totalAssets = scenes.length * 2;
  const progress = Math.round((completedCount / totalAssets) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!hideProgress && (
        <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-slate-400">Generating video clips with Veo and voiceovers with Gemini...</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl mb-8">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Total Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-3">
        {scenes.map((scene) => {
          const asset = assets.find(a => a.sceneId === scene.id);
          if (!asset) return null;
          
          const canPreview = asset.videoStatus === 'completed';

          return (
            <div key={scene.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">
                  SCENE {scene.id}
                </span>
                <span className="text-slate-300 text-sm truncate max-w-[200px]" title={scene.visual_prompt}>
                  {scene.visual_prompt}
                </span>
                
                {canPreview && onPreview && (
                    <button 
                        onClick={() => onPreview(scene.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                    >
                        <Play className="w-3 h-3 fill-current" /> Preview
                    </button>
                )}
              </div>

              <div className="flex items-center gap-6 shrink-0">
                {/* Video Status */}
                <div className="flex items-center gap-3 w-32 justify-end">
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Video className="w-3 h-3" />
                        <span>Video</span>
                      </div>
                      <div className="h-6 flex items-center">
                         {getStatusDisplay(asset.videoStatus, 'video', scene.id, asset.error)}
                      </div>
                   </div>
                </div>

                <div className="w-px h-8 bg-slate-700 mx-2 hidden md:block"></div>

                {/* Audio Status */}
                <div className="flex items-center gap-3 w-32 justify-end">
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Music className="w-3 h-3" />
                        <span>Audio</span>
                      </div>
                      <div className="h-6 flex items-center">
                        {getStatusDisplay(asset.audioStatus, 'audio', scene.id, asset.error)}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};