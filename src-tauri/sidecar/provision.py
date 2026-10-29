"""Explicit, one-time network provisioning; never called during analysis."""
from pathlib import Path
import subprocess
import sys
import nltk
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
subprocess.run([sys.executable, '-m', 'spacy', 'download', 'en_core_web_sm'], check=True)
snapshot_download('Systran/faster-whisper-base.en', local_dir=ROOT / 'models/whisper-base.en')
for resource in ('cmudict', 'averaged_perceptron_tagger', 'averaged_perceptron_tagger_eng'):
    if not nltk.download(resource, download_dir=str(ROOT / 'models/nltk_data')):
        raise RuntimeError(f'Could not provision {resource}')
print('Speech resources ready. Provision the coach separately with: ollama pull llama3:8b')
