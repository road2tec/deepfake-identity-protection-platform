"""Download the dataset shards used by ml/train_cnn.py (about 770 MB)."""
import os

from huggingface_hub import hf_hub_download

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "TheKernel01/140k-Real-and-Fake-Faces"

for name in ("data/train-00000-of-00006.parquet", "data/test-00000-of-00002.parquet"):
    print("Downloading", name)
    hf_hub_download(REPO, name, repo_type="dataset", local_dir=os.path.join(HERE, "data"))
print("Done.")
