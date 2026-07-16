'use client';

import { useState } from 'react';
import styles from './CubeEditor.module.css';
import {
  FACE_ORDER,
  FACE_LABELS,
  FACE_CSS_COLORS,
  FaceColor,
  CubeState,
} from '@/lib/cubeUtils';

interface CubeEditorProps {
  cubeState: CubeState;
  onChange: (face: FaceColor, index: number, color: FaceColor) => void;
}

// The unfolded cross layout:
//         [U]
//   [L] [F] [R] [B]
//         [D]
const LAYOUT: (FaceColor | null)[][] = [
  [null, 'U', null, null],
  ['L', 'F', 'R', 'B'],
  [null, 'D', null, null],
];

export default function CubeEditor({ cubeState, onChange }: CubeEditorProps) {
  const [activeBrush, setActiveBrush] = useState<FaceColor>('U');

  const handleCellClick = (face: FaceColor, index: number) => {
    // Don't allow changing centers (index 4) — they define the face color
    if (index === 4) return;
    onChange(face, index, activeBrush);
  };

  return (
    <div className={styles.editor}>
      {/* Color Picker / Brush Selector */}
      <div className={styles.palette}>
        <span className="text-sm text-secondary">Paint brush:</span>
        <div className={styles.paletteColors}>
          {FACE_ORDER.map(face => (
            <button
              key={face}
              className={`${styles.paletteBtn} ${activeBrush === face ? styles.paletteBtnActive : ''}`}
              style={{
                background: FACE_CSS_COLORS[face],
                outline: activeBrush === face ? `3px solid white` : 'none',
                outlineOffset: '2px',
              }}
              onClick={() => setActiveBrush(face)}
              title={FACE_LABELS[face]}
              aria-label={`Select ${FACE_LABELS[face]} color`}
            />
          ))}
        </div>
        <span className="text-xs text-muted">
          Active: <strong style={{ color: FACE_CSS_COLORS[activeBrush] }}>{FACE_LABELS[activeBrush]}</strong>
        </span>
      </div>

      {/* Cube Unfolded Cross */}
      <div className={styles.cross}>
        {LAYOUT.map((row, rowIdx) => (
          <div key={rowIdx} className={styles.crossRow}>
            {row.map((face, colIdx) => (
              <div key={colIdx} className={styles.faceSlot}>
                {face ? (
                  <div className={styles.face}>
                    <div className={styles.faceLabel}>
                      <span
                        className={styles.faceLabelDot}
                        style={{ background: FACE_CSS_COLORS[face] }}
                      />
                      {FACE_LABELS[face]}
                    </div>
                    <div className={styles.faceGrid}>
                      {cubeState[face].map((color, cellIdx) => (
                        <button
                          key={cellIdx}
                          className={`${styles.cell} ${cellIdx === 4 ? styles.centerCell : ''}`}
                          style={{
                            background: FACE_CSS_COLORS[color],
                            cursor: cellIdx === 4 ? 'default' : 'pointer',
                          }}
                          onClick={() => handleCellClick(face, cellIdx)}
                          title={cellIdx === 4 ? 'Center (fixed)' : `Click to paint ${FACE_LABELS[activeBrush]}`}
                          aria-label={`Face ${face} cell ${cellIdx}`}
                        >
                          {cellIdx === 4 && (
                            <span className={styles.centerDot} style={{ background: 'rgba(0,0,0,0.3)' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptySlot} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted text-center mt-2">
        Click any facelet to paint it with the active brush color. Centers are fixed.
      </p>
    </div>
  );
}
