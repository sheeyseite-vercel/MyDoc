import "./globals.css";
import type { Metadata, Viewport } from "next";
import OfflineBar from "@/components/OfflineBar";
import Nav from "@/components/Nav";
import AppLock from "@/components/AppLock";
import Onboarding from "@/components/Onboarding";
import InstallProvider from "@/components/InstallProvider";
import LangProvider from "@/components/LangProvider";
export const metadata: Metadata = { title: "MyDoc", description: "Smart document vault", manifest: "/manifest.webmanifest", icons: { apple: "/icons/icon-192.png" } };
export const viewport: Viewport = { themeColor: "#0A171C", width: "device-width", initialScale: 1 };
const boot = "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;if((localStorage.getItem('lock.mode')||localStorage.getItem('lock.hash'))&&!sessionStorage.getItem('lock.ok'))document.documentElement.dataset.lock='1';var m=document.cookie.match(/(?:^|; )lang=(en|es|ar)/);if(m){document.documentElement.lang=m[1];document.documentElement.dir=m[1]==='ar'?'rtl':'ltr'}}catch(e){}";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" dir="ltr" suppressHydrationWarning><head>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />
    <script dangerouslySetInnerHTML={{ __html: boot }} />
  </head><body><LangProvider><InstallProvider><OfflineBar />{children}<Nav /><Onboarding /><AppLock /></InstallProvider></LangProvider></body></html>);
}
