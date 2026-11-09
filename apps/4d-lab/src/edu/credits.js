// Credits & licences shown in the app ("Kredit & lisensi"). Mirrors licensing/CLEARED_ASSETS.md and
// apps/4d-lab/ASSET_LICENSE_REGISTRY.md (kept in sync by test/ux.test.mjs). Classification follows the
// licence audit: verified | conditional | restricted | unknown. Nothing restricted or unknown is shipped.
export const CREDITS = [
  {
    what: 'Model anatomi 3D (Atlas MEDCOEL)', status: 'verified',
    source: '"BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan" · "Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0"',
    licence: 'CC BY-SA 4.0 (adaptasi MEDCOEL: osikel, ginjal & pelvis renalis dihapus tanpa mengubah geometri lain)',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/', notice: '/anatomy/viewer/NOTICE',
  },
  {
    what: 'CT, label map & kulit sintetis (dataset atlas)', status: 'verified',
    source: 'Dibangun MEDCOEL dari model atlas yang lolos audit (vokselisasi 2,5 mm, nilai HU buku teks)',
    licence: 'CC BY-SA 4.0 — adaptasi BodyParts3D/Z-Anatomy; atribusi di NOTICE.txt',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/', notice: 'data/atlas/NOTICE.txt',
  },
  {
    what: 'Ditahan sementara (tinjauan lisensi)', status: 'restricted',
    source: 'nervous.glb (Brainder, "White matter", telinga dalam Dundee, saraf kranial), ginjal lissiecowley (CC BY-NC), osikel',
    licence: 'Tidak didistribusikan dan tidak diganti model lain sampai ada izin tertulis',
    url: null, notice: null,
  },
  {
    what: 'Phantom prosedural, bunyi stetoskop, gerak fisiologis, simulasi USG', status: 'verified',
    source: 'Karya asli MEDCOEL (disintesis kode; tanpa rekaman)', licence: 'MEDCOEL', url: null, notice: null,
  },
  {
    what: 'Konten edukasi (kartu struktur, modul, kasus)', status: 'conditional',
    source: 'Ditulis MEDCOEL berdasarkan rujukan yang dicantumkan', licence: 'MEDCOEL · status draf, perlu tinjauan pendidik klinis', url: null, notice: null,
  },
  { what: 'three.js', status: 'verified', source: 'mrdoob/three.js', licence: 'MIT', url: 'https://github.com/mrdoob/three.js/blob/dev/LICENSE', notice: null },
  { what: 'three-mesh-bvh', status: 'verified', source: 'gkjohnson/three-mesh-bvh', licence: 'MIT', url: 'https://github.com/gkjohnson/three-mesh-bvh/blob/master/LICENSE', notice: null },
  { what: 'Dekoder Draco (dipakai bersama Atlas)', status: 'verified', source: 'Google Draco via three.js', licence: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0', notice: null },
];
export const CREDIT_STATUS = { verified: 'Terverifikasi', conditional: 'Bersyarat', restricted: 'Ditahan', unknown: 'Belum diketahui' };
