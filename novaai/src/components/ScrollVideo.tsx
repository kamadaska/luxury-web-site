import { useEffect, useRef, useState } from 'react';
import { HERO_VIDEO_URL, HERO_POSTER_LOCAL } from '../lib/constants';

const MAX_FRAMES = 90;
const MIN_FRAMES = 24;
const FRAME_MAX_WIDTH = 960;
const LERP_FACTOR = 0.12;

/** Draws `source` onto `ctx` using object-cover math (scale to fill, center-crop). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  destW: number,
  destH: number
) {
  if (!sourceW || !sourceH) return;
  const scale = Math.max(destW / sourceW, destH / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const dx = (destW - drawW) / 2;
  const dy = (destH - drawH) / 2;
  ctx.drawImage(source, dx, dy, drawW, drawH);
}

export default function ScrollVideo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenVideoRef = useRef<HTMLVideoElement | null>(null);

  const framesRef = useRef<ImageBitmap[]>([]);
  const framesReadyRef = useRef(false);
  const progressRef = useRef(0);
  const smoothedRef = useRef(0);
  const lastSeekRef = useRef(-1);
  const rafRef = useRef<number | null>(null);

  const [posterVisible, setPosterVisible] = useState(true);
  const [videoVisible, setVideoVisible] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  // Scroll -> progress
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? window.scrollY / max : 0;
      progressRef.current = Math.min(1, Math.max(0, raw));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Build offscreen frame cache
  useEffect(() => {
    const visibleVideo = videoRef.current;
    if (!visibleVideo) return;

    let cancelled = false;

    const buildCache = async () => {
      const offVideo = document.createElement('video');
      offVideo.crossOrigin = 'anonymous';
      offVideo.muted = true;
      offVideo.playsInline = true;
      offVideo.preload = 'auto';
      offVideo.src = HERO_VIDEO_URL;
      offscreenVideoRef.current = offVideo;

      await new Promise<void>((resolve) => {
        const onMeta = () => resolve();
        offVideo.addEventListener('loadedmetadata', onMeta, { once: true });
        offVideo.load();
      });

      if (cancelled) return;

      const duration = offVideo.duration || 0;
      if (!duration || !Number.isFinite(duration)) return;

      const frameCount = Math.max(
        MIN_FRAMES,
        Math.min(MAX_FRAMES, Math.round(duration * 12))
      );

      const vw = offVideo.videoWidth || 1920;
      const vh = offVideo.videoHeight || 1080;
      const scale = Math.min(1, FRAME_MAX_WIDTH / vw);
      const cw = Math.round(vw * scale);
      const ch = Math.round(vh * scale);

      const scratch = document.createElement('canvas');
      scratch.width = cw;
      scratch.height = ch;
      const sctx = scratch.getContext('2d');
      if (!sctx) return;

      const bitmaps: ImageBitmap[] = [];

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        const t = (i / (frameCount - 1)) * Math.max(0, duration - 0.05);
        await new Promise<void>((resolve) => {
          const onSeeked = () => resolve();
          offVideo.addEventListener('seeked', onSeeked, { once: true });
          offVideo.currentTime = t;
        });
        if (cancelled) return;
        sctx.drawImage(offVideo, 0, 0, cw, ch);
        const bitmap = await createImageBitmap(scratch);
        bitmaps.push(bitmap);
      }

      if (cancelled) return;
      framesRef.current = bitmaps;
      framesReadyRef.current = true;
      setCanvasReady(true);
    };

    const start = () => {
      // Wait for the visible video's first decoded frame, then yield 300ms
      window.setTimeout(() => {
        if (!cancelled) buildCache();
      }, 300);
    };

    if (visibleVideo.readyState >= 2) {
      start();
    } else {
      visibleVideo.addEventListener('loadeddata', start, { once: true });
    }

    return () => {
      cancelled = true;
      offscreenVideoRef.current?.remove();
    };
  }, []);

  // Detect visible video's first frame (for poster crossfade)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoadedData = () => setHasFrame(true);
    video.addEventListener('loadeddata', onLoadedData);
    return () => video.removeEventListener('loadeddata', onLoadedData);
  }, []);

  // Poster fades once video has a frame or the cache is ready
  useEffect(() => {
    if (hasFrame || canvasReady) {
      const id = window.setTimeout(() => setPosterVisible(false), 0);
      return () => window.clearTimeout(id);
    }
  }, [hasFrame, canvasReady]);

  // Video layer fades once the canvas frame cache takes over
  useEffect(() => {
    setVideoVisible(!canvasReady);
  }, [canvasReady]);

  // rAF loop: lerp progress, draw canvas or seek fallback video
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      smoothedRef.current +=
        (progressRef.current - smoothedRef.current) * LERP_FACTOR;
      const smoothed = smoothedRef.current;

      if (framesReadyRef.current && framesRef.current.length > 0) {
        const frames = framesRef.current;
        const idx = Math.min(
          frames.length - 1,
          Math.max(0, Math.round(smoothed * (frames.length - 1)))
        );
        const bitmap = frames[idx];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCover(
          ctx,
          bitmap,
          bitmap.width,
          bitmap.height,
          canvas.width,
          canvas.height
        );
      } else {
        const video = videoRef.current;
        if (video && video.duration && Number.isFinite(video.duration)) {
          const target = smoothed * Math.max(0, video.duration - 0.05);
          if (Math.abs(target - lastSeekRef.current) > 0.04) {
            lastSeekRef.current = target;
            try {
              video.currentTime = target;
            } catch {
              /* ignore seek errors before metadata is ready */
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0a0a]"
      aria-hidden="true"
    >
      <img
        src={HERO_POSTER_LOCAL}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          posterVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          videoVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
          canvasReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
