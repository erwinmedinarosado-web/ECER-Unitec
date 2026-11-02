/* Presentation and navigation only. Learning data keeps its existing format. */
'use strict';
function updateStartAction(){
 const canResume=!$('resumeBox').classList.contains('hidden')&&!$('resume').disabled;
 $('start').classList.toggle('secondary',canResume);
 $('start').textContent=canResume?'Comenzar otro examen':'Comenzar examen';
 const saved=readStore(ATTEMPT_KEY,null);
 $('resume').textContent=saved&&saved.kind!=='exam'?'Continuar práctica':'Continuar examen';
}
function updateSimpleNavigation(view){
 const hash=view==='study'?'#estudio':view==='resources'?'#recursos':'';
 if(location.hash!==hash)window.history.replaceState(null,'',location.pathname+location.search+hash);
 for(const link of document.querySelectorAll('.site-nav > a')){
  const selected=view==='study'?link.getAttribute('href')==='index.html#estudio':
   !['resources'].includes(view)&&link.getAttribute('href')==='index.html';
  if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
}
function openSimpleDestination(hash){
 if(active){announce('Guarda y sal del intento para abrir otra sección.');return false}
 if(hash==='#estudio'){refreshStudyHome();show('study')}
 else if(hash==='#recursos'){show('resources')}
 else if(hash==='#datos'){
  refreshStudyHome();show('home');$('settingsData').open=true;
  const backup=$('backupExport').closest('details');backup.open=true;
  backup.scrollIntoView({block:'start'});backup.querySelector('summary').focus();
  window.history.replaceState(null,'','#datos');
 }else return false;
 return true;
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href]');if(!link)return;
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin||!url.pathname.endsWith('/index.html'))return;
 if(!['#estudio','#recursos','#datos'].includes(url.hash))return;
 event.preventDefault();
 if(openSimpleDestination(url.hash)){
  window.history.replaceState(null,'',url.hash);
  const menu=link.closest('details.resources-nav');if(menu)menu.open=false;
 }
});
window.addEventListener('hashchange',()=>openSimpleDestination(location.hash));
$('questionNavigator').addEventListener('toggle',()=>{
 if($('questionNavigator').open){$('questionMap').classList.remove('hidden');drawMap()}
});
// Printing includes every explanation, even if its disclosure is closed.
let printDisclosures=[];
window.addEventListener('beforeprint',()=>{
 printDisclosures=[...$('results').querySelectorAll('details:not([open])')];
 for(const box of printDisclosures)box.open=true;
});
window.addEventListener('afterprint',()=>{for(const box of printDisclosures)box.open=false;printDisclosures=[]});
updateStartAction();
if(!new URLSearchParams(location.search).has('tema'))openSimpleDestination(location.hash);
