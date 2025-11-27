import React, { useEffect, useState } from 'react';
import { Key } from 'lucide-react';

interface ApiKeySelectorProps {
  onReady: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onReady }) => {
  const [hasKey, setHasKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
      if (selected) {
        onReady();
      }
    } else {
      // If the API isn't available (e.g. not in the specific environment), we assume env var is set manually for dev
      // But for Veo compliance we strictly follow instructions.
      // If window.aistudio is missing, we might be in a dev env without the extension/wrapper.
      // We'll assume ready if we have a process.env.API_KEY, but show warning if strict Veo is needed.
      if (process.env.API_KEY) {
          setHasKey(true);
          onReady();
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after interaction
        setHasKey(true);
        onReady();
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  if (isLoading) return null;
  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
        <div className="bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">API Key Required</h2>
        <p className="text-slate-400 mb-6">
          To generate high-quality video with Veo, you must select a paid API key from a Google Cloud Project.
        </p>
        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Select API Key
        </button>
        <div className="mt-4 text-xs text-slate-500">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noreferrer"
            className="underline hover:text-indigo-400"
          >
            Learn about Gemini API billing
          </a>
        </div>
      </div>
    </div>
  );
};
