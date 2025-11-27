
import React, { useState, useEffect } from 'react';
import { AdScript, Scene, ProductionConfig, MusicTrack } from '../types';
import { STOCK_MUSIC_LIBRARY } from '../constants';
import { Film, Mic, Clock, Edit2, Save, X, Sparkles, RotateCcw, Loader2, Music, Sliders, Volume2 } from 'lucide-react';

interface ScriptViewProps {
  script: AdScript;
  productionConfig?: ProductionConfig;
  onApprove: () => void;
  onUpdateScene: (scene: Scene) => void;
  onUpdateConfig: (config: ProductionConfig) => void;
  onRegenerateScene: (sceneId: number) => Promise<void>;
  onRegenerateAll: () => Promise<void>;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ 
  script, 
  productionConfig,
  onApprove, 
  onUpdateScene,
  onUpdateConfig,
  onRegenerateScene,
  onRegenerateAll
}) => {
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Scene | null>(null);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<number | null>(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize config if missing (backward compatibility)
  useEffect(() => {
    if (!productionConfig) {
        onUpdateConfig({
            audio: {
                musicTrackId: 'track_corporate',
                musicVolume: 0.3,
                voiceVolume: 1.0,
                duckingEnabled: true
            },
            overlays: {}
        });
    }
  }, [productionConfig, onUpdateConfig]);

  const handleEditClick = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditForm({ ...scene });
  };

  const handleCancelEdit = () => {
    setEditingSceneId(null);
    setEditForm(null);
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onUpdateScene(editForm);
      setEditingSceneId(null);
      setEditForm(null);
    }
  };

  const handleMagicRewrite = async (sceneId: number) => {
    setRegeneratingSceneId(sceneId);
    try {
      await onRegenerateScene(sceneId);
    } finally {
      setRegeneratingSceneId(null);
    }
  };

  const handleRegenerateAllClick = async () => {
    if (confirm("Are you sure? This will discard all current scenes and generate a new script from scratch.")) {
        setIsRegeneratingAll(true);
        try {
            await onRegenerateAll();
        } finally {
            setIsRegeneratingAll(false);
        }
    }
  };

  const handleAudioConfigChange = (key: string, value: any) => {
      if (!productionConfig) return;
      onUpdateConfig({
          ...productionConfig,
          audio: {
              ...productionConfig.audio,
              [key]: value
          }
      });
  };

  const currentTrack = STOCK_MUSIC_LIBRARY.find(t => t.id === productionConfig?.audio?.musicTrackId);

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{script.title}</h2>
          <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium bg-indigo-500/10 px-3 py-1 rounded-full w-fit border border-indigo-500/20">
             <UsersIcon className="w-4 h-4" />
             {script.target_audience}
          </div>
        </div>
        <div className="flex gap-3">
            <button
                onClick={handleRegenerateAllClick}
                disabled={isRegeneratingAll}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
                {isRegeneratingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span className="text-sm font-medium">Regenerate</span>
            </button>
            <button
                onClick={onApprove}
                disabled={isRegeneratingAll}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/20 transition-all flex items-center gap-2 disabled:opacity-50 transform hover:scale-105"
            >
                <Film className="w-5 h-5" />
                <span>Start Production</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Script Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Screenplay</h3>
                <span className="text-xs text-slate-500">{script.scenes.length} Scenes • ~{script.scenes.reduce((a,b)=>a+b.estimated_duration,0)}s Total</span>
            </div>
            
            {script.scenes.map((scene, index) => {
            const isEditing = editingSceneId === scene.id;
            const isRegenerating = regeneratingSceneId === scene.id;

            return (
                <div key={scene.id} className={`bg-slate-800 border ${isEditing ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700'} rounded-xl p-5 hover:border-indigo-500/30 transition-all relative group shadow-sm`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    Scene {index + 1}
                    </span>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Clock className="w-4 h-4" />
                            {isEditing && editForm ? (
                                <input 
                                    type="number" 
                                    value={editForm.estimated_duration}
                                    onChange={(e) => setEditForm({...editForm, estimated_duration: parseInt(e.target.value) || 0})}
                                    className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            ) : (
                                <span>{scene.estimated_duration}s</span>
                            )}
                        </div>
                        
                        {!isEditing && !isRegenerating && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleMagicRewrite(scene.id)}
                                    className="p-1.5 hover:bg-purple-500/20 text-purple-400 rounded transition-colors"
                                    title="AI Rewrite"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleEditClick(scene)}
                                    className="p-1.5 hover:bg-slate-600 text-slate-400 hover:text-white rounded transition-colors"
                                    title="Edit Details"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {isRegenerating ? (
                    <div className="flex flex-col items-center justify-center py-8 text-purple-400 animate-pulse">
                        <Sparkles className="w-8 h-8 mb-2" />
                        <p className="text-sm">Rewriting scene...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Visual Section */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Film className="w-3 h-3" /> Visual Prompt
                            </h4>
                            {isEditing && editForm ? (
                                <textarea
                                    value={editForm.visual_prompt}
                                    onChange={(e) => setEditForm({...editForm, visual_prompt: e.target.value})}
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                                />
                            ) : (
                                <p className="text-slate-300 text-sm leading-relaxed border border-transparent p-1">
                                    {scene.visual_prompt}
                                </p>
                            )}
                        </div>

                        {/* Audio Section */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-pink-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Mic className="w-3 h-3" /> Voiceover Script
                            </h4>
                            {isEditing && editForm ? (
                                <textarea
                                    value={editForm.voiceover_text}
                                    onChange={(e) => setEditForm({...editForm, voiceover_text: e.target.value})}
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg p-3 text-base text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                                />
                            ) : (
                                <p className="text-white text-base font-medium leading-relaxed border border-transparent p-1 italic">
                                    "{scene.voiceover_text}"
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {isEditing && (
                    <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                        <button 
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-3 h-3" /> Cancel
                        </button>
                        <button 
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded shadow transition-all"
                        >
                            <Save className="w-3 h-3" /> Save Changes
                        </button>
                    </div>
                )}
                </div>
            );
            })}
          </div>

          {/* Settings Column */}
          <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-24">
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
                      <Sliders className="w-5 h-5 text-slate-400" />
                      <h3 className="font-bold text-white">Studio Settings</h3>
                  </div>

                  {productionConfig && productionConfig.audio && (
                      <div className="space-y-6">
                          {/* Music Selector */}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                  <Music className="w-4 h-4" /> Background Music
                              </label>
                              <div className="grid grid-cols-1 gap-2">
                                  {STOCK_MUSIC_LIBRARY.map(track => (
                                      <button
                                          key={track.id}
                                          onClick={() => handleAudioConfigChange('musicTrackId', track.id)}
                                          className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                                              productionConfig.audio.musicTrackId === track.id 
                                              ? 'bg-indigo-900/30 border-indigo-500 text-white' 
                                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                          }`}
                                      >
                                          <div className="flex flex-col items-start">
                                              <span className="font-semibold">{track.name}</span>
                                              <span className="text-xs opacity-70">{track.genre} • {track.mood}</span>
                                          </div>
                                          {productionConfig.audio.musicTrackId === track.id && (
                                              <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                                          )}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Mixing Controls */}
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                  <Volume2 className="w-4 h-4" /> Audio Mix
                              </label>
                              
                              <div className="space-y-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                  <div>
                                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                                          <span>Music Volume</span>
                                          <span>{Math.round(productionConfig.audio.musicVolume * 100)}%</span>
                                      </div>
                                      <input 
                                          type="range" 
                                          min="0" max="1" step="0.1" 
                                          value={productionConfig.audio.musicVolume}
                                          onChange={(e) => handleAudioConfigChange('musicVolume', parseFloat(e.target.value))}
                                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                      />
                                  </div>

                                  <div>
                                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                                          <span>Voice Volume</span>
                                          <span>{Math.round(productionConfig.audio.voiceVolume * 100)}%</span>
                                      </div>
                                      <input 
                                          type="range" 
                                          min="0" max="1" step="0.1" 
                                          value={productionConfig.audio.voiceVolume}
                                          onChange={(e) => handleAudioConfigChange('voiceVolume', parseFloat(e.target.value))}
                                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                      />
                                  </div>

                                  <div className="flex items-center justify-between pt-2">
                                      <span className="text-xs text-slate-300 font-medium">Auto-Ducking</span>
                                      <button 
                                          onClick={() => handleAudioConfigChange('duckingEnabled', !productionConfig.audio.duckingEnabled)}
                                          className={`w-10 h-5 rounded-full relative transition-colors ${productionConfig.audio.duckingEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                      >
                                          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${productionConfig.audio.duckingEnabled ? 'translate-x-5' : ''}`}></div>
                                      </button>
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-tight">
                                      Automatically lowers music volume when voiceover is speaking.
                                  </p>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

// Helper icon
const UsersIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
