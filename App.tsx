
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AppState, AssetStatus, SavedProject, User, Scene, Brand, PlanType, Subscription, UsageStats, ProductionConfig } from './types';
import { geminiService } from './services/gemini';
import { supabaseStorageService } from './services/supabaseStorage';
import { storageService as indexedDBService } from './services/storage';
import { authService } from './services/auth';
import { isSupabaseConfigured, usingHardcodedCredentials, supabase } from './services/supabase'; 
import { SubscriptionManager } from './services/subscription';
import { PLANS } from './constants';
import { CreateAdForm } from './components/CreateAdForm';
import { BrandForm } from './components/BrandForm';
import { ScriptView } from './components/ScriptView';
import { ProductionDashboard } from './components/ProductionDashboard';
import { AdPlayer } from './components/AdPlayer';
import { ApiKeySelector } from './components/ApiKeySelector';
import { ProjectList } from './components/ProjectList';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { UpgradeModal } from './components/UpgradeModal';
import { Settings } from 'lucide-react';

// Layout Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DatabaseStatusBanner } from './components/DatabaseStatusBanner';

export default function App() {
  const [view, setView] = useState<'LIBRARY' | 'EDITOR' | 'BRAND_CREATOR'>('LIBRARY');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Project State
  const [currentProject, setCurrentProject] = useState<SavedProject | null>(null);
  
  // App Global State
  const [projectsList, setProjectsList] = useState<SavedProject[]>([]);
  const [brandsList, setBrandsList] = useState<Brand[]>([]);
  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  
  // Backend State
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [isDatabaseSetupMissing, setIsDatabaseSetupMissing] = useState(false);
  
  // Admin State
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminInitialView, setAdminInitialView] = useState<'DASHBOARD' | 'SETTINGS' | 'USERS' | 'JOBS'>('USERS');
  const [adminInitialSection, setAdminInitialSection] = useState<'CONNECTION' | 'SCHEMA'>('CONNECTION');

  // SaaS State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');
  
  // Preview State
  const [previewSceneId, setPreviewSceneId] = useState<number | null>(null);

  // Edit State
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Initialize Backend Mode & Test Connection
  useEffect(() => {
     // 1. Check if we have hardcoded credentials or Env vars (Highest Priority)
     if (usingHardcodedCredentials && isSupabaseConfigured()) {
         console.log("App: Using Hardcoded/Env Supabase Credentials");
         setUseLocalMode(false);
         setIsSupabaseReady(true);
         testConnection();
         return;
     }

     // 2. Check LocalStorage
     const storedMode = localStorage.getItem('app_mode');
     if (storedMode === 'supabase' && localStorage.getItem('supabase_url')) {
         console.log("App: Using Stored Supabase Credentials");
         setIsSupabaseReady(true);
         setUseLocalMode(false);
         testConnection();
     } else {
         // 3. Default to Offline
         console.log("App: Defaulting to Offline Mode");
         setUseLocalMode(true);
         setIsSupabaseReady(false);
         setConnectionStatus('offline');
     }
  }, []);

  const testConnection = async () => {
      if (!supabase) return;
      try {
          const { error } = await supabase.auth.getSession();
          if (!error) {
              setConnectionStatus('connected');
          } else {
              console.warn("Supabase reachable but auth error:", error);
              setConnectionStatus('connected'); 
          }
      } catch (e) {
          console.error("Supabase Connection Failed:", e);
          setConnectionStatus('error');
      }
  };

  // Determine active storage service
  const storageService = useMemo(() => {
     return useLocalMode ? indexedDBService : supabaseStorageService;
  }, [useLocalMode]);

  const subManager = useMemo(() => new SubscriptionManager(storageService), [storageService]);

  // Load user on mount
  useEffect(() => {
    const initAuth = async () => {
        const storedUser = authService.getUser();
        if (storedUser) {
          setUser(storedUser);
          if (!useLocalMode) {
             const freshUser = await authService.syncSession();
             if (freshUser) setUser(freshUser);
             else {
                 authService.logout();
                 setUser(null);
             }
          }
        }
    };
    initAuth();
  }, [useLocalMode, isSupabaseReady]);

  // Load Data & Subscriptions
  useEffect(() => {
    if (user) {
      loadData(user.id);
      loadSubscription(user.id);
    } else {
      setProjectsList([]);
      setBrandsList([]);
      setSubscription(null);
    }
  }, [user, isSupabaseReady, useLocalMode, storageService]);

  const loadData = async (userId: string) => {
    try {
      const projects = await storageService.getProjects(userId);
      setProjectsList(projects);
      const brands = await storageService.getBrands(userId);
      setBrandsList(brands);
      setIsDatabaseSetupMissing(false); // Reset if successful
    } catch (e: any) {
      let errorMessage = '';
      if (typeof e === 'string') errorMessage = e;
      else if (e instanceof Error) errorMessage = e.message;
      else if (e?.message) errorMessage = e.message;
      else if (e?.error_description) errorMessage = e.error_description;
      else errorMessage = JSON.stringify(e);
      
      // Handle Missing Table Error (42P01)
      if (
        e?.code === '42P01' || 
        errorMessage.includes('Could not find the table') || 
        errorMessage.includes('relation "public.projects" does not exist') ||
        errorMessage.includes('schema cache')
      ) { 
          console.warn("Database tables missing. Triggering setup flow.");
          setIsDatabaseSetupMissing(true);
          
          if (!showAdmin) {
             setAdminInitialView('SETTINGS');
             setAdminInitialSection('SCHEMA');
             setShowAdmin(true);
          }
      } else {
        console.error("Failed to load user data:", errorMessage);
      }
    }
  };

  const loadSubscription = async (userId: string) => {
    try {
        const { sub, usage } = await subManager.ensureSubscription(userId);
        setSubscription(sub);
        setUsage(usage);
    } catch (e: any) {
        if (e?.code === '42P01' || (e?.message && e.message.includes('relation'))) {
            return;
        }
        console.error("Failed to load subscription", e);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (currentProject && view === 'EDITOR' && user) {
      const saveTimer = setTimeout(() => {
         storageService.saveProject(currentProject).then(() => {
            storageService.getProjects(user.id).then(setProjectsList);
         });
      }, 3000); 
      return () => clearTimeout(saveTimer);
    }
  }, [currentProject, view, user, storageService]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setView('LIBRARY');
    setCurrentProject(null);
  };
  
  // --- Actions ---

  const handleCreateNewProject = async () => {
    if (!user) return;
    const check = await subManager.checkLimit(user.id, 'projects', projectsList.length);
    if (!check.allowed) {
        setUpgradeReason(`You have reached the limit of ${check.limit} projects on the ${check.planName} plan.`);
        setShowUpgradeModal(true);
        return;
    }
    
    setCurrentProject(null);
    setState(AppState.IDLE);
    setView('EDITOR');
  };

  const handleCreateNewBrand = async () => {
    if (!user) return;
    const check = await subManager.checkLimit(user.id, 'brands', brandsList.length);
    if (!check.allowed) {
        setUpgradeReason(`You have reached the limit of ${check.limit} brands on the ${check.planName} plan.`);
        setShowUpgradeModal(true);
        return;
    }
    setEditingBrand(null);
    setView('BRAND_CREATOR');
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setView('BRAND_CREATOR');
  };

  const handleSaveBrand = async (brand: Brand) => {
    if (!user) return;
    await storageService.saveBrand(brand);
    await loadData(user.id);
    setView('LIBRARY');
    setEditingBrand(null);
  };

  const handleDeleteProject = async (projectId: string) => {
      if (!user) return;
      try {
          await storageService.deleteProject(projectId, user.id);
          setProjectsList(prev => prev.filter(p => p.id !== projectId));
      } catch (e) {
          console.error("Delete failed", e);
          loadData(user.id);
      }
  };

  const handleDeleteBrand = async (brandId: string) => {
      if (!user) return;
      try {
          await storageService.deleteBrand(brandId, user.id);
          setBrandsList(prev => prev.filter(b => b.id !== brandId));
      } catch (e) {
          console.error("Delete brand failed", e);
          loadData(user.id);
      }
  };

  const handleSelectProject = async (project: SavedProject) => {
     const fullProject = await storageService.loadProject(project.id);
     if (fullProject) {
        const sanitizedAssets = fullProject.assets.map(a => {
            if (a.videoStatus === 'generating') return { ...a, videoStatus: 'error' as const, error: 'Interrupted' };
            if (a.audioStatus === 'generating') return { ...a, audioStatus: 'error' as const, error: 'Interrupted' };
            return a;
        });
        setCurrentProject({ ...fullProject, assets: sanitizedAssets });
        setState(fullProject.status);
        setView('EDITOR');
     }
  };

  const handleCreateAdSubmit = async (name: string, description: string, brand?: Brand, voiceoverStyle?: string) => {
    if (!user) return;

    const check = await subManager.checkLimit(user.id, 'generations');
    if (!check.allowed) {
        setUpgradeReason(`You have used all ${check.limit} AI script generations for this month.`);
        setShowUpgradeModal(true);
        return;
    }

    setState(AppState.SCRIPTING);
    try {
      await geminiService.ensureApiKey();
      const generatedScript = await geminiService.generateScript(name, description, brand, voiceoverStyle);
      
      await subManager.incrementUsage(user.id, 'generations');
      loadSubscription(user.id);

      const initialAssets: AssetStatus[] = generatedScript.scenes.map(s => ({
        sceneId: s.id,
        videoStatus: 'pending',
        audioStatus: 'pending'
      }));

      // Auto-select music based on voiceover style or default
      let defaultTrackId = 'track_corporate';
      if (voiceoverStyle === 'energetic') defaultTrackId = 'track_rock';
      if (voiceoverStyle === 'calm') defaultTrackId = 'track_chill';
      if (voiceoverStyle === 'dramatic') defaultTrackId = 'track_dramatic';

      const newProject: SavedProject = {
        id: crypto.randomUUID(),
        userId: user.id,
        brandId: brand?.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name,
        description,
        script: generatedScript,
        assets: initialAssets,
        status: AppState.REVIEW_SCRIPT,
        // Initialize Production Config (Phase 1/4)
        productionConfig: {
            audio: {
                musicTrackId: defaultTrackId,
                musicVolume: 0.25,
                voiceVolume: 1.0,
                duckingEnabled: true
            },
            overlays: {}
        }
      };

      setCurrentProject(newProject);
      setState(AppState.REVIEW_SCRIPT);
    } catch (error) {
      console.error(error);
      alert("Failed to generate script. Please try again.");
      setState(AppState.IDLE);
    }
  };

  const handleScriptRegenerate = async () => {
    if (!currentProject || !user) return;
    
    const check = await subManager.checkLimit(user.id, 'generations');
    if (!check.allowed) {
        setUpgradeReason(`You have used all ${check.limit} AI script generations for this month.`);
        setShowUpgradeModal(true);
        return;
    }

    const { name, description, brandId } = currentProject;
    const brand = brandsList.find(b => b.id === brandId);

    setState(AppState.SCRIPTING);
    try {
       const newScript = await geminiService.generateScript(name, description, brand);
       await subManager.incrementUsage(user.id, 'generations');
       loadSubscription(user.id);
       
       const newAssets: AssetStatus[] = newScript.scenes.map(s => ({
          sceneId: s.id,
          videoStatus: 'pending',
          audioStatus: 'pending'
       }));
       
       setCurrentProject(prev => prev ? ({ ...prev, script: newScript, assets: newAssets, status: AppState.REVIEW_SCRIPT, updatedAt: Date.now() }) : null);
       setState(AppState.REVIEW_SCRIPT);
    } catch (e) {
       console.error("Failed to regenerate script", e);
       setState(AppState.REVIEW_SCRIPT);
    }
  };

  const handleSceneUpdate = useCallback((updatedScene: Scene) => {
      setCurrentProject(prev => {
          if (!prev || !prev.script) return prev;
          const newScenes = prev.script.scenes.map(s => s.id === updatedScene.id ? updatedScene : s);
          return {
              ...prev,
              script: { ...prev.script, scenes: newScenes },
              updatedAt: Date.now()
          };
      });
  }, []);

  const handleConfigUpdate = useCallback((config: ProductionConfig) => {
      setCurrentProject(prev => {
          if (!prev) return null;
          return { ...prev, productionConfig: config, updatedAt: Date.now() };
      });
  }, []);

  const handleSceneRegenerate = async (sceneId: number) => {
      const scene = currentProject?.script?.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      try {
          const updatedScene = await geminiService.rewriteScene(scene);
          updatedScene.id = sceneId;
          handleSceneUpdate(updatedScene);
      } catch (e) {
          console.error("Failed to rewrite scene", e);
      }
  };

  const updateAsset = useCallback((sceneId: number, update: Partial<AssetStatus>) => {
    setCurrentProject(prev => {
        if (!prev) return null;
        const newAssets = prev.assets.map(a => a.sceneId === sceneId ? { ...a, ...update } : a);
        return { ...prev, assets: newAssets };
    });
  }, []);

  const generateAudio = useCallback(async (scene: Scene) => {
    updateAsset(scene.id, { audioStatus: 'generating', error: undefined });
    try {
        const audioUrl = await geminiService.generateSpeech(scene.voiceover_text);
        updateAsset(scene.id, { audioStatus: 'completed', audioUrl });
    } catch (e: any) {
        console.error(`Audio failed for scene ${scene.id}`, e);
        updateAsset(scene.id, { audioStatus: 'error', error: e.message || "Audio failed" });
    }
  }, [updateAsset]);

  const generateVideo = useCallback(async (scene: Scene) => {
    if (!user) return;
    
    const check = await subManager.checkLimit(user.id, 'videos');
    if (!check.allowed) {
        updateAsset(scene.id, { videoStatus: 'error', error: 'Plan limit reached' });
        return; 
    }

    updateAsset(scene.id, { videoStatus: 'generating', error: undefined });
    try {
        const videoUrl = await geminiService.generateVideo(scene.visual_prompt);
        await subManager.incrementUsage(user.id, 'videos');
        loadSubscription(user.id);

        updateAsset(scene.id, { videoStatus: 'completed', videoUrl });
    } catch (e: any) {
        console.error(`Video failed for scene ${scene.id}`, e);
        let displayError = e.message || "Video generation failed";
        if (displayError.includes("Requested entity was not found") || displayError.includes("Billing")) {
            displayError = "Billing Required / API Key Missing";
            if (window.aistudio?.openSelectKey) {
                try { await window.aistudio.openSelectKey(); } catch {}
            }
        }
        updateAsset(scene.id, { videoStatus: 'error', error: displayError });
    }
  }, [updateAsset, user, subManager]);

  const handleStartProduction = useCallback(async () => {
    if (!currentProject || !currentProject.script || !user) return;
    
    const needed = currentProject.script.scenes.length;
    const check = await subManager.checkLimit(user.id, 'videos', (usage?.videosRenderedUsed || 0) + needed);
    if (!check.allowed && (usage?.videosRenderedUsed || 0) >= check.limit) {
         setUpgradeReason(`You have reached your monthly video render limit (${check.limit}).`);
         setShowUpgradeModal(true);
         return;
    }

    setCurrentProject(prev => prev ? ({ ...prev, status: AppState.PRODUCING }) : null);
    setState(AppState.PRODUCING);
    
    const scenes = currentProject.script.scenes;
    scenes.forEach(async (scene) => {
        const currentAsset = currentProject.assets.find(a => a.sceneId === scene.id);
        if (currentAsset?.audioStatus === 'completed') return;
        generateAudio(scene);
    });

    for (const scene of scenes) {
        const asset = currentProject.assets.find(a => a.sceneId === scene.id);
        if (asset?.videoStatus === 'completed') continue;
        await generateVideo(scene);
    }
  }, [currentProject, generateAudio, generateVideo, user, subManager, usage]);

  const handleRetryAsset = useCallback(async (sceneId: number, type: 'video' | 'audio') => {
      const scene = currentProject?.script?.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      if (type === 'video') generateVideo(scene);
      else generateAudio(scene);
  }, [currentProject, generateVideo, generateAudio]);

  const handlePreviewAsset = (sceneId: number) => {
    setPreviewSceneId(sceneId);
  };

  const handleClosePreview = () => {
    setPreviewSceneId(null);
  };

  const handleProductionComplete = () => {
    setCurrentProject(prev => prev ? ({ ...prev, status: AppState.COMPLETED }) : null);
    setState(AppState.COMPLETED);
  };

  const handleBackToLibrary = () => {
     if (currentProject) {
        storageService.saveProject(currentProject).then(() => {
           if (user) loadData(user.id);
        });
     }
     setView('LIBRARY');
     setCurrentProject(null);
     setPreviewSceneId(null);
  };
  
  const handleUpgradePlan = async (code: PlanType) => {
      if (!user) return;
      await subManager.upgradePlan(user.id, code);
      await loadSubscription(user.id);
      setShowUpgradeModal(false);
      alert(`Successfully upgraded to ${PLANS[code].name}!`);
  };

  const currentPlan = subscription ? PLANS[subscription.planId] : PLANS['free'];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 flex flex-col">
      <ApiKeySelector onReady={() => setIsApiKeyReady(true)} />
      
      <AdminDashboard 
         isOpen={showAdmin} 
         onClose={() => setShowAdmin(false)} 
         initialView={adminInitialView} 
         initialSection={adminInitialSection}
      />
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        currentPlanCode={subscription?.planId || 'free'}
        onUpgrade={handleUpgradePlan}
        reason={upgradeReason}
      />

      <Header 
        user={user}
        currentPlan={currentPlan}
        connectionStatus={connectionStatus}
        useLocalMode={useLocalMode}
        onLogout={handleLogout}
        onOpenSettings={() => { setAdminInitialView('USERS'); setShowAdmin(true); }}
        onOpenUpgrade={() => { setUpgradeReason(''); setShowUpgradeModal(true); }}
        onBackToLibrary={handleBackToLibrary}
      />

      <main className="max-w-7xl mx-auto px-6 py-12 flex-grow w-full">
        {!isApiKeyReady ? (
            <div className="flex h-[60vh] items-center justify-center text-slate-500 flex-col gap-4 animate-in fade-in duration-500">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
               <p>Initializing...</p>
            </div>
        ) : !user ? (
            <LoginScreen onLogin={handleLogin} />
        ) : (
            <>
                {isDatabaseSetupMissing && !showAdmin && (
                    <DatabaseStatusBanner 
                        onSetup={() => { setAdminInitialView('SETTINGS'); setAdminInitialSection('SCHEMA'); setShowAdmin(true); }} 
                    />
                )}

                {view === 'LIBRARY' && !isDatabaseSetupMissing && (
                    <ProjectList 
                        projects={projectsList} 
                        brands={brandsList}
                        onCreateNewProject={handleCreateNewProject} 
                        onCreateNewBrand={handleCreateNewBrand}
                        onSelectProject={handleSelectProject}
                        onDeleteProject={handleDeleteProject}
                        onDeleteBrand={handleDeleteBrand}
                        onEditBrand={handleEditBrand}
                        userName={user.name}
                    />
                )}

                {view === 'BRAND_CREATOR' && !isDatabaseSetupMissing && (
                    <BrandForm 
                        userId={user.id}
                        initialBrand={editingBrand || undefined}
                        onSave={handleSaveBrand}
                        onCancel={() => { setEditingBrand(null); setView('LIBRARY'); }}
                    />
                )}

                {view === 'EDITOR' && !isDatabaseSetupMissing && (
                    <>
                        {state === AppState.IDLE && (
                            <CreateAdForm 
                                onSubmit={handleCreateAdSubmit} 
                                onCancel={handleBackToLibrary}
                                isLoading={false}
                                brands={brandsList}
                            />
                        )}

                        {state === AppState.SCRIPTING && (
                            <CreateAdForm 
                                onSubmit={() => {}} 
                                onCancel={handleBackToLibrary}
                                isLoading={true} 
                                brands={brandsList}
                            />
                        )}

                        {state === AppState.REVIEW_SCRIPT && currentProject?.script && (
                            <ScriptView 
                                script={currentProject.script} 
                                productionConfig={currentProject.productionConfig}
                                onApprove={handleStartProduction} 
                                onUpdateScene={handleSceneUpdate}
                                onUpdateConfig={handleConfigUpdate}
                                onRegenerateScene={handleSceneRegenerate}
                                onRegenerateAll={handleScriptRegenerate}
                            />
                        )}

                        {state === AppState.PRODUCING && currentProject?.script && (
                            <>
                                {previewSceneId !== null && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
                                        <div className="w-full max-w-5xl">
                                            <AdPlayer 
                                                scenes={currentProject.script.scenes} 
                                                assets={currentProject.assets}
                                                initialSceneIndex={currentProject.script.scenes.findIndex(s => s.id === previewSceneId)}
                                                onClose={handleClosePreview}
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <ProductionDashboard 
                                    scenes={currentProject.script.scenes} 
                                    assets={currentProject.assets}
                                    onComplete={handleProductionComplete}
                                    onRetry={handleRetryAsset}
                                    onPreview={handlePreviewAsset}
                                />
                            </>
                        )}

                        {state === AppState.COMPLETED && currentProject?.script && (
                            <div className="space-y-8 animate-in fade-in duration-700">
                                {previewSceneId !== null && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
                                        <div className="w-full max-w-5xl">
                                            <AdPlayer 
                                                scenes={currentProject.script.scenes} 
                                                assets={currentProject.assets}
                                                initialSceneIndex={currentProject.script.scenes.findIndex(s => s.id === previewSceneId)}
                                                onClose={handleClosePreview}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="text-center">
                                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">Production Wrap!</h2>
                                    <p className="text-slate-400">Your ad is ready for preview.</p>
                                </div>
                                <AdPlayer 
                                    scenes={currentProject.script.scenes} 
                                    assets={currentProject.assets}
                                    productionConfig={currentProject.productionConfig}
                                />
                                
                                <div className="max-w-4xl mx-auto mt-8 px-4">
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                                        <Settings className="w-5 h-5 text-slate-400" />
                                        <h3 className="text-lg font-semibold text-slate-200">Asset Management</h3>
                                    </div>
                                    <ProductionDashboard 
                                        scenes={currentProject.script.scenes} 
                                        assets={currentProject.assets}
                                        onComplete={() => {}}
                                        onRetry={handleRetryAsset}
                                        onPreview={handlePreviewAsset}
                                        title=""
                                        hideProgress={true}
                                    />
                                </div>

                                <div className="flex justify-center mt-8 gap-6">
                                     <button 
                                        onClick={handleBackToLibrary}
                                        className="text-slate-400 hover:text-white underline"
                                     >
                                        Back to Library
                                     </button>
                                     <button 
                                        onClick={handleCreateNewProject}
                                        className="text-indigo-400 hover:text-indigo-300 font-bold"
                                     >
                                        Create Another Ad
                                     </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </>
        )}
      </main>

      <Footer />
    </div>
  );
}
