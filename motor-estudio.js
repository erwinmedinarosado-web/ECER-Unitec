let exam=[],answers=[],flags=[],index=0,attempt=null,active=false,timerHandle=null,lastResult=null,markedOnly=false;
const $=id=>document.getElementById(id);
const ATTEMPT_KEY='electricidadAttemptV3',PROFILE_KEY='electricidadStudyV3';
const LEVELS={basica:'Básica',aplicacion:'Aplicación',analisis:'Análisis'};
let storageAvailable=true;
function readStore(key,fallback){try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch(error){return fallback}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){storageAvailable=false;return false}}
function removeStore(key){try{localStorage.removeItem(key);return true}catch(error){storageAvailable=false;return false}}
function getProfile(){let p=readStore(PROFILE_KEY,null);if(!p||p.version!==3||!Array.isArray(p.history)||!Array.isArray(p.mistakes)||!p.topics||typeof p.topics!=='object'){const legacy=readStore('electricidadScores',[]);p={version:3,history:Array.isArray(legacy)?legacy.slice(0,15).filter(x=>x&&typeof x.pct==='number').map(x=>({...x,kind:'legacy',total:50})):[],topics:{},mistakes:[]}}return prepareReviewProfile(p)}
let profile=getProfile();
function announce(text){$('saveStatus').textContent=text}
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function balancedQuestions(level='mixta'){
 const selected=[];
 for(const [group,quota] of [['calculos',10],['circuitos',8],['aplicaciones',32]]){
  const pool=shuffle(BANK.filter(q=>q.examGroup===group));const topics=new Map(),families=new Map();
  for(let n=0;n<quota;n++){
   let best=-1,lowest=Infinity;
   for(let i=0;i<pool.length;i++){
    const q=pool[i];const family=q.similarityFamily||String(q.id);
    const preference=level==='mixta'?0:(q.difficulty===level?0:1);
    const score=(families.get(family)||0)*1000+preference*100+(topics.get(q.topic)||0)*10;
    if(score<lowest){lowest=score;best=i}
   }
   if(best<0)throw new Error('Banco insuficiente para '+group);
   const q=pool.splice(best,1)[0];selected.push(q);topics.set(q.topic,(topics.get(q.topic)||0)+1);const family=q.similarityFamily||String(q.id);families.set(family,(families.get(family)||0)+1);
  }
 }
 return shuffle(selected);
}
function show(id){for(const x of ['home','exam','results','bank'])$(x).classList.toggle('hidden',x!==id);window.scrollTo(0,0);if(id!=='exam')focusHeading(id)}
function focusHeading(id){const key={home:'homeTitle',exam:'question',results:'resultsTitle',bank:'bankTitle'}[id];const heading=$(key);if(heading&&typeof heading.focus==='function')heading.focus({preventScroll:false})}
function orderedQuestion(q,order){return {...q,optionOrder:order,options:order.map(i=>q.options[i]),answer:order.indexOf(q.answer),optionExplanations:q.optionExplanations?order.map(i=>q.optionExplanations[i]):undefined}}
function saveAttempt(){if(!attempt||!active)return false;const record={version:3,...attempt,index,answers:[...answers],flags:[...flags],questions:exam.map(q=>({id:q.id,order:q.optionOrder})),updatedAt:Date.now()};const ok=writeStore(ATTEMPT_KEY,record);announce(ok?'Avance guardado en este navegador.':'No se pudo guardar el avance. Mantén esta página abierta.');return ok}
function newId(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function start(kind='exam',topic=''){
 if(readStore(ATTEMPT_KEY,null)&&!confirm('Hay un intento guardado. Comenzar otro lo reemplazará. ¿Deseas continuar?'))return;
 let questions;
 if(kind==='errors'){
  const ids=lastResult?lastResult.wrongIds:profile.mistakes;
  const wanted=new Set(ids.map(String));questions=shuffle(BANK.filter(q=>wanted.has(String(q.id)))).slice(0,50);
  if(!questions.length){announce('No hay errores pendientes para practicar.');return}
 }else if(kind==='spaced'||kind==='topic'){questions=learningQuestions(kind,topic);if(!questions.length){announce(kind==='spaced'?'No hay repasos pendientes para hoy.':'No hay preguntas para este tema.');return}}else questions=balancedQuestions($('examLevel').value||'mixta');
 const timed=kind==='exam'&&$('examMode').value==='timed';
 const raw=Number($('minutes').value),minutes=Number.isFinite(raw)?Math.min(240,Math.max(10,Math.round(raw))):90;
 if(timed)$('minutes').value=minutes;
 const now=Date.now();attempt={id:newId(),kind,timed,level:kind==='exam'?$('examLevel').value:'errores',startedAt:now,deadline:timed?now+minutes*60000:null};
 exam=questions.map(q=>orderedQuestion(q,shuffle([0,1,2,3])));answers=Array(exam.length).fill(null);flags=Array(exam.length).fill(false);index=0;active=true;markedOnly=false;lastResult=null;
 $('questionMap').classList.add('hidden');show('exam');saveAttempt();render();focusHeading('exam');startTimer();
}
function restoreRecord(record){
 if(!record||record.version!==3||!Array.isArray(record.questions)||!record.questions.length||record.questions.length>50||!Array.isArray(record.answers)||!Array.isArray(record.flags)||record.answers.length!==record.questions.length||record.flags.length!==record.questions.length||!['exam','errors','spaced','topic'].includes(record.kind)||typeof record.id!=='string')throw new Error('Intento no válido');
 if(record.kind==='exam'&&record.questions.length!==50)throw new Error('Examen incompleto');
 if(!Number.isInteger(record.index)||record.index<0||record.index>=record.questions.length||!Number.isFinite(record.startedAt))throw new Error('Posición no válida');
 if(record.timed&&(!Number.isFinite(record.deadline)||record.kind!=='exam'))throw new Error('Cronómetro no válido');
 const seen=new Set();const restored=record.questions.map((item,i)=>{const q=BANK.find(q=>q.id===item.id);if(!q||seen.has(String(q.id))||!Array.isArray(item.order)||item.order.length!==4||item.order.some(x=>!Number.isInteger(x))||[...item.order].sort().join(',')!=='0,1,2,3')throw new Error('Pregunta no válida');seen.add(String(q.id));if(record.answers[i]!==null&&(!Number.isInteger(record.answers[i])||record.answers[i]<0||record.answers[i]>3))throw new Error('Respuesta no válida');if(typeof record.flags[i]!=='boolean')throw new Error('Marca no válida');return orderedQuestion(q,item.order)});
 return restored;
}
function resume(){const record=readStore(ATTEMPT_KEY,null);try{const restored=restoreRecord(record);exam=restored;answers=[...record.answers];flags=[...record.flags];index=record.index;attempt={id:record.id,kind:record.kind,timed:!!record.timed,level:record.level,startedAt:record.startedAt,deadline:record.deadline};active=true;markedOnly=false;lastResult=null;$('questionMap').classList.add('hidden');show('exam');render();focusHeading('exam');startTimer()}catch(error){announce('El intento guardado no se puede recuperar. Puedes comenzar uno nuevo.');$('resume').disabled=true}}
function startTimer(){if(timerHandle!==null)clearInterval(timerHandle);timerHandle=null;tick();if(active&&attempt.timed)timerHandle=setInterval(tick,1000)}
function tick(){if(!active||!attempt)return;if(!attempt.timed){$('timer').textContent='Sin límite de tiempo';return}const remaining=Math.max(0,Math.ceil((attempt.deadline-Date.now())/1000));$('timer').textContent='Tiempo restante: '+Math.floor(remaining/60).toString().padStart(2,'0')+':'+(remaining%60).toString().padStart(2,'0');$('timer').classList.toggle('urgent',remaining<=300);if(remaining===0)finish(true)}
function saveAndExit(){if(!active)return;if(!saveAttempt()){if(!confirm('El navegador no permitió guardar. Salir perderá el avance de este intento. ¿Deseas salir de todos modos?'))return}active=false;if(timerHandle!==null)clearInterval(timerHandle);timerHandle=null;history();show('home')}

function visualDescription(q){
 const path=q.visual||q.diagram||'';
 const descriptions={
  'arlington-930-1.jpg':'Pieza metálica alargada con tapa atornillada; una boca está en un extremo y otra sale perpendicularmente por detrás.',
  'arlington-930-2.jpg':'Pieza metálica con tapa; dos bocas están alineadas y una tercera sale perpendicularmente por el lateral.',
  'arlington-930-4.jpg':'Pieza metálica con tapa atornillada y dos bocas en extremos opuestos, alineadas entre sí.',
  'arlington-930-5.jpg':'Una mano retira la tapa de una pieza metálica de canalización y deja visible su cavidad interior.',
  'leviton-gfci.jpg':'Receptáculo blanco con dos tomas de tres aberturas, botones centrales TEST y RESET y un indicador pequeño.',
  'leviton-hospital.jpg':'Receptáculo blanco con dos tomas, botones centrales y una marca circular verde visible junto a la toma superior.',
  'klein-pinza.jpg':'Instrumento con pantalla y selector; en la parte superior tiene una mordaza circular que se abre. Incluye dos puntas de prueba.',
  'klein-pelacables.jpg':'Herramienta de dos mangos y mordazas con aberturas de distintos diámetros, marcadas por calibre de conductor.',
  'eaton-breaker.jpg':'Dispositivo negro con palanca de encendido y apagado. La palanca lleva el número 20 y la carcasa otras especificaciones.',
  'arlington-conector.jpg':'Accesorio metálico corto: un extremo tiene rosca exterior y contratuerca; el otro tiene una tuerca de compresión.',
  'arlington-cople.jpg':'Accesorio metálico tubular con una tuerca de compresión en cada extremo.',
  'klein-conductor.jpg':'Una persona coloca un conductor con aislamiento negro entre las aberturas graduadas de una herramienta pelacables.',
  'esquema-a.svg':'Esquema: L llega al contacto abierto S1; después sigue hacia una lámpara cuyo retorno se conecta a N. La separación del contacto interrumpe la trayectoria.',
  'esquema-b.svg':'Esquema: una lámpara conecta los nodos L y N; un instrumento circular marcado V está conectado entre esos mismos dos nodos.'
 };
 for(const [file,text] of Object.entries(descriptions))if(path.endsWith(file))return text;
 if(q.diagram)return 'Diagrama de apoyo del circuito. Sus conexiones y valores se especifican en el enunciado de la pregunta.';
 return q.visualAlt||'Imagen de apoyo del ejercicio';
}

function appendVisual(parent,q){const file=q.visual||q.diagram;if(!file)return;const figure=document.createElement('figure');figure.className='question-figure';const img=document.createElement('img');img.src=file;img.alt=visualDescription(q);img.loading='lazy';figure.append(img);if(q.imageCredit){const caption=document.createElement('figcaption');caption.textContent=q.imageCredit;figure.append(caption)}parent.append(figure)}
function appendLearning(parent,q){const section=document.createElement('div');section.className='learning';const p=document.createElement('p');p.textContent=q.explanation;section.append(p);appendCalculationSteps(section,q);if(q.optionExplanations){const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ul');summary.textContent='Por qué las otras opciones no aplican';details.append(summary);q.options.forEach((opt,i)=>{if(i===q.answer)return;const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=opt+': ';li.append(strong,document.createTextNode(q.optionExplanations[i]));list.append(li)});details.append(list);section.append(details)}const refs=document.createElement('div');refs.className='reference-links';for(const ref of q.references||[]){const a=document.createElement('a');a.textContent=ref.label;a.href=ref.url;a.target='_blank';a.rel='noopener';refs.append(a)}section.append(refs);const report=document.createElement('button');report.className='secondary report-question';report.textContent='Esta pregunta tiene un problema';report.onclick=()=>openQuestionReport(q);section.append(report);parent.append(section)}
function render(){if(!active)return;const q=exam[index];$('counter').textContent=`Pregunta ${index+1} de ${exam.length}`;$('answered').textContent=`${answers.filter(x=>x!==null).length} contestadas · ${flags.filter(Boolean).length} marcadas`;$('bar').style.width=((index+1)/exam.length*100)+'%';$('examProgress').setAttribute('aria-valuemax',String(exam.length));$('examProgress').setAttribute('aria-valuenow',String(index+1));$('category').textContent=attempt.timed?'Simulacro · responde sin pistas':q.topic+' · '+LEVELS[q.difficulty];$('question').textContent=q.q;const visual=$('question-diagram');visual.replaceChildren();appendVisual(visual,q);
 if(!attempt.timed&&q.originalEvidence){const a=document.createElement('a');a.href='originales.html#'+q.originalEvidence.document+'/'+q.originalEvidence.page;a.textContent='Consultar documento original';a.target='_blank';a.rel='noopener';a.className='study-link';visual.append(a)}
 if(q.original_images){for(const path of q.original_images){const img=document.createElement('img');img.src=path;img.loading='lazy';img.alt='Imagen de la fuente original';img.className='source-image';visual.append(img)}}
 $('options').replaceChildren();q.options.forEach((option,i)=>{const label=document.createElement('label');label.className='option';const input=document.createElement('input');input.type='radio';input.name='answer';input.checked=answers[index]===i;input.onchange=()=>{if(attempt.timed&&Date.now()>=attempt.deadline){tick();return}answers[index]=i;saveAttempt();$('answered').textContent=`${answers.filter(x=>x!==null).length} contestadas · ${flags.filter(Boolean).length} marcadas`;drawMap()};const span=document.createElement('span');span.textContent=String.fromCharCode(65+i)+'. '+option;label.append(input,span);$('options').append(label)});
 $('prev').disabled=index===0;$('next').disabled=index===exam.length-1;$('flag').textContent=flags[index]?'★ Quitar marca':'☆ Marcar para revisar';$('flag').setAttribute('aria-pressed',String(flags[index]));$('marked').textContent='Ver marcadas ('+flags.filter(Boolean).length+')';drawMap();
}
function drawMap(){const parent=$('questionMap');parent.replaceChildren();for(let i=0;i<exam.length;i++){if(markedOnly&&!flags[i])continue;const button=document.createElement('button');button.className='question-number'+(answers[i]!==null?' completed':'')+(flags[i]?' flagged':'')+(i===index?' current':'');button.textContent=String(i+1)+(answers[i]!==null?' ✓':'')+(flags[i]?' ★':'');button.setAttribute('aria-label','Pregunta '+(i+1)+(answers[i]!==null?', contestada':', sin contestar')+(flags[i]?', marcada':''));if(i===index)button.setAttribute('aria-current','step');button.onclick=()=>{index=i;saveAttempt();render();focusHeading('exam')};parent.append(button)}if(markedOnly&&!flags.some(Boolean)){const p=document.createElement('p');p.textContent='No hay preguntas marcadas.';parent.append(p)}}
function toggleMap(onlyMarked){markedOnly=onlyMarked;$('questionMap').classList.toggle('hidden',false);drawMap()}
function finish(expired=false){if(!active)return;if(attempt.timed&&Date.now()>=attempt.deadline)expired=true;const missing=answers.filter(x=>x===null).length,marked=flags.filter(Boolean).length;if(!expired&&(missing||marked)&&!confirm(`Tienes ${missing} sin contestar y ${marked} marcadas para revisar. Las preguntas en blanco cuentan como incorrectas. ¿Deseas entregar?`))return;
 active=false;if(timerHandle!==null)clearInterval(timerHandle);timerHandle=null;const good=exam.filter((q,i)=>answers[i]===q.answer).length,pct=Math.round(good/exam.length*100);const wrongIds=exam.filter((q,i)=>answers[i]!==q.answer).map(q=>q.id);
 lastResult={id:attempt.id,kind:attempt.kind,total:exam.length,good,pct,wrongIds,date:new Date().toLocaleString('es-PR'),expired};
 profile=getProfile();if(!profile.history.some(x=>x.id===attempt.id)){
  const pending=new Set(profile.mistakes.map(String));exam.forEach((q,i)=>{const correct=answers[i]===q.answer;updateReviewCard(profile,q,correct,Date.now(),answers[i]);if(correct)pending.delete(String(q.id));else pending.add(String(q.id));let t=profile.topics[q.topic];if(!t||!Array.isArray(t.seen))t={total:0,good:0,seen:[]};t.total++;if(correct)t.good++;if(!t.seen.includes(String(q.id)))t.seen.push(String(q.id));profile.topics[q.topic]=t});profile.mistakes=[...pending].filter(id=>BANK.some(q=>String(q.id)===id));profile.history.unshift({...lastResult,level:attempt.level});profile.history=profile.history.slice(0,50);
  if(!writeStore(PROFILE_KEY,profile))$('resultStorage').textContent='No se pudo guardar este resultado en el navegador.';else $('resultStorage').textContent='Resultado y progreso guardados en este navegador.';
 }
 removeStore(ATTEMPT_KEY);$('score').textContent=pct+'%';$('correct').textContent=good+'/'+exam.length;$('incorrect').textContent=exam.length-good;$('message').textContent=(expired?'El tiempo terminó y el intento se entregó automáticamente. ':'')+(attempt.kind!=='exam'?kindLabel(attempt.kind)+' completada.':pct>=70?'¡Buen trabajo! Revisa las explicaciones para seguir mejorando.':'Revisa las explicaciones y vuelve a practicar.');$('retryErrors').disabled=wrongIds.length===0;$('retryErrors').textContent=wrongIds.length?'Practicar estos '+wrongIds.length+' errores':'Sin errores en este intento';
 const breakdown=$('topicResults');breakdown.replaceChildren();const totals=new Map();exam.forEach((q,i)=>{if(!totals.has(q.topic))totals.set(q.topic,{total:0,good:0});const t=totals.get(q.topic);t.total++;if(answers[i]===q.answer)t.good++});for(const [topic,t] of totals){const p=document.createElement('p');p.textContent=topic+': '+t.good+'/'+t.total;p.className=t.good===t.total?'good':'muted';breakdown.append(p)}$('reviewFilter').value='all';drawReview();show('results');
}
function drawReview(){const parent=$('review');parent.replaceChildren();let shown=0;exam.forEach((q,i)=>{if($('reviewFilter').value==='wrong'&&answers[i]===q.answer)return;shown++;const d=document.createElement('article');d.className='review';const h=document.createElement('h3');h.textContent=`${i+1}. ${q.q}`;d.append(h);appendVisual(d,q);const p=document.createElement('p');p.className=answers[i]===q.answer?'good':'bad';p.textContent=(answers[i]===q.answer?'Correcta. Tu respuesta: ':'Incorrecta. Tu respuesta: ')+(answers[i]===null?'Sin contestar':q.options[answers[i]]);const a=document.createElement('p');a.textContent='Respuesta correcta: '+q.options[q.answer];const m=document.createElement('small');m.className='muted';m.textContent=q.topic+' · '+LEVELS[q.difficulty];d.append(p,a,m);appendLearning(d,q);parent.append(d)});$('reviewCount').textContent=shown+' preguntas en esta revisión'}
function history(){profile=getProfile();const saved=readStore(ATTEMPT_KEY,null);$('resumeBox').classList.toggle('hidden',!saved);$('resume').disabled=false;if(saved){try{restoreRecord(saved);$('resumeSummary').textContent=`${kindLabel(saved.kind)}: ${saved.answers.filter(x=>x!==null).length}/${saved.questions.length} contestadas. `+(saved.timed?'El tiempo sigue contando aunque cierres la página.':'Puedes continuar donde lo dejaste.')}catch(error){$('resumeSummary').textContent='El intento guardado no puede recuperarse. Al comenzar otro se reemplazará.';$('resume').disabled=true}}
 const pending=profile.mistakes.filter(id=>BANK.some(q=>String(q.id)===String(id)));$('practiceErrors').disabled=pending.length===0;$('practiceErrors').textContent='Practicar errores pendientes ('+pending.length+')';const parent=$('history');parent.replaceChildren();if(profile.history.length){const h=document.createElement('h2');h.textContent='Últimos resultados';parent.append(h);for(const result of profile.history.slice(0,5)){const p=document.createElement('p');p.textContent=result.date+' · '+kindLabel(result.kind)+': '+result.pct+'% ('+result.good+'/'+(result.total||50)+')';parent.append(p)}}drawProgress();drawLearningHome();if(!storageAvailable)announce('Este navegador no está permitiendo guardar el avance.')}
function drawProgress(){const rows=$('progressRows');rows.replaceChildren();const entries=Object.entries(profile.topics).filter(([,t])=>t.total>0).sort((a,b)=>a[1].good/a[1].total-b[1].good/b[1].total);$('progressEmpty').classList.toggle('hidden',entries.length>0);for(const [topic,t] of entries){const tr=document.createElement('tr');for(const text of [topic,t.good+'/'+t.total,Math.round(t.good/t.total*100)+'%',t.seen.length]){const td=document.createElement('td');td.textContent=String(text);tr.append(td)}rows.append(tr)}}
function browse(){const select=$('topic');select.replaceChildren();const any=document.createElement('option');any.value='';any.textContent='Todos los temas';select.append(any);for(const topic of [...new Set(BANK.map(q=>q.topic))].sort()){const o=document.createElement('option');o.value=topic;o.textContent=topic;select.append(o)}show('bank');drawBank()}
function drawBank(){const term=$('search').value.toLocaleLowerCase('es'),topic=$('topic').value,level=$('levelFilter').value;const found=BANK.filter(q=>(!topic||q.topic===topic)&&(!level||q.difficulty===level)&&(`${q.q} ${q.options.join(' ')}`.toLocaleLowerCase('es').includes(term)));$('countBank').textContent=`${found.length} preguntas encontradas`;$('bankList').replaceChildren();for(const q of found){const d=document.createElement('details');d.className='review';const s=document.createElement('summary');s.textContent=q.q;d.append(s);appendVisual(d,q);const p=document.createElement('p');p.textContent='Respuesta: '+q.options[q.answer];const m=document.createElement('small');m.className='muted';m.textContent=q.topic+' · '+LEVELS[q.difficulty];d.append(p,m);appendLearning(d,q);$('bankList').append(d)}}
$('start').onclick=()=>start('exam');$('again').onclick=()=>{lastResult=null;history();show('home')};$('resume').onclick=resume;$('practiceErrors').onclick=()=>{lastResult=null;start('errors')};$('retryErrors').onclick=()=>start('errors');$('saveExit').onclick=saveAndExit;$('browse').onclick=browse;
for(const id of ['back','homeBtn'])$(id).onclick=()=>{lastResult=null;history();show('home')};
$('prev').onclick=()=>{if(index>0){index--;saveAttempt();render();focusHeading('exam')}};$('next').onclick=()=>{if(index<exam.length-1){index++;saveAttempt();render();focusHeading('exam')}};$('flag').onclick=()=>{flags[index]=!flags[index];saveAttempt();render()};$('marked').onclick=()=>toggleMap(true);$('allQuestions').onclick=()=>toggleMap(false);$('finish').onclick=()=>finish();$('print').onclick=()=>window.print();$('search').oninput=drawBank;$('topic').onchange=drawBank;$('levelFilter').onchange=drawBank;$('reviewFilter').onchange=drawReview;
$('examMode').onchange=()=>{$('timedSettings').classList.toggle('hidden',$('examMode').value!=='timed')};
window.addEventListener('pagehide',()=>{if(active)saveAttempt()});document.addEventListener('visibilitychange',()=>{if(active){if(document.visibilityState==='visible')tick();else saveAttempt()}});
setupLearning();history();const requestedTopic=new URLSearchParams(location.search).get('tema');if(requestedTopic&&BANK.some(q=>q.topic===requestedTopic)){browse();$('topic').value=requestedTopic;drawBank()}
