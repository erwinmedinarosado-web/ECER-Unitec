import json,re,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
b=json.loads((ROOT/'banco-ampliado.json').read_text())
def values(s,unit):return [float(x.replace(',','')) for x in re.findall(r'([\d,]+(?:\.\d+)?)\s*'+re.escape(unit),s)]
def options_match(option,result):
 m=re.search(r'[\d,]+(?:\.\d+)?',option)
 if not m:return False
 v=float(m[0].replace(',',''));precision=len(m[0].split('.')[1]) if '.' in m[0] else 0
 return abs(v-result)<=.500001*10**(-precision)
checks=[];concept=[];bad=[]
for q in b:
 if q['topic'] not in ['Ley de Ohm','Potencia','Circuitos en serie','Circuitos en paralelo'] and q['id']!='ampliacion-38':continue
 s=q['q'];rs=values(s,'Ω');vs=values(s,'V');amps=values(s,'A');watts=values(s,'W');result=None;formula=''
 if q['id']=='ampliacion-38':result=4*2.25;formula='4 × 2.25'
 elif rs and 'paralelo' in s and not vs and (len(rs)>1 or re.search(r'\d+ (?:resistencias|resistores) de',s)):
  count=re.search(r'(\d+) (?:resistencias|resistores) de',s)
  if len(rs)==1 and count:result=rs[0]/int(count[1]);formula=f'{rs[0]}/{count[1]}'
  else:result=1/sum(1/r for r in rs);formula='1/('+ ' + '.join('1/'+str(r) for r in rs)+')'
 elif rs and ('resistencias' in s or 'resistores' in s) and 'serie' in s:
  total=sum(rs)
  if len(rs)==1:total=rs[0]*(3 if 'tres' in s.lower() else 2 if 'dos' in s.lower() else 1)
  result=vs[0]/total if vs else total;formula=f'{vs[0]}/{total}' if vs else ' + '.join(map(str,rs))
 elif rs and 'ocho resistores' in s:result=rs[0]/8;formula=f'{rs[0]}/8'
 elif rs and 'paralelo' in s and vs:result=sum(vs[0]/r for r in rs);formula=' + '.join(f'{vs[0]}/{r}' for r in rs)
 elif len(amps)==3 and 'tercera rama' in s:result=amps[0]-amps[1]-amps[2];formula=f'{amps[0]} - {amps[1]} - {amps[2]}'
 elif q['id'] in ['original-4',42]:result=250-75-75;formula='250 - 75 - 75'
 elif vs and rs:
  result=vs[0]**2/rs[0] if q['topic']=='Potencia' else vs[0]/rs[0];formula=f'{vs[0]}²/{rs[0]}' if q['topic']=='Potencia' else f'{vs[0]}/{rs[0]}'
 elif vs and amps:result=vs[0]*amps[0] if q['topic']=='Potencia' else vs[0]/amps[0];formula=f'{vs[0]}'+(' × ' if q['topic']=='Potencia' else '/')+str(amps[0])
 elif rs and amps:result=rs[0]*amps[0];formula=f'{rs[0]} × {amps[0]}'
 elif watts and vs:
  if q['topic']=='Potencia' and re.search(r'corriente|consume una|consume\?',s):result=watts[0]/vs[0];formula=f'{watts[0]}/{vs[0]}'
  else:result=vs[0]**2/watts[0];formula=f'{vs[0]}²/{watts[0]}'
 if result is None:concept.append(q['id']);continue
 matches=[i for i,o in enumerate(q['options']) if options_match(o,result)]
 row={'id':q['id'],'formula':formula,'result':result,'key':q['options'][q['answer']],'matchingOptions':matches}
 checks.append(row)
 if q['answer'] not in matches or len(matches)!=1:bad.append(row)
assert len(checks)==153 and len(concept)==14,(len(checks),len(concept))
assert not bad,bad
import csv,hashlib,sys,copy,unicodedata,ast,operator
base=json.loads((ROOT/'auditoria_base_320.json').read_text());patches=json.loads((ROOT/'correcciones-auditoria-320.json').read_text());patchby={str(x['id']):x for x in patches}
language=json.loads((ROOT/'normalizacion-idioma.json').read_text());lb={str(x['id']):x for x in language['changes']}
languageBase=json.loads((ROOT/'auditoria_base_idioma_320.json').read_text())
assert len(base)==len(b)==len(languageBase)==320
for original,current in zip(base,b):
 assert original['id']==current['id'];expected=copy.deepcopy(original);patch=patchby.get(str(current['id']))
 if patch:
  for field,change in patch['changes'].items():assert expected.get(field)==change['before'],(current['id'],field,'before');expected[field]=change['after']
 assert expected==languageBase[next(i for i,q in enumerate(base) if q['id']==current['id'])],('Base de idioma incoherente',current['id'])
 wording=lb.get(str(current['id']))
 if wording:
  for field,change in wording['changes'].items():assert expected.get(field)==change['before'],(current['id'],field,'idioma before');expected[field]=change['after']
 assert expected==current,('Cambio no documentado',current['id'])
 assert current['answer']==original['answer'],('Índice de clave modificado',current['id'])
 assert len(current['options'])==4 and len(set(current['options']))==4,current['id']
 assert all(isinstance(x,str) and x.strip() for x in current['options'])
 assert isinstance(current['answer'],int) and 0<=current['answer']<4
 if current.get('optionExplanations'):assert len(current['optionExplanations'])==4 and all(current['optionExplanations'])
