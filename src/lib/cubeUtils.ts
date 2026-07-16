/**
 * Rubik's Cube Utility Functions
 * Color mapping, HSV classification, validation, facelet string building
 */

// Face order in cubejs: U R F D L B (each 9 facelets, top-left to bottom-right)
export type FaceColor = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export const FACE_NAMES: Record<FaceColor, string> = {
  U: 'Top (White)',
  R: 'Right (Red)',
  F: 'Front (Green)',
  D: 'Bottom (Yellow)',
  L: 'Left (Orange)',
  B: 'Back (Blue)',
};

export const FACE_ORDER: FaceColor[] = ['U', 'R', 'F', 'D', 'L', 'B'];

// Visual color for each face
export const FACE_CSS_COLORS: Record<FaceColor, string> = {
  U: '#FFFFFF', // White
  R: '#EF4444', // Red
  F: '#22C55E', // Green
  D: '#EAB308', // Yellow
  L: '#F97316', // Orange
  B: '#3B82F6', // Blue
};

export const FACE_LABELS: Record<FaceColor, string> = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
};

export const FACE_INSTRUCTIONS: Record<FaceColor, string> = {
  U: 'Hold the cube with the WHITE face pointing UP toward the camera',
  R: 'Now rotate: RED face pointing UP toward the camera',
  F: 'Now rotate: GREEN face pointing UP toward the camera',
  D: 'Now rotate: YELLOW face pointing UP toward the camera',
  L: 'Now rotate: ORANGE face pointing UP toward the camera',
  B: 'Now rotate: BLUE face pointing UP toward the camera',
};

export type CubeFace = FaceColor[]; // 9 facelets [0..8], row-major

export interface CubeState {
  U: CubeFace;
  R: CubeFace;
  F: CubeFace;
  D: CubeFace;
  L: CubeFace;
  B: CubeFace;
}

// A solved cube state
export function createSolvedState(): CubeState {
  const make = (c: FaceColor): CubeFace => Array(9).fill(c) as CubeFace;
  return { U: make('U'), R: make('R'), F: make('F'), D: make('D'), L: make('L'), B: make('B') };
}

// Convert CubeState to 54-char facelet string for cubejs (order: U R F D L B)
export function toFaceletString(state: CubeState): string {
  return FACE_ORDER.map((f) => state[f].join('')).join('');
}

// Check if cube is already solved
export function isSolved(state: CubeState): boolean {
  return FACE_ORDER.every((f) => state[f].every((c) => c === f));
}

// Validate the cube state - returns an error message or null if valid
export function validateCubeState(state: CubeState): string | null {
  const faceletStr = toFaceletString(state);

  // Count each color
  const counts: Record<string, number> = {};
  for (const ch of faceletStr) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  // Each color must appear exactly 9 times
  for (const face of FACE_ORDER) {
    if ((counts[face] || 0) !== 9) {
      const colorName = FACE_NAMES[face];
      return `Invalid cube: ${colorName} color appears ${counts[face] || 0} times (expected 9).`;
    }
  }

  // Center facelets (index 4 on each face) must be unique
  const centers = FACE_ORDER.map((f) => state[f][4]);
  const uniqueCenters = new Set(centers);
  if (uniqueCenters.size !== 6) {
    return 'Invalid cube: Two or more faces share the same center color.';
  }

  return null; // valid
}

/** RGB to HSV conversion */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, v];
}

/**
 * Classify an RGB pixel as one of the 6 Rubik's Cube face colors.
 * Uses HSV thresholds tuned for common lighting conditions.
 */
export function classifyColor(r: number, g: number, b: number): FaceColor {
  const [h, s, v] = rgbToHsv(r, g, b);

  // White: low saturation, high value
  if (s < 0.25 && v > 0.75) return 'U';

  // Yellow: hue 45-75
  if (h >= 40 && h <= 80 && s > 0.4) return 'D';

  // Orange: hue 15-40
  if (h >= 10 && h < 40 && s > 0.45) return 'L';

  // Red: hue 0-15 or 340-360
  if ((h >= 340 || h < 12) && s > 0.45) return 'R';

  // Green: hue 80-165
  if (h >= 80 && h <= 165 && s > 0.3) return 'F';

  // Blue: hue 165-270
  if (h >= 165 && h <= 270 && s > 0.3) return 'B';

  // Fallback: nearest by hue
  if (h < 30) return 'R';
  if (h < 75) return 'D';
  if (h < 165) return 'F';
  if (h < 270) return 'B';
  return 'L';
}

/** Sample the 9 facelet colors from a canvas ImageData given the scan box coordinates */
export function sampleFaceColors(
  imageData: ImageData,
  boxX: number,
  boxY: number,
  boxSize: number,
): CubeFace {
  const cellSize = boxSize / 3;
  const colors: FaceColor[] = [];
  const { data, width } = imageData;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // Sample center pixel of each cell
      const px = Math.round(boxX + col * cellSize + cellSize / 2);
      const py = Math.round(boxY + row * cellSize + cellSize / 2);
      const idx = (py * width + px) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      colors.push(classifyColor(r, g, b));
    }
  }
  return colors as CubeFace;
}

/** Human-readable move notation */
export const MOVE_DESCRIPTIONS: Record<string, string> = {
  U: "Rotate the TOP face 90° clockwise",
  "U'": "Rotate the TOP face 90° counter-clockwise",
  U2: "Rotate the TOP face 180°",
  D: "Rotate the BOTTOM face 90° clockwise",
  "D'": "Rotate the BOTTOM face 90° counter-clockwise",
  D2: "Rotate the BOTTOM face 180°",
  R: "Rotate the RIGHT face 90° clockwise",
  "R'": "Rotate the RIGHT face 90° counter-clockwise",
  R2: "Rotate the RIGHT face 180°",
  L: "Rotate the LEFT face 90° clockwise",
  "L'": "Rotate the LEFT face 90° counter-clockwise",
  L2: "Rotate the LEFT face 180°",
  F: "Rotate the FRONT face 90° clockwise",
  "F'": "Rotate the FRONT face 90° counter-clockwise",
  F2: "Rotate the FRONT face 180°",
  B: "Rotate the BACK face 90° clockwise",
  "B'": "Rotate the BACK face 90° counter-clockwise",
  B2: "Rotate the BACK face 180°",
};

/** Parse a solution string from cubejs into an array of moves */
export function parseSolution(solution: string): string[] {
  return solution.trim().split(/\s+/).filter(Boolean);
}

/** Get the face color for a move (which face is being turned) */
export function getMoveface(move: string): FaceColor {
  const letter = move[0] as FaceColor;
  return letter;
}

export const MOVE_FACE_COLOR: Record<string, string> = {
  U: FACE_CSS_COLORS.U,
  D: FACE_CSS_COLORS.D,
  R: FACE_CSS_COLORS.R,
  L: FACE_CSS_COLORS.L,
  F: FACE_CSS_COLORS.F,
  B: FACE_CSS_COLORS.B,
};
