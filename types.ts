
export enum AppState {
  IDLE = 'IDLE',
  SCRIPTING = 'SCRIPTING',
  REVIEW_SCRIPT = 'REVIEW_SCRIPT',
  PRODUCING = 'PRODUCING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Scene {
  id: number;
  visual_prompt: string;
  voiceover_text: string;
  estimated_duration: number; // in seconds
}

export interface AdScript {
  title: string;
  target_audience: string;
  scenes: Scene[];
}

export interface AssetStatus {
  sceneId: number;
  videoStatus: 'pending' | 'generating' | 'completed' | 'error';
  audioStatus: 'pending' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  audioUrl?: string; // Blob URL
  error?: string;
}

// --- Production / Polish Types (Phase 1) ---

export interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  mood: 'energetic' | 'calm' | 'corporate' | 'cinematic' | 'playful' | 'dramatic';
  url: string; // URL to mp3/wav
  duration: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom';
  styleId: string; // references a style constant
}

export interface AudioConfig {
  musicTrackId?: string;
  musicVolume: number; // 0.0 to 1.0
  voiceVolume: number; // 0.0 to 1.0
  duckingEnabled: boolean; // Lower music when VO plays
}

export interface ProductionConfig {
  audio: AudioConfig;
  // Keyed by Scene ID for granular control
  overlays: Record<number, TextOverlay[]>;
}

// --- Brand & Project Types ---

export interface BrandProduct {
  id: string;
  name: string;
  url: string;
}

export interface Brand {
  id: string;
  userId: string;
  name: string;
  website: string;
  about: string;
  category: string;
  targetAudience: string;
  logoLight?: string; // Blob URL
  logoDark?: string; // Blob URL
  products: BrandProduct[];
  updatedAt: number;
}

export interface SavedProject {
  id: string;
  userId: string;
  brandId?: string; // Optional link to a brand
  createdAt: number;
  updatedAt: number;
  name: string;
  description: string;
  script: AdScript | null;
  assets: AssetStatus[];
  status: AppState;
  productionConfig?: ProductionConfig; // New field for mixing/overlays
}

// --- SaaS Types ---

export type PlanType = 'free' | 'starter' | 'pro';

export interface Plan {
  id: string;
  code: PlanType;
  name: string;
  price: number; // in cents
  maxBrands: number;
  maxProjects: number;
  maxGenerationsPerMonth: number;
  maxVideosPerMonth: number;
  maxVideoDuration: number;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string; // references Plan.code (e.g., 'free')
  status: 'active' | 'past_due' | 'canceled';
  renewsAt: number;
}

export interface UsageStats {
  id?: string;
  userId: string;
  periodStart: number;
  periodEnd: number;
  adGenerationsUsed: number;
  videosRenderedUsed: number;
}

// --- Admin Types ---

export type AdminRole = 'super_admin' | 'admin' | 'support';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  lastLogin: number;
}

export interface VideoJob {
  id: string;
  userId: string;
  userEmail?: string;
  projectId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: 'veo' | 'gemini';
  createdAt: number;
  errorMessage?: string;
}

export interface SystemLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: number;
  metadata?: any;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
