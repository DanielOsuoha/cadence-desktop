from functools import lru_cache
from difflib import SequenceMatcher
import re
import cmudict

@lru_cache(maxsize=1)
def dictionary():
    return cmudict.dict()

@lru_cache(maxsize=1)
def fallback():
    # g2p_en otherwise downloads NLTK resources during import. Require provisioning.
    import nltk
    for resource in ('corpora/cmudict', 'taggers/averaged_perceptron_tagger', 'taggers/averaged_perceptron_tagger_eng'):
        nltk.data.find(resource)
    from g2p_en import G2p
    return G2p()

@lru_cache(maxsize=2048)
def phonemes(word):
    known = dictionary().get(word.lower())
    if known: return known[0]
    return [p for p in fallback()(word) if re.fullmatch(r'[A-Z]+[012]?', p)]

def attention_items(words, targets):
    items = []
    for target in dict.fromkeys(targets):
        expected = phonemes(target)
        matches = [w for w in words if w['word'].strip(' .,!?;:').lower() == target.lower()]
        for match in matches:
            if match['probability'] < .65:
                items.append(dict(target=target, phonemes=expected, reason='Low recognition confidence; listen and retry.', **match))
        if not matches:
            # Similar phonemes are a review cue, never proof of a dropped sound.
            candidates = []
            for w in words:
                heard = re.sub(r'[^a-zA-Z]', '', w['word']).lower()
                if not heard: continue
                actual = dictionary().get(heard)
                if actual and SequenceMatcher(None, expected, actual[0]).ratio() >= .65:
                    candidates.append(w)
            if candidates:
                items.append(dict(target=target, phonemes=expected, reason='A phonetically similar word was recognized; compare with the target.', **candidates[0]))
            else:
                items.append(dict(target=target, phonemes=expected, reason='Target not recognized; no acoustic diagnosis is possible.', start=None, end=None, probability=None, word=''))
    return items
