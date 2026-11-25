const $=id=>document.getElementById(id);
const titles={lamp:'Luminaria',single:'Interruptor',three:'Interruptor 3 vías',splice:'Empalmes',outlet:'Receptáculo',240:'Receptáculo 240 V'};
const labels={'P.1':'C1 · L1','P.2':'C2 · L2','P.3':'C3 · L1','P.4':'C4 · L2','P.N':'Neutro','P.T':'Tierra'};
const palette=['#ffbd76','#83c6fb','#d2a6ff','#8ce2d1','#e99dad'];
let wires=[],switches={A:false,B:false,C:false},live=false,mode='wire',pick=null,meterPair=null,feedback='Selecciona dos terminales para instalar un conductor.',fault='',example='blank';
const wireColors={auto:['Automático',''],negro:['Negro','#121212'],rojo:['Rojo','#ef5555'],azul:['Azul','#599eff'],blanco:['Blanco','#ffffff'],verde:['Verde','#59c86d'],amarillo:['Amarillo','#ffd54f'],naranja:['Naranja','#ff963c'],violeta:['Violeta','#c298ff'],gris:['Gris','#afb6bd'],marron:['Marrón','#ac744d']};
const slots=Array.from({length:12},(_,i)=>({id:'E'+(i+1),x:103+(i%6)*150,y:560+Math.floor(i/6)*67}));
let junctions=[],selectedColor='auto';
function colorOptions(selected){
 return Object.entries(wireColors).map(([id,[label]])=>'<option value="'+id+'" '+(id===selected?'selected':'')+'>'+label+'</option>').join('');
}
function allTerminals(){return terminals.concat(junctions)}
try{
 const s=JSON.parse(localStorage.getItem('unitec-wall-v1'));
 if(s&&Array.isArray(s.wires)){
  junctions=slots.filter(slot=>Array.isArray(s.junctions)&&s.junctions.includes(slot.id)).map(slot=>slot.id);
  const allowed=allTerminals();
  wires=s.wires.filter(w=>Array.isArray(w)&&allowed.includes(w[0])&&allowed.includes(w[1])).map(([a,b,color])=>[a,b,Object.hasOwn(wireColors,color)?color:'auto']);
  switches={...switches,...s.switches};
  if(Object.hasOwn(wireColors,s.selectedColor))selectedColor=s.selectedColor;
 }
}catch{}
function save(){try{localStorage.setItem('unitec-wall-v1',JSON.stringify({wires,switches,junctions,selectedColor}))}catch{}}
$('wireColor').innerHTML=colorOptions(selectedColor);
$('wireColor').onchange=e=>{selectedColor=e.target.value;save()};
const pos={},rows=[['1','2','3','4'],['A','B','C','D'],['W','X','Y','Z']];
function name(k){if(junctions.includes(k))return 'Empalme '+k;if(labels[k])return 'Alimentación · '+labels[k];let [id,p]=k.split('.');return id+' · '+titles[deviceList.find(d=>d.id===id).type]+' · '+p}
function options(el){el.innerHTML='<option value="">Elegir terminal…</option>'+allTerminals().map(k=>'<option value="'+k+'">'+name(k)+'</option>').join('')}
function refreshOptions(){options($('first'));options($('second'))}
refreshOptions();
const txt=(x,y,t,size=12,color='#cedce6',anchor='start',weight=500)=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Arial,sans-serif" font-weight="'+weight+'" font-size="'+size+'" text-anchor="'+anchor+'">'+t+'</text>';
const rect=(x,y,w,h,fill,stroke='none',r=5)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" rx="'+r+'"/>';
function pin(k,x,y,label,side=false){pos[k]=[x,y];let c=k.endsWith('.T')?'#a9d888':k.endsWith('.N')?'#f0f1e9':'#ebba76';return '<g class="terminal" role="button" tabindex="0" aria-label="'+name(k)+'" data-pin="'+k+'">'+rect(x-15,y-14,30,29,'transparent')+'<circle class="dot" cx="'+x+'" cy="'+y+'" r="'+(pick===k?8:5.5)+'" fill="'+(pick===k?'#c9ff76':'#172636')+'" stroke="'+c+'" stroke-width="2.8"/>'+(!side?txt(x,y-12,label,12,'#d7e2e7','middle',600):'')+'</g>'}
function icon(d,x,y,v){
 let isLamp=d.type==='lamp',on=live&&v>1,fill=isLamp&&on?(v>121?'#f59c6b':v<100?'#b99a61':'#ffe3a0'):'#bdc9c9';
 if(isLamp)return '<g transform="translate('+x+' '+y+')"><path d="M-15 -3a15 15 0 1 1 30 0c0 8-7 10-8 17H-7c-1-7-8-9-8-17Z" fill="'+fill+'" stroke="#eef0d9"/><path d="M-5 13 -7 0 -2 4 1 0 5 4 7 0 5 13" fill="none" stroke="#66736e"/><path d="M-7 16h14m-13 4h12m-10 3h8" stroke="#98a9ab" stroke-width="3"/></g>';
 if(d.type==='single'||d.type==='three')return rect(x-13,y-18,26,35,'#a6b5ba','#dce3df',3)+rect(x-6,y-12,12,24,'#52646b','#7a898a',2)+rect(x-5,y+(switches[d.id]?-11:0),10,11,'#f0f0e6','none',2);
 if(d.type==='splice')return [0,1,2].map(j=>rect(x-17+j*12,y-9,10,20,'#a3b2b3','#d3dcde',2)+rect(x-15+j*12,y-7,6,8,'#edaf69','none',1)).join('');
 return rect(x-15,y-18,30,35,'#dde2d9','#8e9fa3',6)+rect(x-9,y-11,d.type==='240'?8:4,d.type==='240'?4:10,'#36454d','none',1)+rect(x+4,y-11,d.type==='240'?8:4,d.type==='240'?4:10,'#36454d','none',1)+rect(x-3,y+3,7,6,'#36454d','none',3)
}
function render(){
 const result=solve(wires,switches,junctions);
 if(live&&result.faults.length){live=false;fault=result.faults.join(' ');feedback='Protección activada. '+fault}
 const svg=$('diagram');let base='<defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="#354959"/></pattern></defs>'+rect(0,0,956,674,'url(#grid)')+txt(18,28,'ACOMETIDA',11,'#a8b8c5')+txt(194,28,'VISTA DE CABLEADO',11,'#a8b8c5');
 let pins='',controls='';
 base+=rect(13,51,147,443,'#203343','#476171',9)+txt(28,79,'Panel 120/240 V',16,'#eff5f2','start',700)+txt(28,99,'FASE DIVIDIDA',10,'#abc1cc');
 ['P.1','P.2','P.3','P.4','P.N','P.T'].forEach((k,j)=>{let y=141+j*55;base+=rect(23,y-19,125,38,'#192b3a','#415666',5)+txt(32,y+5,labels[k],14,'#e3ecec','start',600);pins+=pin(k,133,y,'',true)});
 base+=txt(28,470,'C3–C4 · bipolar',12,'#aebfc8');
 rows.forEach((row,r)=>row.forEach((id,c)=>{let x=191+190*c,y=51+r*153,d=deviceList.find(dev=>dev.id===id),val=result.readings[id];
 if(c<3)base+=rect(x+157,y+51,34,8,'#304554','#596b74',0);
 if(r<2)base+=rect(x+76,y+125,9,29,'#304554','#596b74',0);
 base+=rect(x,y,157,125,'#213646','#577080',8)+rect(x+9,y+9,21,20,'#354f5f','none',4)+txt(x+19.5,y+24,id,14,'#d5f89f','middle',700)+txt(x+35,y+23,titles[d.type],d.type==='240'?12:13,'#e0e9e9','start',600)+icon(d,x+37,y+56,val);
 if(['lamp','outlet','240'].includes(d.type)){base+=txt(x+75,y+56,live?(val===null?'Flotante':Math.round(val*10)/10+' V'):'— V',15,live&&val>0?'#d5f58e':'#b9c7d0','start',700)+txt(x+75,y+72,d.type==='240'?'Nom. 240 V':'Nom. 120 V',11,'#96adbd')}
 if(d.type==='splice')base+=txt(x+67,y+58,'Bornes aislados',11);
 if(['single','three'].includes(d.type)){let st=d.type==='three'?(switches[id]?'C–V2':'C–V1'):(switches[id]?'Cerrado':'Abierto');controls+='<g class="switchOp" role="button" tabindex="0" data-switch="'+id+'" aria-label="Accionar interruptor '+id+'">'+rect(x+65,y+41,80,30,'#344e58','#738e86',5)+txt(x+105,y+60,st+' ↻',13,'#d8f0cf','middle',700)+'</g>'}
 d.pins.forEach((p,j)=>pins+=pin(id+'.'+p,x+23+j*111/(d.pins.length-1),y+112,p))
 }));
 base+=rect(13,500,930,165,'#192d3b','#577080',8)+txt(28,522,'ZONA DE EMPALMES · Selecciona + para crear un punto común',14,'#deebef','start',600);
 for(const {id,x,y} of slots){
  if(junctions.includes(id)){
   pins+=pin(id,x,y,id);
  }else if(!live){
   controls+='<g class="new-junction" tabindex="0" role="button" aria-label="Crear empalme '+id+'" data-slot="'+id+'">'+rect(x-27,y-17,54,34,'#263d4a','#7d99a6',6)+txt(x,y+5,'+ '+id,13,'#e2eff2','middle',600)+'</g>';
  }
 }
 let paths=wires.map(([a,b,color],j)=>{let [x,y]=pos[a],[X,Y]=pos[b],l=10+(j%4)*4,col=wireColors[color]?.[1]||([a,b].some(t=>t.endsWith('.T'))?'#a5d67f':[a,b].some(t=>t.endsWith('.N'))?'#d2dae0':palette[j%palette.length]),mid=(x+X)/2+(j%3)*6;
 let path='M'+x+' '+y+' v'+l+' H'+mid+' V'+(Y+l)+' H'+X+' V'+Y;
 return '<path d="'+path+'" fill="none" stroke="'+(color==='negro'?'#acb8bf':'#16232c')+'" stroke-width="4"/><path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"><title>'+name(a)+' ↔ '+name(b)+'</title></path>'}).join('');
 svg.innerHTML=base+paths+controls+pins;
 $('power').textContent=live?'Desenergizar':'Energizar tablero';$('powerState').textContent=live?'ACTIVA':'APAGADA';$('powerState').style.background=live?'#c8ef9d':'#edf0eb';
 $('wire').className=mode==='wire'?'selected':'';$('meter').className=mode==='meter'?'selected':'';
 $('first').value=pick||'';$('connect').textContent=mode==='wire'?'Instalar conductor':'Medir tensión/voltaje';$('connect').disabled=mode==='wire'&&live;
 $('selection').textContent=pick?'Seleccionado: '+name(pick):mode==='wire'?'Toca dos bornes o elígelos abajo.':'Selecciona los dos puntos de medición.';
 $('counter').textContent=wires.length+' conductores';$('undo').disabled=live||!wires.length;
 $('feedback').textContent=feedback+(live&&result.warnings.length?' '+result.warnings.join(' '):'');
 $('meterValue').textContent='';if(meterPair){let [a,b]=meterPair,v=result.read(a,b);
 $('meterValue').textContent=(live?(v===null?'Sin referencia':Math.round(v*10)/10+' V'):'0 V · apagado')+' ('+meterPair.join(' ↔ ')+')'}
 $('wireColor').disabled=live||mode!=='wire';
 $('entries').innerHTML=wires.length?wires.map(([a,b,color],j)=>'<div>'+name(a)+' ↔ '+name(b)+' <select data-color="'+j+'" aria-label="Color del conductor '+(j+1)+'" '+(live?'disabled':'')+'>'+colorOptions(color||'auto')+'</select> <button data-remove="'+j+'" '+(live?'disabled':'')+'>Quitar</button></div>').join(''):'Ningún conductor instalado.';
 save()
}
function pair(a,b){if(!a||!b){feedback='Selecciona origen y destino.'}else if(a===b){feedback='Selecciona dos terminales diferentes.'}else if(mode==='meter'){meterPair=[a,b];feedback='Lectura entre '+name(a)+' y '+name(b)+'.'}else if(live){feedback='Desenergiza antes de editar.'}else if(wires.some(w=>w.includes(a)&&w.includes(b))){feedback='Ese conductor ya está instalado.'}else{wires.push([a,b,selectedColor]);fault='';feedback='Conductor instalado entre '+name(a)+' y '+name(b)+'.'}pick=null;$('second').value='';render()}
function terminal(k){if(mode==='wire'&&live){feedback='Para medir, elige Medir. Para modificar, desenergiza.';render();return}if(pick===null){pick=k;feedback='Ahora selecciona el otro extremo.';render()}else pair(pick,k)}
function activate(e){
 const slot=e.target.closest('[data-slot]');
 if(slot){
  const id=slot.dataset.slot;
  if(live||junctions.includes(id))return;
  junctions.push(id);refreshOptions();pick=null;feedback='Empalme '+id+' creado. Conecta aquí los cables que compartirán este punto.';render();
  $('diagram').querySelector('[data-pin="'+id+'"]')?.focus();return;
 }
let pin=e.target.closest('[data-pin]'),sw=e.target.closest('[data-switch]');if(pin)terminal(pin.dataset.pin);if(sw){let id=sw.dataset.switch;switches[id]=!switches[id];feedback='Interruptor '+id+' accionado.';render()}}
$('diagram').onclick=activate;$('diagram').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){let target=e.target.closest('[data-pin],[data-switch],[data-slot]');if(target){e.preventDefault();let k=target.dataset.pin||target.dataset.switch;activate(e);$('diagram').querySelector('[data-pin="'+k+'"],[data-switch="'+k+'"]')?.focus()}}};
$('first').onchange=()=>{pick=$('first').value||null;render()};$('connect').onclick=()=>pair($('first').value,$('second').value);
for(let m of ['wire','meter'])$(m).onclick=()=>{mode=m;pick=null;meterPair=null;$('second').value='';render()};
$('power').onclick=()=>{live=!live;pick=null;fault='';feedback=live?'Tablero energizado. Acciona un interruptor o mide entre dos terminales.':'Tablero desenergizado. Puedes editar los conductores.';render()};
$('undo').onclick=()=>{if(!live){wires.pop();pick=null;feedback='Último conductor retirado.';render()}};
$('entries').onchange=e=>{
 if(live||e.target.dataset.color===undefined||!Object.hasOwn(wireColors,e.target.value))return;
 const index=Number(e.target.dataset.color);
 wires[index][2]=e.target.value;render();
 $('entries').querySelector('[data-color="'+index+'"]')?.focus();
};
$('entries').onclick=e=>{if(e.target.dataset.remove!==undefined&&!live){wires.splice(+e.target.dataset.remove,1);feedback='Conductor retirado.';render()}};
function modal(t,html){$('modalTitle').textContent=t;$('modalBody').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
$('close').onclick=()=>$('modal').close();
const lessons={blank:['Cableado libre','Comienza con el panel sin conductores.'],parallel:['Luminarias en paralelo','Dos lámparas de 120 V controladas por A.'],series:['Luminarias en serie','Compara la caída de tensión/voltaje en dos lámparas iguales.'],three:['Control desde dos puntos','Los interruptores B y C controlan la luminaria 3.'],outlets:['Receptáculos de 120 y 240 V','Dos ramales de 120 V y un receptáculo bipolar de 240 V.']};
function applyExample(k){junctions=[];refreshOptions();wires=modelExamples[k].map(w=>[...w]);switches={A:true,B:false,C:false};live=false;mode='wire';pick=meterPair=null;example=k;$('second').value='';feedback=k==='blank'?'Selecciona dos terminales para instalar un conductor.':'Configuración cargada. Energiza el tablero para probarla.';$('modal').close();render()}
function confirmLoad(k){if(!wires.length&&!junctions.length){applyExample(k);return}modal('¿Reemplazar el cableado?','<p>La configuración seleccionada sustituirá los conductores y los empalmes añadidos al panel actual.</p><button class="option" id="confirm">Cargar '+lessons[k][0]+'</button>');$('confirm').onclick=()=>applyExample(k)}
$('examples').onclick=()=>{modal('Configuraciones',Object.entries(lessons).map(([k,[t,d]])=>'<button class="option" data-example="'+k+'">'+t+'<p>'+d+'</p></button>').join(''));document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>confirmLoad(b.dataset.example))};
$('clear').onclick=()=>confirmLoad('blank');
$('help').onclick=()=>modal('Cómo usar el taller','<p><b>Cablear.</b> Con el tablero apagado, toca dos círculos. También puedes elegir origen y destino en las listas. Un borne admite varios conductores. Elige el color antes de conectar o cámbialo en Conductores instalados. En la zona inferior, pulsa + para añadir un empalme. Los cables conectados al mismo empalme comparten continuidad eléctrica. Las cajas D y Z ofrecen puntos de empalme independientes.</p><p><b>Probar.</b> Energiza, acciona A, B o C y observa las lecturas. Usa Medir para comparar dos puntos. Una isla sin referencia aparece como flotante.</p><p><b>Alimentación.</b> Modelo monofásico dividido de 120/240 V. C1 y C3 corresponden a L1, C2 y C4 a L2. C3 y C4 representan un ramal bipolar. N es neutro y T es tierra de equipos.</p><p><b>Modelo.</b> Las lámparas se representan como cargas resistivas iguales de 240 Ω. El ejercicio en serie permite estudiar la división de voltaje. Los receptáculos se miden sin carga. La protección simulada detecta conexiones incompatibles. El taller omite dimensionamiento, corriente de disparo y verificación normativa.</p>');
render();
