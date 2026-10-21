// Koneksi ke PocketBase. Di produksi web dan API satu origin (Caddy), jadi
// alamatnya cukup "/".
import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '/');
pb.autoCancellation(false);

export default pb;
