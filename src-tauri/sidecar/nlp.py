"""Dependency-based structural checks, not a complete grammaticality proof."""
from functools import lru_cache
import re
import spacy

@lru_cache(maxsize=1)
def parser():
    return spacy.load('en_core_web_sm')

def finite_clause(token):
    return (token.pos_ in {'VERB', 'AUX'}
            and any(c.dep_ in {'nsubj', 'nsubjpass', 'csubj', 'expl'} for c in token.children)
            and (token.tag_ in {'VBD', 'VBP', 'VBZ', 'MD'} or any(c.dep_ in {'aux', 'auxpass'} for c in token.children)))

def verify(text, kind):
    doc = parser()(text.strip())
    roots = [t for t in doc if t.dep_ == 'ROOT' and finite_clause(t)]
    valid = False
    if kind == 'compound':
        for root in roots:
            for other in doc:
                if not finite_clause(other) or other == root:
                    continue
                between = doc[min(root.i, other.i):max(root.i, other.i)]
                coordinated = other.dep_ == 'conj' and other.head == root and any(t.dep_ == 'cc' and t.head in (root, other) for t in between)
                semicolon = any(t.text == ';' for t in between) and other.dep_ in {'ROOT', 'conj', 'parataxis'}
                if coordinated or semicolon:
                    valid = True
    else:
        valid = any(finite_clause(t) and t.dep_ in {'advcl', 'ccomp'}
                    and (t.dep_ == 'advcl' or any(c.dep_ == 'mark' for c in t.children))
                    and any(a in roots for a in t.ancestors) for t in doc)
    messages = {'compound': 'Use two subject–finite-verb clauses linked by FANBOYS or a semicolon.',
                'complex': 'Use a main clause and a subordinate clause with its own subject and verb.'}
    return {'valid': bool(valid), 'message': 'Dependency structure verified.' if valid else messages[kind]}

SPELLINGS = {'colour': 'color', 'analyse': 'analyze', 'centre': 'center', 'whilst': 'while'}
def americanize(text):
    flags = []
    def replace(match):
        original = match.group()
        replacement = SPELLINGS[original.lower()]
        if original.isupper(): replacement = replacement.upper()
        elif original.istitle(): replacement = replacement.title()
        flags.append({'original': original, 'replacement': replacement, 'start': match.start()})
        return replacement
    normalized = re.sub(r'\b(' + '|'.join(SPELLINGS) + r')\b', replace, text, flags=re.I)
    return normalized, flags
