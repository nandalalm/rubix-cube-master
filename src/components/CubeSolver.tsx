'use client';

import { useState } from 'react';
import styles from './CubeSolver.module.css';
import {
  parseSolution,
  MOVE_DESCRIPTIONS,
  MOVE_FACE_COLOR,
  FACE_CSS_COLORS,
  FACE_LABELS,
  FaceColor,
} from '@/lib/cubeUtils';

interface CubeSolverProps {
  solution: string;
  onReset: () => void;
}

// Simple move notation icons
function MoveIcon({ move }: { move: string }) {
  const face = move[0] as FaceColor;
  const modifier = move.slice(1);
  const color = FACE_CSS_COLORS[face] || '#fff';
  const label = FACE_LABELS[face] || face;

  let arrow = '↻';
  if (modifier === "'") arrow = '↺';
  if (modifier === '2') arrow = '↻↻';

  return (
    <div className={styles.moveIcon} style={{ borderColor: color }}>
      <div className={styles.moveIconFace} style={{ background: color, color: face === 'U' ? '#111' : '#fff' }}>
        {face}
      </div>
      <div className={styles.moveIconArrow} style={{ color }}>
        {arrow}
      </div>
      <div className={styles.moveIconLabel}>{label}</div>
    </div>
  );
}

export default function CubeSolver({ solution, onReset }: CubeSolverProps) {
  const moves = parseSolution(solution);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const totalSteps = moves.length;
  const currentMove = moves[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      setCompleted(true);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(s => s - 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setCompleted(false);
    onReset();
  };

  if (completed) {
    return (
      <div className={`${styles.solver} ${styles.solvedState}`}>
        <div className="animate-confetti" style={{ fontSize: '4rem', textAlign: 'center' }}>🎉</div>
        <h2 className="text-3xl font-bold text-gradient text-center mt-4">Cube Solved!</h2>
        <p className="text-secondary text-center mt-2">
          Congratulations! You followed all {totalSteps} steps and solved the cube!
        </p>
        <div className={styles.solvedStats}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>{totalSteps}</span>
            <span className={styles.statLabel}>Moves</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>22</span>
            <span className={styles.statLabel}>Max (God's Number)</span>
          </div>
        </div>
        <button className="btn btn-primary btn-lg w-full mt-6" onClick={handleReset}>
          🔄 Solve Another Cube
        </button>
      </div>
    );
  }

  return (
    <div className={styles.solver}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className="text-xl font-bold">Step-by-Step Solution</h2>
          <p className="text-sm text-secondary">{totalSteps} total moves • Kociemba algorithm</p>
        </div>
        <div className={`badge badge-accent`}>{totalSteps} moves</div>
      </div>

      <div className={styles.orientationNote}>
        <strong>Before Step 1:</strong> Hold the cube with White on top and Green facing you. Keep that orientation for the whole solution; turn only the face named by each move.
      </div>

      {/* Progress */}
      <div className={styles.progressSection}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentStep) / totalSteps) * 100}%` }} />
        </div>
        <div className={styles.progressLabel}>
          <span className="text-xs text-muted">Step {currentStep + 1} of {totalSteps}</span>
          <span className="text-xs text-muted">{Math.round((currentStep / totalSteps) * 100)}% done</span>
        </div>
      </div>

      {/* Current Move */}
      <div className={styles.currentMove}>
        <div className={styles.stepBadge}>Step {currentStep + 1}</div>
        <MoveIcon move={currentMove} />
        <div className={styles.moveDescription}>
          <span className={styles.moveNotation} style={{ color: MOVE_FACE_COLOR[currentMove[0]] }}>
            {currentMove}
          </span>
          <p className="text-base font-medium mt-2">
            {MOVE_DESCRIPTIONS[currentMove] || `Apply move ${currentMove}`}
          </p>
        </div>
      </div>

      {/* All Moves Overview */}
      <div className={styles.movesOverview}>
        <p className="text-xs text-muted mb-2">All moves (click to jump):</p>
        <div className={styles.movesGrid}>
          {moves.map((move, idx) => {
            const face = move[0] as FaceColor;
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;
            return (
              <button
                key={idx}
                className={`${styles.moveChip} ${isActive ? styles.moveChipActive : ''} ${isDone ? styles.moveChipDone : ''}`}
                style={{
                  borderColor: isActive ? FACE_CSS_COLORS[face] : isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)',
                  background: isActive ? `${FACE_CSS_COLORS[face]}22` : isDone ? 'rgba(34,197,94,0.1)' : 'transparent',
                  color: isActive ? FACE_CSS_COLORS[face] : isDone ? '#4ade80' : 'rgba(255,255,255,0.4)',
                }}
                onClick={() => setCurrentStep(idx)}
                title={MOVE_DESCRIPTIONS[move]}
              >
                {move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className={styles.nav}>
        <button
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={isFirst}
        >
          ← Prev
        </button>
        <div className={styles.navInfo}>
          <div className="flex gap-1 justify-center flex-wrap" style={{ maxWidth: 140 }}>
            {moves.map((_, idx) => (
              <div
                key={idx}
                className={`step-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'done' : ''}`}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>
        </div>
        <button
          className={`btn ${isLast ? 'btn-success' : 'btn-primary'}`}
          onClick={handleNext}
        >
          {isLast ? '🎉 Done!' : 'Next →'}
        </button>
      </div>

      <button className="btn btn-ghost btn-sm w-full mt-2 text-muted" onClick={handleReset}>
        ↩ Start Over
      </button>
    </div>
  );
}
