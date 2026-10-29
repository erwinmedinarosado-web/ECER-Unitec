(()=>{
 const root=document.documentElement,key='electricidadReadingV1';let preferences={theme:'light',text:'normal'};
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&['light','dark','system'].includes(saved.theme)&&['normal','large'].includes(saved.text))preferences=saved}catch(error){}
 function apply(){root.dataset.theme=preferences.theme;root.dataset.text=preferences.text;document.getElementById('readingTheme').value=preferences.theme;document.getElementById('readingSize').value=preferences.text}
 function save(){try{localStorage.setItem(key,JSON.stringify(preferences))}catch(error){document.getElementById('readingStatus').textContent='Los ajustes se aplican, pero este navegador no permitió guardarlos.'}}
 document.getElementById('readingTheme').onchange=e=>{preferences.theme=e.target.value;apply();save()};document.getElementById('readingSize').onchange=e=>{preferences.text=e.target.value;apply();save()};apply();
 function describeLinks(){for(const a of document.querySelectorAll('a[target="_blank"]'))if(a.textContent.trim()&&!a.hasAttribute('aria-label'))a.setAttribute('aria-label',a.textContent.trim()+' (abre otra pestaña)')}
 describeLinks();new MutationObserver(describeLinks).observe(document.querySelector('main'),{childList:true,subtree:true});
})();
