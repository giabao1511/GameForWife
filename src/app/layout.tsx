import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boyfriend Survival Simulator",
  description: "Giữ 4 chỉ số của anh ấy còn sống. Mất một, anh mất luôn.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nuôi Anh 💖",
  },
  icons: {
    // Dedicated 180px apple-touch-icon so iOS installs a crisp home-screen icon
    // instead of upscaling the 192px PWA icon.
    apple: "/icons/apple-touch-icon.png",
  },
};

// Separate `Viewport` export (this Next version deprecates metadata.viewport).
// Lock zoom so double-tap / pinch misfires don't happen mid-swipe.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fdf2f8",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
