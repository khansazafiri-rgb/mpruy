"""Security/decoding tests; fixtures are engineering data, not medical assets."""
import io
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from prepare_source import decode_tiff, parse_workbook, safe_members


def fixture_tiff(endian='<', samples=1, compressed=1, next_ifd=0):
    tags = [(256, 4, 573), (257, 4, 330), (258, 3, 16), (259, 3, compressed),
            (273, 4, 8 + 2 + 8 * 12 + 4), (277, 3, samples),
            (278, 4, 330), (279, 4, 573 * 330 * 2)]
    head = (b'II' if endian == '<' else b'MM') + struct.pack(endian + 'HIH', 42, 8, len(tags))
    for tag, kind, value in tags:
        head += struct.pack(endian + 'HHI', tag, kind, 1)
        head += struct.pack(endian + 'H', value) + b'\0\0' if kind == 3 else struct.pack(endian + 'I', value)
    head += struct.pack(endian + 'I', next_ifd)
    return head + struct.pack(endian + 'H', 513) * (573 * 330)


class PreparationTests(unittest.TestCase):
    def test_tiff_endianness_canonical_uint16(self):
        expected = b'\x01\x02' * (573 * 330)
        self.assertEqual(decode_tiff(fixture_tiff('<')), expected)
        self.assertEqual(decode_tiff(fixture_tiff('>')), expected)

    def test_rejects_ct_rgb_compression_multiimage_and_truncation(self):
        for data in [fixture_tiff(samples=3), fixture_tiff(compressed=5), fixture_tiff(next_ifd=8), fixture_tiff()[:-1]]:
            with self.assertRaises(ValueError):
                decode_tiff(data)

    def test_archive_traversal_links_duplicates_and_budgets(self):
        for name in ['pack/../labels1256.tif', '/labels1256.tif', 'pack\\labels1256.tif']:
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w') as z:
                z.writestr(name, b'x')
            with zipfile.ZipFile(buf) as z, self.assertRaises(ValueError):
                safe_members(z, 10, 10)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('labels1256.tif', b'aa')
        with zipfile.ZipFile(buf) as z:
            with self.assertRaises(ValueError):
                safe_members(z, 0, 10)
            with self.assertRaises(ValueError):
                safe_members(z, 10, 1)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            z.writestr('a.tif', b'x'); z.writestr('A.tif', b'x')
        with zipfile.ZipFile(buf) as z, self.assertRaises(ValueError):
            safe_members(z, 10, 10)
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w') as z:
            link = zipfile.ZipInfo('labels1256.tif')
            link.create_system = 3
            link.external_attr = 0o120777 << 16
            z.writestr(link, 'elsewhere')
        with zipfile.ZipFile(buf) as z, self.assertRaises(ValueError):
            safe_members(z, 10, 100)

    def test_rejects_unpinned_workbook(self):
        with tempfile.TemporaryDirectory() as d:
            file = Path(d) / 'labels.xlsx'
            file.write_bytes(b'wrong-source')
            with self.assertRaises(ValueError):
                parse_workbook(file)


if __name__ == '__main__':
    unittest.main()
