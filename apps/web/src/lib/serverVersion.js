// Migrasi PocketBase terbaru yang dibutuhkan web ini. Naikkan angkanya setiap kali ada berkas baru di
// apps/pocketbase/pb_migrations (serverVersion.test.mjs menjaganya tetap sama).
// Produksi memakai --hooksWatch=false: setelah pembaruan, PocketBase harus dijalankan ulang agar migrasi dan hook baru terpasang.
export const REQUIRED_MIGRATION = 1800001700;

/** Angka depan nama berkas migrasi, mis. "1800001500_drilling_chapters.js" -> 1800001500. */
export const migrationNumber = (file) => Number(String(file || '').split('_')[0]) || 0;

/** true bila server belum memuat migrasi yang dibutuhkan web. */
export const serverIsBehind = (file) => migrationNumber(file) < REQUIRED_MIGRATION;
