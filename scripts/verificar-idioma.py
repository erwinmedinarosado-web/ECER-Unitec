from pathlib import Path
import json,re,csv
P=Path(__file__).resolve().parent.parent
before=json.loads((P/'auditoria_base_idioma_320.json').read_text());after=json.loads((P/'banco-ampliado.json').read_text());m=json.loads((P/'normalizacion-idioma.json').read_text());patches={str(x['id']):x for x in m['changes']}
assert len(before)==len(after)==320
assert len(patches)==m['summary']['normalizedQuestions']
allowed={'q','options','explanation','optionExplanations','visualAlt'}
for old,q in zip(before,after):
 assert old['id']==q['id'] and old['answer']==q['answer']
 assert old['topic']==q['topic'] and old.get('similarityFamily')==q.get('similarityFamily')
 expected=dict(old)
 for field,c in patches.get(str(q['id']),{}).get('changes',{}).items():
  assert field in allowed and c['before']==old.get(field);expected[field]=c['after']
 assert q==expected,('Cambios fuera del alcance lingüístico',q['id'])
 assert len(set(q['options']))==4
 if q['topic'] in ['Ley de Ohm','Potencia','Circuitos en serie','Circuitos en paralelo'] or q['id']=='ampliacion-38':
  for field in ['q','options']:
   a=old[field] if isinstance(old[field],list) else [old[field]];z=q[field] if isinstance(q[field],list) else [q[field]]
   assert [re.findall(r'\d+(?:[.,]\d+)*',x) for x in a]==[re.findall(r'\d+(?:[.,]\d+)*',x) for x in z],(q['id'],field,'datos')
 text=' '.join([q['q'],*q['options'],q['explanation'],*q.get('optionExplanations',[]),q.get('visualAlt','')])
 assert not re.search(r'\btensión(?!/voltaje)\b',text,re.I),(q['id'],'falta equivalencia voltaje')
 assert not re.search(r'\b(?:breakers?|bonding|subpanel(?:es)?|amperaje|micro switch|dimmer)\b',text,re.I),q['id']
 assert not re.search(r'\b(?:el|un|todo|mismo|bajo|alto)\s+(?:misma\s+)?tensión\b|tensión dividido',text,re.I),(q['id'],'concordancia')
for name in ['subpanel.svg','gabinete.svg','enchufe.svg']:
 s=(P/'imagenes/instalaciones'/name).read_text();assert 'EGC' in s and not re.search(r'\bPE\b',s)
for f in ['index.html','repaso.html','revision-profesional.html']:assert 'terminologia.html' in (P/f).read_text()
glossary=(P/'terminologia.html').read_text();assert 'no se presenta el banco como una actualización normativa al NEC 2023' in glossary;assert 'El texto completo no estuvo disponible' in glossary
with (P/'normalizacion-idioma.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
assert len(rows)==sum(len(x['changes']) for x in m['changes']) and all(None not in row for row in rows)
print('OK: 320 preguntas cotejadas; cambios solo lingüísticos, datos e índices de clave conservados, siglas EGC congruentes, glosario y CSV sincronizados.')
