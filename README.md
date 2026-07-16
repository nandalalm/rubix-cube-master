# Rubik's Cube Master

An AI-powered Rubik's Cube solver built with Next.js that uses your camera to scan the cube and provides step-by-step solving instructions.

---

## Features

| Feature | Details |
|---|---|
| **Camera Scanning** | Scan all 6 sides using your device camera |
| **Live Color Detection** | HSV-based auto color classification per facelet |
| **Manual Entry** | Click-to-paint 2D cube editor (unfolded cross layout) |
| **Full Validation** | Detects invalid configs, duplicates, already-solved cubes |
| **Kociemba Solver** | Finds the optimal solution in ≤22 moves |
| **Step-by-Step Guide** | Animated move instructions with notation, arrows, jump-to-step |
| **Responsive** | Works on mobile, tablet, and desktop |
| **Dark Mode Design** | Glassmorphism, gradient accents, micro-animations |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install & Run

```bash
cd rubix-cube-master
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS with CSS Modules
- **Solver**: [cubejs](https://github.com/ldez/cubejs) — Kociemba's two-phase algorithm
- **Performance**: Web Worker for solver (keeps UI responsive)

---

## How to Use

### Camera Mode
1. Click **Scan with Camera** and grant camera permission
2. Hold your cube with the **White face** pointing UP toward the camera
3. Align the cube within the purple guide box
4. Click **Capture Face** — review and correct any misdetected colors
5. Click **Confirm Colors** and repeat for all 6 faces
6. Review the complete cube in the editor, then click **Solve Cube**
7. Follow the step-by-step instructions!

### Manual Mode
1. Click **Enter Manually**
2. Use the paint brush selector to pick a color
3. Click facelets on the unfolded cube to paint them
4. Click **Solve Cube**

---

## Cube Face Order

The app uses the standard **U R F D L B** face notation:

| Letter | Face | Color |
|---|---|---|
| U | Up | White |
| R | Right | Red |
| F | Front | Green |
| D | Down | Yellow |
| L | Left | Orange |
| B | Back | Blue |
