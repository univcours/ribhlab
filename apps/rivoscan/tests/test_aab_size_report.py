import importlib.util
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('aab_report', ROOT / 'scripts' / 'aab-size-report.py')
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)

class AabSizeTests(unittest.TestCase):
    def test_summary_counts_modules_and_files(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'sample.aab'
            with ZipFile(p,'w',ZIP_DEFLATED) as z:
                z.writestr('BundleConfig.pb','header')
                z.writestr('base/dex/classes.dex','dex'*100)
                z.writestr('base/assets/model.bin','data'*1500)
            data=report.summarize(p)
            self.assertEqual(data['entries'],3)
            self.assertEqual(data['bundle_bytes'],p.stat().st_size)
            self.assertIn('base/assets',data['groups'])
            self.assertEqual(data['groups']['base/dex']['count'],1)
            self.assertIn('RivoScan Android AAB size audit',report.markdown(data))
if __name__=='__main__':
    unittest.main()
