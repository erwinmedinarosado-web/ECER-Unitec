/* Calendar dates use Puerto Rico civil dates, independent of the visitor timezone. */
(function(){
  'use strict';
  function calendarState(today, verified, deadline, end){
    const age=(Date.parse(today+'T12:00:00Z')-Date.parse(verified+'T12:00:00Z'))/86400000;
    return {stale:!Number.isFinite(age)||age<0||age>=8, closed:today>deadline, past:today>end};
  }
  if(typeof module!=='undefined')module.exports={calendarState};
  if(typeof document==='undefined')return;
  const section=document.getElementById('fechas-examenes');
  if(!section)return;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Puerto_Rico',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=name=>parts.find(p=>p.type===name).value;
  const today=part('year')+'-'+part('month')+'-'+part('day');
  const state=calendarState(today,section.dataset.verified,'2026-11-05','2026-12-14');
  document.getElementById('datesDeadlineState').textContent=state.closed?'El plazo publicado ya terminó.':'Confirma la disponibilidad de cupo al solicitar.';
  document.getElementById('datesFreshness').textContent=state.stale?'Han pasado más de siete días sin una verificación registrada. Consulta la fuente oficial antes de hacer planes.':'Fechas contrastadas con el calendario oficial en la fecha indicada.';
  section.querySelectorAll('[data-exam-end]').forEach(card=>{
    card.querySelector('.date-state').textContent=calendarState(today,section.dataset.verified,'2026-11-05',card.dataset.examEnd).past?'Periodo publicado finalizado. Consulta la próxima convocatoria.':'';
  });
})();
