// Tombol "Lewati" kecil dan agak transparan di pojok kanan atas (seperti Google).
export default function SkipButton({ onClick, label = 'Lewati', busy = false }) {
  return (
    <button type="button" className="onb-skip" onClick={onClick} disabled={busy}>
      {busy ? 'Menyimpan…' : label}
    </button>
  );
}
