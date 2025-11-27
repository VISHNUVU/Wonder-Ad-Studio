
import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Briefcase, ChevronDown, Mic2, Rocket, Lightbulb, Smile, Film, LayoutTemplate } from 'lucide-react';
import { Brand } from '../types';
import { AD_TEMPLATES } from '../constants';

interface CreateAdFormProps {
  onSubmit: (productName: string, description: string, brand?: Brand, voiceoverStyle?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  brands: Brand[];
}

export const CreateAdForm: React.FC<CreateAdFormProps> = ({ onSubmit, onCancel, isLoading, brands }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceoverStyle, setVoiceoverStyle] = useState('professional');
  const [progress, setProgress] = useState(0);

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  // Simulated progress for better UX
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      setProgress(0);
      // Simulate progress over ~10-15 seconds (typical LLM gen time for script)
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 98) return 98; // Cap until actually done
          
          // Decaying increment to simulate work getting harder/finishing up
          const remaining = 100 - prev;
          // Faster at start, slower at end
          const jump = Math.max(0.2, remaining / 30); 
          return prev + jump;
        });
      }, 200);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const getLoadingText = (p: number) => {
    if (p < 25) return "Analyzing brand identity...";
    if (p < 50) return "Brainstorming creative concepts...";
    if (p < 75) return "Drafting screenplay & visual cues...";
    return "Finalizing production script...";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName && description) {
      onSubmit(productName, description, selectedBrand, voiceoverStyle);
    }
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const prodName = e.target.value;
     if (prodName === 'new') {
        setProductName('');
     } else {
        setProductName(prodName);
     }
  };

  const applyTemplate = (template: typeof AD_TEMPLATES[0]) => {
    let desc = template.defaultDescription;
    // Basic replacements if we have data
    if (productName) desc = desc.replace('[Product Name]', productName);
    if (selectedBrand) desc = desc.replace('[Brand Name]', selectedBrand.name);
    
    setDescription(desc);
    setVoiceoverStyle(template.defaultVoiceover);
  };

  const getIcon = (name: string) => {
      switch(name) {
          case 'Rocket': return <Rocket className="w-5 h-5" />;
          case 'Lightbulb': return <Lightbulb className="w-5 h-5" />;
          case 'Smile': return <Smile className="w-5 h-5" />;
          case 'Film': return <Film className="w-5 h-5" />;
          default: return <Sparkles className="w-5 h-5" />;
      }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <button 
        onClick={onCancel}
        disabled={isLoading}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4">
          New Production
        </h1>
        <p className="text-slate-400 text-lg">
          Create full 60-second video commercials with AI. <br/> Scripted, visualized, and voiced by Gemini & Veo.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Brand Selection */}
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
             <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Select Brand (Optional)
             </label>
             <div className="relative">
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={isLoading}
                >
                   <option value="">No Brand - Generic Project</option>
                   {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                   ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
             </div>
             {selectedBrand && (
                 <div className="mt-3 text-xs text-slate-400">
                    Using brand identity: <span className="text-white font-medium">{selectedBrand.name}</span> • Audience: <span className="text-white">{selectedBrand.targetAudience.substring(0, 30)}...</span>
                 </div>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Product / Campaign Name</label>
            {selectedBrand && selectedBrand.products.length > 0 ? (
                <div className="flex flex-col gap-2">
                    <select
                        onChange={handleProductSelect}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        disabled={isLoading}
                        defaultValue=""
                    >
                        <option value="" disabled>Select a product...</option>
                        {selectedBrand.products.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                        <option value="new">+ Custom / New Product</option>
                    </select>
                    {/* Fallback input if they want to type custom name or edit */}
                    <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="Or type product name..."
                        disabled={isLoading}
                    />
                </div>
            ) : (
                <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g., 'Nebula Energy Drink'"
                    disabled={isLoading}
                />
            )}
          </div>

          {/* Templates Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-purple-400" />
                Kickstart with a Template
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AD_TEMPLATES.map((template) => (
                    <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        disabled={isLoading}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-indigo-500 hover:bg-slate-800 transition-all group text-center h-full"
                    >
                        <div className="mb-2 p-2 bg-slate-800 rounded-full group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors text-slate-400">
                            {getIcon(template.iconName)}
                        </div>
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{template.label}</span>
                    </button>
                ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Goal & Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                  placeholder={selectedBrand 
                      ? `Describe this specific campaign for ${selectedBrand.name}...` 
                      : "Describe what you want to sell and the vibe (e.g., 'High energy, cyberpunk aesthetic, targeting gamers...')"}
                  disabled={isLoading}
                />
             </div>
             
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Mic2 className="w-4 h-4 text-pink-400" />
                    Voiceover Style
                </label>
                <div className="relative">
                    <select
                        value={voiceoverStyle}
                        onChange={(e) => setVoiceoverStyle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        disabled={isLoading}
                    >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly & Conversational</option>
                        <option value="energetic">Energetic & Hype</option>
                        <option value="calm">Calm & Soothing</option>
                        <option value="dramatic">Dramatic & Cinematic</option>
                        <option value="humorous">Humorous & Witty</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
             </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !productName || !description}
            className={`w-full rounded-xl font-bold text-lg transition-all overflow-hidden ${
              isLoading || !productName || !description
                ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg hover:shadow-indigo-500/25 transform hover:scale-[1.01]'
            }`}
          >
            <div className="py-4 px-6 relative">
              {isLoading ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                      <span className="text-indigo-300 animate-pulse text-sm md:text-base font-medium">
                        {getLoadingText(progress)}
                      </span>
                  </div>
                  <div className="w-full max-w-sm h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                         className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out" 
                         style={{ width: `${progress}%` }} 
                      />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Ad Concept</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </div>
              )}
            </div>
          </button>
        </form>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-slate-500">
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <strong className="block text-slate-300 mb-1">Gemini 3 Pro</strong>
          Writes the screenplay
        </div>
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <strong className="block text-slate-300 mb-1">Veo 3.1</strong>
          Directs the video
        </div>
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <strong className="block text-slate-300 mb-1">Gemini Flash TTS</strong>
          Records the voiceover
        </div>
      </div>
    </div>
  );
};
