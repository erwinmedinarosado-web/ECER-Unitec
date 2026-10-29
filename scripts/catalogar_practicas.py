"""Finalize reviewed practice inventory and document source-conversion limitations.
Run after preparar_originales.py. No source document or answer key is changed.
"""
from pathlib import Path
import json,hashlib
import fitz
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/p).read_text())
audit=read('practica-originales/auditoria.json');originals=read('originales/datos.json')
# Manually observed missing/incomplete source figures; direct Word conversion of
# EXAMEN 3,8,9,30 was also checked. Do not infer a replacement circuit topology.
figure_gaps={
 '3':[1,4,5,6,8], '8':[11,12,29],
 '9':[14,15,18,19,20,21,23,24,25,26],
 '26':[12,13,15,16,39], '30':[44], '31':[83], '31A':[83],
}
outline_gaps={'24':[26],'27':[23],'29':[21,30],'29A':[15],
 '31':[46,59],'31A':[46,59],'35':[26,27,28],'36':[10]}
reference_pages={12:[8,9,10,11],16:[3,4,5,6],17:[3,4],20:[7],
 '21A':[7],22:[1],28:[7,8],32:[5,6,7],'32A':[5,6,7,8,9]}
figure_msg='Figura ausente o incompleta en el PDF convertido: ejercicios {numbers}. Consulta el Word original; no se ha reconstruido ni supuesto el circuito.'
outline_msg='Enunciado ausente, incompleto o solo anunciado en la fuente: ejercicios {numbers}. No se han inventado preguntas ni respuestas.'
public=[];totals={'sourcePages':0,'practicePages':0,'excludedPages':0,'figureGapEntries':0,'incompletePromptEntries':0}
for d in audit['documents']:
 src=next(x for x in originals['documents'] if x['id']==d['document']);key=d['document'].removeprefix('EXAMEN_')
 pdoc=fitz.open(ROOT/d['practiceFile']);pages=[]
 warnings=[]
 if key=='17':warnings.append('Se corrigió la segunda etiqueta 13 de la cuadrícula a 29, siguiendo la secuencia de 30 celdas. El original conserva su numeración.')
 if key in ['31','31A']:warnings.append('La fuente incluye apuntes y títulos breves además de preguntas completas. Se conservan como temas de respuesta escrita; no forman un examen calificado.')
 if key=='36':warnings.append('La fuente repite el número 22. Distingue las respuestas por la posición del ejercicio en la hoja.')
 for pm in d['pages']:
  pn=pm['sourcePage'];pw=[]
  for gaps,msg in [(figure_gaps,figure_msg),(outline_gaps,outline_msg)]:
   numbers=[q['number'] for q in d['questions'] if q['sourcePage']==pn and q['number'] in gaps.get(key,[])]
   if numbers:pw.append(msg.format(numbers=', '.join(map(str,numbers))))
  page=pdoc[pm['pdfPage']-1]
  pages.append({**pm,'text':page.get_text(),'warnings':pw})
 for q in d['questions']:
  q['status']='reviewed_source_layout'
  q['limitations']=[]
  if q['number'] in figure_gaps.get(key,[]):q['limitations'].append('incomplete_converted_figure')
  if q['number'] in outline_gaps.get(key,[]):q['limitations'].append('incomplete_source_prompt')
  totals['figureGapEntries']+=int('incomplete_converted_figure' in q['limitations'])
  totals['incompletePromptEntries']+=int('incomplete_source_prompt' in q['limitations'])
 d['review']={'status':'visual_review_complete_with_source_limitations','scope':'Distribución, numeración, figuras y separación de soluciones impresas; no certifica las respuestas normativas.','correctedSourceNumbering':key=='17'}
 d['sourcePageDisposition']=[]
 for p in src['pages']:
  pn=p['number'];match=next((x for x in pages if x['sourcePage']==pn),None)
  d['sourcePageDisposition'].append({'sourcePage':pn,'disposition':'practice' if match else ('reference_appendix' if pn in reference_pages.get(int(key) if key.isdigit() else key,[]) else 'answered_duplicate'),'practicePage':match['pdfPage'] if match else None})
 public.append({'id':d['document'],'practiceFile':d['practiceFile'],'practiceSha256':d['practiceSha256'],'sourceFile':src['file'],'sourceDownload':src['sourceDownload'],'warnings':warnings,'pages':pages})
 totals['sourcePages']+=len(src['pages']);totals['practicePages']+=len(pages);totals['excludedPages']+=len(d['excludedSourcePages'])
audit['status']='visual_review_complete_with_source_limitations';audit['totals']=totals
audit['reviewNotes']=['40 documentos únicos revisados; las copias y los anexos siguen accesibles íntegramente en las fuentes.','Los inicios de preguntas no son un conteo de preguntas únicas; varias fuentes repiten los mismos ejercicios.','Las leyendas identificadas que revelan respuestas se ocultan; las marcas físicas y los datos necesarios de los componentes se conservan.','Los circuitos incompletos no se reconstruyen. Las respuestas de las fuentes no se certifican; este modo no asigna una nota automática.']
(ROOT/'practica-originales/auditoria.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
(ROOT/'practica-originales/datos.json').write_text(json.dumps({'status':audit['status'],'totals':totals,'documents':public},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(totals))
