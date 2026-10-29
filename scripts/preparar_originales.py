"""Build source-layout practice sheets; originals remain byte-for-byte intact.

Question locations, removed labels and overrides are recorded for review. The
output preserves open responses, drawings and matching rather than inventing keys.
"""
from pathlib import Path
import re,json,hashlib,io
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'practica-originales';OUT.mkdir(exist_ok=True)
META=json.loads((ROOT/'originales/datos.json').read_text())
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SKIP={11:{3,4},12:set(range(7,12)),13:{2},14:{2},16:{2,3,4,5,6},17:{2,3,4},18:{2},'21A':{7},20:{7},22:{1,2,3},28:{7,8},32:{5,6,7},'32A':{5,6,7,8,9}}
GRID={11,13,14,16,17,18}
# These are statement/label-only source entries, converted to questions explicitly.
OVERRIDES={
 (29,49):'Explica cómo interactúan los polos magnéticos iguales y opuestos.',
 (31,27):'¿Cómo se identifica la ubicación de los conductores de servicio subterráneo?',
 (31,28):'¿Qué separación y protección se requieren al atravesar elementos de madera?',
 (31,29):'¿Quiénes fueron los primeros en estudiar la electricidad, según la fuente?',
 (31,39):'Describe el contenido de la tabla 310.4(A) citada en la fuente.',
 (32,14):'¿Qué significa la R en un conductor RHH?',
 ('32A',14):'¿Qué significa la R en un conductor RHH?',
 (34,31):'Identifica el conducto mostrado.',
 (31,41):'Describe los usos permitidos y no permitidos de la tubería FMT.',
 (31,43):'Describe la instalación de la tubería ENT.',
 (31,64):'¿Qué quórum indica la fuente para reunir a la Junta de Peritos?',
 (31,72):'¿Para qué se utiliza la tubería de color rojo?',
 (31,78):'Identifica el símbolo mostrado.',
 (31,80):'Explica cómo interactúan los polos magnéticos iguales y opuestos.',
 (34,39):'Menciona usos permitidos y no permitidos del cable UF.',
 (34,59):'¿Qué separación y protección se requieren al atravesar elementos de madera?',
 (34,64):'Describe los usos permitidos y no permitidos de la tubería FMT.',
 (34,71):'Menciona usos permitidos del cable AC.',
 (34,72):'Menciona usos no permitidos del cable AC.',
 (34,83):'¿Qué requisitos deben reunir los miembros de la Junta, según la fuente?',
 (34,102):'¿En qué caso se necesita permiso de servidumbre de paso?',
 (35,9):'¿Qué partículas del átomo se mueven alrededor del núcleo?',
 (35,29):'Describe los circuitos en serie, paralelo y serie-paralelo.',
 (36,18):'Indica los tamaños mínimo y máximo de la tubería LFNC.',
}
# Paragraphs in these entries are a worked answer, not alternative choices.
NO_OPTIONS={(32,14),('32A',14),(31,77),(30,26),(32,19),('32A',19),(34,48)}
UNNUMBERED=('La foto celda donde','Transformador seco dentro','La medida del cemento',
 'Cuantos receptáculos','¿Cuántos receptáculos','Si tengo una caja','¿Si tengo una caja',
 'Cuanto es el % de ajuste','En donde no se usa','Cable FMT tamaño','Minimo')
QSTART=re.compile(r'^\\?\s*(\d{1,3})\s*[-.),]+\s*')
QWORD=re.compile(r'siguiente|figura|ilustraci|s[ií]mbolo|identifi|dibuj|escrib|¿|\b(?:cual|cuál|cuanto|cuánto|cuantos|cuántos|calcule|mencione|indique|identifi|dibuj|escriba|resuelve|busque|busca|complete|según|segun|qué|que |de qué|de que |donde|cómo|como |si |tenemos|un circuito|una bombilla|un horno|toda persona|la ley|el largo|la frecuencia|el tamaño|la tubería|el cable|la capacidad|edad mínima|resistencia del|origen de|fórmula|maximo|máximo|libras de|distancia|altura|profundidad|años como|dispositivo|material conductor|mejor material|el área|para la bombilla)\b',re.I)
OPTION=re.compile(r'(?:^|\s)[a-hA-H]\s*[-.)]+\s*|^\s*[a-hA-H]\s+(?=\S)')
DATA=re.compile(r'(?:^|\s)(?:R[Tt1-9]?|E[Tt1-9]?|I[Tt1-9]?|P[Tt1-9]?|W|V|C[1-9]|L[1-9])\s*=\s*[^\n]*\d',re.I)
BARE=re.compile(r'^\s*(?:\d+(?:[.,]\d+)?\s*(?:voltios|volt|[vVaA]|[mµμu]?F|microF|mH|[ΩΩ]|ohmios)\s*)+$',re.I)

