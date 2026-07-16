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

initSolver();

self.onmessage = (event: MessageEvent) => {
  const { type, faceletString } = event.data as { type: string; faceletString: string };

  if (type === 'SOLVE') {
    try {
      const cube = Cube.fromString(faceletString);
      const solution: string = cube.solve();
      self.postMessage({ type: 'SOLUTION', solution });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to solve. Please check the cube configuration.';
      self.postMessage({ type: 'SOLVE_ERROR', error: msg });
    }
  }
};
