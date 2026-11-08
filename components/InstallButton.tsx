"use client";
import { useEffect, useState } from "react";
type BIP = Event & { prompt: () => Promise<void> };
export default function InstallButton() {
  const [ev, setEv] = useState<BIP | null>(null); const [ios, setIos] = useState(false); const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => { e.preventDefault(); setEv(e as BIP); }; const d = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", d);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", d); };
  }, []);
  if (installed) return null;
  if (ev) return <button className="btn" onClick={async () => { await ev.prompt(); setEv(null); }}>تثبيت التطبيق على جهازك</button>;
  if (ios) return <div className="k m" style={{ fontSize: 13 }}>للتثبيت على آيفون: افتح الموقع في Safari، اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية».</div>;
  return <div className="k m" style={{ fontSize: 13 }}>للتثبيت: افتح قائمة المتصفح (⋮) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</div>;
}
