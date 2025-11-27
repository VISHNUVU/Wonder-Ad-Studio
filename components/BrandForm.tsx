
import React, { useState } from 'react';
import { Brand, BrandProduct } from '../types';
import { Briefcase, Link as LinkIcon, Save, Plus, Trash2, Image, X, AlertCircle } from 'lucide-react';

interface BrandFormProps {
  userId: string;
  initialBrand?: Brand;
  onSave: (brand: Brand) => Promise<void>;
  onCancel: () => void;
}

export const BrandForm: React.FC<BrandFormProps> = ({ userId, initialBrand, onSave, onCancel }) => {
  const [name, setName] = useState(initialBrand?.name || '');
  const [website, setWebsite] = useState(initialBrand?.website || '');
  const [about, setAbout] = useState(initialBrand?.about || '');
  const [category, setCategory] = useState(initialBrand?.category || '');
  const [targetAudience, setTargetAudience] = useState(initialBrand?.targetAudience || '');
  
  const [logoLight, setLogoLight] = useState<string | null>(initialBrand?.logoLight || null);
  const [logoDark, setLogoDark] = useState<string | null>(initialBrand?.logoDark || null);
  
  const [products, setProducts] = useState<BrandProduct[]>(initialBrand?.products || []);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isDark: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (isDark) setLogoDark(url);
      else setLogoLight(url);
    }
  };

  const addProduct = () => {
    if (newProductName) {
      setProducts([...products, { 
          id: crypto.randomUUID(), 
          name: newProductName, 
          url: newProductUrl || '#' 
      }]);
      setNewProductName('');
      setNewProductUrl('');
    }
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const newBrand: Brand = {
      id: initialBrand?.id || crypto.randomUUID(),
      userId,
      name,
      website,
      about,
      category,
      targetAudience,
      products,
      updatedAt: Date.now(),
      logoLight: logoLight || undefined,
      logoDark: logoDark || undefined
    };

    try {
      await onSave(newBrand);
    } catch (err: any) {
      console.error("Failed to save brand", err);
      let msg = "Failed to save brand.";
      
      // Parse error object safely
      if (typeof err === 'string') {
          msg = err;
      } else if (err instanceof Error) {
          msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
          msg = err.message || err.error_description || JSON.stringify(err);
      }

      // Friendly mapping
      if (msg.includes("Bucket not found")) {
          msg = "Storage bucket missing. Please run the SQL Setup in Admin Settings.";
      } else if (msg.includes("relation") && msg.includes("does not exist")) {
          msg = "Database tables missing. Please run the SQL Setup in Admin Settings.";
      } else if (msg.includes("Upload failed")) {
          // Keep specific upload error
      } else {
          msg = `Error: ${msg}`;
      }

      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
       <button 
        onClick={onCancel}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-700">
           <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
             <Briefcase className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-white">{initialBrand ? 'Edit Brand' : 'Create New Brand'}</h1>
             <p className="text-slate-400 text-sm">Define your brand identity for consistent AI generation</p>
           </div>
        </div>

        {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p>{error}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
           {/* Basic Info */}
           <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Brand Essentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Brand Name</label>
                    <input 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="Acme Corp"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Category / Industry</label>
                    <input 
                      required
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="e.g., SaaS, Fashion, Beverage..."
                    />
                 </div>
              </div>
              
              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1">Website URL</label>
                 <div className="relative">
                    <input 
                        required
                        type="url"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-9 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="https://example.com"
                    />
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">About the Brand (Mission & Values)</label>
                <textarea 
                    required
                    value={about}
                    onChange={e => setAbout(e.target.value)}
                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Tell us about your mission, values, and story. The AI uses this to match your tone."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Audience</label>
                <textarea 
                    required
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    className="w-full h-20 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Who are you selling to? (e.g. Gen Z gamers, Corporate executives, Busy parents...)"
                />
              </div>
           </div>

           {/* Logos */}
           <div className="space-y-4 pt-4 border-t border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visual Assets</h3>
              <p className="text-xs text-slate-500">Upload high-quality PNGs or SVGs. These may be used in video overlays.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Logo (Light Background)</label>
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-white border border-slate-300 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {logoLight ? <img src={logoLight} alt="Light Logo" className="w-full h-full object-contain p-1" /> : <Image className="w-6 h-6 text-slate-300" />}
                       </div>
                       <input 
                         type="file" 
                         accept="image/png, image/jpeg, image/webp, image/svg+xml"
                         onChange={(e) => handleLogoUpload(e, false)}
                         className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Logo (Dark Background)</label>
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {logoDark ? <img src={logoDark} alt="Dark Logo" className="w-full h-full object-contain p-1" /> : <Image className="w-6 h-6 text-slate-600" />}
                       </div>
                       <input 
                         type="file" 
                         accept="image/png, image/jpeg, image/webp, image/svg+xml"
                         onChange={(e) => handleLogoUpload(e, true)}
                         className="text-xs text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                       />
                    </div>
                 </div>
              </div>
           </div>

           {/* Products */}
           <div className="space-y-4 pt-4 border-t border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Product Catalog</h3>
              <p className="text-xs text-slate-500">List your key products. This helps the AI understand your portfolio context.</p>
              
              <div className="space-y-2">
                 {products.map(p => (
                   <div key={p.id} className="flex items-center gap-3 bg-slate-900/50 p-2 rounded border border-slate-700">
                      <div className="flex-1 font-medium text-sm text-white">{p.name}</div>
                      <div className="flex-1 text-xs text-indigo-400 truncate">{p.url}</div>
                      <button type="button" onClick={() => removeProduct(p.id)} className="p-1 hover:text-red-400 text-slate-500 transition-colors">
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                 ))}
                 {products.length === 0 && (
                     <div className="text-center py-4 border border-dashed border-slate-700 rounded text-slate-500 text-xs">
                         No products added yet.
                     </div>
                 )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-2 items-end bg-slate-900/30 p-3 rounded border border-slate-700/50">
                 <div className="flex-1 w-full">
                    <label className="block text-xs text-slate-500 mb-1">Product Name</label>
                    <input 
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-2 text-sm text-white outline-none focus:border-indigo-500"
                      placeholder="e.g. Model X"
                    />
                 </div>
                 <div className="flex-1 w-full">
                    <label className="block text-xs text-slate-500 mb-1">Product Page URL (Optional)</label>
                    <input 
                      value={newProductUrl}
                      onChange={e => setNewProductUrl(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-2 text-sm text-white outline-none focus:border-indigo-500"
                      placeholder="e.g. /products/model-x"
                    />
                 </div>
                 <button 
                   type="button" 
                   onClick={addProduct}
                   disabled={!newProductName}
                   className="w-full md:w-auto bg-slate-700 hover:bg-slate-600 text-white p-2 rounded disabled:opacity-50 transition-colors"
                 >
                   <Plus className="w-4 h-4 mx-auto" />
                 </button>
              </div>
           </div>

           <div className="pt-6 border-t border-slate-700 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onCancel}
                className="px-6 py-3 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                    <>
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>Saving...</span>
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5" />
                        <span>{initialBrand ? 'Update Brand' : 'Save Brand'}</span>
                    </>
                )}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};
