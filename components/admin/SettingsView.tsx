
import React, { useState, useRef, useEffect } from 'react';
import { Database, Save, Copy, Check, AlertCircle, Loader2, Key } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_SETUP_SQL } from '../../services/supabase';
import { adminService } from '../../services/admin';

interface SettingsViewProps {
  initialSection?: 'CONNECTION' | 'SCHEMA';
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export const SettingsView: React.FC<SettingsViewProps> = ({ initialSection }) => {
  const schemaRef = useRef<HTMLDivElement>(null);
  
  // Settings State
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [dbKey, setDbKey] = useState(localStorage.getItem('supabase_key') || '');
  const [googleKey, setGoogleKey] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Connection Test State
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('idle');
  const [connError, setConnError] = useState('');

  useEffect(() => {
    // Load stored google key (masked)
    const loadKey = async () => {
        const key = await adminService.getSystemSetting('google_api_key');
        if (key) setGoogleKey('**********************');
    };
    loadKey();

    // Scroll to schema if requested
    if (initialSection === 'SCHEMA') {
        setTimeout(() => {
            schemaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
    }
  }, [initialSection]);

  const handleSaveSettings = async () => {
      setConnStatus('testing');
      setConnError('');
      
      const cleanUrl = dbUrl.trim();
      const cleanKey = dbKey.trim();

      if (!cleanUrl || !cleanKey) {
          setConnError('URL and Key are required');
          setConnStatus('error');
          return;
      }

      try {
          // 1. Verify Connection
          const tempClient = createClient(cleanUrl, cleanKey);
          await tempClient.auth.getSession();
          
          setConnStatus('success');

          // 2. Save
          localStorage.setItem('supabase_url', cleanUrl);
          localStorage.setItem('supabase_key', cleanKey);
          localStorage.setItem('app_mode', 'supabase');

          // 3. Reload after short delay
          setTimeout(() => {
              window.location.reload();
          }, 1500);

      } catch (e: any) {
          console.error(e);
          setConnError('Connection failed. Please check your credentials.');
          setConnStatus('error');
      }
  };
  
  const handleSaveGoogleKey = async () => {
      if (!googleKey || googleKey.startsWith('***')) return;
      await adminService.saveSystemSetting('google_api_key', googleKey, 'Google Cloud API Key for Veo & Gemini');
      alert('API Key Saved Securely');
      setGoogleKey('**********************');
  };
  
  const handleDisconnect = () => {
      if(confirm("Disconnect Supabase? The app will revert to offline mode.")) {
          localStorage.removeItem('supabase_url');
          localStorage.removeItem('supabase_key');
          localStorage.removeItem('app_mode');
          window.location.reload();
      }
  };

  const copySQL = () => {
      navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-20">
        <h1 className="text-2xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-slate-400 mb-8">Configure your Supabase backend connection.</p>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-900/20 rounded-xl flex items-center justify-center border border-green-500/20">
                    <Database className="w-6 h-6 text-green-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Connection Details</h3>
                    <p className="text-sm text-slate-400">Required for cloud storage and auth</p>
                </div>
            </div>

            <div className="space-y-4">
            {connStatus === 'error' && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4" /> {connError}
                </div>
            )}
            
            {connStatus === 'success' && (
                <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 flex items-center gap-2 text-green-300 text-sm font-bold">
                    <Check className="w-4 h-4" /> Connected Successfully! Reloading app...
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
                <input 
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none"
                    placeholder="https://your-project.supabase.co"
                    disabled={connStatus === 'testing' || connStatus === 'success'}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon API Key</label>
                <input 
                    type="password"
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none"
                    placeholder="eyJ..."
                    disabled={connStatus === 'testing' || connStatus === 'success'}
                />
            </div>
            <div className="flex gap-4 pt-4">
                <button 
                    onClick={handleSaveSettings}
                    disabled={connStatus === 'testing' || connStatus === 'success'}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {connStatus === 'testing' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" /> Save Configuration
                        </>
                    )}
                </button>
                {isSupabaseConfigured() && (
                    <button 
                        onClick={handleDisconnect}
                        className="px-6 border border-red-900/50 text-red-400 hover:bg-red-900/20 font-bold rounded-lg"
                    >
                        Disconnect
                    </button>
                )}
            </div>
            </div>
        </div>

        {/* Google Cloud API Key Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                    <Key className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Google Cloud API</h3>
                    <p className="text-sm text-slate-400">For Platform-managed Veo & Gemini generation</p>
                </div>
            </div>
            <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                <div className="flex gap-2">
                    <input 
                        type="password"
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder="Enter AI Studio API Key..."
                    />
                    <button 
                        onClick={handleSaveGoogleKey}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg font-bold"
                    >
                        Save
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    This key will be used for users if they haven't provided their own. Stored securely in system settings.
                </p>
            </div>
            </div>
        </div>

        <div 
        ref={schemaRef} 
        className={`bg-slate-900 border border-slate-800 rounded-xl p-8 transition-all duration-1000 ${initialSection === 'SCHEMA' ? 'ring-2 ring-yellow-500 shadow-xl shadow-yellow-900/20' : ''}`}
        >
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white">Database Schema</h3>
                    {initialSection === 'SCHEMA' && (
                        <p className="text-yellow-500 text-sm font-bold mt-1 animate-pulse">
                            ACTION REQUIRED: Run this SQL to fix missing tables.
                        </p>
                    )}
                </div>
                <button onClick={copySQL} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy SQL'}
                </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-400 font-mono overflow-x-auto h-64 custom-scrollbar select-all">
                {SUPABASE_SETUP_SQL}
            </pre>
        </div>
    </div>
  );
};