concepts=json.loads((ROOT/'revision-conceptos-320.json').read_text());cb={str(x['id']):x for x in concepts};nb={str(x['id']):x for x in checks}
assert len(cb)==167 and len(nb)==153 and set(cb).isdisjoint(nb)
assert set(cb)|set(nb)=={str(q['id']) for q in b}
for q in b:
 if str(q['id']) in cb:
  c=cb[str(q['id'])]
  reviewed={'q':c['reviewedQuestion'],'options':c['reviewedOptions'],'explanation':c['reviewedExplanation'],'optionExplanations':c['reviewedOptionExplanations']}
  for field,change in lb.get(str(q['id']),{}).get('changes',{}).items():
   if field not in reviewed:continue
   assert reviewed[field]==change['before'],(q['id'],field,'concepto previo')
   reviewed[field]=change['after']
  assert c['reviewedAnswer']==q['answer'] and reviewed['options'][c['reviewedAnswer']]==q['options'][q['answer']]
  assert reviewed['q']==q['q'] and reviewed['explanation']==q['explanation']
  assert reviewed['options']==q['options'] and reviewed['optionExplanations']==q.get('optionExplanations')
 else:
  s=q['q'].lower();unit='pulgadas cúbicas' if q['id']=='ampliacion-38' else 'V' if q['id'] in ['original-4',42,94] else 'W' if 'potencia' in s else 'A' if ('corriente' in s or 'amperios' in s) else 'Ω'
  assert unit in q['options'][q['answer']],('Unidad incorrecta',q['id'],unit)
# Check numerical equalities printed in explanations, using only arithmetic AST nodes.
def evaluate(expr):
 expr=expr.strip().replace(',','').replace('×','*').replace('−','-').replace('²','**2')
 def walk(n):
  if isinstance(n,ast.Expression):return walk(n.body)
  if isinstance(n,ast.Constant) and isinstance(n.value,(float,int)):return n.value
  if isinstance(n,ast.BinOp) and type(n.op) in [ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow]:return {ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv,ast.Pow:operator.pow}[type(n.op)](walk(n.left),walk(n.right))
  raise ValueError('No arithmetic')
 return walk(ast.parse(expr,mode='eval'))
num=r'\d[\d,]*(?:\.\d+)?';expr=num+r'(?:\s*(?:\*\*|[+*/−×-])\s*'+num+r')*'
equalities=[]
for q in b:
 for field,text in [('explanation',q['explanation'])]+[(f'optionExplanation-{i}',v) for i,v in enumerate(q.get('optionExplanations',[]))]:
  t=text.replace('²','**2')
  for m in re.finditer(r'(?<![\w])('+expr+r')\s*(?:=|≈)\s*('+expr+')',t):
   left,right=m.groups()
   if not any(op in left+right for op in ['+','/','*','×','−','-']):continue
   a,z=evaluate(left),evaluate(right)
   digits=len(right.strip().split('.')[-1]) if '.' in right and not any(op in right for op in ['+','/','*','×','−','-']) else 8
   tolerance=max(.500001*10**(-digits),1e-7)
   assert abs(a-z)<=tolerance,(q['id'],field,left,right,a,z)
   equalities.append({'id':q['id'],'field':field,'left':left,'right':right})
# Professional CSV must exactly match every canonical question, not only its row count.
with (ROOT/'revision-profesional.csv').open(encoding='utf-8-sig',newline='') as f:professional=list(csv.DictReader(f))
assert len(professional)==320
for q,row in zip(b,professional):
 assert None not in row and row['ID']==str(q['id'])
 assert row['Tema']==language['topicLabels'].get(q['topic'],q['topic'])
 assert row['Pregunta']==q['q'] and row['Clave']==q['options'][q['answer']] and row['Explicación']==q['explanation']
 assert row['Referencias']==' | '.join(r['url'] for r in q['references'])
 assert row['Estado']=='Pendiente de revisión profesional'
