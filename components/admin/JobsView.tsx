
import React, { useState } from 'react';
import { VideoJob } from '../../types';
import { adminService } from '../../services/admin';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface JobsViewProps {
  jobs: VideoJob[];
  refresh: () => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, refresh }) => {
  const [filter, setFilter] = useState<'all' | 'failed' | 'pending'>('all');
  const [retrying, setRetrying] = useState<string | null>(null);

  const filteredJobs = jobs.filter(j => {
      if (filter === 'all') return true;
      return j.status === filter;
  });

  const handleRetry = async (id: string) => {
      setRetrying(id);
      try {
          await adminService.retryJob(id);
          refresh();
      } finally {
          setRetrying(null);
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'completed': return <span className="flex items-center gap-1 text-green-400 bg-green-400/10 px-2 py-1 rounded text-xs"><CheckCircle2 className="w-3 h-3"/> Completed</span>;
          case 'failed': return <span className="flex items-center gap-1 text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs"><XCircle className="w-3 h-3"/> Failed</span>;
          case 'pending': return <span className="flex items-center gap-1 text-slate-400 bg-slate-400/10 px-2 py-1 rounded text-xs"><Clock className="w-3 h-3"/> Pending</span>;
          default: return <span className="text-slate-500 text-xs">{status}</span>;
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Video Generation Queue</h2>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('failed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${filter === 'failed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Failed
                </button>
                <button 
                    onClick={() => setFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Pending
                </button>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-800/50 text-slate-200 text-xs uppercase font-bold">
                    <tr>
                        <th className="p-4">Job ID</th>
                        <th className="p-4">Created</th>
                        <th className="p-4">Provider</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-800/30">
                            <td className="p-4 font-mono text-xs">{job.id.substring(0,8)}...</td>
                            <td className="p-4 text-xs">{new Date(job.createdAt).toLocaleTimeString()}</td>
                            <td className="p-4 uppercase text-xs">{job.provider}</td>
                            <td className="p-4">
                                {getStatusBadge(job.status)}
                                {job.errorMessage && <div className="text-xs text-red-500 mt-1 max-w-xs truncate">{job.errorMessage}</div>}
                            </td>
                            <td className="p-4 text-right">
                                {job.status === 'failed' && (
                                    <button 
                                        onClick={() => handleRetry(job.id)}
                                        disabled={retrying === job.id}
                                        className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center justify-end gap-1 ml-auto disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${retrying === job.id ? 'animate-spin' : ''}`} />
                                        Retry
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredJobs.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    No jobs found in queue.
                </div>
            )}
        </div>
    </div>
  );
};
