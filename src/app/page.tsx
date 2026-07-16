'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import {
  FACE_ORDER,
  FACE_CSS_COLORS,
  FACE_LABELS,
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

  // Toggle bright background (flashlight mode) during camera scanning
  useEffect(() => {
    if (phase === 'scan') {
      document.body.classList.add('flashlightTheme');
    } else {
      document.body.classList.remove('flashlightTheme');
    }
    return () => {
      document.body.classList.remove('flashlightTheme');
    };
  }, [phase]);

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

    // Compute the next scanned set locally to avoid stale state issues
    const nextScanned = new Set(scannedFaces);
    nextScanned.add(face);

    // Find the first face in FACE_ORDER that has not been scanned yet
    const nextIdx = FACE_ORDER.findIndex(f => !nextScanned.has(f));
    if (nextIdx !== -1) {
      setCurrentFaceIndex(nextIdx);
    } else {
      // All 6 faces scanned → go to edit/review
      setPhase('edit');
    }
  }, [scannedFaces]);

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

  const handlePageReset = () => {
    setCubeState(createSolvedState());
    setScannedFaces(new Set());
    setCurrentFaceIndex(0);
    setValidationError(null);
    setSolution(null);
    if (phase !== 'scan' && phase !== 'edit') {
      setPhase('home');
    }
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
            <div className="flex gap-2 items-center">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (phase === 'scan') setPhase('home');
                  else if (phase === 'edit') setPhase(captureMode === 'camera' ? 'scan' : 'home');
                  else if (phase === 'solution') setPhase('home');
                  else setPhase('home');
                }}
              >
                ← Back
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handlePageReset}>
                ✕ Reset
              </button>
            </div>
          )}
        </header>

        {/* ========================= HOME ========================= */}
        {phase === 'home' && (
          <HeroSection onStart={handleStart} solverStatus={solverStatus} />
        )}

        {/* ========================= SCAN ========================= */}
        {phase === 'scan' && (
        <div className={`${styles.section} ${styles.noScroll} animate-fadeIn`}>

            {/* ── Hint banner: above Box 1 ── */}
            <div className={styles.centreHint}>
              <span className={styles.centreHintIcon}>💡</span>
              <span>
                <strong>Scan Tip:</strong> When scanning side faces, keep the <strong>White center pointing straight UP</strong> and start with the <strong>Green center pointing towards the camera</strong>. Rotate the cube only around this vertical axis to scan side faces — do not spin, twist, or flip the cube randomly.
              </span>
            </div>

            {/* ── Box 1: Face progress tracker ── */}
            <div className={styles.scanCard}>
              <FaceProgress
                scannedFaces={scannedFaces}
                currentFaceIndex={currentFaceIndex}
                onFaceClick={(face) => {
                  const idx = FACE_ORDER.indexOf(face);
                  if (idx !== -1) {
                    setCurrentFaceIndex(idx);
                  }
                }}
              />
            </div>

            {/* ── Box 2: Live scanner (camera + grid + capture) ── */}
            <div className={`${styles.scanCard} ${styles.scannerCard}`}>
              <CubeScanner
                onFaceScanned={handleFaceScanned}
                scannedFaces={scannedFaces}
                currentFaceIndex={currentFaceIndex}
              />
            </div>

            {/* ── Box 3: Instruction card ── */}
            <div className={styles.instructionCard}>
              <div
                className={styles.instructionColorDot}
                style={{ background: FACE_CSS_COLORS[FACE_ORDER[currentFaceIndex]] }}
              >
                <div className={styles.instructionColorDotCenter} />
              </div>
              <div className={styles.instructionBody}>
                <p className={styles.instructionStep}>
                  Step {currentFaceIndex + 1} of 6 &mdash; <span className={styles.instructionFaceName}>{FACE_LABELS[FACE_ORDER[currentFaceIndex]]} Center</span> face
                </p>
                <p className={styles.instructionText}>
                  {[
                    'Point the White center at the camera. Make sure the Green center points straight DOWN and the Blue center points straight UP.',
                    'Keep the White center pointing straight UP. Turn the cube to bring the Red face (on the right) to face the camera.',
                    'Keep the White center pointing straight UP. Turn the cube to bring the Green face (on the front) to face the camera.',
                    'Point the Yellow center at the camera. Make sure the Green center points straight UP and the Blue center points straight DOWN.',
                    'Keep the White center pointing straight UP. Turn the cube to bring the Orange face (on the left) to face the camera.',
                    'Keep the White center pointing straight UP. Turn the cube to bring the Blue face (on the back) to face the camera.',
                  ][currentFaceIndex]}
                </p>
                <div className={styles.instructionTips}>
                  <span className={styles.tipChip}>💡 Good lighting helps</span>
                  <span className={styles.tipChip}>📐 Fill the scan box</span>
                  <span className={styles.tipChip}>🕐 Hold still 2s</span>
                </div>
              </div>
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

            {/* Hint: orientation rule */}
            <div className={`${styles.centreHint} ${styles.centreHintDark}`}>
              <span className={styles.centreHintIcon}>💡</span>
              <span>
                <strong>Orientation Guide:</strong> Hold the cube with the <strong>White center pointing straight UP (to the sky)</strong> and the <strong>Green center pointing straight at YOU</strong>. Keep this exact orientation constant without spinning, twisting, or rotating the cube randomly and changing its axis as you paint the colors to match the layout.
              </span>
            </div>

            {/* Color count status */}
            <div className={styles.colorCounts}>
              {FACE_ORDER.map(face => {
                const counts = getFaceColorCounts();
                const count = counts[face] || 0;
                const ok = count === 9;
                return (
                  <div key={face} className={`${styles.countChip} ${ok ? styles.countOk : styles.countBad}`}>
                    <div className={styles.countDot} style={{ background: FACE_CSS_COLORS[face] }} />
                    <span>{FACE_LABELS[face]}: {count}/9</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.editorWrapper}>
              <CubeEditor cubeState={cubeState} onChange={handleCellChange} />
            </div>

            <div className={`flex gap-3 mt-2 ${styles.editActions}`}>
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
