'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import {
  FACE_ORDER,
  FACE_CSS_COLORS,
  FaceColor,
  CubeFace,
  CubeState,
  createSolvedState,
  toFaceletString,
  isSolved,
  validateCubeState,
} from '@/lib/cubeUtils';

// Lazy load heavy components
const CubeScanner = dynamic(() => import('@/components/CubeScanner'), { ssr: false });
const CubeEditor = dynamic(() => import('@/components/CubeEditor'), { ssr: false });
const FaceProgress = dynamic(() => import('@/components/FaceProgress'), { ssr: false });
const CubeSolver = dynamic(() => import('@/components/CubeSolver'), { ssr: false });

type AppPhase = 'home' | 'scan' | 'edit' | 'solving' | 'solution';
type CaptureMode = 'camera' | 'manual';

type SolverStatus = 'loading' | 'ready' | 'solving' | 'error';

function LoaderOverlay({ message }: { message: string }) {
  return (
    <div className={styles.loaderOverlay}>
      <div className="spinner spinner-lg" />
      <p className="text-secondary mt-4">{message}</p>
    </div>
  );
}

function HeroSection({ onStart, solverStatus }: { onStart: (mode: CaptureMode) => void; solverStatus: SolverStatus }) {
  return (
    <div className={`${styles.hero} animate-fadeInUp`}>
      {/* Badge */}
      <div className={`badge badge-accent ${styles.heroBadge}`}>
        <span>✦</span>
        Powered by Kociemba&apos;s Algorithm
      </div>

      {/* Animated cube icon */}
      <div className={styles.cubeArt} aria-hidden="true">
        {['U', 'R', 'F', 'D', 'L', 'B'].map((f) => (
          <div
            key={f}
            className={styles.cubeArtFace}
            style={{ background: FACE_CSS_COLORS[f as FaceColor] }}
          />
        ))}
      </div>

      <h1 className={`text-5xl font-bold text-gradient ${styles.heroTitle}`}>
        Rubik&apos;s Cube<br />Master
      </h1>
      <p className={`text-lg text-secondary ${styles.heroSubtitle}`}>
        Scan all 6 sides of your scrambled cube, and we&apos;ll solve it in{' '}
        <strong className="text-accent">22 moves or less</strong> — step by step.
      </p>

      {/* Solver status */}
      <div className={styles.solverStatus}>
        {solverStatus === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-secondary">
            <div className="spinner" />
            Initializing solver engine…
          </div>
        )}
        {solverStatus === 'ready' && (
          <div className={`badge badge-success animate-fadeIn`}>
            ✓ Solver ready
          </div>
        )}
        {solverStatus === 'error' && (
          <div className={`badge badge-error`}>
            ⚠ Solver failed to load
          </div>
        )}
      </div>

      {/* CTA Buttons */}
      <div className={`${styles.heroCtas} stagger`}>
        <button
          className="btn btn-primary btn-lg animate-fadeInUp"
          onClick={() => onStart('camera')}
          id="scan-camera-btn"
        >
          📷 Scan with Camera
        </button>
        <button
          className="btn btn-secondary btn-lg animate-fadeInUp"
          onClick={() => onStart('manual')}
          id="manual-entry-btn"
        >
          ✏️ Enter Manually
        </button>
      </div>

      {/* Features */}
      <div className={`${styles.features} stagger`}>
        {[
          { icon: '🎯', label: 'Auto Color Detection' },
          { icon: '🔄', label: 'Step-by-Step Guide' },
          { icon: '⚡', label: 'Solves in Seconds' },
        ].map(({ icon, label }) => (
          <div key={label} className={`${styles.featureChip} glass animate-fadeInUp`}>
            <span>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('home');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('camera');
  const [cubeState, setCubeState] = useState<CubeState>(createSolvedState());
  const [scannedFaces, setScannedFaces] = useState<Set<FaceColor>>(new Set());
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [solverStatus, setSolverStatus] = useState<SolverStatus>('loading');
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, solution: sol, error } = e.data;
      if (type === 'READY') {
        setSolverStatus('ready');
      } else if (type === 'LOADING') {
        setSolverStatus('loading');
      } else if (type === 'ERROR') {
        setSolverStatus('error');
        console.error('Solver error:', error);
      } else if (type === 'SOLUTION') {
        setSolution(sol);
        setPhase('solution');
      } else if (type === 'SOLVE_ERROR') {
        setValidationError('Solver error: ' + error + '. Please verify your cube configuration.');
        setPhase('edit');
      }
    };

    return () => worker.terminate();
  }, []);

  const handleStart = (mode: CaptureMode) => {
    setCaptureMode(mode);
    setCubeState(createSolvedState());
    setScannedFaces(new Set());
    setCurrentFaceIndex(0);
    setValidationError(null);
    setSolution(null);
    setPhase(mode === 'camera' ? 'scan' : 'edit');
  };

  const handleFaceScanned = useCallback((face: FaceColor, colors: CubeFace) => {
    setValidationError(null);

    setCubeState(prev => ({ ...prev, [face]: colors }));
    setScannedFaces(prev => {
      const next = new Set(prev);
      next.add(face);
      return next;
    });

    // Move to next un-scanned face
    const nextIdx = FACE_ORDER.findIndex((f, idx) => idx > currentFaceIndex && !scannedFaces.has(f));
    if (nextIdx !== -1) {
      setCurrentFaceIndex(nextIdx);
    } else {
      // All 6 faces scanned → go to edit/review
      setPhase('edit');
    }
  }, [currentFaceIndex, scannedFaces]);

  const handleCellChange = (face: FaceColor, index: number, color: FaceColor) => {
    setCubeState(prev => {
      const faceArr = [...prev[face]] as CubeFace;
      faceArr[index] = color;
      return { ...prev, [face]: faceArr };
    });
    setValidationError(null);
  };

  const handleSolve = () => {
    setValidationError(null);

    // Validate
    const err = validateCubeState(cubeState);
    if (err) {
      setValidationError(err);
      return;
    }

    if (isSolved(cubeState)) {
      setValidationError('🎉 This cube is already solved! Try a scrambled one.');
      return;
    }

    // Run solver
    const faceletStr = toFaceletString(cubeState);
    setPhase('solving');
    workerRef.current?.postMessage({ type: 'SOLVE', faceletString: faceletStr });
  };

  const handleReset = () => {
    setCubeState(createSolvedState());
    setScannedFaces(new Set());
    setCurrentFaceIndex(0);
    setValidationError(null);
    setSolution(null);
    setPhase('home');
  };

  // Quick face count for edit page
  const getFaceColorCounts = () => {
    const faceletStr = toFaceletString(cubeState);
    const counts: Record<string, number> = {};
    for (const ch of faceletStr) counts[ch] = (counts[ch] || 0) + 1;
    return counts;
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button
            className={`${styles.logo} btn btn-ghost`}
            onClick={handleReset}
            title="Go home"
          >
            <span className={styles.logoCube}>🟧</span>
            <span className="font-bold text-lg">Cube<span className="text-accent">Master</span></span>
          </button>
          {phase !== 'home' && (
            <button className="btn btn-ghost btn-sm" onClick={handleReset}>
              ✕ Reset
            </button>
          )}
        </header>

        {/* ========================= HOME ========================= */}
        {phase === 'home' && (
          <HeroSection onStart={handleStart} solverStatus={solverStatus} />
        )}

        {/* ========================= SCAN ========================= */}
        {phase === 'scan' && (
          <div className={`${styles.section} animate-fadeIn`}>
            <div className={styles.sectionHeader}>
              <h2 className="text-2xl font-bold">Scan Your Cube</h2>
              <p className="text-secondary text-sm mt-1">
                Hold each face up to the camera. Align the cube within the guide box.
              </p>
            </div>

            <FaceProgress
              scannedFaces={scannedFaces}
              currentFaceIndex={currentFaceIndex}
            />

            <CubeScanner
              onFaceScanned={handleFaceScanned}
              scannedFaces={scannedFaces}
              currentFaceIndex={currentFaceIndex}
            />

            <div className="flex gap-3 mt-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase('home')}>← Back</button>
              {scannedFaces.size > 0 && (
                <button className="btn btn-secondary btn-sm w-full" onClick={() => setPhase('edit')}>
                  Review & Edit Colors →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================= EDIT ========================= */}
        {phase === 'edit' && (
          <div className={`${styles.section} animate-fadeIn`}>
            <div className={styles.sectionHeader}>
              <h2 className="text-2xl font-bold">Review & Edit</h2>
              <p className="text-secondary text-sm mt-1">
                Verify each face is correct. Click any sticker to repaint it.
              </p>
            </div>

            {validationError && (
              <div className="alert alert-error animate-slideInRight">
                <span>⚠</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Color count status */}
            <div className={styles.colorCounts}>
              {FACE_ORDER.map(face => {
                const counts = getFaceColorCounts();
                const count = counts[face] || 0;
                const ok = count === 9;
                return (
                  <div key={face} className={`${styles.countChip} ${ok ? styles.countOk : styles.countBad}`}>
                    <div className={styles.countDot} style={{ background: FACE_CSS_COLORS[face] }} />
                    <span>{face}: {count}/9</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.editorWrapper}>
              <CubeEditor cubeState={cubeState} onChange={handleCellChange} />
            </div>

            <div className={`flex gap-3 mt-2 ${styles.editActions}`}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPhase(captureMode === 'camera' ? 'scan' : 'home')}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary w-full"
                onClick={handleSolve}
                disabled={solverStatus !== 'ready'}
                id="solve-btn"
              >
                {solverStatus !== 'ready' ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Solver Loading…
                  </>
                ) : (
                  '⚡ Solve Cube'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================= SOLVING ========================= */}
        {phase === 'solving' && (
          <div className={`${styles.section} animate-fadeIn`}>
            <LoaderOverlay message="Computing optimal solution…" />
          </div>
        )}

        {/* ========================= SOLUTION ========================= */}
        {phase === 'solution' && solution && (
          <div className={`${styles.section} animate-fadeIn`}>
            <CubeSolver solution={solution} onReset={handleReset} />
          </div>
        )}
      </div>
    </main>
  );
}
