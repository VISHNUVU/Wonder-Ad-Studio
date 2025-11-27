
import React from 'react';
import { Wifi, WifiOff, AlertTriangle, Settings, Crown, LogOut } from 'lucide-react';
import { User, Plan } from '../../types';

interface HeaderProps {
  user: User | null;
  currentPlan?: Plan;
  connectionStatus: string;
  useLocalMode: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  onBackToLibrary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentPlan,
  connectionStatus,
  useLocalMode,
  onLogout,
  onOpenSettings,
  onOpenUpgrade,
  onBackToLibrary
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToLibrary}>
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-bold text-lg text-white">A</div>
          <span className="font-bold text-xl tracking-tight text-white">AdGenius</span>
          {useLocalMode ? (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Offline
              </span>
          ) : (
               <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                   connectionStatus === 'connected' 
                   ? 'bg-green-900/20 text-green-400 border-green-900/50' 
                   : connectionStatus === 'error' 
                      ? 'bg-red-900/20 text-red-400 border-red-900/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
               }`}>
                  {connectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {connectionStatus === 'connected' ? 'Cloud' : connectionStatus === 'error' ? 'Error' : 'Connecting...'}
              </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
           <button 
              onClick={onOpenSettings}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Settings & Admin"
           >
               <Settings className="w-5 h-5" />
           </button>

          {user && (
            <>
               <div className="h-4 w-px bg-slate-800"></div>
               
               {currentPlan && (
                   <button 
                      onClick={onOpenUpgrade}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                          currentPlan.code === 'pro' 
                          ? 'bg-purple-900/30 border-purple-500/50 text-purple-200 hover:bg-purple-900/50' 
                          : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300'
                      }`}
                   >
                      {currentPlan.code === 'pro' && <Crown className="w-3 h-3 text-yellow-500" />}
                      <span className="font-semibold uppercase">{currentPlan.name}</span>
                   </button>
               )}
               
               <div className="h-4 w-px bg-slate-800"></div>

               <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
               >
                  <span>{user.email}</span>
                  <LogOut className="w-4 h-4" />
               </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
