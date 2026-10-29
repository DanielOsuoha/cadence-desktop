"""Explicit, one-time network provisioning; never called during analysis."""
from pathlib import Path
import subprocess
import sys
import nltk
import ssl
import certifi

# Python.org macOS installs may not have a configured system CA bundle.
# Keep certificate verification enabled using the installed certifi bundle.
ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
subprocess.run([sys.executable, '-m', 'spacy', 'download', 'en_core_web_sm'], check=True)
snapshot_download('Systran/faster-whisper-base.en', local_dir=ROOT / 'models/whisper-base.en')
for resource in ('cmudict', 'averaged_perceptron_tagger', 'averaged_perceptron_tagger_eng'):
    if not nltk.download(resource, download_dir=str(ROOT / 'models/nltk_data')):
        raise RuntimeError(f'Could not provision {resource}')
print('Speech resources ready. Provision the coach separately with: ollama pull kimi-k2.6:cloud')
