import { Scene, AssetStatus } from '../types';

export const exportService = {
  // Simple download helper
  downloadUrl: (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // Stitch all scenes into a single WebM video
  stitchAd: async (
    scenes: Scene[], 
    assets: AssetStatus[], 
    onProgress: (percent: number) => void
  ): Promise<Blob> => {
    
    // 1. Setup Canvas & Audio Context
    const canvas = document.createElement('canvas');
    // Set to 720p (Landscape) or adjust based on first asset if needed
    // Assuming 16:9 for now based on constants
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    if (!ctx) throw new Error("Could not create canvas context");

    // Fill black background initially
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    
    // 2. Prepare Recorder
    const canvasStream = canvas.captureStream(30); // 30 FPS
    // Add the audio track to the canvas stream
    if (dest.stream.getAudioTracks().length > 0) {
      canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
    }
    
    // Prefer VP9 for better quality/size, fallback to VP8 or default
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }
    
    if (!selectedMimeType) throw new Error("No supported MediaRecorder mimeType found.");

    const recorder = new MediaRecorder(canvasStream, { 
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    // 3. Sequencer Loop
    const totalScenes = scenes.length;
    
    try {
      for (let i = 0; i < totalScenes; i++) {
        const scene = scenes[i];
        const asset = assets.find(a => a.sceneId === scene.id);
        
        if (!asset || !asset.videoUrl || !asset.audioUrl) {
          console.warn(`Skipping incomplete scene ${scene.id}`);
          continue;
        }

        await playScene(ctx, audioCtx, dest, asset.videoUrl, asset.audioUrl);
        onProgress(Math.round(((i + 1) / totalScenes) * 100));
      }
    } catch (e) {
      console.error("Stitching failed", e);
      throw e;
    } finally {
      recorder.stop();
      audioCtx.close();
    }

    // 4. Return Result
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const fullBlob = new Blob(chunks, { type: selectedMimeType });
        resolve(fullBlob);
      };
    });
  }
};

// Helper to play a single scene's video and audio through the capture pipeline
async function playScene(
  ctx: CanvasRenderingContext2D, 
  audioCtx: AudioContext, 
  dest: MediaStreamAudioDestinationNode, 
  videoUrl: string, 
  audioUrl: string
): Promise<void> {
  
  return new Promise((resolve, reject) => {
    // Setup Video
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true; // We play audio separately via AudioContext
    video.playsInline = true;

    // Setup Audio
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.crossOrigin = 'anonymous';
    
    // Connect Audio to Destination
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(dest);

    // Sync Logic
    // We drive the timeline by the Audio, but ensure Video loops if shorter
    let animationFrameId: number;

    const draw = () => {
      if (video.readyState >= 2) {
        // Draw video frame to canvas
        // Maintain aspect ratio cover
        const hRatio = ctx.canvas.width / video.videoWidth;
        const vRatio = ctx.canvas.height / video.videoHeight;
        const ratio = Math.max(hRatio, vRatio);
        const centerShift_x = (ctx.canvas.width - video.videoWidth * ratio) / 2;
        const centerShift_y = (ctx.canvas.height - video.videoHeight * ratio) / 2;
        
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                      centerShift_x, centerShift_y, video.videoWidth * ratio, video.videoHeight * ratio);
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    // Load handlers
    let assetsLoaded = 0;
    const checkStart = () => {
      assetsLoaded++;
      if (assetsLoaded === 2) {
        video.play();
        audio.play();
        draw();
      }
    };

    video.onloadeddata = checkStart;
    audio.onloadeddata = checkStart;
    video.onerror = (e) => reject(new Error("Video load error"));
    audio.onerror = (e) => reject(new Error("Audio load error"));

    // End handler
    audio.onended = () => {
      cancelAnimationFrame(animationFrameId);
      video.pause();
      // Small buffer to ensure last frames are flushed
      setTimeout(() => {
        video.remove();
        audio.remove();
        source.disconnect();
        resolve();
      }, 100);
    };

    // Video Looping logic
    video.loop = true; 
  });
}
