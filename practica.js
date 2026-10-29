'use strict';
(async()=>{
 const el=id=>document.getElementById(id),select=el('documento-practica'),pageSelect=el('pagina-practica');
 const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let data,doc,page;
 const storageKey=()=>`ecer-original-${doc.id}-${page.sourcePage}`;
 function hideSolution(){el('solucion-practica').hidden=true;el('visor-solucion').removeAttribute('src');el('mostrar-solucion').hidden=false;}
 function render(){
  doc=data.documents.find(d=>d.id===select.value);page=doc.pages.find(p=>p.sourcePage===Number(pageSelect.value));
  hideSolution();el('titulo-practica').textContent=doc.id.replace('_',' ')+' · página original '+page.sourcePage;
  const url=doc.practiceFile+'#page='+page.pdfPage+'&view=FitH';el('visor-practica').src=url;el('abrir-practica').href=url;
  el('avisos-practica').replaceChildren();for(const warning of [...(doc.warnings||[]),...(page.warnings||[])]){const p=document.createElement('p');p.className='aviso';p.textContent=warning;el('avisos-practica').append(p);}
  el('respuesta-practica').value='';try{el('respuesta-practica').value=localStorage.getItem(storageKey())||'';}catch{}
  el('guardado-practica').textContent='Tus notas se guardan únicamente en este navegador.';
  const i=doc.pages.indexOf(page);el('anterior-practica').disabled=i===0;el('siguiente-practica').disabled=i===doc.pages.length-1;
  el('abrir-solucion').href=doc.sourceFile+'#page='+page.sourcePage;el('word-solucion').href=doc.sourceDownload;
  history.replaceState(null,'','#'+doc.id+'/'+page.sourcePage);
 }
 function open(id,n=1){select.value=id;const d=data.documents.find(d=>d.id===id);pageSelect.replaceChildren();for(const p of d.pages){const o=document.createElement('option');o.value=p.sourcePage;o.textContent=p.sourcePage;pageSelect.append(o);}pageSelect.value=String(d.pages.some(p=>p.sourcePage===Number(n))?n:d.pages[0].sourcePage);render();}
 function search(){const term=normal(el('buscar-practica').value.trim()),results=el('resultados-practica');results.replaceChildren();if(!term){el('estado-practica').textContent=data.documents.length+' documentos · '+data.documents.reduce((n,d)=>n+d.pages.length,0)+' páginas de práctica';return;}const found=data.documents.flatMap(d=>d.pages.filter(p=>normal(p.text).includes(term)).map(p=>({d,p})));el('estado-practica').textContent=found.length+' páginas encontradas';for(const {d,p} of found){const b=document.createElement('button');b.className='secondary';b.textContent=d.id.replace('_',' ')+' · página '+p.sourcePage;b.onclick=()=>open(d.id,p.sourcePage);results.append(b);}}
 try{
  const r=await fetch('practica-originales/datos.json');if(!r.ok)throw Error('Inventario no disponible');data=await r.json();
  for(const d of data.documents){const o=document.createElement('option');o.value=d.id;o.textContent=d.id.replace('_',' ')+' · '+d.pages.length+' páginas';select.append(o);}
  select.onchange=()=>open(select.value);pageSelect.onchange=render;el('buscar-practica').oninput=search;
  el('respuesta-practica').oninput=()=>{try{localStorage.setItem(storageKey(),el('respuesta-practica').value);el('guardado-practica').textContent='Notas guardadas en este navegador.';}catch{el('guardado-practica').textContent='Este navegador no permite guardar las notas. Cópialas antes de salir.';}};
  el('mostrar-solucion').onclick=()=>{el('solucion-practica').hidden=false;el('mostrar-solucion').hidden=true;el('visor-solucion').src=doc.sourceFile+'#page='+page.sourcePage+'&view=FitH';};
  el('anterior-practica').onclick=()=>{const i=doc.pages.indexOf(page);if(i>0){pageSelect.value=String(doc.pages[i-1].sourcePage);render();}};
  el('siguiente-practica').onclick=()=>{const i=doc.pages.indexOf(page);if(i<doc.pages.length-1){pageSelect.value=String(doc.pages[i+1].sourcePage);render();}};
  const match=location.hash.match(/^#(EXAMEN_\d+[A-Z]?)\/(\d+)$/);open(match&&data.documents.some(d=>d.id===match[1])?match[1]:data.documents[0].id,match?Number(match[2]):1);search();
 }catch(error){el('estado-practica').textContent='No se pudieron cargar las hojas de práctica. Intenta recargar la página.';console.error(error);}
})();
