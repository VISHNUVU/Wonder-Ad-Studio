
import { Plan, Subscription, UsageStats, PlanType } from '../types';
import { PLANS } from '../constants';
import { StorageService } from './storage';
import { SupabaseStorageService } from './supabaseStorage';

export class SubscriptionManager {
  private storage: StorageService | SupabaseStorageService;

  constructor(storage: StorageService | SupabaseStorageService) {
    this.storage = storage;
  }

  // Get or Initialize Subscription
  async ensureSubscription(userId: string): Promise<{ sub: Subscription, usage: UsageStats }> {
    let sub = await this.storage.getSubscription(userId);
    let usage = await this.storage.getUsage(userId);
    
    // Default to FREE plan if missing
    if (!sub) {
      sub = {
        id: crypto.randomUUID(),
        userId,
        planId: 'free',
        status: 'active',
        renewsAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // +30 days
      };
      await this.storage.saveSubscription(sub);
    }

    // Default usage if missing or expired (simple monthly check)
    const now = Date.now();
    if (!usage || usage.periodEnd < now) {
       usage = {
           id: crypto.randomUUID(),
           userId,
           periodStart: now,
           periodEnd: now + 30 * 24 * 60 * 60 * 1000,
           adGenerationsUsed: 0,
           videosRenderedUsed: 0
       };
       await this.storage.saveUsage(usage);
    }

    return { sub, usage };
  }

  // Check Limits
  async checkLimit(
    userId: string, 
    type: 'brands' | 'projects' | 'generations' | 'videos', 
    currentCount: number = 0
  ): Promise<{ allowed: boolean, limit: number, current: number, planName: string }> {
    
    const { sub, usage } = await this.ensureSubscription(userId);
    const plan = PLANS[sub.planId] || PLANS['free'];

    let allowed = true;
    let limit = 0;
    let current = currentCount;

    switch (type) {
        case 'brands':
            limit = plan.maxBrands;
            // For brands/projects we rely on the passed count from DB
            if (currentCount >= limit) allowed = false;
            break;
        case 'projects':
            limit = plan.maxProjects;
            if (currentCount >= limit) allowed = false;
            break;
        case 'generations':
            limit = plan.maxGenerationsPerMonth;
            current = usage.adGenerationsUsed;
            if (current >= limit) allowed = false;
            break;
        case 'videos':
            limit = plan.maxVideosPerMonth;
            current = usage.videosRenderedUsed;
            if (current >= limit) allowed = false;
            break;
    }

    return { allowed, limit, current, planName: plan.name };
  }

  async incrementUsage(userId: string, type: 'generations' | 'videos'): Promise<void> {
    const { usage } = await this.ensureSubscription(userId);
    if (type === 'generations') usage.adGenerationsUsed += 1;
    if (type === 'videos') usage.videosRenderedUsed += 1;
    await this.storage.saveUsage(usage);
  }

  async upgradePlan(userId: string, newPlanCode: PlanType): Promise<void> {
    // In a real app, this triggers Stripe Checkout.
    // For this demo/local/supabase setup, we just update the DB record instantly.
    const { sub } = await this.ensureSubscription(userId);
    sub.planId = newPlanCode;
    sub.renewsAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await this.storage.saveSubscription(sub);
  }
}
