
import React from 'react';
import { 
  LayoutDashboard, Users, Film, Settings, 
  Shield, LogOut, Menu 
} from 'lucide-react';
import { AdminRole } from '../../types';

interface AdminLayoutProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onClose: () => void;
  children: React.ReactNode;
  role: AdminRole;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  currentView, 
  onNavigate, 
  onClose, 
  children,
  role
}) => {
  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button 
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1 ${
        currentView === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex text-slate-200 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
           <Shield className="w-6 h-6 text-indigo-500 mr-2" />
           <span className="font-bold text-white tracking-tight">Admin Console</span>
        </div>
        
        <div className="p-4 flex-grow overflow-y-auto">
           <div className="text-xs font-bold text-slate-600 uppercase mb-3 px-4">Overview</div>
           <SidebarItem id="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
           
           <div className="text-xs font-bold text-slate-600 uppercase mt-6 mb-3 px-4">Management</div>
           <SidebarItem id="USERS" icon={Users} label="Users" />
           <SidebarItem id="JOBS" icon={Film} label="Video Jobs" />
           
           <div className="text-xs font-bold text-slate-600 uppercase mt-6 mb-3 px-4">System</div>
           <SidebarItem id="SETTINGS" icon={Settings} label="Settings" />
        </div>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {role === 'super_admin' ? 'SA' : 'AD'}
                </div>
                <div>
                    <div className="text-sm font-bold text-white">Admin User</div>
                    <div className="text-xs text-slate-500 capitalize">{role.replace('_', ' ')}</div>
                </div>
            </div>
            <button onClick={onClose} className="w-full flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 text-sm hover:bg-slate-800 rounded">
                <LogOut className="w-4 h-4" /> Exit Console
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-950">
         {/* Top Header */}
         <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white capitalize">
                {currentView.toLowerCase()}
            </h2>
            <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">v1.5.0</span>
            </div>
         </header>

         {/* Viewport */}
         <main className="flex-grow overflow-auto p-8">
            {children}
         </main>
      </div>
    </div>
  );
};
