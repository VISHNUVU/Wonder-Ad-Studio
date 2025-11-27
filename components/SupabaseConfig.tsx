
import React, { useState, useEffect } from 'react';
import { Database, Save, AlertCircle, Copy, Check, WifiOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_SETUP_SQL } from '../services/supabase';

interface SupabaseConfigProps {
  onReady: () => void;
  onSkip: () => void;
}

export const SupabaseConfig: React.FC<SupabaseConfigProps> = ({ onReady, onSkip }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // If explicitly set to local mode, skip
    if (localStorage.getItem('app_mode') === 'local') {
        onSkip();
        return;
    }

    // If configured, ready
    if (isSupabaseConfigured()) {
      onReady();
    } else {
      const storedUrl = localStorage.getItem('supabase_url');
      if (!storedUrl) {
         setIsVisible(true);
         // Default to Form view for faster setup
         setShowInstructions(false);
      } else {
         onReady();
      }
    }
  }, [onReady, onSkip]);

  const handleSave = async () => {
    setError('');
    if (!url || !key) {
      setError('Both URL and Key are required');
      return;
    }

    setIsTesting(true);

    try {
      // 1. Test Connection
      // We create a temporary client just to verify the credentials work
      const tempClient = createClient(url, key);
      
      // Try a simple health check or auth check
      // We check session. If URL/Key is invalid, this typically throws or returns error
      const { error: connError } = await tempClient.auth.getSession();
      
      if (connError && connError.message !== 'Auth session missing!') {
         // Some auth errors are fine (like missing session), but network/key errors are not
         console.warn("Connection warning:", connError);
      }
      
      // 2. Save and Reload
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      localStorage.setItem('app_mode', 'supabase');
      
      // Reload is necessary to re-initialize the global supabase service with new env vars
      window.location.reload(); 
    } catch (e: any) {
      console.error(e);
      setError('Connection failed. Please check your URL and Anon Key.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSkip = () => {
      localStorage.setItem('app_mode', 'local');
      setIsVisible(false);
      onSkip();
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 my-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-4 border border-green-500/30">
            <Database className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">One-Time Setup</h2>
          <p className="text-slate-400 text-sm max-w-md">
            Connect your Supabase database to enable cloud storage, authentication, and team features.
          </p>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1">
            <button 
                onClick={() => setShowInstructions(false)}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${!showInstructions ? 'border-green-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                1. Connect
            </button>
            <button 
                onClick={() => setShowInstructions(true)}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${showInstructions ? 'border-green-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                2. Database Config (SQL)
            </button>
        </div>

        {!showInstructions ? (
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
                    <input 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors"
                    placeholder="https://your-project.supabase.co"
                    disabled={isTesting}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon API Key</label>
                    <input 
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                    disabled={isTesting}
                    />
                </div>

                <button 
                    onClick={handleSave}
                    disabled={isTesting}
                    className="w-full mt-2 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/20 disabled:opacity-70 disabled:cursor-wait"
                >
                    {isTesting ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>Save & Connect</span>
                        </>
                    )}
                </button>
                
                <div className="flex items-center gap-4 my-4">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="text-xs text-slate-500">OR</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                </div>

                <button 
                    onClick={handleSkip}
                    disabled={isTesting}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <WifiOff className="w-4 h-4" />
                    Continue in Offline Mode
                </button>
            </div>
        ) : (
            <div className="space-y-4">
                <p className="text-sm text-slate-400">
                    Run this SQL in your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-green-400 hover:underline">Supabase SQL Editor</a> to create the required tables and policies.
                </p>
                
                <div className="relative group">
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto h-64 custom-scrollbar font-mono">
                        {SUPABASE_SETUP_SQL}
                    </pre>
                    <button 
                        onClick={copySQL}
                        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                        title="Copy SQL"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                     <h4 className="text-yellow-500 font-bold text-xs uppercase mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Important: Storage Buckets
                     </h4>
                     <ul className="text-xs text-yellow-200 list-disc list-inside space-y-1">
                        <li>Go to <strong>Storage</strong> in your dashboard.</li>
                        <li>Create a new bucket named <strong>assets</strong>.</li>
                        <li><strong>Make it Public</strong> (Toggle "Public Bucket" to ON).</li>
                     </ul>
                </div>
                
                <button 
                   onClick={() => setShowInstructions(false)}
                   className="w-full py-2 text-slate-400 hover:text-white text-sm"
                >
                   Back to Connection Settings
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
