#!/usr/bin/env python3
"""Generate the MEDCOEL video inventory from finished MP4 projects."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "VIDEO_KATALOG.md"
REPO_URL = "https://github.com/khansazafiri-rgb/mpruy/tree/claude/focused-wozniak-1ayrxa"

TITLES = {
    "brand/video/ad": "Kirim PDF Soalmu",
    "brand/video/ad2": "Simulasi Jadi Dokter",
    "brand/video/ad3": "Latihan Soal MEDCOEL",
}
EDUCATION = {
    "bangun-tapi-tak-bisa-bergerak", "dingin-pengen-pipis",
    "dunia-tanpa-cuci-tangan", "dunia-tanpa-oralit", "gas-air-mata",
    "introvert-ekstrovert", "kopi-kafein-adenosin", "malam-lapar",
    "pasien-tidak-sadar-di-igd",
}
STUDENT_STORIES = {
    "ada-satu-yang-kamu-lupa", "bayangin-jadi-anak-fk",
    "dok-saya-kenapa", "masih-dua-minggu", "tab-dua-puluh",
}

def finished_mp4(folder):
    files = list(folder.glob("*.mp4")) + list((folder / "out").glob("*.mp4"))
    files = [p for p in files if not re.search(r"preview|pratinjau|draf|draft|sample", p.name, re.I)]
    return bool(files)

def title_for(folder):
    rel = folder.relative_to(ROOT).as_posix()
    if rel in TITLES:
        return TITLES[rel]
    readme = folder / "README.md"
    if readme.exists():
        for line in readme.read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                title = re.sub(r"^Video (edukasi |promosi |promo )?", "", title, flags=re.I)
                title = re.sub(r"\s*\(Reels.*$", "", title, flags=re.I)
                title = title.replace('"', "").strip()
                if title:
                    return title
    return folder.name.replace("-", " ").title()

def category_for(folder):
    if folder.parts[-1] in EDUCATION:
        return "Edukasi"
    if folder.parts[-1] in STUDENT_STORIES:
        return "Cerita anak FK"
    return "Promo fitur"

def projects():
    folders = list((ROOT / "video").iterdir())
    folders += [ROOT / "brand" / "video" / name for name in ("ad", "ad2", "ad3")]
    return sorted((p for p in folders if p.is_dir() and finished_mp4(p)), key=lambda p: (category_for(p), title_for(p).lower()))

def render():
    rows = []
    for folder in projects():
        rel = folder.relative_to(ROOT).as_posix()
        title = title_for(folder).replace("|", r"\|")
        rows.append(f"| {category_for(folder)} | [{title}]({REPO_URL}/{rel}) | `{rel}` |")
    return (
        "# Katalog video MEDCOEL\n\n"
        "Daftar ini mencatat **proyek dengan MP4 di repo**, bukan status publikasi di Instagram/TikTok. "
        "Judul diambil dari README proyek; jika belum ada, dipakai nama folder. "
        "Jalankan `python3 scripts/video/update_catalog.py` setelah menambah video. "
        "CI menolak perubahan yang membuat katalog tertinggal.\n\n"
        f"Total: **{len(rows)} video**.\n\n"
        "| Jenis | Judul | Folder sumber |\n"
        "| --- | --- | --- |\n"
        + "\n".join(rows) + "\n\n"
        "## Arah konten berikutnya\n\n"
        "- Edukasi: pilih mekanisme tubuh atau situasi klinis yang belum ada dalam tabel.\n"
        "- Cerita anak FK: gunakan konflik kuliah, praktikum, ujian blok, atau stase yang konkret.\n"
        "- Promo: perlihatkan aksi nyata di web dan klaim yang dapat dibuktikan.\n"
    )

def main():
    expected = render()
    if "--check" in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != expected:
            print("Katalog video tertinggal. Jalankan: python3 scripts/video/update_catalog.py")
            return 1
        print(f"Katalog sinkron: {len(list(projects()))} video")
        return 0
    OUTPUT.write_text(expected, encoding="utf-8")
    print(f"Memperbarui {OUTPUT.relative_to(ROOT)}: {len(list(projects()))} video")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
