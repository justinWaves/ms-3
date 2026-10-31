import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Shrikhand } from "next/font/google";
import "./globals.css";

const display = Shrikhand({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Minesurfer",
  description: "Minesweeper on a surf break. Read the water, dodge the sharks.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before paint so a saved theme doesn't flash the wrong colors on load.
const applySavedTheme = `try{var t=localStorage.getItem("ms-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applySavedTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
