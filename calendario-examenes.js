/* Shared civil-date helpers and independent calendar downloads. */
'use strict';
function validCivil(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function addCivil(s,n){return new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)}
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

function setupCalendarExport(){
 const $=id=>document.getElementById(id);let dates=null;
 $('calendarDownload').onclick=()=>{try{if(!dates)throw Error('No se han cargado las fechas.');downloadCalendarFile(calendarFile(dates,Number($('calendarExam').value)),'text/calendar;charset=utf-8','Fechas_Examen_Electricidad.ics');$('calendarStatus').textContent='Se solicitó la descarga del calendario con el periodo de examen y el cierre de radicación. Comprueba que el archivo .ics se guardó en tus descargas. Esta copia no se actualiza automáticamente.'}catch(e){$('calendarStatus').textContent=e.message}};
 fetch('fechas-examenes.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
  if(!Array.isArray(data.exams)||data.exams.length!==3||data.exams.some(x=>!Array.isArray(x.dates)||!x.dates.length||x.dates.some(d=>!validCivil(d)))||!validCivil(data.applicationDeadline))throw Error();
  dates=data;$('calendarDownload').disabled=false;
 }).catch(()=>{$('calendarStatus').textContent='No se pudieron cargar las fechas para descargar. Consulta el calendario oficial enlazado arriba.'});
}
if(typeof document!=='undefined'&&document.getElementById('calendarDownload'))setupCalendarExport();

function downloadCalendarFile(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
