"use client";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
type BIP = Event & { prompt: () => Promise<void> };
export default function InstallButton() {
  const { t } = useT(); const [ev, setEv] = useState<BIP | null>(null); const [ios, setIos] = useState(false); const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => { e.preventDefault(); setEv(e as BIP); }; const d = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", d);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", d); };
  }, []);
  if (installed) return null;
  if (ev) return <button className="btn" onClick={async () => { await ev.prompt(); setEv(null); }}>{t("Install the app on your device")}</button>;
  if (ios) return <div className="k m" style={{ fontSize: 13 }}>{t("To install on iPhone: open the site in Safari, tap Share, then “Add to Home Screen”.")}</div>;
  return <div className="k m" style={{ fontSize: 13 }}>{t("To install: open the browser menu (⋮) then choose “Install app” or “Add to Home Screen”.")}</div>;
}
