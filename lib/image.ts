// يصغّر صور الهاتف الكبيرة قبل الرفع لتسريع الحفظ (حتى 2000px، جودة 0.82)
export async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  try {
    const bmp = await createImageBitmap(file); const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}
export const extOf = (f: File) => (f.type === "application/pdf" ? "pdf" : f.type === "image/jpeg" ? "jpg" : f.type.split("/")[1] || "bin");
