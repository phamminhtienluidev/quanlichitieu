import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MAX_EDGE = 512;
const JPEG_QUALITY = 0.88;

/** Nén & giới hạn cạnh tối đa trước khi tải lên Storage. */
export async function resizeImageFileToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas không khả dụng");
    ctx.drawImage(bitmap, 0, 0, tw, th);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("Không thể tạo ảnh");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Tải ảnh lên `avatars/{userId}/{timestamp}.jpg`; trả về URL công khai. */
export async function uploadProfileAvatarBlob(
  userId: string,
  imageBlob: Blob
): Promise<string> {
  const objectRef = ref(storage, `avatars/${userId}/${Date.now()}.jpg`);
  await uploadBytes(objectRef, imageBlob, { contentType: "image/jpeg" });
  return getDownloadURL(objectRef);
}
