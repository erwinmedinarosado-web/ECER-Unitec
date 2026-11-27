(()=>{
 const panel=document.getElementById('installation-panel');
 const button=document.getElementById('panel-screen');
 let fallback=false;
 const outside=[];
 function update(){
  const active=fallback||document.fullscreenElement===panel;
  panel.classList.toggle('expanded-panel',active);
  panel.classList.toggle('viewport-panel',fallback);
  document.documentElement.classList.toggle('panel-open',fallback);
  button.setAttribute('aria-pressed',String(active));
  button.textContent=active?'Salir de pantalla completa':'Pantalla completa';
 }
 function viewport(active){
  fallback=active;
  if(active){
   for(let node=panel;node.parentElement&&node!==document.body;node=node.parentElement){
    for(const sibling of node.parentElement.children){
     if(sibling!==node&&!sibling.inert){sibling.inert=true;outside.push(sibling)}
    }
   }
  }else{
   for(const sibling of outside.splice(0))sibling.inert=false;
  }
  update();
  button.focus({preventScroll:true});
 }
 button.addEventListener('click',async()=>{
  if(fallback){viewport(false);return}
  if(document.fullscreenElement===panel){await document.exitFullscreen();return}
  if(panel.requestFullscreen&&document.fullscreenEnabled!==false){
   try{await panel.requestFullscreen();update();return}catch{/* Use the viewport when native fullscreen is unavailable. */}
  }
  viewport(true);
 });
 document.addEventListener('fullscreenchange',update);
 document.addEventListener('keydown',event=>{
  if(fallback&&event.key==='Escape'){event.preventDefault();viewport(false)}
 });
})();
