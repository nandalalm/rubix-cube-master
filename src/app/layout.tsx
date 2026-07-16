import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rubik's Cube Master",
  description:
    "Scan your Rubik's Cube with your camera and get a step-by-step solution powered by Kociemba's two-phase algorithm. Solve any cube in 22 moves or less.",
  keywords: ["rubik's cube", "cube solver", "camera scanner", "puzzle solver", "kociemba"],
  openGraph: {
    title: "Rubik's Cube Master",
    description: "Scan & solve any Rubik's Cube with your camera.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body>
        <div className="app-background" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
