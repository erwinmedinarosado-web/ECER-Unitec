const $=id=>document.getElementById(id);
const lessons=[
 {name:'Iluminación de sala',type:'Residencial',desc:'Instala el cableado de una luminaria de sala controlada desde el interruptor de entrada.'},
 {name:'Alumbrado de taller',type:'Comercial',desc:'Completa un ramal en tubería EMT desde el tablero hasta la caja del interruptor y la luminaria lineal.'},
 {name:'Receptáculo de oficina',type:'Comercial',desc:'Lleva un ramal dedicado del tablero al receptáculo del puesto de trabajo.'}
];
const names=['Tablero','Caja del interruptor','Luminaria','Receptáculo'];
const pins=[['L','N','T'],['S1','S2','N','T'],['L','N','T'],['L','N','T']];
let i=0,routes=[],wires=[],start=null,pass=false,on=false,origin=null;
let completed=[];try{completed=JSON.parse(localStorage.getItem('circuito-completed'))||[]}catch{}
const dialog=document.querySelector('dialog');
function modal(title,html){$('title').textContent=title;$('content').innerHTML=html;if(!dialog.open)dialog.showModal()}
$('close').onclick=()=>dialog.close();
const msg=t=>$('message').textContent=t;
function list(){modal('Prácticas',lessons.map((s,n)=>'<button class="option" data-lesson="'+n+'"><small>'+s.type+'</small>'+s.name+'</button>').join(''));document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{load(+b.dataset.lesson);dialog.close()})}
$('choose').onclick=list;document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{if(b.dataset.view==='list')list();else if(b.dataset.view==='progress')modal('Tu progreso',lessons.map((s,n)=>'<p>'+(completed.includes(n)?'✓ Completada':'○ Pendiente')+' · '+s.name+'</p>').join(''));else dialog.close()});
$('help').onclick=()=>modal('Cómo practicar','<p>Selecciona dos puntos del plano para tender el cable o la tubería. Después, toca un punto, elige un terminal y repite en el extremo del mismo tramo.</p><p>L = línea, N = neutro, T = tierra de equipos. S1 y S2 son los bornes del interruptor. En la caja, N representa un empalme y T representa el conjunto de puesta a tierra.</p><p>Trabaja con el circuito virtual desenergizado. La verificación evalúa las conexiones de este ejercicio. El modelo omite dimensionamiento, soportes, protecciones y pruebas de campo.</p>');
function devices(){return i===2?[0,3]:[0,1,2]}
function expectedRoutes(){return i===2?['03']:['01','12']}
function needed(){return i===2?[['0L','3L'],['0N','3N'],['0T','3T']]:[['0L','1S1'],['1S2','2L'],['0N','1N'],['1N','2N'],['0T','1T'],['1T','2T']]}
const key=(a,b)=>[a,b].sort().join('|');
function load(n){tested=false;i=n;routes=[];wires=[];start=origin=null;pass=on=false;msg('Selecciona el tablero para iniciar el primer tramo.');render()}
const poly=(points,fill,stroke='#47565d')=>'<polygon points="'+points+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.3"/>';
// Project all objects from one measured room coordinate system.
function pt(x,y,z){return [348+(x-y)*.93,216+(x+y)*.32-z*.84]}
const p=(x,y,z)=>pt(x,y,z).join(',');
function face(coords,c){return poly(coords.map(a=>p(...a)).join(' '),c)}
function box(x,y,z,w,d,h,colors){let X=x+w,Y=y+d,Z=z+h;return face([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],colors[0])+face([[X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z]],colors[1])+face([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],colors[2])}
const metal=['#738189','#56636c','#adb8b9'],wood=['#af8359','#87674d','#dbb18b'],light=['#bcc4bf','#a4b0ad','#e0e5dc'];
function line(a,b,c,w=1){return '<path d="M'+p(...a)+' L'+p(...b)+'" stroke="'+c+'" stroke-width="'+w+'" fill="none"/>'}
function room(){
let s=box(0,0,-8,323,243,8,['#828e91','#66767f','#c7cbc6']);
s+=box(-6,0,0,6,243,195,['#9ea8a5','#c4ceca','#e1e7df'])+box(0,-6,0,323,6,195,['#dce0d6','#a6b0ab','#eef0e6']);
for(let x=0;x<320;x+=34)s+=line([x,0,.4],[x,243,.4],'#a8b2b0');
for(let y=0;y<243;y+=42)s+=line([0,y,.5],[323,y,.5],'#b3bcb8');
s+=box(0,0,0,323,3,7,light)+box(0,0,0,3,243,7,light);
if(i===0){
// Window, sill and framed panes on the left wall.
s+=box(0,78,76,4,91,86,wood)+box(4,83,81,2,81,76,['#9ab7c0','#9ab7c0','#dbedef'])+box(6,121,80,2,4,77,light)+box(6,82,117,2,81,4,light)+box(1,75,74,12,97,4,wood);
let fabric=['#71847e','#52645f','#90a49b'];
s+=box(73,20,5,145,54,19,wood)+box(73,15,21,145,10,42,fabric)+box(73,24,24,10,53,22,fabric)+box(208,24,24,10,53,22,fabric)+box(84,26,23,60,48,11,fabric)+box(146,26,23,60,48,11,fabric);
s+=box(105,106,1,127,70,2,['#879397','#859293','#a4ada6']);
for(let x of [128,199])for(let y of [118,153])s+=box(x,y,3,4,4,21,wood);
s+=box(122,112,24,89,48,4,wood)+box(142,122,28,22,13,2,light);
}else{
for(let x of [90,217])for(let y of [12,48])s+=box(x,y,0,5,5,50,metal);
s+=box(86,8,50,142,51,5,wood)+box(97,13,55,43,17,19,metal);
for(let y of [76,177])s+=box(1,y,0,6,5,138,metal);
for(let z of [32,77,122])s+=box(1,75,z,24,110,4,metal)+box(4,92,z+4,16,30,16,wood);
}
s+=box(0,197,65,9,34,52,metal);
for(let z=78;z<105;z+=8)s+=box(10,203,z,2,20,3,['#34454d','#34454d','#44555d']);
if(i!==2)s+=box(266,0,72,16,5,24,light)+box(271,5,80,6,2,9,metal);
else s+=box(266,0,35,18,6,23,light)+box(270,6,41,8,1,3,metal)+box(270,6,49,8,1,3,metal);
if(i===0){let [x,y]=pt(157,64,189);s+=line([157,64,205],[157,64,178],'#4d585c',3)+'<path d="M'+(x-23)+' '+(y+22)+' q23 -35 46 0z" fill="'+(on?'#f6d475':'#82958e')+'" stroke="#4d5c56"/><ellipse cx="'+x+'" cy="'+(y+22)+'" rx="23" ry="5" fill="'+(on?'#ffedab':'#e4e2ca')+'"/>'}
if(i===1)s+=box(77,52,185,112,17,6,['#a8b6b6','#8a989c',on?'#fff4b3':'#e6e8db']);
return s}
const locations=[[14,213,90],[275,9,83],[157,64,174],[275,9,48]];
function render(){let n=lessons[i],ready=routes.length===expectedRoutes().length;
$('num').textContent=n.type.toUpperCase()+'  /  '+String(i+1).padStart(2,'0');$('name').textContent=n.name;$('desc').textContent=n.desc;
$('goals').innerHTML=[['Tender '+(i===0?'el cable':'la tubería EMT'),ready],['Conectar los conductores',pass],['Probar '+(i===2?'el receptáculo':'el interruptor'),on||tested]].map(([t,yes])=>'<div class="goal"><b>'+(yes?'✓':'')+'</b>'+t+'</div>').join('');
$('count').textContent=ready?wires.length+' conexiones':routes.length+' / '+expectedRoutes().length+' tramos';$('undo').disabled=!routes.length&&!origin&&start===null;
$('check').textContent=pass?(i===2?'Probar receptáculo':on?'Apagar luz':'Encender luz'):'▷  Verificar instalación';
let s=room();
for(let r of routes){let a=locations[+r[0]],b=locations[+r[1]],path=r[0]==='0'?[a,[8,a[1],145],[8,8,145],[b[0],8,145],b]:[a,[a[0],8,185],[b[0],8,185],b];for(let j=1;j<path.length;j++){s+=line(path[j-1],path[j],i===0?'#8b622b':'#536775',5)+line(path[j-1],path[j],i===0?'#f5ba60':'#c2dae5',2)}}
for(let id of devices()){let [x,y]=pt(...locations[id]),left=id===0,dx=left?-42:22,dy=id===2?-36:-18,label=names[id],width=label.length*7.15+22,xx=left?x+dx-width:x+dx,yy=y+dy-15,selected=start===id||origin?.[0]===String(id);
s+='<g class="port" tabindex="0" role="button" aria-label="'+label+'" data-device="'+id+'"><path d="M'+x+' '+y+' L'+(x+dx)+' '+(y+dy)+'" stroke="#a8d86b" stroke-width="2"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="#253b33" stroke="#b9f76c" stroke-width="2"/><circle cx="'+x+'" cy="'+y+'" r="3" fill="#c5fa70"/><rect x="'+xx+'" y="'+yy+'" width="'+width+'" height="29" rx="5" fill="'+(selected?'#507332':'#243441')+'" stroke="#96b36f"/><text x="'+(xx+10)+'" y="'+(yy+19)+'" fill="#ebf4e5" font-family="Arial" font-size="13">'+label+'</text></g>'}
$('points').innerHTML=devices().map(d=>'<button data-point="'+d+'">'+names[d]+'</button>').join('');document.querySelectorAll('[data-point]').forEach(b=>b.onclick=()=>device(+b.dataset.point));
$('entries').innerHTML=wires.length?wires.map((w,j)=>'<div>'+w.split('|').map(t=>names[+t[0]]+' ('+t.slice(1)+')').join(' ↔ ')+' <button data-remove="'+j+'">Quitar</button></div>').join(''):'Ningún conductor instalado.';
document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{wires.splice(+b.dataset.remove,1);pass=on=tested=false;origin=null;msg('Conductor retirado.');render()});
$('drawing').innerHTML=s;document.querySelectorAll('[data-device]').forEach(g=>{g.onclick=()=>device(+g.dataset.device);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick()}}})}
let tested=false;
function device(d){if(pass){msg('Usa el botón de prueba para operar la instalación verificada.');return}
if(routes.length<expectedRoutes().length){if(start===null){start=d;msg('Inicio en '+names[d]+'. Selecciona el destino del tramo.')}else{let path=[start,d].sort().join('');if(expectedRoutes().includes(path)&&!routes.includes(path)){routes.push(path);msg(routes.length===expectedRoutes().length?'Recorrido completo. Selecciona un punto para conectar sus terminales.':'Primer tramo tendido. Une la caja del interruptor con la luminaria.')}else msg('Ese tramo no corresponde al recorrido previsto o ya está instalado. Elige otro par.');start=null}render();return}
modal(names[d],'<p>'+(origin?'Elige el extremo final del conductor que parte de '+names[+origin[0]]+' ('+origin.slice(1)+').':'Elige el terminal de origen del conductor.')+'</p>'+pins[d].map(t=>'<button class="option" data-pin="'+t+'">'+t+' · '+({L:'Línea',N:'Neutro',T:'Tierra de equipos',S1:'Borne 1',S2:'Borne 2'})[t]+'</button>').join(''));
document.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{let dest=d+b.dataset.pin;dialog.close();if(!origin){origin=dest;msg('Selecciona el destino del conductor desde '+names[d]+' ('+b.dataset.pin+').')}else{let r=[+origin[0],d].sort().join('');if(!routes.includes(r))msg('Conecta terminales ubicados en extremos del mismo tramo.');else if(wires.includes(key(origin,dest)))msg('Esta conexión ya existe.');else{wires.push(key(origin,dest));msg('Conductor conectado: '+names[+origin[0]]+' '+origin.slice(1)+' ↔ '+names[d]+' '+b.dataset.pin+'.')}origin=null}render()})}
$('check').onclick=()=>{if(pass){on=i===2?true:!on;tested=true;if(!completed.includes(i))completed.push(i);try{localStorage.setItem('circuito-completed',JSON.stringify(completed))}catch{}msg(i===2?'Prueba virtual correcta: 120 V entre línea y neutro.':on?'Interruptor cerrado. La luminaria está encendida.':'Interruptor abierto. La luminaria está apagada.');render();return}
if(routes.length!==expectedRoutes().length){msg('Completa los tramos entre los puntos de instalación.');return}
let sets=[needed().map(pair=>key(...pair))];if(i!==2)sets.push(needed().map(pair=>key(...pair.map(t=>t==='1S1'?'1S2':t==='1S2'?'1S1':t))));
if(sets.some(set=>set.length===wires.length&&set.every(t=>wires.includes(t)))){pass=true;origin=null;msg('Conexiones correctas. Acciona la prueba para completar la práctica.')}else{let set=sets.sort((a,b)=>b.filter(t=>wires.includes(t)).length-a.filter(t=>wires.includes(t)).length)[0],bad=wires.find(w=>!set.includes(w)),miss=set.find(w=>!wires.includes(w));const pretty=w=>w.split('|').map(t=>names[+t[0]]+' ('+t.slice(1)+')').join(' ↔ ');msg(bad?'Revisa esta conexión: '+pretty(bad)+'. Usa Deshacer para corregirla.':'Falta conectar: '+pretty(miss)+'.')}render()};
$('undo').onclick=()=>{if(origin)origin=null;else if(start!==null)start=null;else if(wires.length)wires.pop();else routes.pop();pass=on=tested=false;msg('Selección o último paso deshecho.');render()};
$('reset').onclick=()=>{tested=false;load(i)};load(0);