def lines_of(page):
 lines=[]
 for b in page.get_text('dict')['blocks']:
  if b['type']!=0:continue
  for l in b['lines']:
   text=''.join(s['text'] for s in l['spans'])
   if text.strip():lines.append({'text':text,'box':l['bbox'],'spans':l['spans']})
 # Merge text fragments sharing a baseline (e.g. a separately formatted number).
 ordered=sorted(lines,key=lambda x:(round(x['spans'][0]['origin'][1],1),x['box'][0]))
 merged=[]
 for line in ordered:
  if merged and abs(merged[-1]['spans'][0]['origin'][1]-line['spans'][0]['origin'][1])<1.5 and merged[-1]['box'][2]<=line['box'][0]+1:
   prev=merged[-1];prev['text']+=' '+line['text'];prev['spans']+=line['spans'];prev['box']=list(fitz.Rect(prev['box'])|fitz.Rect(line['box']))
  else:merged.append(line)
 return merged

def write_line(page,line,text=None):
 # A single regular black font removes red/bold answer-key cues.
 if text is not None:
  x=line['box'][0];y=line['spans'][0]['origin'][1]
  size=min(line['spans'][0]['size'],10.5)
  font=fitz.Font(fontfile=FONT)
  size=min(size,(page.rect.width-x-28)/max(font.text_length(text,fontsize=1),1))
  page.insert_text((x,y),text,fontname='clean',fontfile=FONT,fontsize=size,color=(0,0,0))
  return
 for span in line['spans']:
  t=span['text'];size=span['size'];x,y=span['origin'];font=fitz.Font(fontfile=FONT)
  width=font.text_length(t,fontsize=size)
  room=max(span['bbox'][2]-span['bbox'][0],1)
  if width>room:size*=room/width
  page.insert_text((x,y),t,fontname='clean',fontfile=FONT,fontsize=size,color=(0,0,0))


# Apply a reviewed caption mask everywhere the exact same raster image recurs.
CAPTION_MASKS={(10, 4): [(295, 166, 352, 180), (290, 320, 345, 333)], (12, 5): [(280, 185, 360, 201)], (27, 4): [(349, 446, 415, 465), (348, 542, 426, 578)], (29, 6): [(130, 160, 440, 200)], (29, 10): [(245, 476, 303, 503), (423, 507, 479, 536)], (29, 11): [(215, 99, 355, 114), (125, 264, 470, 292)], (31, 10): [(90, 522, 185, 548), (366, 651, 434, 667)], ('31A', 10): [(90, 522, 185, 548), (366, 651, 434, 667)], (31, 15): [(128, 390, 484, 529)], (34, 18): [(118, 272, 210, 299), (394, 401, 462, 418)], (34, 22): [(137, 475, 193, 498), (214, 475, 269, 498), (392, 475, 445, 498)], (34, 26): [(153, 297, 502, 330)], (36, 6): [(100, 184, 237, 214), (281, 551, 468, 572)]}
CAPTION_MASKS.update({(9,5):[(304,455,332,465)],(35,4):[(180,237,222,254)]})
CAPTION_MASKS[(31,10)].append((136,400,213,412))
RASTER_MASKS={}
for (name,pn),boxes in CAPTION_MASKS.items():
 pdf=fitz.open(ROOT/'originales'/f'EXAMEN_{name}.pdf');page=pdf[pn-1]
 for box in boxes:
  rect=fitz.Rect(box)
  for im in page.get_image_info(hashes=True):
   b=fitz.Rect(im['bbox']);overlap=b&rect
   if not b.is_empty and overlap.get_area()>=rect.get_area()*.7:
    relative=[(overlap.x0-b.x0)/b.width,(overlap.y0-b.y0)/b.height,(overlap.x1-b.x0)/b.width,(overlap.y1-b.y0)/b.height]
    RASTER_MASKS.setdefault(im['digest'].hex(),[]).append(relative)
 pdf.close()

