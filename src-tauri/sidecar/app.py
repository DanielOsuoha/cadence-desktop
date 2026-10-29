import asyncio
from datetime import date
import json
from pathlib import Path
import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import nlp
import coach
from audio import analyze

app = FastAPI(title='Cadence local analysis')
ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'tauri://localhost', 'http://tauri.localhost']
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])
WORDS = json.loads((Path(__file__).parent / 'data/words.json').read_text())
AUDIO_LOCK = asyncio.Lock()

@app.middleware('http')
async def local_requests(request: Request, call_next):
    from starlette.responses import JSONResponse
    if request.headers.get('origin') and request.headers['origin'] not in ORIGINS:
        return JSONResponse({'detail': 'Origin not permitted.'}, status_code=403)
    return await call_next(request)

class Submission(BaseModel):
    compound: str = Field(min_length=1, max_length=3000)
    complex: str = Field(min_length=1, max_length=3000)
    word: str = Field(min_length=1, max_length=80)

@app.get('/api/health')
def health():
    try:
        nlp.parser()
        return {'syntax': 'ready'}
    except OSError:
        raise HTTPException(503, 'Install en_core_web_sm: python -m spacy download en_core_web_sm')

@app.get('/api/daily-word')
def daily_word(day: date | None = None):
    return WORDS[((day or date.today()).toordinal()) % len(WORDS)]

@app.post('/api/scenario')
async def scenario(day: date | None = None):
    word = daily_word(day)
    try:
        result = await coach.generate(word, 'Return JSON with one string key scenario: a brief writing scenario using the supplied word. Do not choose another word.')
        if set(result) != {'scenario'} or not isinstance(result['scenario'], str) or not 1 <= len(result['scenario']) <= 2000:
            raise ValueError('Invalid scenario')
        return result
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(503, 'Scenario unavailable. Start Ollama and install the configured model; the curated word remains available.')

@app.post('/api/evaluate')
async def evaluate(submission: Submission):
    if submission.word not in {w['word'] for w in WORDS}:
        raise HTTPException(422, 'Choose a word from the curated bank.')
    try:
        checks = await asyncio.to_thread(lambda: {kind: nlp.verify(getattr(submission, kind), kind) for kind in ('compound', 'complex')})
    except OSError:
        raise HTTPException(503, 'Dependency parser missing. Install en_core_web_sm.')
    normalized, flags = nlp.americanize(submission.compound + '\n' + submission.complex)
    used = bool(re.search(r'\b' + re.escape(submission.word) + r'\b', normalized, re.I))
    base = {'syntax': checks, 'spelling_flags': flags, 'feedback': None}
    if not all(c['valid'] for c in checks.values()) or not used:
        return {**base, 'error': None if used else 'Use the word of the day in at least one sentence.'}
    try:
        feedback = await coach.evaluate({'submission': submission.model_dump(), 'normalized': normalized, 'syntax_valid': True, 'spelling_flags': flags})
        return {**base, 'feedback': feedback, 'error': None}
    except (httpx.HTTPError, ValueError, KeyError):
        return {**base, 'error': 'Syntax verified; coaching unavailable. Start Ollama with the configured model, or retry if its JSON response was invalid.'}

@app.post('/api/analyze-audio')
async def analyze_audio(request: Request):
    # Bound the body before multipart parsing to prevent UploadFile disk spooling.
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > 4_100_000:
            raise HTTPException(413, 'Audio upload exceeds the 125-second limit.')
    from python_multipart.multipart import FormParser, parse_options_header
    files = []; fields = {}
    def field(item): fields[item.field_name.decode()] = (item.value or b'').decode()
    def file(item):
        item.file_object.seek(0); files.append(item.file_object.read())
    try:
        content_type, options = parse_options_header(request.headers.get('content-type', ''))
        if content_type != b'multipart/form-data' or b'boundary' not in options:
            raise ValueError('Use multipart/form-data with a boundary.')
        parser = FormParser('multipart/form-data', field, file, boundary=options[b'boundary'], config={'MAX_MEMORY_FILE_SIZE': 4_100_000, 'MAX_BODY_SIZE': 4_100_000})
        parser.write(bytes(raw))
        parser.finalize()
        if len(files) != 1: raise ValueError('Supply one WAV file.')
        targets = re.findall(r"[A-Za-z]+", fields.get('targets', ''))[:20]
        if AUDIO_LOCK.locked(): raise HTTPException(429, 'Audio analysis is busy; retry shortly.')
        async with AUDIO_LOCK:
            return await asyncio.to_thread(analyze, files[0], targets)
    except (ValueError, OSError) as error:
        raise HTTPException(422, str(error))
    except (RuntimeError, LookupError):
        raise HTTPException(503, 'Local speech model or pronunciation resources missing. Follow sidecar setup in README.')
