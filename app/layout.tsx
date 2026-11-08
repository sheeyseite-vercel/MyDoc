import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
export const metadata: Metadata = { title: "MyDoc", description: "خزنة الوثائق الذكية", manifest: "/manifest.webmanifest", icons: { apple: "/icons/icon-192.png" } };
export const viewport: Viewport = { themeColor: "#0A171C", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ar" dir="rtl" suppressHydrationWarning><head>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />
    <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
  </head><body><PwaRegister />{children}</body></html>);
}
