'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CubeScanner.module.css';
import {
  FACE_ORDER,
  FACE_NAMES,
  FACE_INSTRUCTIONS,
  FACE_CSS_COLORS,
  FaceColor,
  CubeFace,
  sampleFaceColors,
  classifyColor,
  FACE_LABELS,
  FACE_DIRECTIONS,
} from '@/lib/cubeUtils';

interface CubeScannerProps {
  onFaceScanned: (face: FaceColor, colors: CubeFace) => void;
  scannedFaces: Set<FaceColor>;
  currentFaceIndex: number;
}

const SELECTED_BORDER_COLORS: Record<FaceColor, string> = {
  U: '#c8c8d0', // Slightly darker white/gray
  R: '#dc2626', // Slightly darker red
  F: '#16a34a', // Slightly darker green
  D: '#ca8a04', // Slightly darker yellow
  L: '#ea580c', // Slightly darker orange
  B: '#2563eb', // Slightly darker blue
};

export default function CubeScanner({ onFaceScanned, scannedFaces, currentFaceIndex }: CubeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const stableFramesRef = useRef<number>(0);
  const lastColorsRef = useRef<string>('');

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [capturedColors, setCapturedColors] = useState<FaceColor[] | null>(null);
  const [previewColors, setPreviewColors] = useState<FaceColor[]>(Array(9).fill('U') as FaceColor[]);
  const [confirmMode, setConfirmMode] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [selectedBrush, setSelectedBrush] = useState<FaceColor>('U');

  const currentFace = FACE_ORDER[currentFaceIndex];

  const startCamera = useCallback(async (retryCount = 0) => {
    setCameraLoading(true);
    setCameraError(null);
    setConfirmMode(false);
    setCapturedColors(null);
    stableFramesRef.current = 0;
    lastColorsRef.current = '';

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraLoading(false);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === 'AbortError') return;
      if (e.name === 'NotReadableError' || e.message.includes('Could not start video source')) {
        if (retryCount < 2) {
          setTimeout(() => startCamera(retryCount + 1), 500);
          return;
        }
      }
      if (e.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera: ' + e.message);
      }
      setCameraLoading(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [startCamera]);

  // Screen Wake Lock API: keep screen awake and bright during scan phase
  useEffect(() => {
    let wakeLock: any = null;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Screen Wake Lock failed:', err);
      }
    }

    requestWakeLock();

    // Re-acquire lock if tab visibility changes (e.g. user toggles app back and forth)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        wakeLock.release().catch((e: any) => console.error('Wake lock release error:', e));
      }
    };
  }, []);

  // Live preview: sample colours every frame
  useEffect(() => {
    if (confirmMode) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const sample = () => {
      if (video.readyState < 2) { animFrameRef.current = requestAnimationFrame(sample); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const boxSize = Math.min(vw, vh) * 0.45;
      const boxX = (vw - boxSize) / 2;
      const boxY = (vh - boxSize) / 2;

      const imageData = ctx.getImageData(0, 0, vw, vh);
      const colors = sampleFaceColors(imageData, boxX, boxY, boxSize);
      setPreviewColors(colors);

      // Auto-capture when stable for 22 frames (approx. 0.75 seconds)
      const colorsStr = colors.join('');
      if (colorsStr === lastColorsRef.current) {
        stableFramesRef.current += 1;
        if (stableFramesRef.current > 22) {
          setCapturedColors(colors);
          setConfirmMode(true);
          cancelAnimationFrame(animFrameRef.current);
          return;
        }
      } else {
        stableFramesRef.current = 0;
        lastColorsRef.current = colorsStr;
      }

      animFrameRef.current = requestAnimationFrame(sample);
    };
    animFrameRef.current = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [confirmMode, cameraLoading]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const boxSize = Math.min(vw, vh) * 0.45;
    const boxX = (vw - boxSize) / 2;
    const boxY = (vh - boxSize) / 2;

    const imageData = ctx.getImageData(0, 0, vw, vh);
    const colors = sampleFaceColors(imageData, boxX, boxY, boxSize);
    setCapturedColors(colors);
    setConfirmMode(true);
    cancelAnimationFrame(animFrameRef.current);
  };

  const handleConfirm = () => {
    if (!capturedColors) return;
    onFaceScanned(currentFace, capturedColors as CubeFace);
    setConfirmMode(false);
    setCapturedColors(null);
    stableFramesRef.current = 0;
    lastColorsRef.current = '';
  };

  const handleRetake = () => {
    setConfirmMode(false);
    setCapturedColors(null);
    stableFramesRef.current = 0;
    lastColorsRef.current = '';
  };

  const handleColorChange = (index: number, color: FaceColor) => {
    if (!capturedColors) return;
    const updated = [...capturedColors] as FaceColor[];
    updated[index] = color;
    setCapturedColors(updated);
  };

  const colors = confirmMode ? (capturedColors || previewColors) : previewColors;

  return (
    <div className={styles.scanner}>

      {/* ── Camera area ── */}
      <div className={styles.cameraSection}>

        {/* Loading */}
        {cameraLoading && !cameraError && (
          <div className={styles.cameraOverlay}>
            <div className="spinner spinner-lg" />
            <p className="text-secondary">Starting camera…</p>
          </div>
        )}

        {/* Error */}
        {cameraError && (
          <div className={styles.cameraOverlay}>
            <div className={`alert alert-error ${styles.cameraAlert}`}>
              <span>⚠</span>
              <span>{cameraError}</span>
            </div>
            <button className="btn btn-secondary" onClick={() => startCamera(0)}>Try Again</button>
          </div>
        )}

        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          style={{ display: cameraLoading || cameraError ? 'none' : 'block' }}
        />
        <canvas ref={canvasRef} className={styles.hiddenCanvas} />

        {/* Alignment overlay — centred on the camera feed */}
        {!cameraLoading && !cameraError && (
          <div className={styles.scanOverlay}>
            <div className={styles.scanBox}>
              <div className={`${styles.corner} ${styles.cornerTL}`} />
              <div className={`${styles.corner} ${styles.cornerTR}`} />
              <div className={`${styles.corner} ${styles.cornerBL}`} />
              <div className={`${styles.corner} ${styles.cornerBR}`} />
              <div className={styles.grid}>
                {Array(9).fill(null).map((_, i) => (
                  <div key={i} className={styles.gridCell} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Face label */}
        {!cameraLoading && !cameraError && (
          <div className={styles.faceLabel}>
            <span className={styles.faceDot} style={{ background: FACE_CSS_COLORS[currentFace] }} />
            <span>Scanning: <strong>{FACE_NAMES[currentFace]}</strong></span>
          </div>
        )}

        {/* Camera flip */}
        {!cameraError && (
          <button
            className={`btn btn-ghost btn-icon ${styles.flipBtn}`}
            onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
            title="Flip camera"
          >
            🔄
          </button>
        )}
      </div>

      {/* ── Bottom panel: colour grid + controls ── */}
      {!cameraLoading && !cameraError && (
        <div className={styles.bottomPanel}>

          {/* 3×3 swatch grid */}
          <div className={styles.colorGridWrap}>
            <div className={styles.colorGrid}>
              {colors.map((color, i) => (
                <div key={i} className={styles.colorCell}>
                  <div
                    className={styles.colorSwatch}
                    style={{
                      background: FACE_CSS_COLORS[color],
                      cursor: confirmMode ? 'pointer' : 'default',
                    }}
                    onClick={() => confirmMode && handleColorChange(i, selectedBrush)}
                    title={confirmMode ? `Paint ${FACE_DIRECTIONS[selectedBrush]}` : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Controls sit directly below the live grid, same width */}
            <div className={styles.controlsCol}>
              {confirmMode ? (
                <>
                  <p className={styles.controlsLabel}>Review &amp; correct:</p>
                  <div className={styles.colorPalette}>
                    {FACE_ORDER.map(f => {
                      const isSelected = selectedBrush === f;
                      return (
                        <button
                          key={f}
                          className={`${styles.brushSwatch} ${isSelected ? styles.selectedBrush : ''}`}
                          style={{
                            background: FACE_CSS_COLORS[f],
                            borderColor: isSelected ? SELECTED_BORDER_COLORS[f] : 'var(--color-border)',
                          }}
                          onClick={() => setSelectedBrush(f)}
                          title={`Use ${FACE_DIRECTIONS[f]} brush`}
                        />
                      );
                    })}
                  </div>
                  <p className={styles.paletteInstruction}>Tap a colour, then tap a square</p>
                </>
              ) : (
                <button className={`btn btn-primary ${styles.captureBtn}`} onClick={handleCapture}>
                  📷 Capture Face
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Retake / Confirm buttons (confirm mode only) */}
      {!cameraLoading && !cameraError && confirmMode && (
        <div className={styles.scannerFooter}>
          <button className="btn btn-secondary" onClick={handleRetake}>↩ Retake</button>
          <button className="btn btn-success" onClick={handleConfirm}>✓ Confirm</button>
        </div>
      )}
    </div>
  );
}
