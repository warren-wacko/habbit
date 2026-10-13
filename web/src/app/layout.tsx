import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Archivo is a variable font with a width axis: the display style uses width 125
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Habbit",
  description: "Track your daily habits and keep your streaks going.",
};

// Applies a saved Light or Dark choice before the first paint so the page never
// flashes the wrong theme (and the same for the accent colour). "System" has no saved value and is left to CSS.
const themeScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("habbit-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t);var a=localStorage.getItem("habbit-accent");if(["aqua","sky","violet","rose","sand"].indexOf(a)>-1)d.setAttribute("data-accent",a)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
