
import { supabase } from './supabase';
import { User, VideoJob, SystemLog, PlanType, Plan, AdminRole } from '../types';
import { PLANS } from '../constants';

export const adminService = {
  
  // --- Dashboard Stats ---
  
  async getDashboardStats() {
    if (!supabase) return null;
    
    try {
        const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (userError && userError.code === '42P01') return { totalUsers: 0, totalProjects: 0, activeSubscribers: 0, mrr: 0 };

        const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
        const { count: activeSubs } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
        
        // Mock revenue calculation
        const mrr = (activeSubs || 0) * 19; 
        
        return {
          totalUsers: userCount || 0,
          totalProjects: projectCount || 0,
          activeSubscribers: activeSubs || 0,
          mrr
        };
    } catch (e) {
        // Quiet fail for missing tables
        return { totalUsers: 0, totalProjects: 0, activeSubscribers: 0, mrr: 0 };
    }
  },

  // --- Users ---
  
  async getUsers(): Promise<(User & { adminRole?: AdminRole })[]> {
    if (!supabase) return [];
    try {
        // Fetch users
        const { data: users, error } = await supabase.from('users').select('*');
        if (error) {
             if (error.code === '42P01') return [];
             throw error;
        }

        // Fetch admins to merge role data
        // We catch here separately in case users table exists but admins doesn't (rare but possible)
        let admins: any[] = [];
        try {
            const { data } = await supabase.from('admins').select('id, role');
            admins = data || [];
        } catch {}
        
        const adminMap = new Map((admins || []).map((a: any) => [a.id, a.role]));

        return (users || []).map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            adminRole: adminMap.get(u.id)
        }));
    } catch (e) {
        return [];
    }
  },

  async updateUserStatus(userId: string, status: 'active' | 'banned'): Promise<void> {
    if (!supabase) return;
    // In a real app, this might involve updating auth.users via an edge function
    // Here we simulate by updating a metadata field or a status column in public.users
    // For now, we'll just log it as we don't have a status column in the minimal schema
    await this.logAction('UPDATE_USER_STATUS', userId, { status });
    console.log(`Updated user ${userId} to ${status}`);
  },

  async updateUserRole(userId: string, role: AdminRole | 'customer'): Promise<void> {
    if (!supabase) return;

    if (role === 'customer') {
        // Remove from admins table
        await supabase.from('admins').delete().eq('id', userId);
    } else {
        // Upsert into admins table
        await supabase.from('admins').upsert({ id: userId, role });
    }
    await this.logAction('UPDATE_USER_ROLE', userId, { role });
  },
  
  // --- Video Jobs ---
  
  async getRecentJobs(): Promise<VideoJob[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('video_jobs').select('*').order('created_at', { ascending: false }).limit(50);
        if (error && error.code === '42P01') return [];
        
        return (data || []).map((j: any) => ({
          id: j.id,
          userId: j.user_id,
          projectId: j.project_id,
          status: j.status,
          provider: j.provider,
          createdAt: new Date(j.created_at).getTime(),
          errorMessage: j.error_message
        }));
    } catch (e) {
        return [];
    }
  },

  async retryJob(jobId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from('video_jobs')
      .update({ status: 'pending', error_message: null, created_at: new Date().toISOString() })
      .eq('id', jobId);
    
    if (error) throw error;
    await this.logAction('RETRY_JOB', jobId);
  },

  // --- Plans ---

  async getPlans(): Promise<Plan[]> {
    if (!supabase) return Object.values(PLANS); // Fallback to constants if offline
    try {
        const { data, error } = await supabase.from('plans').select('*');
        if (error && error.code === '42P01') return Object.values(PLANS);
        if (!data || data.length === 0) return Object.values(PLANS);
        
        return data.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price_cents,
        maxBrands: p.max_brands,
        maxProjects: p.max_projects,
        maxGenerationsPerMonth: p.max_gens_mo,
        maxVideosPerMonth: p.max_videos_mo,
        maxVideoDuration: 60, // Default
        features: [] 
        }));
    } catch {
        return Object.values(PLANS);
    }
  },

  async updatePlan(planId: string, updates: Partial<Plan>): Promise<void> {
    if (!supabase) return;
    const dbUpdates = {
       price_cents: updates.price,
       max_brands: updates.maxBrands,
       max_projects: updates.maxProjects,
       max_gens_mo: updates.maxGenerationsPerMonth,
       max_videos_mo: updates.maxVideosPerMonth
    };
    // Remove undefined
    Object.keys(dbUpdates).forEach(key => (dbUpdates as any)[key] === undefined && delete (dbUpdates as any)[key]);

    await supabase.from('plans').update(dbUpdates).eq('id', planId);
    await this.logAction('UPDATE_PLAN', planId, updates);
  },

  // --- System Settings ---

  async getSystemSetting(key: string): Promise<any> {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).single();
        if (error) return null;
        return data.value;
    } catch {
        return null;
    }
  },

  async saveSystemSetting(key: string, value: any, description?: string): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from('system_settings').upsert({
            key,
            value,
            description,
            updated_at: new Date().toISOString()
        });
        await this.logAction('UPDATE_SETTING', key);
    } catch (e) {
        console.error("Failed to save setting", e);
    }
  },

  // --- Audit ---

  async logAction(action: string, targetId: string, metadata?: any) {
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Best effort log
        await supabase.from('admin_audit_logs').insert({
          actor_id: user.id,
          action,
          target_id: targetId,
          metadata
        });
    } catch (e) {
        // Ignore audit failure
    }
  }
};
