import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Literata, Lora, Merriweather, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { MotionProvider } from "@/components/ui/motion";
import "./globals.css";

// UI font: warm, friendly and very clear at small sizes.
const ui = Plus_Jakarta_Sans({ variable: "--font-ui", subsets: ["latin"] });
// Reading fonts (Reader settings). Not preloaded: the browser downloads one only when it is used.
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const lora = Lora({ variable: "--font-lora-face", subsets: ["latin"], preload: false });
const merriweather = Merriweather({ variable: "--font-merriweather-face", subsets: ["latin"], weight: ["400", "700"], preload: false });
// Easy-to-read font (made for low vision; clear letter shapes).
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"], preload: false });

export const metadata: Metadata = {
  title: { default: "TaleTalk", template: "%s · TaleTalk" },
  description: "Learn English with stories, speaking and daily practice.",
  applicationName: "TaleTalk",
  // iPhone "Add to Home Screen": full-screen app with its own icon and name.
  appleWebApp: { capable: true, title: "TaleTalk", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom bar respect the phone's safe area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [ui, literata, lora, merriweather, atkinson].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={`${fonts} h-full antialiased`}>
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
