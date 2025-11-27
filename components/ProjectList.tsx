
import React, { useState } from 'react';
import { SavedProject, AppState, Brand } from '../types';
import { Film, Calendar, ArrowRight, Play, Clock, CheckCircle2, Briefcase, Plus, Globe, Trash2, AlertTriangle, X, Edit } from 'lucide-react';

interface ProjectListProps {
  projects: SavedProject[];
  brands: Brand[];
  onCreateNewProject: () => void;
  onCreateNewBrand: () => void;
  onSelectProject: (project: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  onDeleteBrand: (id: string) => void;
  onEditBrand: (brand: Brand) => void;
  userName?: string;
}

export const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  brands, 
  onCreateNewProject, 
  onCreateNewBrand, 
  onSelectProject, 
  onDeleteProject,
  onDeleteBrand,
  onEditBrand,
  userName 
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'brands'>('projects');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'project' | 'brand', id: string } | null>(null);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: AppState) => {
    switch (status) {
      case AppState.COMPLETED:
        return <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>;
      case AppState.PRODUCING:
        return <span className="bg-indigo-900/50 text-indigo-400 text-xs px-2 py-1 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Processing</span>;
      default:
        return <span className="bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded">Draft</span>;
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'project') {
      onDeleteProject(deleteConfirm.id);
    } else {
      onDeleteBrand(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
               <AlertTriangle className="w-6 h-6 text-red-500" />
             </div>
             <h3 className="text-xl font-bold text-white text-center mb-2">Are you sure?</h3>
             <p className="text-slate-400 text-center text-sm mb-6">
               This action cannot be undone. This will permanently delete the {deleteConfirm.type} and all associated files.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setDeleteConfirm(null)}
                 className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleDelete}
                 className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
               >
                 Delete
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-white mb-2">
             {userName ? `Welcome back, ${userName.split(' ')[0]}` : 'My Dashboard'}
           </h1>
           <p className="text-slate-400">Manage your brands and AI video productions</p>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl">
             <button
                onClick={() => setActiveTab('projects')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                My Projects
             </button>
             <button
                onClick={() => setActiveTab('brands')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'brands' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                Brand Assets
             </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
              <button 
                onClick={onCreateNewProject}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 text-sm"
            >
                <Plus className="w-4 h-4" />
                New Ad Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
            <Film className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">Start your first AI video production today.</p>
            <button 
                onClick={onCreateNewProject}
                className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
            >
                Create a Project
            </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
                <div 
                key={project.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group relative"
                >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'project', id: project.id }); }}
                        className="p-2 bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete Project"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                
                <div onClick={() => onSelectProject(project)} className="cursor-pointer">
                    <div className="flex justify-between items-start mb-4 pr-10">
                        <div className="bg-indigo-500/10 p-3 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                        <Play className="w-6 h-6 text-indigo-400" />
                        </div>
                        {getStatusBadge(project.status)}
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{project.name}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4 h-10">{project.description}</p>
                    
                    {project.brandId && (
                        <div className="mb-4 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                            <Briefcase className="w-3 h-3" />
                            <span>{brands.find(b => b.id === project.brandId)?.name || 'Linked Brand'}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.updatedAt)}
                        </div>
                        <span className="flex items-center gap-1 text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Open <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
                </div>
            ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'brands' && (
         <>
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">My Brands</h2>
              <button 
                onClick={onCreateNewBrand}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/25 text-sm"
            >
                <Plus className="w-4 h-4" />
                Add Brand
            </button>
          </div>
          
          {brands.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-300 mb-2">No brands defined</h3>
                <p className="text-slate-500 mb-6">Define your brand identity for better AI results.</p>
                <button 
                    onClick={onCreateNewBrand}
                    className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
                >
                    Create a Brand Profile
                </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map(brand => (
                    <div key={brand.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group relative">
                        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                             <button 
                                onClick={() => onEditBrand(brand)}
                                className="p-2 bg-slate-900/50 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors backdrop-blur-sm"
                                title="Edit Brand"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                             <button 
                                onClick={() => setDeleteConfirm({ type: 'brand', id: brand.id })}
                                className="p-2 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors backdrop-blur-sm"
                                title="Delete Brand"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="h-32 bg-slate-700/50 relative p-4 flex items-center justify-center">
                            {brand.logoDark ? (
                                <img src={brand.logoDark} alt={brand.name} className="max-h-24 max-w-full object-contain" />
                            ) : (
                                <h3 className="text-3xl font-bold text-slate-600 select-none">{brand.name[0]}</h3>
                            )}
                            <div className="absolute top-4 left-4 bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-300">
                                {brand.products.length} Products
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-white mb-1">{brand.name}</h3>
                            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-xs flex items-center gap-1 mb-3 hover:underline">
                                <Globe className="w-3 h-3" /> {brand.website.replace(/^https?:\/\//, '')}
                            </a>
                            <p className="text-slate-400 text-sm line-clamp-2 mb-4 h-10">{brand.about}</p>
                            <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                                Category: {brand.category}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
         </>
      )}
    </div>
  );
};
