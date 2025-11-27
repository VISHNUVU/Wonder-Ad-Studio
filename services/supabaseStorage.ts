
import { SavedProject, Brand, User, Subscription, UsageStats, MusicTrack } from '../types';
import { supabase } from './supabase';

const ASSETS_BUCKET = 'assets';

// Helpers
const mapProjectFromDB = (data: any): SavedProject => ({
  id: data.id,
  userId: data.user_id,
  brandId: data.brand_id,
  name: data.name,
  description: data.description,
  script: data.script,
  assets: data.assets || [],
  productionConfig: data.production_config, // Map new field
  status: data.status,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

const mapBrandFromDB = (data: any): Brand => ({
  id: data.id,
  userId: data.user_id,
  name: data.name,
  website: data.website || '',
  about: data.about || '',
  category: data.category || '',
  targetAudience: data.target_audience || '',
  products: data.products || [],
  logoLight: data.logo_light,
  logoDark: data.logo_dark,
  updatedAt: data.updated_at
});

export class SupabaseStorageService {
  
  // --- Upload Helper ---
  
  private async uploadFile(fileUrl: string, path: string): Promise<string | null> {
    if (!fileUrl.startsWith('blob:')) return fileUrl; 
    if (!supabase) throw new Error("Supabase not initialized");

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const type = blob.type.split('/')[1] || 'bin';
      const finalPath = `${path}.${type}`;

      const { error } = await supabase.storage
        .from(ASSETS_BUCKET)
        .upload(finalPath, blob, { upsert: true });

      if (error) {
          throw error; // Throw the actual Supabase error object
      }

      const { data: { publicUrl } } = supabase.storage
        .from(ASSETS_BUCKET)
        .getPublicUrl(finalPath);
        
      return publicUrl;
    } catch (e: any) {
      // Throw with a descriptive message so the UI can parse "Bucket not found"
      throw new Error(`Upload failed: ${e.message || e.error_description || JSON.stringify(e)}`);
    }
  }

  // --- Projects ---

  async saveProject(project: SavedProject): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");

    const projectToSave = { ...project };
    
    // We upload files sequentially to catch errors properly
    // Using a simple loop or Promise.all is fine, but we need to propagate errors
    const processedAssets = await Promise.all(projectToSave.assets.map(async (asset) => {
      const newAsset = { ...asset };
      if (asset.videoUrl) {
         const url = await this.uploadFile(asset.videoUrl, `${project.userId}/${project.id}/scene_${asset.sceneId}_video`);
         if (url) newAsset.videoUrl = url;
      }
      if (asset.audioUrl) {
         const url = await this.uploadFile(asset.audioUrl, `${project.userId}/${project.id}/scene_${asset.sceneId}_audio`);
         if (url) newAsset.audioUrl = url;
      }
      return newAsset;
    }));

    projectToSave.assets = processedAssets;
    projectToSave.updatedAt = Date.now();

    const { error } = await supabase.from('projects').upsert({
      id: projectToSave.id,
      user_id: projectToSave.userId,
      brand_id: projectToSave.brandId,
      name: projectToSave.name,
      description: projectToSave.description,
      script: projectToSave.script,
      assets: projectToSave.assets,
      production_config: projectToSave.productionConfig, // Save new field
      status: projectToSave.status,
      created_at: projectToSave.createdAt,
      updated_at: projectToSave.updatedAt
    });

    if (error) throw error;
  }

  async getProjects(userId: string): Promise<SavedProject[]> {
    if (!supabase) throw new Error("Supabase not initialized");

    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error; // Pass error up to caller
    return (data || []).map(mapProjectFromDB);
  }

  async loadProject(id: string): Promise<SavedProject | null> {
    if (!supabase) throw new Error("Supabase not initialized");
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) return null;
    return mapProjectFromDB(data);
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  // --- Brands ---

  async saveBrand(brand: Brand): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");

    let logoLightUrl = brand.logoLight;
    let logoDarkUrl = brand.logoDark;

    // Use try-catch around individual uploads if you want partial success, 
    // but here we want to fail if upload fails (e.g. Bucket missing)
    if (brand.logoLight) {
        logoLightUrl = await this.uploadFile(brand.logoLight, `${brand.userId}/brands/${brand.id}/logo_light`) || undefined;
    }
    if (brand.logoDark) {
        logoDarkUrl = await this.uploadFile(brand.logoDark, `${brand.userId}/brands/${brand.id}/logo_dark`) || undefined;
    }

    const { error } = await supabase.from('brands').upsert({
      id: brand.id,
      user_id: brand.userId,
      name: brand.name,
      website: brand.website,
      about: brand.about,
      category: brand.category,
      target_audience: brand.targetAudience,
      products: brand.products,
      logo_light: logoLightUrl,
      logo_dark: logoDarkUrl,
      updated_at: Date.now()
    });

    if (error) throw error;
  }

  async getBrands(userId: string): Promise<Brand[]> {
    if (!supabase) throw new Error("Supabase not initialized");
    const { data, error } = await supabase.from('brands').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapBrandFromDB);
  }

  async deleteBrand(id: string, userId: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");
    const { error } = await supabase.from('brands').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  // --- SaaS Methods ---

  async getSubscription(userId: string): Promise<Subscription | null> {
    if (!supabase) throw new Error("Supabase not initialized");
    try {
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
      if (error) return null;
      return {
        id: data.id,
        userId: data.user_id,
        planId: data.plan_code,
        status: data.status,
        renewsAt: data.renews_at
      };
    } catch (e) {
      return null;
    }
  }

  async saveSubscription(subscription: Subscription): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");
    await supabase.from('subscriptions').upsert({
        id: subscription.id,
        user_id: subscription.userId,
        plan_code: subscription.planId,
        status: subscription.status,
        renews_at: subscription.renewsAt
    });
  }

  async getUsage(userId: string): Promise<UsageStats | null> {
    if (!supabase) throw new Error("Supabase not initialized");
    try {
      // Get usage for current month essentially
      const { data, error } = await supabase.from('usage_counters').select('*').eq('user_id', userId).order('period_start', {ascending: false}).limit(1).single();
      if (error) return null;
      return {
          id: data.id,
          userId: data.user_id,
          periodStart: data.period_start,
          periodEnd: data.period_end,
          adGenerationsUsed: data.ad_gens_used,
          videosRenderedUsed: data.videos_used
      };
    } catch(e) {
      return null;
    }
  }

  async saveUsage(usage: UsageStats): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");
    await supabase.from('usage_counters').upsert({
        id: usage.id,
        user_id: usage.userId,
        period_start: usage.periodStart,
        period_end: usage.periodEnd,
        ad_gens_used: usage.adGenerationsUsed,
        videos_used: usage.videosRenderedUsed
    });
  }
  
  // --- Music Library (Phase 2) ---
  
  async getMusicTracks(): Promise<MusicTrack[]> {
    if (!supabase) throw new Error("Supabase not initialized");
    try {
        const { data, error } = await supabase.from('music_library').select('*');
        if (error || !data) return [];
        
        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            genre: t.genre,
            mood: t.mood,
            url: t.url,
            duration: t.duration
        }));
    } catch {
        return [];
    }
  }

  // --- Users ---
  async createUser(user: User, password?: string): Promise<void> {}
  async getUserByEmail(email: string): Promise<any> { return null; }
}

export const supabaseStorageService = new SupabaseStorageService();
