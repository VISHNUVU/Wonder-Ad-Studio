
import { Plan, MusicTrack } from './types';

// Models
export const MODEL_SCRIPT = 'gemini-3-pro-preview';
export const MODEL_SCRIPT_FALLBACK = 'gemini-2.5-flash';
export const MODEL_VIDEO = 'veo-3.1-fast-generate-preview';
export const MODEL_AUDIO = 'gemini-2.5-flash-preview-tts';

// Configuration
export const SCRIPT_THINKING_BUDGET = 32768; // Max for Pro
export const VIDEO_ASPECT_RATIO = '16:9';
export const VIDEO_RESOLUTION = '720p'; // Fast preview

// SaaS Plans
export const PLANS: Record<string, Plan> = {
  free: {
    id: 'plan_free',
    code: 'free',
    name: 'Free Tier',
    price: 0,
    maxBrands: 1,
    maxProjects: 3,
    maxGenerationsPerMonth: 5,
    maxVideosPerMonth: 1, // Full render limit (or scene limit conceptually)
    maxVideoDuration: 30,
    features: ['1 Brand Profile', '5 AI Script Gens/mo', 'Standard Queue', 'Watermarked']
  },
  starter: {
    id: 'plan_starter',
    code: 'starter',
    name: 'Starter',
    price: 1900, // $19.00
    maxBrands: 5,
    maxProjects: 50,
    maxGenerationsPerMonth: 50,
    maxVideosPerMonth: 10,
    maxVideoDuration: 60,
    features: ['5 Brand Profiles', '50 AI Script Gens/mo', '10 Video Renders/mo', 'Priority Support']
  },
  pro: {
    id: 'plan_pro',
    code: 'pro',
    name: 'Pro Agency',
    price: 4900, // $49.00
    maxBrands: 9999,
    maxProjects: 9999,
    maxGenerationsPerMonth: 500,
    maxVideosPerMonth: 50,
    maxVideoDuration: 120,
    features: ['Unlimited Brands', '500 AI Script Gens/mo', '50 Video Renders/mo', 'Fastest Veo Generation', 'Commercial License']
  }
};

// Stock Assets (Phase 1 Blueprint)
export const STOCK_MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: 'track_corporate',
    name: 'Success Driven',
    genre: 'Corporate',
    mood: 'corporate',
    url: '', // Placeholder: In real app, these would be CDN links
    duration: 120
  },
  {
    id: 'track_cinematic',
    name: 'Epic Horizon',
    genre: 'Orchestral',
    mood: 'cinematic',
    url: '',
    duration: 120
  },
  {
    id: 'track_chill',
    name: 'LoFi Study',
    genre: 'LoFi',
    mood: 'calm',
    url: '',
    duration: 120
  },
  {
    id: 'track_upbeat',
    name: 'Sunny Day',
    genre: 'Pop',
    mood: 'playful',
    url: '',
    duration: 120
  },
  {
    id: 'track_rock',
    name: 'High Energy',
    genre: 'Rock',
    mood: 'energetic',
    url: '',
    duration: 120
  },
  {
    id: 'track_dramatic',
    name: 'Suspense Builder',
    genre: 'Ambient',
    mood: 'dramatic',
    url: '',
    duration: 120
  }
];

export const TEXT_STYLES = {
  modern: {
    id: 'modern',
    label: 'Modern Clean',
    fontFamily: 'Inter, sans-serif',
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: '8px',
    padding: '8px 16px'
  },
  bold: {
    id: 'bold',
    label: 'Bold Impact',
    fontFamily: 'Impact, sans-serif',
    color: '#ffffff',
    textShadow: '2px 2px 0px #000000',
    backgroundColor: 'transparent'
  },
  minimal: {
    id: 'minimal',
    label: 'Minimalist',
    fontFamily: 'Inter, sans-serif',
    color: '#000000',
    backgroundColor: '#ffffff',
    padding: '4px 12px',
    borderRadius: '2px'
  }
};


// Prompts
export const SYSTEM_INSTRUCTION_SCRIPT = `
You are an award-winning Creative Director for a high-end advertising agency. 
Your goal is to write a compelling, detailed commercial script for a video ad that is AT LEAST 60 seconds long.
Break the ad down into exactly 6 scenes. Each scene should be approximately 10-12 seconds.
Return the result strictly as a JSON object with the following schema:
{
  "title": "Ad Title",
  "target_audience": "Target Audience Summary",
  "scenes": [
    {
      "id": 1,
      "visual_prompt": "Detailed visual description for video generation AI (Veo). Focus on lighting, movement, and subject.",
      "voiceover_text": "The spoken words for this scene.",
      "estimated_duration": 10
    }
  ]
}
ENSURE the 'visual_prompt' is descriptive and optimized for generative video (e.g., 'Cinematic shot of...', 'Drone view of...').
`;

// Templates
export const AD_TEMPLATES = [
  {
    id: 'launch',
    label: 'Product Launch',
    iconName: 'Rocket',
    description: 'High energy reveal for new products',
    defaultDescription: "Announce the grand launch of [Product Name]. Start with a mystery tease, then reveal the product with dynamic lighting. Highlight its key features: [Feature 1], [Feature 2]. The vibe should be groundbreaking, futuristic, and exciting.",
    defaultVoiceover: 'energetic'
  },
  {
    id: 'explainer',
    label: 'Problem & Solution',
    iconName: 'Lightbulb',
    description: 'Educational walk-through',
    defaultDescription: "Start by showing the common frustration of [Problem]. Then introduce [Product Name] as the ultimate solution. Explain how it works in 3 simple steps. Close with a clear call to action.",
    defaultVoiceover: 'professional'
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle Demo',
    iconName: 'Smile',
    description: 'Relatable, real-life usage',
    defaultDescription: "Showcase [Product Name] being used in a daily life setting by happy people. Focus on the joy, convenience, and emotional benefits it brings. Bright, sunny, and authentic visuals.",
    defaultVoiceover: 'friendly'
  },
  {
    id: 'cinematic',
    label: 'Cinematic Brand',
    iconName: 'Film',
    description: 'High-end visual storytelling',
    defaultDescription: "Create a moody, cinematic visual experience for [Brand Name]. Focus on textures, slow-motion shots, abstract lighting, and emotion. Minimal dialogue, maximum visual impact to build brand prestige.",
    defaultVoiceover: 'dramatic'
  }
];
