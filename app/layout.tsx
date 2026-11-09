import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import PwaRegister from "@/components/PwaRegister";
import Nav from "@/components/Nav";
import LangProvider from "@/components/LangProvider";
import { dir, parseLang } from "@/lib/i18n";
export const metadata: Metadata = { title: "MyDoc", description: "Smart document vault", manifest: "/manifest.webmanifest", icons: { apple: "/icons/icon-192.png" } };
export const viewport: Viewport = { themeColor: "#0A171C", width: "device-width", initialScale: 1 };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = parseLang((await cookies()).get("lang")?.value);
  return (<html lang={lang} dir={dir(lang)} suppressHydrationWarning><head>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet" />
    <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
  </head><body><LangProvider initial={lang}><PwaRegister />{children}<Nav /></LangProvider></body></html>);
}
