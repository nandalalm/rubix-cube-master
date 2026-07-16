'use client';

import styles from './FaceProgress.module.css';
import { FACE_ORDER, FACE_LABELS, FACE_CSS_COLORS, FaceColor } from '@/lib/cubeUtils';

interface FaceProgressProps {
  scannedFaces: Set<FaceColor>;
  currentFaceIndex: number;
  onFaceClick?: (face: FaceColor) => void;
}

export default function FaceProgress({ scannedFaces, currentFaceIndex, onFaceClick }: FaceProgressProps) {
  const currentFace = FACE_ORDER[currentFaceIndex];

  return (
    <div className={styles.progress}>
      <div className={styles.faces}>
        {FACE_ORDER.map((face, idx) => {
          const isScanned = scannedFaces.has(face);
          const isCurrent = face === currentFace;
          return (
            <button
              key={face}
              className={`${styles.faceBtn} ${isScanned ? styles.scanned : ''} ${isCurrent ? styles.current : ''}`}
              onClick={() => onFaceClick?.(face)}
              title={FACE_LABELS[face]}
              aria-label={`${FACE_LABELS[face]} face – ${isScanned ? 'scanned' : isCurrent ? 'current' : 'pending'}`}
            >
              <div
                className={styles.faceSquare}
                style={{
                  background: isScanned || isCurrent ? FACE_CSS_COLORS[face] : 'var(--color-surface)',
                  borderColor: isCurrent ? FACE_CSS_COLORS[face] : isScanned ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
                  opacity: isScanned ? 1 : isCurrent ? 0.85 : 0.5,
                }}
              >
                {isScanned && (
                  <span className={styles.checkmark}>✓</span>
                )}
                {!isScanned && isCurrent && (
                  <span className={styles.currentDot} />
                )}
              </div>
              <span className={styles.faceId} style={{ color: isCurrent ? '#c084fc' : isScanned ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {FACE_LABELS[face]}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${(scannedFaces.size / 6) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted text-center">
        {scannedFaces.size} / 6 faces captured
      </p>
    </div>
  );
}