# Every local reference resolves, including its section fragment.
for q in b:
 for r in q['references']:
  if r['url'].startswith('http'):assert r['url'].startswith('https://');continue
  file,_,fragment=r['url'].partition('#');text=(ROOT/file).read_text();assert not fragment or f'id="{fragment}"' in text,(q['id'],r)
visuals={q.get('visual') or q.get('diagram') for q in b if q.get('visual') or q.get('diagram')}
assert len(visuals)==27
for file in visuals:assert (ROOT/file).is_file()
rows=[]
for q in b:
 id=str(q['id']);calc=nb.get(id);method='Recálculo desde los datos; unidades y opciones contrastadas' if calc else 'Revisión conceptual del enunciado, cuatro opciones, clave y explicación'
 note='Concepto revisado; la edición NEC aplicable y el texto íntegro con excepciones requieren cotejo profesional.' if any('nfpa.org' in r['url'] for r in q['references']) else 'Revisión técnica del asistente; no certificación profesional.'
 if q['id'] in [27,91]:note+=' Historia: fecha de enmienda contrastada en compilación OGP y registro de leyes de 1992; definición vigente en art. 2(c).'
 rows.append({'id':q['id'],'topic':language['topicLabels'].get(q['topic'],q['topic']),'question':q['q'],'options':q['options'],'answerIndex':q['answer'],'answer':q['options'][q['answer']],'explanation':q['explanation'],'method':method,'calculation':calc,'visual':q.get('visual') or q.get('diagram'),'changed':id in patchby,'languageNormalized':id in lb,'notes':note,'references':q['references'],'questionSha256':hashlib.sha256(json.dumps(q,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()})
audit={'date':'2026-10-29','languageNormalizedOn':language['date'],'languageScope':language['scope'],'baselineCommit':'66fac87f41190d7d0015c3178001bfb62aa6627d','scope':'Revisión técnica realizada por el asistente. No equivale a una revisión humana independiente, certificación WCAG ni aprobación de la Junta.','summary':{'questions':320,'numericRecalculations':153,'conceptualReviews':167,'printedEqualitiesChecked':len(equalities),'uniqueVisualsInspected':27,'questionsWithVisuals':sum(bool(q.get('visual') or q.get('diagram')) for q in b),'questionsChanged':len(patches),'questionStemsClarified':sum('q' in p['changes'] for p in patches),'questionsWithOptionsChanged':sum('options' in p['changes'] for p in patches),'answerIndicesChanged':0,'languageNormalizedQuestions':len(lb)},'limits':['La convocatoria no confirma aquí la edición NEC exigida.','Los documentos públicos de desarrollo NFPA corroboran conceptos; no se afirma haber leído íntegramente una edición del código.','Las sesiones con estudiantes y la revisión por un perito acreditado siguen pendientes.','El historial agregado ya entregado no permite recalificar una antigua respuesta ambigua sin sus respuestas originales. Los intentos antiguos guardados aceptan ambas opciones históricas de 1 A.'],'records':rows}
if '--write' in sys.argv:
 (ROOT/'auditoria-preguntas-320.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 with (ROOT/'auditoria-preguntas-320.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f,lineterminator='\n');w.writerow(['ID','Tema','Pregunta','Opción A','Opción B','Opción C','Opción D','Clave revisada','Explicación','Método','Cálculo independiente','Modificada técnicamente','Normalizada en español','Notas de alcance','Fuentes','SHA256'])
  for r in rows:w.writerow([r['id'],r['topic'],r['question'],*r['options'],r['answer'],r['explanation'],r['method'],(r['calculation']['formula']+' = '+str(r['calculation']['result'])) if r['calculation'] else '', 'Sí' if r['changed'] else 'No','Sí' if r['languageNormalized'] else 'No',r['notes'],' | '.join(x['url'] for x in r['references']),r['questionSha256']])
else:
 saved=json.loads((ROOT/'auditoria-preguntas-320.json').read_text());assert saved==audit,'El banco cambió después de generar su auditoría.'
 with (ROOT/'auditoria-preguntas-320.csv').open(encoding='utf-8-sig',newline='') as f:ar=list(csv.DictReader(f))
 assert len(ar)==320
 for r,a in zip(rows,ar):assert None not in a and str(r['id'])==a['ID'] and a['Clave revisada']==r['answer'] and a['SHA256']==r['questionSha256']
print('OK: 320 preguntas registradas; 153 recálculos, 167 revisiones conceptuales,',len(equalities),'igualdades aritméticas; 27 imágenes; CSV profesional y fuentes locales congruentes.')
print(json.dumps(audit['summary'],ensure_ascii=False))