all_audits=[]
for doc in META['documents']:
 key=doc['id'].removeprefix('EXAMEN_');num=int(key) if key.isdigit() else key
 base=31 if num=='31A' else num
 source=fitz.open(ROOT/doc['file']);work=fitz.open(ROOT/doc['file'])
 excluded=SKIP.get(num,set());records=[];questions=[];current=None;last=0;u=0
 for pi,page in enumerate(source):
  if pi+1 in excluded:continue
  ls=lines_of(page)
  for li,line in enumerate(ls):
   t=line['text'].strip();m=QSTART.match(t)
   accepted=False
   if re.fullmatch(r'\d+\s*-\s*\d+[A-Za-z]+',t):m=None
   if m and re.match(r'Ley\s+\d',t[m.end():],re.I):m=None
   if num==31 and pi==14 and re.match(r'^81\s+Identifica',t):m=re.match(r'^(81)\s+',t)
   if m and num not in GRID and not(num in [15,21,'21A',22,25]):
    n=int(m[1])
    if 0<n<=150 and ((last==0 and n<=3) or last<n<=last+4 or (num==36 and n==22 and last==22)):
     accepted=True;last=n
    elif num==31 and pi==14 and n==81:accepted=True
   if not accepted and any(t.startswith(s) for s in UNNUMBERED):
    accepted=True;u+=1;n='u'+str(u);m=None
   if accepted:
    current={'number':n,'page':pi+1,'box':line['box'],'lines':[],'first':line,'stemOpen':True,'stem':[]}
    questions.append(current)
   rec={'page':pi+1,'line':line,'q':current,'kind':'remove','reason':'Texto de consulta o solución fuera del enunciado'}
   if re.match(r'^(Nombre:|Fecha:|Examen\b|Examen_|Repaso\b|PAREO\b)',t,re.I):
    rec.update(kind='keep',reason='Encabezado')
   elif num in GRID:
    rec.update(kind='keep',reason='Hoja de identificación sin etiquetas; numeración conservada')
   elif num in [15,21,'21A',22,25]:
    if num==15 and pi==0:
     if re.fullmatch(r'(?:[A-L]\s*[-.)]+\s*)+',t):rec.update(kind='keep',reason='Letra de pareo')
    elif num==22:
     if re.fullmatch(r'(?:[A-N]\s*)+',t) or re.fullmatch(r'_+',t):rec.update(kind='keep',reason='Hoja de identificación sin claves')
    else:
     rec.update(kind='keep',reason='Enunciado de pareo; valores escritos se borran')
     rec['replacement']=re.sub(r'_+\s*\d+\s*_+','________',line['text'])
     if num==21 and pi>=2:rec.update(kind='remove',reason='Solución numérica del pareo')
     if num=='21A' and pi>=1:
      marker=re.match(r'^\d+[-.)]+',t)
      if marker:rec['replacement']=marker[0]
      else:rec.update(kind='remove',reason='Solución numérica del pareo')
   elif current:
    current['lines'].append(rec)
    if line is current['first']:
     rec.update(kind='stem',reason='Inicio de ejercicio');current['stem'].append(rec)
    elif current['stemOpen']:
     prev=current['stem'][-1]['line'];gap=line['box'][1]-prev['box'][3]
     prevtext=prev['text'].strip()
     if rec['page']==current['page'] and gap<=6 and not (len(t.split())<=3 and '?' not in t and not re.search(r'(?:tipo|de|del|la|las|el|los|en|a|por|para|como|un|una|que|al|sus|es|son|deberá|su)$',prevtext,re.I) and prevtext.count('“')<=prevtext.count('”') and prevtext.count(chr(34))%2==0) and not (re.match(r'^[-–]|^\d+(?:\s|[.,])',t) and '?' not in t and not re.search(r'conect|consume|fuente|resistencia|calcule',t,re.I) and not re.search(r'(?:de|del|en|a|una|un)$',prevtext,re.I)) and not DATA.search(t) and not BARE.match(t) and (not re.search(r'[?:.!]$',prevtext) or re.match(r'El tipo|Si las|¿',t,re.I)) and not OPTION.search(t) and not re.match(r'Contestaci|Soluci|Fuente de informaci',t,re.I):
      rec.update(kind='stem',reason='Continuación del enunciado');current['stem'].append(rec)
     else:current['stemOpen']=False
   records.append(rec)
 # Decide question-level retention only after collecting the whole question.
 for q in questions:
  stem=' '.join(r['line']['text'].strip() for r in q['stem'])
  n=q['number'];override=OVERRIDES.get((base,n));has_image=False
  # Determine the region of this question including drawings and image resources.
  qi=questions.index(q);nq=questions[qi+1] if qi+1<len(questions) else None
  q['regions']=[]
  endpage=nq['page'] if nq else len(source)
  for pn in range(q['page'],endpage+1):
   if pn in excluded:continue
   y0=q['box'][1]-2 if pn==q['page'] else 0
   y1=nq['box'][1]-2 if nq and pn==nq['page'] else source[pn-1].rect.height
   if y1<=y0:continue
   rect=fitz.Rect(0,y0,source[pn-1].rect.width,y1)
   imgs=[im['bbox'] for im in source[pn-1].get_image_info() if fitz.Rect(im['bbox']).intersects(rect)]
   drawings=[d['rect'] for d in source[pn-1].get_drawings() if d['rect'].intersects(rect) and (d['rect'].height>8 or d['rect'].width>8)]
   has_image=has_image or bool(imgs or drawings)
   q['regions'].append({'page':pn,'rect':list(rect)})
  content=QSTART.sub('',stem).strip()
  if override:q['replacement']=f'{n}. {override}'
  elif not QWORD.search(content) and has_image:q['replacement']=f'{n}. Identifica las figuras mostradas.'
  elif not content:q['replacement']=f'{n}. Identifica las figuras mostradas.' if has_image else f'{n}. [La fuente no incluye un enunciado completo.]'
  # Strip labels appended to identification prompts and answers after a question mark.
  elif re.search(r'figura|ilustraci[oó]n|s[ií]mbolo',content,re.I) and ':' in stem and stem.split(':',1)[1].strip():q['replacement']=stem.split(':',1)[0]+':'
  elif '?' in stem and stem.rsplit('?',1)[1].strip() and not re.match(r'\s*(?:Si|cuando|con|en|las resistencias)\b',stem.rsplit('?',1)[1],re.I):q['replacement']=stem.rsplit('?',1)[0]+'?'
  # An isolated label inside the stem can give away a figure even with a question mark elsewhere.
  if num==29 and n in [31,47]:q['replacement']=f'{n}. Identifica las figuras mostradas.'
  if num==35 and n in [26,27,28]:q['replacement']=f'{n}. [La fuente solo enumera un grupo de ejercicios; no incluye sus enunciados.]'
  if num==36 and n==10:q['replacement']='10. [La fuente menciona cuatro preguntas de leyes sin incluir sus enunciados.]'
  if num=='29A' and n==15:q['replacement']='15. [La fuente menciona diez problemas matemáticos sin incluir sus enunciados.]'
  q['sourceStem']=stem;q['hasFigure']=has_image
  letters=set()
  for r in q['lines']:
   letters.update(m.group().strip()[0].lower() for m in OPTION.finditer(r['line']['text']))
  allow_options=len(letters)>=2 and (base,n) not in NO_OPTIONS
  for r in q['lines']:
   if r['kind']=='stem':continue
   t=r['line']['text'].strip()
   if allow_options and OPTION.search(t):
    r.update(kind='keep',reason='Alternativas originales sin marca de corrección')
    note=re.search(r'NOTA:|La caja 4x4 Deep|la de shallow|la de shallow|la deshallow',t,re.I)
    if note:r['replacement']=t[:note.start()].rstrip()
    filled=re.match(r'^([a-hA-H]\s*[-.)]*\s*_{3,})\s+(?=[A-Za-zÁÉÍÓÚáéíóú#]{2})',t)
    if filled:r['replacement']=filled[1]
   elif re.fullmatch(r'En\s+(?:paralelo|serie)\.?',t,re.I):r.update(kind='keep',reason='Topología dada explícitamente en la fuente')
   elif re.fullmatch(r'[\s_|│─/\\.+()*\-–—<>○●]+',t):r.update(kind='keep',reason='Símbolo o espacio de respuesta original')
   elif re.fullmatch(r'[a-hA-H]\s*[-.)]*\s*_+',t):r.update(kind='keep',reason='Espacio de respuesta')
   elif re.search(r'circuit|resisten|corriente|potencia|voltaje|capacit|induct|amper|R total',stem,re.I) and (DATA.search(t) or (has_image and BARE.match(t))) and not re.search(r'Contestaci|Soluci|1ro|2do|3ro',t,re.I):
    r.update(kind='keep',reason='Dato dado del circuito o tabla')
  # These source quantities are an already-worked result or distance to be found.
  if num==19 and n in [12,17]:
   for r in q['lines']:
    if DATA.search(r['line']['text']):r.update(kind='keep',reason='Datos y celdas de la tabla original')
  if num==3 and n in [1,4,6,8]:
   for r in q['lines']:
    if DATA.search(r['line']['text']) or BARE.match(r['line']['text']):r.update(kind='keep',reason='Datos conservados; figura no renderizada completa en la fuente PDF')
  if num==8 and n==27:
   for r in q['lines']:
    if re.fullmatch(r'(?:\s*S[wWpP]?\d?\s*)+',r['line']['text']):r.update(kind='keep',reason='Símbolos tipográficos originales')
  if num==12 and n==6:
   for r in q['lines']:
    if 'experiencia' in r['line']['text'] or r['line']['text'].strip()=='J.E.P.E?':r.update(kind='keep',reason='Segunda pregunta del ejercicio original')
  if num==27 and n in [7,8]:
   for r in q['lines']:
    if re.search(r'Rt|lo cual|como resultado|donde se suman',r['line']['text'],re.I):r.update(kind='remove',reason='Resultado intermedio del solucionario')
 # Redact all original text, then put back retained text using uniform black regular type.
 pagemeta=[]
 for pi,page in enumerate(work):
  if pi+1 in excluded:continue
  page_records=[r for r in records if r['page']==pi+1]
  for b in source[pi].get_text('dict')['blocks']:
   if b['type']!=0:continue
   for line in b['lines']:
    for s in line['spans']:
     if s['text'].strip():
      rect=fitz.Rect(s['bbox']);rect.y1+=1.6
      page.add_redact_annot(rect,fill=None,cross_out=False)
  page.apply_redactions(images=0,graphics=0,text=0)
  # Remove answer-key underlining only under textual alternatives, not diagram symbols.
  for rec in page_records:
   if rec['kind']!='keep' or not OPTION.search(rec['line']['text']) or len(re.sub(r'[^A-Za-z]','',rec['line']['text']))<12:continue
   line=rec['line'];baseline=max(s['origin'][1] for s in line['spans'])
   for drawing in source[pi].get_drawings():
    b=drawing['rect']
    if b.height<1 and b.width>4 and baseline<=b.y0<=baseline+4 and b.x0>=line['box'][0]-1 and b.x1<=line['box'][2]+1:
     page.draw_rect(fitz.Rect(b.x0-.4,b.y0-.7,b.x1+.4,b.y1+.7),color=None,fill=(1,1,1),overlay=True)
  emitted=set()
  for rec in page_records:
   q=rec['q']
   if rec['kind']=='stem':
    if 'replacement' in q:
     if id(q) not in emitted and rec is q['stem'][0]:write_line(page,rec['line'],q['replacement']);emitted.add(id(q))
    else:write_line(page,rec['line'])
   elif rec['kind']=='keep':
    replacement=rec.get('replacement')
    if num==17 and pi==0 and rec['line']['text'].strip()=='13' and rec['line']['box'][1]>550:replacement='29'
    write_line(page,rec['line'],replacement)
  # Remove drawn solutions where the task explicitly asks the student to draw the symbol.
  for q in questions:
   if re.search(r'Dibuj|Escriba cual es el s[ií]mbolo',q['sourceStem'],re.I) or (base,q['number']) in [(31,28),(34,59)]:
    for region in q['regions']:
     if region['page']!=pi+1:continue
     box=fitz.Rect(region['rect']);box.y0=max(box.y0,(q['stem'][0] if 'replacement' in q else q['stem'][-1])['line']['box'][3]+3 if pi+1==q['page'] else 0)
     page.draw_rect(box,color=None,fill=(1,1,1),overlay=True)
  # Hide unrelated reference appendices that share a page with an exercise.
  appendix_cuts={('21A',6):(0,370,page.rect.width,page.rect.height-24),(20,6):(0,500,page.rect.width,page.rect.height-24),(28,6):(0,385,page.rect.width,page.rect.height-24),(32,8):(0,0,page.rect.width,617.7),('32A',10):(0,0,page.rect.width,355.5)}
  cut=appendix_cuts.get((num,pi+1))
  if cut and cut[3]>cut[1]:page.draw_rect(fitz.Rect(cut),color=None,fill=(1,1,1),overlay=True)
  # Raster captions that reveal the identification answer or a requested distance.

  for box in CAPTION_MASKS.get((num,pi+1),[]):page.draw_rect(fitz.Rect(box),color=None,fill=(1,1,1),overlay=True)
  for im in source[pi].get_image_info(hashes=True):
   b=fitz.Rect(im['bbox'])
   for relative in RASTER_MASKS.get(im['digest'].hex(),[]):
    r=fitz.Rect(b.x0+b.width*relative[0],b.y0+b.height*relative[1],b.x0+b.width*relative[2],b.y0+b.height*relative[3]);page.draw_rect(r,color=None,fill=(1,1,1),overlay=True)
  # A footer identifies this as an edited exercise sheet, distinct from the source.
  page.insert_text((24,page.rect.height-12),'Practica: respuestas separadas | ECER Unitec | Fuente '+doc['id']+' p.'+str(pi+1),fontname='helv',fontsize=6,color=(.35,.35,.35))
  pagemeta.append({'sourcePage':pi+1,'pdfPage':len(pagemeta)+1})
 output=fitz.open()
 for pm in pagemeta:output.insert_pdf(work,from_page=pm['sourcePage']-1,to_page=pm['sourcePage']-1,links=False,annots=False)
 filename='practica-originales/'+doc['id']+'.pdf'
 output.save(ROOT/filename,garbage=4,deflate=True);output.close()
 qa=[]
 for q in questions:
  qa.append({'number':q['number'],'sourcePage':q['page'],'stem':q.get('replacement',q['sourceStem']),'sourceStem':q['sourceStem'],'regions':q['regions'],'hasFigure':q['hasFigure'],'status':'requires_visual_review'})
 # Fixed counts come from the source's own numbered grids / matching lists.
 grid_counts={11:24,13:9,14:9,15:12,16:30,17:30,18:20,21:18,'21A':18,22:14,25:16}
 if num in grid_counts:
  qa=[{'number':str(i+1) if num!=22 else chr(65+i),'sourcePage':1 if num!=22 else (4 if i<6 else 5),'stem':'Identificación / pareo original','status':'requires_visual_review'} for i in range(grid_counts[num])]
 if num==1:
  for n,pn in [(10,2),(11,2),(12,3),(13,3),(14,3),(15,3)]:qa.append({'number':n,'sourcePage':pn,'stem':'Ejercicio original en imagen escaneada','status':'requires_visual_review','scanned':True})
 audit={'document':doc['id'],'practiceFile':filename,'sourceSha256':doc['sourceSha256'],'practiceSha256':hashlib.sha256((ROOT/filename).read_bytes()).hexdigest(),'pages':pagemeta,'excludedSourcePages':sorted(excluded),'questions':qa,'removedText':[{'page':r['page'],'text':r['line']['text'].strip(),'reason':r['reason']} for r in records if r['kind']=='remove']}
 all_audits.append(audit)
 print(doc['id'],len(pagemeta),'pages',len(qa),'question starts')
(ROOT/'practica-originales/auditoria.json').write_text(json.dumps({'status':'requires_visual_review','documents':all_audits},ensure_ascii=False,indent=2)+'\n')
