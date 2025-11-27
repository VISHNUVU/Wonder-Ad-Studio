
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MODEL_SCRIPT, MODEL_SCRIPT_FALLBACK, MODEL_VIDEO, MODEL_AUDIO, SYSTEM_INSTRUCTION_SCRIPT, SCRIPT_THINKING_BUDGET, VIDEO_ASPECT_RATIO, VIDEO_RESOLUTION } from "../constants";
import { AdScript, Scene, Brand } from "../types";
import { adminService } from "./admin";

// Helper to decode audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export class GeminiService {
  private apiKey: string;
  private genAI: GoogleGenAI;

  constructor() {
    this.apiKey = process.env.API_KEY || '';
    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
  }

  // Check if we need to select a key or use platform key
  async ensureApiKey(): Promise<void> {
    // 1. Try env key first (automatic)
    if (process.env.API_KEY) {
        this.apiKey = process.env.API_KEY;
        this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
        return;
    }

    // 2. Try Platform Key from Admin Settings (Managed Service)
    try {
        const platformKey = await adminService.getSystemSetting('google_api_key');
        if (platformKey && !platformKey.startsWith('***')) {
            this.apiKey = platformKey;
            this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
            return;
        }
    } catch {}

    // 3. Fallback to existing or empty
    this.apiKey = process.env.API_KEY || '';
    this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async generateScript(productName: string, description: string, brand?: Brand, voiceoverStyle: string = 'professional'): Promise<AdScript> {
    let contextPrompt = `Product/Campaign: ${productName}\nCampaign Goal: ${description}\nVOICEOVER STYLE: ${voiceoverStyle}\n\n`;
    
    if (brand) {
        const productCatalog = brand.products.length > 0 
            ? brand.products.map(p => `• ${p.name} (${p.url})`).join('\n') 
            : "No specific catalog provided.";

        contextPrompt += `
        BRAND IDENTITY & CONTEXT:
        =========================
        Brand Name: ${brand.name}
        Industry/Category: ${brand.category}
        Target Audience: ${brand.targetAudience}
        Website: ${brand.website}
        
        About the Brand:
        ${brand.about}
        
        Key Products in Portfolio:
        ${productCatalog}
        =========================
        
        INSTRUCTIONS:
        1. Align the script tone with the brand's identity defined above.
        2. Speak directly to the specified target audience.
        3. If the campaign goal mentions other products, refer to the catalog context accurately.
        `;
    }

    const prompt = `${contextPrompt}\n\nTASK: Create a 60+ second video ad script. The voiceover text must strictly follow the requested tone: ${voiceoverStyle}.`;
    
    try {
        // Try Primary Model (Pro)
        const response = await this.genAI.models.generateContent({
          model: MODEL_SCRIPT,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: SCRIPT_THINKING_BUDGET },
            responseMimeType: "application/json",
            responseSchema: this.getScriptSchema(),
            systemInstruction: SYSTEM_INSTRUCTION_SCRIPT
          }
        });

        if (!response.text) throw new Error("No script generated");
        return JSON.parse(response.text) as AdScript;

    } catch (e: any) {
        // Fallback Strategy for Quota/Rate Limits
        if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn("Primary model quota exceeded. Falling back to Flash model.");
            
            const fallbackResponse = await this.genAI.models.generateContent({
                model: MODEL_SCRIPT_FALLBACK, // gemini-2.5-flash
                contents: prompt,
                config: {
                    // Flash doesn't support thinkingConfig usually, or has different limits
                    responseMimeType: "application/json",
                    responseSchema: this.getScriptSchema(),
                    systemInstruction: SYSTEM_INSTRUCTION_SCRIPT
                }
            });
            
            if (!fallbackResponse.text) throw new Error("Fallback script generation failed");
            return JSON.parse(fallbackResponse.text) as AdScript;
        }
        throw e;
    }
  }

  async rewriteScene(scene: Scene): Promise<Scene> {
    const prompt = `
      You are a creative director. Rewrite this specific scene for a video commercial to be more engaging, cinematic, and clear.
      Maintain the same ID and approximate duration.
      
      Current Scene JSON:
      ${JSON.stringify(scene)}
      
      Return ONLY the raw JSON object for the updated scene.
    `;

    try {
        const response = await this.genAI.models.generateContent({
            model: MODEL_SCRIPT, 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: this.getSceneSchema()
            }
        });

        if (!response.text) throw new Error("Failed to rewrite scene");
        return JSON.parse(response.text) as Scene;

    } catch (e: any) {
        if (e.message?.includes('429') || e.message?.includes('quota')) {
             console.warn("Primary model quota exceeded. Falling back to Flash for rewrite.");
             const fallbackResponse = await this.genAI.models.generateContent({
                model: MODEL_SCRIPT_FALLBACK, 
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: this.getSceneSchema()
                }
            });
            if (!fallbackResponse.text) throw new Error("Fallback rewrite failed");
            return JSON.parse(fallbackResponse.text) as Scene;
        }
        throw e;
    }
  }

  async generateVideo(prompt: string): Promise<string> {
    // Veo check
    if (window.aistudio?.hasSelectedApiKey) {
       // Ensure fresh client with latest key
       this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    let operation = await this.genAI.models.generateVideos({
      model: MODEL_VIDEO,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: VIDEO_RESOLUTION,
        aspectRatio: VIDEO_ASPECT_RATIO
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await this.genAI.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to return a URI");

    // Fetch the actual video bytes using the key
    const fetchResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!fetchResponse.ok) throw new Error("Failed to download video bytes");
    
    const blob = await fetchResponse.blob();
    return URL.createObjectURL(blob);
  }

  async generateSpeech(text: string): Promise<string> {
    const response = await this.genAI.models.generateContent({
      model: MODEL_AUDIO,
      contents: {
        parts: [{ text: text }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Deep, commercial voice
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const audioBytes = decode(base64Audio);
    
    return this.pcmToWavUrl(audioBytes, 24000);
  }

  // Helper schemas to keep code clean
  private getScriptSchema() {
      return {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            target_audience: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: this.getSceneSchema()
            }
          },
          required: ["title", "target_audience", "scenes"]
        };
  }

  private getSceneSchema() {
      return {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          visual_prompt: { type: Type.STRING },
          voiceover_text: { type: Type.STRING },
          estimated_duration: { type: Type.INTEGER }
        },
        required: ["id", "visual_prompt", "voiceover_text", "estimated_duration"]
      };
  }

  private pcmToWavUrl(pcmData: Uint8Array, sampleRate: number): string {
    const numChannels = 1;
    const bitsPerSample = 16; 
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    const blob = new Blob([header, pcmData], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const geminiService = new GeminiService();
