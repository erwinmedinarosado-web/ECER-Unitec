/* Portable local backups, study goals, recurrent mistakes and calendar export. */
'use strict';
const GOAL_KEY='electricidadStudyGoalV1';
const BACKUP_KEYS=['electricidadStudyV3','electricidadAttemptV3','electricidadReadingV1','electricidadQuestionReportsV1','electricidadScores',GOAL_KEY];
const backupKey=k=>BACKUP_KEYS.includes(k)||/^ecer-original-[A-Za-z0-9_-]+-\d+$/.test(k);
function civilToday(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-')}
function validCivil(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function addCivil(s,n){return new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)}
function cleanTree(v){if(!v||typeof v!=='object')return;for(const k of Object.keys(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('La copia contiene campos no permitidos.');cleanTree(v[k])}}
function validateBackup(b){
 const fail=()=>{throw Error('La copia no tiene un formato compatible o contiene datos inválidos.')};
 if(!b||b.app!=='academia-electrica'||b.version!==1||!b.data||Array.isArray(b.data)||typeof b.data!=='object')fail();cleanTree(b);
 const entries=Object.entries(b.data);if(entries.length>1000)fail();
 const ids=new Set(BANK.map(q=>String(q.id))),topics=new Set(BANK.map(q=>q.topic));
 const int=(v,min=0,max=1e9)=>Number.isInteger(v)&&v>=min&&v<=max;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const text=v=>typeof v==='string'&&v.length<=10000;
 for(const [key,raw] of entries){
  if(!backupKey(key)||typeof raw!=='string'||raw.length>2000000)fail();
  if(key.startsWith('ecer-original-')){if(raw.length>100000)fail();continue}
  let v;try{v=JSON.parse(raw)}catch(e){fail()}cleanTree(v);
  if(key==='electricidadStudyV3'){
   if(!obj(v)||v.version!==3||!Array.isArray(v.history)||v.history.length>50||!Array.isArray(v.mistakes)||!obj(v.topics)||v.mistakes.some(id=>!ids.has(String(id))))fail();
   for(const r of v.history){if(!obj(r)||!int(r.pct,0,100)||!int(r.good,0,50)||!text(r.date)||(r.total!==undefined&&!int(r.total,1,50))||(r.total!==undefined&&r.good>r.total)||(r.id!==undefined&&!text(r.id))||(r.kind!==undefined&&!['exam','errors','spaced','topic','legacy'].includes(r.kind)))fail();if(r.wrongIds!==undefined&&(!Array.isArray(r.wrongIds)||r.wrongIds.some(id=>!ids.has(String(id)))))fail()}
   for(const [topic,t] of Object.entries(v.topics)){if(!topics.has(topic)||!obj(t)||!int(t.total)||!int(t.good,0,t.total)||!Array.isArray(t.seen)||t.seen.some(id=>!ids.has(String(id))))fail()}
   if(v.srs!==undefined){if(!obj(v.srs))fail();for(const [id,c] of Object.entries(v.srs)){if(!ids.has(id)||!obj(c)||!int(c.stage,0,4)||!Number.isFinite(c.due)||c.due<0||(c.lastAt!==null&&c.lastAt!==undefined&&!Number.isFinite(c.lastAt))||(c.wrongCount!==undefined&&!int(c.wrongCount))||(c.lastWrongOption!==undefined&&c.lastWrongOption!==null&&!int(c.lastWrongOption,0,3)))fail()}}
  }else if(key==='electricidadAttemptV3'){restoreRecord(v)}
  else if(key==='electricidadReadingV1'){if(!obj(v)||!['light','dark','system'].includes(v.theme)||!['normal','large'].includes(v.text))fail()}
  else if(key===GOAL_KEY){if(!obj(v)||!validCivil(v.date)||!int(v.minutes,10,120)||!['ayudante','perito-teorico','perito-practico','personal'].includes(v.kind))fail()}
  else if(key==='electricidadQuestionReportsV1'){if(!Array.isArray(v)||v.length>500||v.some(r=>!obj(r)||!ids.has(String(r.questionId))||!text(r.note)||r.note.length>2000||!text(r.question)||!text(r.topic)||!text(r.category)||!text(r.createdAt)))fail()}
  else if(key==='electricidadScores'){if(!Array.isArray(v)||v.length>500||v.some(r=>!obj(r)||!int(r.pct,0,100)||!int(r.good,0,50)||!text(r.date)))fail()}
 }
 return b;
}
function backupSnapshot(){const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(backupKey(k))data[k]=localStorage.getItem(k)}return {app:'academia-electrica',version:1,createdAt:new Date().toISOString(),data}}
function replaceBackup(b){
 validateBackup(b);const before=backupSnapshot();
 try{for(const k of Object.keys(before.data))localStorage.removeItem(k);for(const [k,v] of Object.entries(b.data))localStorage.setItem(k,v)}
 catch(error){let recovered=true;try{for(const k of Object.keys(b.data))localStorage.removeItem(k);for(const [k,v] of Object.entries(before.data))localStorage.setItem(k,v)}catch(e){recovered=false}const e=new Error(recovered?'No se pudo importar; se conservaron los datos anteriores.':'No se pudo restaurar todo el almacenamiento. Descarga la copia de recuperación antes de salir.');e.recovery=before;throw e}
}
function downloadStudyFile(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backupSummary(b){const p=JSON.parse(b.data.electricidadStudyV3||'{"history":[],"mistakes":[]}');const notes=Object.keys(b.data).filter(k=>k.startsWith('ecer-original-')).length;return p.history.length+' resultados, '+p.mistakes.length+' errores pendientes, '+notes+' hojas con notas'+(b.data.electricidadAttemptV3?' y un intento guardado.':'.')}
function planDays(goal,p,today=civilToday()){
 if(!validCivil(goal.date)||goal.date<today)return [];
 const days=Math.floor((Date.parse(goal.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 const choices=studyRecommendations(p).map(x=>x.topic),fallback=[...new Set(BANK.map(q=>q.topic))];
 return Array.from({length:Math.min(7,days)},(_,i)=>{const remaining=days-i,topic=(choices.length?choices:fallback)[i%(choices.length||fallback.length)];let task='Repasa '+topicLabel(topic)+' y practica hasta 10 preguntas. Reserva parte de tus '+goal.minutes+' minutos para los repasos pendientes.';if(remaining===1)task='Repaso breve de errores y fórmulas. Revisa tus documentos, sede y hora de admisión.';else if(remaining>=3&&(i===5||remaining===3))task='Haz un simulacro cuando dispongas del tiempo necesario; revisa después las respuestas. El tiempo del simulacro se configura aparte.';return {date:addCivil(today,i),topic,task}});
}
function recurrentQuestions(p){return BANK.filter(q=>p.srs&&p.srs[String(q.id)]&&p.srs[String(q.id)].wrongCount>=2).sort((a,b)=>p.srs[String(b.id)].wrongCount-p.srs[String(a.id)].wrongCount).slice(0,10)}
function drawRecurrent(){const p=getProfile(),list=$('recurringList');list.replaceChildren();const found=recurrentQuestions(p);$('recurringEmpty').hidden=found.length>0;for(const q of found){const c=p.srs[String(q.id)],d=document.createElement('details'),s=document.createElement('summary'),note=document.createElement('p'),answer=document.createElement('p'),a=document.createElement('a');s.textContent=q.q+' · '+c.wrongCount+' fallos registrados';d.append(s);note.textContent=c.lastWrongOption===null?'Último fallo: sin contestar.':Number.isInteger(c.lastWrongOption)?'Última opción incorrecta elegida: '+q.options[c.lastWrongOption]+'.':'No hay una opción anterior registrada.';answer.textContent='Respuesta correcta: '+q.options[q.answer]+'. '+(p.mistakes.map(String).includes(String(q.id))?'Pendiente de resolver.':'Resuelta en un intento posterior; conserva el historial de fallos.');d.append(note,answer);if(Number.isInteger(c.lastWrongOption)&&q.optionExplanations&&q.optionExplanations[c.lastWrongOption]){const reason=document.createElement('p');reason.textContent='Por qué esa opción no aplica: '+q.optionExplanations[c.lastWrongOption];d.append(reason)}appendLearning(d,q);a.href='repaso.html#'+topicGuide(q.topic);a.textContent='Revisar el concepto: '+topicLabel(q.topic);d.append(a);list.append(d)}}
function drawGoal(){const goal=readStore(GOAL_KEY,null),out=$('goalSummary'),list=$('goalDays');list.replaceChildren();if(!goal){out.textContent='Elige tu convocatoria o escribe la fecha de tu cita para crear un plan.';return}const today=civilToday();if(goal.date<today){out.textContent='Tu fecha de estudio ya pasó. Actualízala para preparar el próximo intento.';return}const remaining=Math.round((Date.parse(goal.date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);out.textContent=(remaining===0?'Tu fecha objetivo es hoy.':remaining+' días hasta tu fecha objetivo.')+' Dedicación: '+goal.minutes+' minutos al día. El plan se adapta a tus resultados al volver.';for(const row of planDays(goal,getProfile(),today)){const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=readableDate(row.date+'T12:00:00Z')+': ';li.append(strong,document.createTextNode(row.task));list.append(li)}}
const icsEscape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function calendarFile(data,examIndex){
 const exam=data.exams[examIndex];if(!exam||!exam.dates.length||exam.dates.some(d=>!validCivil(d))||!validCivil(data.applicationDeadline))throw Error('No se pudieron leer las fechas del calendario.');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const compact=s=>s.replaceAll('-','');const event=(uid,title,start,end,description)=>['BEGIN:VEVENT','UID:'+uid+'@academia-electrica','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+compact(start),'DTEND;VALUE=DATE:'+compact(end),'SUMMARY:'+icsEscape(title),'DESCRIPTION:'+icsEscape(description),'URL:'+data.source,'END:VEVENT'];
 const warning='Periodo oficial publicado; confirma tu cita individual, hora y sede con Didaxis. No es una reserva. Si la convocatoria cambia, elimina o actualiza esta copia del calendario. Fuente verificada: '+data.verifiedOn+'.';
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Academia Electrica//Fechas PR//ES','CALSCALE:GREGORIAN',...event('examen-'+examIndex+'-'+exam.dates[0],exam.name+' · periodo publicado',exam.dates[0],addCivil(exam.dates.at(-1),1),warning),...event('radicacion-'+examIndex+'-'+data.applicationDeadline,'Cierre de radicación · '+exam.name,data.applicationDeadline,addCivil(data.applicationDeadline,1),'Fecha límite publicada de radicación. '+warning),'END:VCALENDAR'];
 // Fold by UTF-8 bytes, without splitting a code point (RFC 5545).
 return lines.map(line=>{let out='',part='';for(const char of line){if(new TextEncoder().encode(part+char).length>74){out+=part+'\r\n';part=' '}part+=char}return out+part}).join('\r\n')+'\r\n';
}
function setupStudyImprovements(){
 let pending=null,recovery=null,dates=null;const status=$('backupStatus');
 $('backupExport').onclick=()=>{try{const b=backupSnapshot();downloadStudyFile(JSON.stringify(b,null,2),'application/json','Academia_Electrica_Progreso_'+civilToday()+'.json');status.textContent='Copia descargada. Incluye historial, repasos, intento, notas, reportes y ajustes guardados. Consérvala en un lugar privado.'}catch(e){status.textContent='No se pudo leer el almacenamiento. '+e.message}};
 $('backupFile').onchange=async e=>{pending=null;$('backupApply').disabled=true;const f=e.target.files[0];if(!f)return;try{if(f.size>5000000)throw Error('El archivo supera el límite de 5 MB.');pending=validateBackup(JSON.parse(await f.text()));$('backupPreview').textContent='Contenido de la copia: '+backupSummary(pending)+' Al restaurar se reemplazan todos los datos locales de esta aplicación, incluidas las notas. Descarga primero tu copia actual.';$('backupApply').disabled=false;status.textContent='Copia validada. Revisa su contenido antes de restaurarla.'}catch(error){pending=null;$('backupPreview').textContent='';status.textContent='No se modificó tu progreso. '+error.message}};
 $('backupApply').onclick=()=>{if(!pending||active)return;try{replaceBackup(pending);location.reload()}catch(error){recovery=error.recovery||null;$('backupRecovery').hidden=!recovery;status.textContent=error.message}};
 $('backupRecovery').onclick=()=>{if(recovery)downloadStudyFile(JSON.stringify(recovery,null,2),'application/json','Academia_Electrica_Recuperacion.json')};
 const saved=readStore(GOAL_KEY,null);if(saved){$('goalKind').value=saved.kind;$('goalDate').value=saved.date;$('goalMinutes').value=saved.minutes}
 $('goalDate').min=civilToday();
 $('goalKind').onchange=()=>{const i={'ayudante':0,'perito-teorico':1,'perito-practico':2}[$('goalKind').value];if(dates&&i!==undefined)$('goalDate').value=dates.exams[i].dates[0]};
 $('goalForm').onsubmit=e=>{e.preventDefault();const g={kind:$('goalKind').value,date:$('goalDate').value,minutes:Number($('goalMinutes').value)};if(!validCivil(g.date)||g.date<civilToday()||!Number.isInteger(g.minutes)||g.minutes<10||g.minutes>120){$('goalSummary').textContent='Elige una fecha de hoy en adelante y de 10 a 120 minutos diarios.';return}if(!writeStore(GOAL_KEY,g)){$('goalSummary').textContent='No se pudo guardar el plan. Mantén tus datos en una copia.';return}drawGoal()};
 $('calendarDownload').onclick=()=>{try{if(!dates)throw Error('No se han cargado las fechas.');downloadStudyFile(calendarFile(dates,Number($('calendarExam').value)),'text/calendar;charset=utf-8','Fechas_Examen_Electricidad.ics');$('calendarStatus').textContent='Se solicitó la descarga del calendario con el periodo de examen y el cierre de radicación. Comprueba que el archivo .ics se guardó en tus descargas. Esta copia no se actualiza automáticamente.'}catch(e){$('calendarStatus').textContent=e.message}};
 fetch('fechas-examenes.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!Array.isArray(data.exams)||data.exams.length!==3||data.exams.some(x=>!Array.isArray(x.dates)||x.dates.some(d=>!validCivil(d))))throw Error();dates=data;$('calendarDownload').disabled=false;if(!saved)$('goalKind').onchange()}).catch(()=>{$('calendarStatus').textContent='No se pudieron cargar las fechas. Consulta el calendario oficial enlazado arriba. Puedes escribir tu fecha objetivo manualmente.'});
 const previous=drawLearningHome;drawLearningHome=function(){previous();drawGoal();drawRecurrent()};drawGoal();drawRecurrent();
}
if(typeof document!=='undefined')setupStudyImprovements();
