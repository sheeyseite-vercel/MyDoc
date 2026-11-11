import { useEffect, useState } from "react";
export function useOnline() {
  const [o, setO] = useState(true);
  useEffect(() => { setO(navigator.onLine); const a = () => setO(true), b = () => setO(false); window.addEventListener("online", a); window.addEventListener("offline", b); return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); }; }, []);
  return o;
}
