import io
import json
from pathlib import Path
import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient
import app
import audio
import coach
import nlp
from pronunciation import attention_items, phonemes

client = TestClient(app.app)

@pytest.mark.parametrize('kind,text,valid', [
 ('compound','I prepared my ideas, and I practiced them aloud.',True),
 ('compound','I prepared my ideas; I practiced them aloud.',True),
 ('compound','I bought apples and pears.',False),
 ('compound','I prepared my ideas. I practiced them aloud.',False),
 ('compound','I prepared my ideas, I practiced them aloud.',False),
 ('compound','I sang and danced.',False),
 ('complex','Although I prepared my ideas, I practiced them aloud.',True),
 ('complex','I practiced because I wanted to improve.',True),
 ('complex','Because of the rain, I stayed home.',False),
 ('complex','Although I prepared my ideas.',False),
])
def test_structure(kind,text,valid):
 assert nlp.verify(text,kind)['valid'] is valid

def test_bank():
 assert len(app.WORDS) >= 100
 assert len({w['word'] for w in app.WORDS}) == len(app.WORDS)
 for w in app.WORDS:
  assert all(w.values()) and w['word'] in w['sample_context'].lower()
 assert client.get('/api/daily-word?day=2026-10-28').json() == client.get('/api/daily-word?day=2026-10-28').json()

def test_gate(monkeypatch):
 async def fail(*args): raise AssertionError('Ollama must not be called')
 monkeypatch.setattr(coach,'evaluate',fail)
 response = client.post('/api/evaluate',json={'compound':'Apples and pears.','complex':'Because rain.','word':'bolster'})
 assert response.status_code == 200 and response.json()['feedback'] is None

def test_coaching_and_offline(monkeypatch):
 async def generate(payload, system):
  assert payload['syntax_valid'] is True and 'Example 2' in system
  return dict(syntax_valid=True,word_of_day_used_correctly=True,glow='Clear clauses.',grow='Be specific.',american_polish='Original -> Suggested',vocabulary_score=8)
 monkeypatch.setattr(coach,'generate',generate)
 data={'compound':'We gather evidence, and we bolster the case.','complex':'Because we analyse the facts, we proceed.','word':'bolster'}
 result=client.post('/api/evaluate',json=data).json()
 assert result['feedback']['vocabulary_score']==8
 assert result['spelling_flags'][0]['replacement']=='analyze'
 async def broken(*args): raise ValueError('bad JSON')
 monkeypatch.setattr(coach,'generate',broken)
 result=client.post('/api/evaluate',json=data).json()
 assert result['feedback'] is None and 'unavailable' in result['error']

def test_schema():
 with pytest.raises(ValueError): coach.Feedback.model_validate(dict(syntax_valid='yes'))

def wav(seconds=1,rate=16000):
 buf=io.BytesIO(); sf.write(buf,.2*np.sin(2*np.pi*180*np.arange(rate*seconds)/rate),rate,format='WAV',subtype='PCM_16');return buf.getvalue()

def test_audio_upload_in_memory(monkeypatch):
 words=[dict(word=w,start=i*.1,end=(i+1)*.1,probability=.9) for i,w in enumerate(['You','know,','um','bolster'])]
 monkeypatch.setattr(audio,'transcribe',lambda samples: words)
 monkeypatch.setattr(audio,'pitch',lambda samples: {'pitch_std_hz':0.,'monotone_risk':True})
 # Larger than multipart's default 1 MiB spool threshold: disk writes must not occur.
 import tempfile
 def forbidden(*args,**kwargs): raise AssertionError('No disk audio writes')
 monkeypatch.setattr(tempfile,'NamedTemporaryFile',forbidden)
 response=client.post('/api/analyze-audio',files={'audio':('speech.wav',wav(40),'audio/wav')},data={'targets':'bolster'})
 assert response.status_code==200, response.text
 result=response.json();assert result['wpm']==6
 assert [f['phrase'] for f in result['fillers']]==['You know','um']
 assert result['fillers'][0]['end']==.2
 assert client.post('/api/analyze-audio',files={'audio':('bad.wav',wav(rate=8000))}).status_code==422
 assert client.post('/api/analyze-audio',files={'audio':('bad.wav',b'garbage')}).status_code==422

def test_pitch():
 result=audio.pitch(.2*np.sin(2*np.pi*180*np.arange(32000)/16000))
 assert result['monotone_risk'] is True
 assert result['pitch_std_hz'] < 2

def test_pronunciation():
 assert phonemes('bolster')==['B','OW1','L','S','T','ER0']
 words=[dict(word='bolster',start=0,end=1,probability=.64)]
 assert len(attention_items(words,['bolster']))==1
 words[0]['probability']=.65
 assert attention_items(words,['bolster'])==[]

def test_origin():
 assert client.get('/api/health',headers={'Origin':'https://evil.example'}).status_code==403

def test_ollama_json_transport(monkeypatch):
 import asyncio
 import httpx
 real_client = httpx.AsyncClient
 def handler(request):
  assert str(request.url) == 'http://127.0.0.1:11434/api/generate'
  payload = json.loads(request.content)
  assert payload['format'] == 'json' and payload['stream'] is False
  return httpx.Response(200,json={'response':json.dumps({'scenario':'Discuss how evidence can bolster a proposal.'})})
 monkeypatch.setattr(coach.httpx,'AsyncClient',lambda **kwargs:real_client(transport=httpx.MockTransport(handler),**kwargs))
 result=asyncio.run(coach.generate({'word':'bolster'},'Return a JSON scenario.'))
 assert 'bolster' in result['scenario']

def test_schema_rejects_out_of_range_and_extra_fields():
 good=dict(syntax_valid=True,word_of_day_used_correctly=True,glow='A',grow='B',american_polish='C',vocabulary_score=8)
 for bad in [{**good,'vocabulary_score':11},{**good,'syntax_valid':'true'},{**good,'unexpected':'field'}]:
  with pytest.raises(ValueError): coach.Feedback.model_validate(bad)

def test_cloud_account_error_keeps_syntax(monkeypatch):
 import httpx
 async def denied(*args):
  response=httpx.Response(402,request=httpx.Request('POST','http://127.0.0.1:11434/api/generate'))
  response.raise_for_status()
 monkeypatch.setattr(coach,'evaluate',denied)
 result=client.post('/api/evaluate',json={'compound':'We gather evidence, and we bolster the case.','complex':'Because we have evidence, we proceed.','word':'bolster'}).json()
 assert result['syntax']['compound']['valid']
 assert result['feedback'] is None and 'usage plan' in result['error']
