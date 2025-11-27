
import React from 'react';
import { Database } from 'lucide-react';

interface DatabaseStatusBannerProps {
  onSetup: () => void;
}

export const DatabaseStatusBanner: React.FC<DatabaseStatusBannerProps> = ({ onSetup }) => {
  return (
    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-6 mb-8 flex items-start gap-4 animate-in slide-in-from-top-4">
        <div className="bg-yellow-900/30 p-3 rounded-lg">
            <Database className="w-6 h-6 text-yellow-500" />
        </div>
        <div className="flex-grow">
            <h3 className="text-lg font-bold text-white mb-1">Database Setup Required</h3>
            <p className="text-slate-400 mb-4 text-sm">
                Your Supabase connection is active, but the required tables have not been created yet. 
                The app cannot save or load data until the database schema is applied.
            </p>
            <button 
                onClick={onSetup}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
            >
                Setup Database Schema
            </button>
        </div>
    </div>
  );
};
