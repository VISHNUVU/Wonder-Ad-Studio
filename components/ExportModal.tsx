import React, { useState } from 'react';
import { Scene, AssetStatus } from '../types';
import { exportService } from '../services/export';
import { Download, Film, FileVideo, X, Loader2, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  assets: AssetStatus[];
  projectTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, onClose, scenes, assets, projectTitle 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'compiled' | 'individual'>('compiled');

  if (!isOpen) return null;

  const handleDownloadCompiled = async () => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const blob = await exportService.stitchAd(scenes, assets, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_full.webm`;
      exportService.downloadUrl(url, filename);
      onClose();
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to compile video. Please try downloading individual assets.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAsset = (url: string | undefined, filename: string) => {
    if (url) exportService.downloadUrl(url, filename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            Export Production
          </h2>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isProcessing ? (
            <div className="text-center py-12">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8" 
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-out"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                  {progress}%
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Rendering Final Cut...</h3>
              <p className="text-slate-400 text-sm">Stitching scenes and mixing audio. Please do not close this window.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex bg-slate-800 p-1 rounded-lg mb-6">
                <button
                  onClick={() => setActiveTab('compiled')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'compiled' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Video
                </button>
                <button
                  onClick={() => setActiveTab('individual')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'individual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Individual Scenes
                </button>
              </div>

              {activeTab === 'compiled' && (
                <div className="text-center py-8">
                  <div className="bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-8 mb-6">
                    <Film className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Merged Video (WebM)</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Download a single video file with all scenes stitched together sequentially.
                      Best for quick previews and sharing.
                    </p>
                    <button 
                      onClick={handleDownloadCompiled}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-105"
                    >
                      Render & Download
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'individual' && (
                <div className="space-y-3">
                  {scenes.map((scene, idx) => {
                    const asset = assets.find(a => a.sceneId === scene.id);
                    const isReady = asset?.videoStatus === 'completed' && asset?.audioStatus === 'completed';
                    
                    return (
                      <div key={scene.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">
                            SCENE {idx + 1}
                          </span>
                          <span className="text-sm text-slate-300 truncate max-w-[200px]" title={scene.visual_prompt}>
                            {scene.visual_prompt}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                           <button
                             disabled={!isReady}
                             onClick={() => handleDownloadAsset(asset?.videoUrl, `scene_${idx+1}_video.mp4`)}
                             className="p-2 bg-slate-700 hover:bg-indigo-600 rounded text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Download Video Only"
                           >
                             <FileVideo className="w-4 h-4" />
                           </button>
                           <button
                             disabled={!isReady}
                             onClick={() => handleDownloadAsset(asset?.audioUrl, `scene_${idx+1}_audio.wav`)}
                             className="p-2 bg-slate-700 hover:bg-pink-600 rounded text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Download Audio Only"
                           >
                             <Loader2 className="w-4 h-4" /> 
                             {/* Using loader as wave icon placeholder or just Music icon */}
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
