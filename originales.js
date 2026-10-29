'use strict';
(async () => {
 const byId = id => document.getElementById(id);
 const select = byId('documento'), pages = byId('pagina-original'), search = byId('buscar-original');
 const normal = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 try {
  const response = await fetch('originales/datos.json');
  if (!response.ok) throw new Error('No se pudo cargar el inventario');
  const data = await response.json();
  for (const doc of data.documents) { const option=document.createElement('option'); option.value=doc.id;option.textContent=doc.id.replace('_',' ')+' · '+doc.pages.length+' páginas';select.append(option); }
  function renderPage() {
   const doc=data.documents.find(d=>d.id===select.value),number=Number(pages.value)||1;
   const page=doc.pages.find(p=>p.number===number);
   renderLegalNotes(doc.id,number,byId('correcciones-legales-original'));
   byId('titulo-original').textContent=doc.id.replace('_',' ');
   byId('contenido-fuente').hidden=true;
   byId('visor-original').removeAttribute('src');
   byId('mostrar-fuente').hidden=false;
   byId('mostrar-fuente').onclick=()=>{byId('contenido-fuente').hidden=false;byId('mostrar-fuente').hidden=true;byId('visor-original').src=doc.file+'#page='+number+'&view=FitH';};
   byId('abrir-pdf').href=doc.file+'#page='+number;
   byId('descargar-fuente').href=doc.sourceDownload;
   byId('texto-original').textContent=page.text||'Esta página contiene figuras. Consulta el documento original.';
   history.replaceState(null,'','#'+doc.id+'/'+number);
  }
  function openDocument(id,number=1) { select.value=id;pages.replaceChildren();const doc=data.documents.find(d=>d.id===id);for(const page of doc.pages){const option=document.createElement('option');option.value=page.number;option.textContent=page.number;pages.append(option);}pages.value=String(Math.min(Math.max(number,1),doc.pages.length));renderPage(); }
  function searchPages() {
   const term=normal(search.value.trim()),results=byId('resultados-original');results.replaceChildren();
   if(!term){byId('estado-original').textContent=data.documents.length+' exámenes · '+data.documents.reduce((n,d)=>n+d.pages.length,0)+' páginas completas';return;}
   const found=data.documents.flatMap(doc=>doc.pages.filter(p=>normal(p.text).includes(term)).map(page=>({doc,page})));
   byId('estado-original').textContent=found.length+' páginas encontradas en todos los originales';
   for(const {doc,page} of found){const button=document.createElement('button');button.className='secondary';button.textContent=doc.id.replace('_',' ')+' · página '+page.number;button.onclick=()=>openDocument(doc.id,page.number);results.append(button);}
  }
  select.onchange=()=>openDocument(select.value);pages.onchange=renderPage;search.oninput=searchPages;
  const match=location.hash.match(/^#(EXAMEN_\d+[A-Z]?)\/(\d+)$/);
  openDocument(match&&data.documents.some(d=>d.id===match[1])?match[1]:data.documents[0].id,match?Number(match[2]):1);searchPages();
 } catch(error) { byId('estado-original').textContent='No se pudieron cargar los originales. Vuelve a intentarlo.';console.error(error); }
})();
