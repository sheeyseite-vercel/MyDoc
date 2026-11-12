import { zipSync, strToU8 } from "fflate";
import { S, billFileOf, cacheAllFiles, kvGet } from "./data";
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
// نسخة احتياطية كاملة: بيانات JSON + كل الملفات الأصلية داخل ملف ZIP واحد
export async function buildBackup(onProgress: (done: number, total: number) => void): Promise<Blob> {
  await cacheAllFiles(onProgress); const files: Record<string, Uint8Array> = {};
  for (const d of S.docs ?? []) { const b = await kvGet<Blob>("file:" + d.id); if (b) files[`files/${safe(d.title)}-${d.id.slice(0, 8)}.${EXT[b.type] ?? "bin"}`] = new Uint8Array(await b.arrayBuffer()); }
  for (const b of S.bills ?? []) { if (!b.storage_path) continue; const f = await billFileOf(b).catch(() => null); if (f) files[`bills/${b.category}-${b.period}-${b.id.slice(0, 8)}.${EXT[f.type] ?? "bin"}`] = new Uint8Array(await f.arrayBuffer()); }
  files["data.json"] = strToU8(JSON.stringify({ exported_at: new Date().toISOString(), documents: S.docs, bills: S.bills, folders: S.folders }, null, 2));
  return new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
}
