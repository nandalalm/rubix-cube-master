declare module 'cubejs' {
  interface CubeInstance {
    solve(): string;
    move(algorithm: string): void;
    randomize(): void;
  }

  interface CubeConstructor {
    new (): CubeInstance;
    initSolver(): void;
    fromString(faceletString: string): CubeInstance;
    random(): CubeInstance;
  }

  const Cube: CubeConstructor;
  export default Cube;
}
