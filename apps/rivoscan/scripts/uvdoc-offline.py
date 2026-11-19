#!/usr/bin/env python3
"""Optional desktop validation harness for PaddlePaddle UVDoc_onnx (Apache-2.0).

Not part of the Android APK. No external document uploads are performed by
this script; PaddleOCR may download the ONNX model on first use.
Run on a supported Python with paddleocr + onnxruntime installed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
from datetime import datetime, timezone


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Offline UVDoc ONNX comparison, never replace an original photo")
    parser.add_argument("input", type=Path, help="Local JPEG or PNG document image")
    parser.add_argument("--output-dir", type=Path, default=Path("uvdoc-output"))
    args = parser.parse_args()
    src = args.input.expanduser().resolve(strict=True)
    if not src.is_file() or src.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        parser.error("Input must be an existing JPEG, PNG or WEBP")
    output = args.output_dir.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    target = output / ("PerfectScan_Original_" + src.name)
    if src == target:
        parser.error("Output must differ from original input")
    if target.exists():
        parser.error(f"Original copy already exists: {target}")
    try:
        from paddleocr import TextImageUnwarping
    except ImportError:
        print("Install compatible paddleocr and onnxruntime to run this optional desktop tool.", file=sys.stderr)
        return 2
    shutil.copy2(src, target)
    before_files = set(output.iterdir())
    model = TextImageUnwarping(model_name="UVDoc", engine="onnxruntime")
    results = model.predict(str(src), batch_size=1)
    count = 0
    for result in results:
        result.save_to_img(save_path=str(output))
        count += 1
    outputs = [p for p in output.iterdir() if p.is_file() and p not in before_files and p != target]
    report = {
        "RivoScan": "Optional UVDoc ONNX desktop prototype, not part of Android APK",
        "timestampUTC": datetime.now(timezone.utc).isoformat(),
        "source": str(src), "sourceSha256": sha256(src), "sourceCopy": str(target),
        "sourceCopySha256": sha256(target),
        "model": "PaddlePaddle/UVDoc_onnx", "runtime": "onnxruntime",
        "imagesProcessed": count,
        "modelOutputs": [{"path": str(p), "sha256": sha256(p)} for p in outputs],
        "caveat": "Geometric changes require manual comparison; not certified forensic authenticity."
    }
    report_path = output / "UVDoc_offline_integrity.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("UVDoc output:", output)
    print("Integrity metadata:", report_path)
    return 0 if count else 1


if __name__ == "__main__":
    raise SystemExit(main())
