import tempfile
import unittest
from pathlib import Path
from PIL import Image
from compare import compare


class CompareTests(unittest.TestCase):
    def test_identical_and_one_pixel(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b, out = (Path(directory) / name for name in ('a.png', 'b.png', 'diff.png'))
            im = Image.new('RGB', (2, 2))
            im.save(a)
            self.assertEqual(compare(a, a, out)['changed_pixels_pct'], 0)
            im.putpixel((0, 0), (24, 0, 0))
            im.save(b)
            result = compare(a, b, out)
            self.assertEqual(result['changed_pixels_pct'], 25)
            self.assertEqual(result['pixels_over_16_pct'], 25)
            self.assertEqual(result['mean_absolute_rgb_error'], 2)
            self.assertTrue(out.exists())

    def test_size_and_overwrite_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b, out = (Path(directory) / name for name in ('a.png', 'b.png', 'diff.png'))
            Image.new('RGB', (2, 2)).save(a)
            Image.new('RGB', (3, 2)).save(b)
            with self.assertRaisesRegex(ValueError, 'Viewport mismatch'):
                compare(a, b, out)
            with self.assertRaisesRegex(ValueError, 'must not overwrite'):
                compare(a, a, a)
            self.assertFalse(out.exists())


if __name__ == '__main__':
    unittest.main()
