"use client"

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseStorage } from 'firebase/storage';
import { bankCodeItems } from '@/lib/bankCodes';

export async function processImage(fileOrBlob: Blob, opts?: { cropToSquare?: boolean; maxSize?: number; quality?: number }): Promise<Blob | null> {
  const { cropToSquare = false, maxSize = 1024, quality = 0.8 } = opts || {};
  return await new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;

        // If cropToSquare, compute square crop centered
        let sx = 0, sy = 0, sSize = Math.min(sw, sh);
        if (cropToSquare) {
          sx = Math.floor((sw - sSize) / 2);
          sy = Math.floor((sh - sSize) / 2);
        } else {
          sSize = Math.min(sw, sh);
        }

        // Determine output size while respecting maxSize
        const outSize = cropToSquare ? Math.min(sSize, maxSize) : Math.min(Math.max(sw, sh), maxSize);
        const canvas = document.createElement('canvas');
        if (cropToSquare) {
          canvas.width = outSize;
          canvas.height = outSize;
        } else {
          const ratio = Math.min(1, maxSize / Math.max(sw, sh));
          canvas.width = Math.round(sw * ratio);
          canvas.height = Math.round(sh * ratio);
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        if (cropToSquare) {
          ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outSize, outSize);
        } else {
          ctx.drawImage(img, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob((b) => {
          if (b) resolve(b);
          else resolve(null);
        }, 'image/jpeg', quality);
      } catch (e) {
        console.error('processImage error', e);
        resolve(null);
      }
    };
    img.onerror = (e) => { console.error('image load error', e); resolve(null); };
    const url = URL.createObjectURL(fileOrBlob);
    img.src = url;
  });
}

export async function captureFromVideoElement(videoEl: HTMLVideoElement): Promise<Blob | null> {
  if (!videoEl) return null;
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 1280;
  canvas.height = videoEl.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.9));
}

export async function uploadBlob(storage: FirebaseStorage, path: string, blob: Blob) {
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, blob);
  const url = await getDownloadURL(sRef);
  return url;
}

export function maskMerchantId(id?: string | null) {
  if (!id) return '';
  const s = String(id);
  if (s.length <= 8) return s;
  const first = s.slice(0, 4);
  const last = s.slice(-4);
  const middle = '*'.repeat(Math.max(0, s.length - 8));
  return `${first}${middle}${last}`;
}

export function maskEmail(email?: string | null) {
  if (!email) return '';
  const s = String(email);
  const parts = s.split('@');
  if (parts.length !== 2) return s;
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0] ?? ''}***@${domain}`;
  const first = local.slice(0, 2);
  return `${first}***@${domain}`;
}

export function getBankName(code?: string | number | null) {
  if (!code && code !== 0) return '';
  const c = String(code);
  const found = bankCodeItems.find(b => b.value === c);
  return found ? found.label : c;
}
