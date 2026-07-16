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
} from '@/lib/cubeUtils';

interface CubeScannerProps {
  onFaceScanned: (face: FaceColor, colors: CubeFace) => void;
  scannedFaces: Set<FaceColor>;
  currentFaceIndex: number;
}

export default function CubeScanner({ onFaceScanned, scannedFaces, currentFaceIndex }: CubeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [capturedColors, setCapturedColors] = useState<FaceColor[] | null>(null);
  const [previewColors, setPreviewColors] = useState<FaceColor[]>(Array(9).fill('U') as FaceColor[]);
  const [confirmMode, setConfirmMode] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const currentFace = FACE_ORDER[currentFaceIndex];

  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setConfirmMode(false);
    setCapturedColors(null);

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

  // Live preview: sample colors every frame
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
      const boxSize = Math.min(vw, vh) * 0.55;
      const boxX = (vw - boxSize) / 2;
      const boxY = (vh - boxSize) / 2;

      const imageData = ctx.getImageData(0, 0, vw, vh);
      const colors = sampleFaceColors(imageData, boxX, boxY, boxSize);
      setPreviewColors(colors);
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
    const boxSize = Math.min(vw, vh) * 0.55;
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
    // Restart camera for next face
    startCamera();
  };

  const handleRetake = () => {
    setConfirmMode(false);
    setCapturedColors(null);
    startCamera();
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
      {/* Camera View */}
      <div className={styles.cameraWrapper}>
        {cameraLoading && !cameraError && (
          <div className={styles.cameraOverlay}>
            <div className="spinner spinner-lg" />
            <p className="text-secondary mt-4">Starting camera…</p>
          </div>
        )}
        {cameraError && (
          <div className={styles.cameraOverlay}>
            <div className={`alert alert-error ${styles.cameraAlert}`}>
              <span>⚠</span>
              <span>{cameraError}</span>
            </div>
            <button className="btn btn-secondary mt-4" onClick={startCamera}>Try Again</button>
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

        {/* Scan Box Overlay */}
        {!cameraLoading && !cameraError && (
          <div className={styles.scanOverlay}>
            <div className={styles.scanBox}>
              {/* Corner decorations */}
              <div className={`${styles.corner} ${styles.cornerTL}`} />
              <div className={`${styles.corner} ${styles.cornerTR}`} />
              <div className={`${styles.corner} ${styles.cornerBL}`} />
              <div className={`${styles.corner} ${styles.cornerBR}`} />
              {/* Grid lines */}
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
            <span
              className={styles.faceDot}
              style={{ background: FACE_CSS_COLORS[currentFace] }}
            />
            <span>Scanning: <strong>{FACE_NAMES[currentFace]}</strong></span>
          </div>
        )}

        {/* Camera flip button */}
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

      {/* Color Preview Grid */}
      {!cameraLoading && !cameraError && (
        <div className={styles.previewSection}>
          <h3 className="text-base font-semibold text-secondary mb-4">
            {confirmMode ? 'Review & correct colors:' : 'Live color detection:'}
          </h3>
          <div className={styles.colorGrid}>
            {colors.map((color, i) => (
              <div key={i} className={styles.colorCell}>
                {confirmMode ? (
                  <select
                    value={color}
                    onChange={e => handleColorChange(i, e.target.value as FaceColor)}
                    className={styles.colorSelect}
                    style={{ background: FACE_CSS_COLORS[color], color: color === 'U' ? '#111' : '#fff' }}
                  >
                    {FACE_ORDER.map(f => (
                      <option key={f} value={f} style={{ background: FACE_CSS_COLORS[f], color: f === 'U' ? '#111' : '#fff' }}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className={styles.colorSwatch}
                    style={{ background: FACE_CSS_COLORS[color] }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Instruction */}
          <p className={`text-sm text-secondary ${styles.instruction}`}>
            {FACE_INSTRUCTIONS[currentFace]}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {!confirmMode ? (
              <button className="btn btn-primary w-full btn-lg" onClick={handleCapture}>
                📷 Capture Face
              </button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={handleRetake}>↩ Retake</button>
                <button className="btn btn-success w-full" onClick={handleConfirm}>✓ Confirm Colors</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
