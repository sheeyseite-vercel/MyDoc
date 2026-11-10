"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useT } from "./LangProvider";
type BIP = Event & { prompt: () => Promise<void> };
const Ctx = createContext<{ installed: boolean; open: () => void }>({ installed: false, open: () => {} });
export const useInstall = () => useContext(Ctx);
const dl = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
export function InstallIcon() {
  const { installed, open } = useInstall(); const { t } = useT();
  return installed ? null : <button type="button" className="ib" aria-label={t("Install app")} onClick={open}>{dl}</button>;
}
export default function InstallProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT(); const [ev, setEv] = useState<BIP | null>(null); const [installed, setInstalled] = useState(false); const [show, setShow] = useState(false); const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const h = (e: Event) => { e.preventDefault(); setEv(e as BIP); }; const d = () => { setInstalled(true); setShow(false); };
    window.addEventListener("beforeinstallprompt", h); window.addEventListener("appinstalled", d);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", d); };
  }, []);
  const steps = (title: string, list: string[], mine: boolean) => (<div className="k" style={{ borderColor: mine ? "var(--gold)" : undefined }}><b>{title}{mine ? ` • ${t("Your device")}` : ""}</b><ol style={{ margin: "8px 0 0", paddingInlineStart: 20, display: "grid", gap: 6, fontSize: 14 }} className="m">{list.map((x) => <li key={x}>{t(x)}</li>)}</ol></div>);
  return (<Ctx.Provider value={{ installed, open: () => setShow(true) }}>{children}
    {show && <div className="sheet" onClick={() => setShow(false)}><div role="dialog" aria-modal="true" aria-label={t("Install MyDoc")} onClick={(e) => e.stopPropagation()}>
      <div className="row"><h2 className="h" style={{ fontSize: 24, margin: 0 }}>{t("Install MyDoc")}</h2><button className="ib" aria-label={t("Close")} onClick={() => setShow(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
      {ev && <button className="btn" onClick={async () => { await ev.prompt(); setEv(null); setShow(false); }}>{t("Install now")}</button>}
      {ios ? <>{steps(t("iPhone (Safari)"), ["Open this site in Safari", "Tap the Share button", "Tap “Add to Home Screen”, then “Add”"], true)}{steps(t("Android (Chrome)"), ["Open the browser menu (⋮)", "Tap “Install app” or “Add to Home screen”"], false)}</>
        : <>{steps(t("Android (Chrome)"), ["Open the browser menu (⋮)", "Tap “Install app” or “Add to Home screen”"], true)}{steps(t("iPhone (Safari)"), ["Open this site in Safari", "Tap the Share button", "Tap “Add to Home Screen”, then “Add”"], false)}</>}
    </div></div>}</Ctx.Provider>);
}
