/**
 * Web Worker for Rubik's Cube solver.
 * Uses cubejs (Kociemba two-phase algorithm) off the main thread.
 *
 * Communication protocol:
 *   IN:  { type: 'SOLVE', faceletString: string }
 *   OUT: { type: 'LOADING' | 'READY' | 'ERROR', error?: string }
 *        { type: 'SOLUTION', solution: string }
 *        { type: 'SOLVE_ERROR', error: string }
 */

import Cube from 'cubejs';

async function initSolver() {
  try {
    self.postMessage({ type: 'LOADING' });
    Cube.initSolver();
    self.postMessage({ type: 'READY' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to initialize solver';
    self.postMessage({ type: 'ERROR', error: msg });
  }
}

function getNumSwaps(arr: number[]): number {
  let numSwaps = 0;
  const seen = Array(arr.length).fill(false);
  while (true) {
    let cur = -1;
    for (let i = 0; i < arr.length; i++) {
      if (!seen[i]) {
        cur = i;
        break;
      }
    }
    if (cur === -1) {
      break;
    }
    let cycleLength = 0;
    while (!seen[cur]) {
      seen[cur] = true;
      cycleLength++;
      cur = arr[cur];
    }
    numSwaps += cycleLength + 1;
  }
  return numSwaps;
}

function verifyCubeSolvability(cube: any): string | null {
  // 1. Corner Orientation: sum of corner twists must be a multiple of 3
  const coSum = cube.co.reduce((a: number, b: number) => a + b, 0);
  if (coSum % 3 !== 0) {
    return 'Invalid corner orientation (e.g. a corner is physically twisted). Please check your colors.';
  }

  // 2. Edge Orientation: number of flipped edges must be even
  const eoSum = cube.eo.reduce((a: number, b: number) => a + b, 0);
  if (eoSum % 2 !== 0) {
    return 'Invalid edge orientation (e.g. an edge is physically flipped). Please check your colors.';
  }

  // 3. Permutation Parity: corner swaps + edge swaps must be even
  const totalSwaps = getNumSwaps(cube.ep) + getNumSwaps(cube.cp);
  if (totalSwaps % 2 !== 0) {
    return 'Invalid permutation parity (e.g. two corners or two edges are swapped). Please check your colors.';
  }

  return null;
}

initSolver();

self.onmessage = (event: MessageEvent) => {
  const { type, faceletString } = event.data as { type: string; faceletString: string };

  if (type === 'SOLVE') {
    try {
      const cube = Cube.fromString(faceletString);
      
      // Perform strict mathematical solvability validation
      const errorMsg = verifyCubeSolvability(cube);
      if (errorMsg) {
        self.postMessage({ type: 'SOLVE_ERROR', error: errorMsg });
        return;
      }

      const solution: string = cube.solve();
      self.postMessage({ type: 'SOLUTION', solution });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to solve. Please check the cube configuration.';
      self.postMessage({ type: 'SOLVE_ERROR', error: msg });
    }
  }
};
