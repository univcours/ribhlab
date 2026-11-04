#!/usr/bin/env python3
"""CI validation of official UVDoc ONNX tensors, before Android model shipping.
No private document input, no model rehosting or user uploads.
"""
from huggingface_hub import HfApi,hf_hub_download
import onnx
from pathlib import Path
import json
repo="PaddlePaddle/UVDoc_onnx"
files=HfApi().list_repo_files(repo_id=repo)
print("OFFICIAL UVDoc_onnx files:",json.dumps(files),flush=True)
models=[n for n in files if n.endswith(".onnx")]
if not models:
    raise SystemExit("OFFICIAL_UVDOC_ONNX_NOT_PUBLISHED: validate Paddle-to-ONNX conversion in separate job; do not ship fake model")
model_path=hf_hub_download(repo_id=repo,filename=models[0])
m=onnx.load(model_path)
def tinfo(field):
    return [{"name":x.name,"type":x.type.tensor_type.elem_type,"shape":[d.dim_value if d.dim_value else d.dim_param for d in x.type.tensor_type.shape.dim]} for x in field]
print("OFFICIAL UVDoc_onnx inputs:",json.dumps(tinfo(m.graph.input)),flush=True)
print("OFFICIAL UVDoc_onnx outputs:",json.dumps(tinfo(m.graph.output)),flush=True)
print("MODEL_SIZE_BYTES:",Path(model_path).stat().st_size,flush=True)
onnx.checker.check_model(model_path)
print("UVDOC_ONNX_VALIDATED")
