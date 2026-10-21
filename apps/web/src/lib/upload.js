// Unggah file ke penyimpanan MEDCOEL. Server menentukan tujuannya:
// - mode "drive": browser mengirim isi file langsung ke Google Drive admin
//   lewat sesi unggah yang dibuka server (file tidak lewat server web);
// - mode "local": dipakai saat pengembangan bila Drive belum diatur.
import { api, ApiError } from './api';
import pb from './pb';

export const PROOF_TARGET_BYTES = 300 * 1024;

// Mengecilkan foto di browser sampai sekitar 300 KB (PRD: foto bukti).
export async function compressImage(file, targetBytes = PROOF_TARGET_BYTES) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new ApiError('Foto bukti harus berformat JPG, PNG, atau WebP.', 400);
  }
  if (file.size <= targetBytes) return file;
  const bitmap = await loadImage(file);
  let maxSide = 1600;
  let quality = 0.82;
  for (let i = 0; i < 8; i++) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (blob && (blob.size <= targetBytes || i === 7)) {
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return new File([blob], name, { type: 'image/jpeg' });
    }
    if (quality > 0.55) quality -= 0.1;
    else maxSide = Math.round(maxSide * 0.8);
  }
  return file;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ApiError('Foto tidak bisa dibaca. Coba foto lain.', 400)); };
    img.src = url;
  });
}

// Cek awal isi file di browser, supaya kesalahan terlihat sebelum mengunggah.
// Server tetap memeriksa ulang dari isinya.
export async function looksLikePdf(file) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
      } else reject(new ApiError('Unggahan ke penyimpanan gagal (kode ' + xhr.status + '). Coba lagi.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Koneksi terputus saat mengunggah. Periksa internetmu lalu coba lagi.', 0));
    xhr.send(file);
  });
}

function postLocal(form, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', pb.buildURL('/api/medcoel/upload/local'));
    if (pb.authStore.token) xhr.setRequestHeader('Authorization', pb.authStore.token);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { data = null; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(data?.message || 'Unggahan gagal. Coba lagi.', xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Koneksi terputus saat mengunggah. Periksa internetmu lalu coba lagi.', 0));
    xhr.send(form);
  });
}

// context: { kind, draftId?, draftToken?, submission? }
export async function uploadFile(file, context, onProgress) {
  const init = await api('upload/init', {
    method: 'POST',
    body: { ...context, name: file.name, size: file.size, mime: file.type || 'application/octet-stream' },
  });
  if (init.mode === 'drive') {
    const g = await putWithProgress(init.uploadUrl, file, onProgress);
    return api('upload/complete', { method: 'POST', body: { fileId: init.fileId, uploadKey: init.uploadKey, driveFileId: g.id } });
  }
  const form = new FormData();
  form.append('fileId', init.fileId);
  form.append('uploadKey', init.uploadKey);
  form.append('file', file, file.name);
  return postLocal(form, onProgress);
}
