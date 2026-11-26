const $=id=>document.getElementById(id);
const titles={lamp:'Luminaria',single:'Interruptor',three:'Interruptor 3 vías',outlet:'Receptáculo',240:'Receptáculo 240 V'};
const labels={'P.1':'C1 · L1','P.2':'C2 · L2','P.3':'C3 · L1','P.4':'C4 · L2','P.N':'Neutro','P.T':'Tierra'};
const palette=['#ffbd76','#83c6fb','#d2a6ff','#8ce2d1','#e99dad'];
let wires=[],switches={A:false,B:false,C:false,D:false},live=false,mode='wire',pick=null,meterPair=null,feedback='Selecciona dos terminales para instalar un conductor.',fault='',example='blank';
const wireColors={auto:['Automático',''],negro:['Negro','#121212'],rojo:['Rojo','#ef5555'],azul:['Azul','#599eff'],blanco:['Blanco','#ffffff'],verde:['Verde','#59c86d'],amarillo:['Amarillo','#ffd54f'],naranja:['Naranja','#ff963c'],violeta:['Violeta','#c298ff'],gris:['Gris','#afb6bd'],marron:['Marrón','#ac744d']};
const rows=[['1','2','3','4'],['A','B','C','D'],['W','X','Y','Z']];
const boxes=new Map();
rows.forEach((row,r)=>row.forEach((id,c)=>boxes.set(id,{x:191+c*250,y:51+r*228,r,c})));
// Keep the original E numbers so saved conductors retain their endpoints.
const slots=Array.from({length:39},(_,i)=>{
 const panel=i===24||i===25||i===38;
 const owner=panel?'P':rows.flat()[i<24?i%12:i-26];
 const box=boxes.get(owner),number=panel?(i===38?3:i-23):i<12?1:i<24?2:3;
 return {id:'E'+(i+1),owner,number,x:panel?39+(number-1)*47:box.x+187,y:panel?522:box.y+48+(number-1)*48};
});
const slotById=new Map(slots.map(slot=>[slot.id,slot]));
function ownerOf(end){return slotById.get(end)?.owner||end.split('.')[0]}
const junctions=slots.map(s=>s.id),spliceStyles={};
let selectedColor='auto';
function colorOptions(selected){
 return Object.entries(wireColors).map(([id,[label]])=>'<option value="'+id+'" '+(id===selected?'selected':'')+'>'+label+'</option>').join('');
}
const lampTypes={inc:{name:'Incandescente',watts:60},led:{name:'LED',watts:9},fluor:{name:'Fluorescente compacta',watts:32},halogen:{name:'Halógena PAR',watts:50},tube:{name:'Tubo fluorescente T8',watts:32},ledtube:{name:'Tubo LED',watts:18},down:{name:'Empotrada LED',watts:12},panel:{name:'Panel LED',watts:40},flood:{name:'Reflector LED',watts:30}};
const lampIds=deviceList.filter(d=>d.type==='lamp').map(d=>d.id);
const lamps=Object.fromEntries(lampIds.map(id=>[id,{type:'inc',watts:60}]));
function validWatts(w){return Number.isFinite(w)&&w>=0.1&&w<=2000}
function setSwitchType(id,type){
 const device=deviceList.find(d=>d.id===id);
 device.type=type;device.pins=switchSpecs[type].pins;
}
function switchTypes(){return Object.fromEntries(Object.keys(defaultSwitchTypes).map(id=>[id,deviceList.find(d=>d.id===id).type]))}
function allTerminals(){return terminals().concat(junctions)}
try{
 const s=JSON.parse(localStorage.getItem('unitec-wall-v1'));
 if(s&&Array.isArray(s.wires)){
  for(const id of junctions)if(s.spliceStyles?.[id]==='lever')spliceStyles[id]='lever';
  // Preserve the independent splice terminals from earlier D and Z boxes.
  for(const id of lampIds){
   const lamp=s.lamps?.[id];
   if(lamp&&Object.hasOwn(lampTypes,lamp.type)&&validWatts(lamp.watts))lamps[id]={type:lamp.type,watts:lamp.watts};
  }
  const oldPins=['D.a','D.b','D.c','Z.a','Z.b','Z.c'];
  const restored=s.wires.filter(Array.isArray).map(([a,b,color])=>{
   const ends=[a,b].map(pin=>{
    const index=oldPins.indexOf(pin);
    if(index<0)return pin;
    const point='E'+(13+index);
    
    return point;
   });
   return [...ends,color];
  });
  for(const id of Object.keys(defaultSwitchTypes))if(Object.hasOwn(switchSpecs,s.switchTypes?.[id]))setSwitchType(id,s.switchTypes[id]);
  for(const d of deviceList){
   d.empty=Array.isArray(s.empty)&&s.empty.includes(d.id);
   if(d.model&&Object.hasOwn(outletSpecs,s.outlets?.[d.id])){configureOutlet(d,s.outlets[d.id]);d.trip=s.trips?.[d.id]!==false}
  }
  const allowed=allTerminals();
  wires=restored.filter(w=>Array.isArray(w)&&allowed.includes(w[0])&&allowed.includes(w[1])).map(([a,b,color])=>[a,b,Object.hasOwn(wireColors,color)?color:'auto']);
  switches={...switches,...s.switches};
  if(Object.hasOwn(wireColors,s.selectedColor))selectedColor=s.selectedColor;
 }
}catch{}
function save(){try{localStorage.setItem('unitec-wall-v1',JSON.stringify({wires,switches,junctions,spliceStyles,selectedColor,lamps,switchTypes:switchTypes(),trips:Object.fromEntries(deviceList.filter(d=>outletSpecs[d.model]?.gfci).map(d=>[d.id,d.trip])),empty:deviceList.filter(d=>d.empty).map(d=>d.id),outlets:Object.fromEntries(deviceList.filter(d=>d.model).map(d=>[d.id,d.model]))}))}catch{}}
$('wireColor').innerHTML=colorOptions(selectedColor);
$('wireColor').onchange=e=>{selectedColor=e.target.value;save()};
for(const id of lampIds){
 const type=$('technology-'+id),watts=$('watts-'+id);
 type.innerHTML=Object.entries(lampTypes).map(([k,s])=>'<option value="'+k+'">'+s.name+'</option>').join('');
 type.value=lamps[id].type;
 watts.value=lamps[id].watts;
 type.onchange=()=>{
  if(live)return;
  lamps[id]={type:type.value,watts:lampTypes[type.value].watts};
  watts.value=lamps[id].watts;
  render();
 };
 watts.onchange=()=>{
  if(live)return;
  const value=watts.valueAsNumber;
  if(validWatts(value))lamps[id].watts=value;
  else {watts.reportValidity();watts.value=lamps[id].watts;feedback='Escribe una potencia entre 0.1 y 2000 W.'}
  render();
 };
}
for(const id of Object.keys(defaultSwitchTypes)){
 const select=$('type-'+id);
 select.innerHTML=Object.entries(switchSpecs).map(([key,spec])=>'<option value="'+key+'">'+spec.label+'</option>').join('');
 select.onchange=()=>{
  const type=select.value;
  const current=switchTypes()[id];
  select.value=current;
  if(live||!Object.hasOwn(switchSpecs,type))return;
  const incompatible=w=>w.slice(0,2).some(p=>p.startsWith(id+'.')&&!p.endsWith('.G')&&!switchSpecs[type].pins.includes(p.split('.')[1]));
  const removed=wires.filter(incompatible).length;
  function apply(){
   wires=wires.filter(w=>!incompatible(w));setSwitchType(id,type);
   for(const key of [id,id+':1',id+':2',id+':3'])delete switches[key];
   pick=meterPair=null;refreshOptions();feedback='Interruptor '+id+' actualizado.';render();
  }
  if(!removed){apply();return}
  modal('Cambiar interruptor '+id,'<p>Este cambio retirará '+removed+' conductor(es) conectado(s) a bornes que desaparecerán.</p><button id="replaceSwitch">Cambiar y retirar esos conductores</button>');
  $('replaceSwitch').onclick=()=>{$('modal').close();apply()};
 };
}
function changePosition(d,pins,update){
 if(live)return;
 const keep=w=>w.slice(0,2).every(p=>!p.startsWith(d.id+'.')||p.endsWith('.G')||pins.includes(p.split('.')[1]));
 const next=wires.filter(keep),removed=wires.length-next.length;
 function apply(){wires=next;update();pick=meterPair=null;refreshOptions();feedback='Posición '+d.id+' actualizada.';render()}
 if(!removed){apply();return}
 modal('Cambiar posición '+d.id,'<p>Se retirarán '+removed+' conductor(es) conectado(s) a bornes que desaparecerán.</p><button id="replacePosition">Confirmar cambio</button>');
 $('replacePosition').onclick=()=>{$('modal').close();apply()};
}
for(const d of deviceList){
 const empty=$('empty-'+d.id);
 empty.onchange=()=>{const value=empty.checked;empty.checked=!!d.empty;changePosition(d,value?[]:d.pins,()=>{d.empty=value})};
 if(!d.model)continue;
 const select=$('outlet-'+d.id);
 select.innerHTML=Object.entries(outletSpecs).map(([model,s])=>'<option value="'+model+'">'+model+' · '+s.rating+'</option>').join('');
 select.onchange=()=>{const model=select.value;select.value=d.model;if(!d.empty&&Object.hasOwn(outletSpecs,model))changePosition(d,outletSpecs[model].pins,()=>configureOutlet(d,model))};
}
const pos={};
function conductorRoute(a,b,index){
 // Parallel tracks stay within the 20-unit bore of each conduit.
 const lane=((index%9)-4)*1.8;
 const hub=id=>{const box=boxes.get(id);return id==='P'?[147+lane,185+lane]:[box.x+145+lane,box.y+134+lane]};
 function lead(end){
  const [x,y]=pos[end],id=ownerOf(end),[hx,hy]=hub(id);
  return [[x,y],[x,hy],[hx,hy]];
 }
 const start=ownerOf(a),finish=ownerOf(b),points=lead(a);
 let from=start==='P'?'1':start,to=finish==='P'?'1':finish;
 if(start!==finish){
  if(start==='P')points.push(hub('1'));
  // Use the upper box's column for the vertical leg in either direction.
  const f=boxes.get(from),t=boxes.get(to);
  const corner=f.r<=t.r?rows[t.r][f.c]:rows[f.r][t.c];
  points.push(hub(corner),hub(to));
  if(finish==='P')points.push(hub('P'));
 }
 points.push(...lead(b).reverse());
 return points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
}

function name(k){if(k.endsWith('.G'))return 'Caja '+ownerOf(k)+' · tornillo verde de puesta a tierra';if(junctions.includes(k))return 'Empalme '+k+' · '+(ownerOf(k)==='P'?'panel':'caja '+ownerOf(k));if(labels[k])return 'Alimentación · '+labels[k];let [id,p]=k.split('.');const d=deviceList.find(dev=>dev.id===id);return id+' · '+(d.model||switchSpecs[d.type]?.label||titles[d.type])+' · '+p+' · '+terminalName(d,p)}
function options(el){el.innerHTML='<option value="">Elegir terminal…</option>'+allTerminals().map(k=>'<option value="'+k+'">'+name(k)+'</option>').join('')}
function refreshOptions(){options($('first'));options($('second'))}

const txt=(x,y,t,size=12,color='#cedce6',anchor='start',weight=500)=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Arial,sans-serif" font-weight="'+weight+'" font-size="'+size+'" text-anchor="'+anchor+'">'+t+'</text>';
const rect=(x,y,w,h,fill,stroke='none',r=5)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" rx="'+r+'"/>';
function pin(k,x,y,label,side=false){pos[k]=[x,y];let c=k.endsWith('.T')?'#a9d888':k.endsWith('.N')?'#f0f1e9':'#ebba76';return '<g class="terminal" role="button" tabindex="0" aria-label="'+name(k)+'" data-pin="'+k+'">'+rect(x-15,y-14,30,29,'transparent')+'<circle class="dot" cx="'+x+'" cy="'+y+'" r="'+(pick===k?8:5.5)+'" fill="'+(pick===k?'#c9ff76':'#172636')+'" stroke="'+c+'" stroke-width="2.8"/>'+(!side?txt(x,y-12,label,12,'#d7e2e7','middle',600):'')+'</g>'}
// Positions are relative to the device body, with the marking beside its screw.
const mounts={
 lamp:{H:[110,70],N:[42,70],T:[42,115]},
 single:{'1':[110,65],'2':[110,103],T:[42,115]},
 three:{C:[42,65],V1:[110,65],V2:[110,103],T:[42,115]},
 four:{A1:[42,60],A2:[110,60],B1:[42,95],B2:[110,95],T:[76,120]},
 dual:{L:[42,68],S1:[110,65],S2:[110,103],T:[42,115]},
 triple:{L:[42,68],S1:[110,52],S2:[110,83],S3:[110,114],T:[42,115]},
 pilot:{'1':[110,65],'2':[110,103],N:[42,65],T:[42,115]},
 bipolar:{L1:[42,60],L2:[110,60],S1:[42,95],S2:[110,95],T:[76,120]},
 outlet:{H:[110,59],H2:[110,94],N:[42,59],N2:[42,94],T:[76,120]},
 '240':{X:[42,62],Y:[110,62],N:[110,102],T:[42,113]}
};
const terminalNames={H:'Fase',H2:'Fase · segundo tornillo',N:'Neutro',N2:'Neutro · segundo tornillo',T:'Tierra del equipo',C:'Común',V1:'Viajero 1',V2:'Viajero 2',A1:'Par A · 1',A2:'Par A · 2',B1:'Par B · 1',B2:'Par B · 2',X:'Línea X',Y:'Línea Y',L:'Alimentación común',L1:'Línea 1',L2:'Línea 2',S1:'Salida 1',S2:'Salida 2',S3:'Salida 3'};
function terminalName(d,p){
 if(outletSpecs[d.model]?.gfci&&p!=='T')return ({H:'LINE · fase',N:'LINE · neutro',HS:'LOAD · fase',NS:'LOAD · neutro'})[p];
 if(d.type==='lamp'&&lamps[d.id].type==='inc'&&p!=='T')return p==='H'?'Fase · contacto central':'Neutro · casquillo roscado';
 if(d.type==='pilot'&&(p==='1'||p==='2'))return p==='1'?'Entrada':'Salida conmutada';
 return terminalNames[p]||'Contacto '+p;
}
function material(id,colors){
 const stops=colors.map((color,i)=>'<stop offset="'+(i*100/(colors.length-1))+'%" stop-color="'+color+'"/>').join('');
 return '<linearGradient id="'+id+'" x2="0.9" y2="0.65">'+stops+'</linearGradient>';
}
const deviceMaterials=[
 material('steel',['#889296','#f4f6ee','#a8afb0','#dadecf','#5c6668']),
 material('bakelite',['#6b6863','#3b3835','#252423','#131413']),
 material('ivory',['#fffef2','#f2eedf','#ded9c9','#b4afa2']),
 material('lever',['#aaa798','#fffdf1','#e2decf','#8a887c']),
 material('brass',['#826734','#ffdf93','#c39949','#785629']),
 material('glass',['#657a86','#e2ece9','#94a6ab','#556d78']),
 material('opal',['#e7ece4','#fffef2','#d9dfdc','#a4afb0']),
 material('litGlass',['#e5a84c','#fffbd0','#ffe699','#e2ab54'])
].join('')+'<radialGradient id="halo"><stop stop-color="#fff2a4" stop-opacity=".65"/><stop offset="1" stop-color="#ffd981" stop-opacity="0"/></radialGradient>';
function yoke(){
 return '<path d="M52 32h48v10h-4v65h4v22H52v-22h4V42h-4z" fill="url(#steel)" stroke="#657074"/>'+
 [37,124].map(y=>rect(69,y-2.4,14,4.8,'#314048','#9da9a8',2)).join('')+
 rect(39,49,74,65,'url(#bakelite)','#111b20',6);
}
function receptacleFace(d){
 const ground='<path d="M-4 4a4 4 0 0 1 8 0v3h-8z" fill="#202223"/>';
 if(outletSpecs[d.model]?.locking)return yoke()+'<circle cx="76" cy="82" r="30" fill="url(#bakelite)" stroke="#a7a79b"/>'+d.pins.map((p,i)=>'<path transform="rotate('+i*360/d.pins.length+' 76 82)" d="M62 69q7 -8 17 -8v5" fill="none" stroke="#080909" stroke-width="4"/>').join('');
 if(d.type==='outlet'){
  let face=rect(51,45,50,67,'url(#ivory)','#ada99f',5);
  for(const y of [62,94])face+='<g transform="translate(76 '+y+')"><path d="M-21 -9q4 -7 12 -7H9q10 0 12 8v13q-4 8 -13 8H-8q-10 0 -13 -8z" fill="url(#ivory)" stroke="#9e9b92"/><path d="M-10 -9v9 M10 -8v8" stroke="#252627" stroke-width="3.7"/>'+(d.model.includes('5-20R')?'<path d="M-15 -5h6" stroke="#252627" stroke-width="3.3"/>':'')+ground+'</g>';
  if(outletSpecs[d.model]?.gfci)face+=rect(60,73,32,10,'#c9c7bd','#777',1)+txt(76,80,'TEST / RESET',5,'#333','middle');
  if(d.model.endsWith(' TR')||d.model.endsWith(' WR'))face+=txt(76,80,d.model.slice(-2),6,'#494a45','middle');
  return yoke()+rect(40,59,4,35,'url(#steel)')+rect(108,59,4,35,'url(#brass)')+face;
 }
 const four=d.pins.includes('N'),is20=d.model==='6-20R';
 let blades=four?'<path d="M-15 -3v12 M15 -3v12 M0 11v9'+(d.model==='14-30R'?'h5':'')+'" stroke="#080909" stroke-width="4"/><path d="M-4 -12v-3a4 4 0 0 1 8 0v3z" fill="#080909"/>':'<path d="M-17 -6h11 M6 -6h11'+(is20?' M-11 -11v10':'')+'" stroke="#080909" stroke-width="4"/>'+ground;
  return yoke()+'<g transform="translate(76 80)"><circle r="30" fill="url(#bakelite)" stroke="#96948a" stroke-width="2"/><circle r="26" fill="none" stroke="#595952"/>'+blades+'</g>';
}
function switchFace(d,pilotLit){
 const count=switchSpecs[d.type].keys||1;
 let face=yoke()+rect(53,45,46,68,'url(#ivory)','#b6b2a5',4);
 if(switchSpecs[d.type].base){face+=rect(56,49,40,58,'url(#lever)','#9c998d',4)+rect(58,switches[d.id]?51:100,36,4,'#aba799','none',1)}else if(count>1){
  const height=57/count;
  for(let n=1;n<=count;n++){const top=49+(n-1)*height,on=switches[d.id+':'+n];
   face+=rect(56,top,40,height-2,'#706e63','#c7c3b6',2)+rect(58,top+(on?3:1),36,height-6,'url(#lever)','#b2afa1',2);
  }
 }else{
  const on=switches[d.id],base=on?76:87,tip=on?59:100;
  face+=rect(65,58,22,44,'#77766e','#c7c3b8',5)+'<path d="M67 '+base+'l3 -4h12l3 4 -2 '+(tip-base)+'h-14z" fill="url(#lever)" stroke="#74746a"/>'+rect(69,tip-2,14,4,'#ede9db','#ada99d',2);
  if(d.type==='pilot')face+=rect(63,48,26,8,pilotLit?'#ffbd43':'#884c2e','#744832',4);
 }
 return face;
}
function lampFace(tech,on){
 const shade=on?'url(#litGlass)':'url(#opal)';
 let art='<ellipse cx="76" cy="109" rx="34" ry="13" fill="url(#steel)" stroke="#667579"/><ellipse cx="76" cy="106" rx="29" ry="10" fill="url(#ivory)" stroke="#a1a397"/>';
 if(on)art+='<ellipse cx="76" cy="72" rx="42" ry="42" fill="url(#halo)"/>';
 if(['tube','ledtube','panel','down','flood','halogen'].includes(tech)){
  const lens=on?shade:'url(#opal)';
  if(tech==='tube'||tech==='ledtube')return art+rect(45,64,62,22,'url(#steel)','#9aa1a5',4)+rect(47,68,58,6,lens,'#8c9697',3)+(tech==='tube'?rect(47,77,58,6,lens,'#8c9697',3):'');
  if(tech==='down'||tech==='halogen')return art+'<ellipse cx="76" cy="71" rx="29" ry="24" fill="url(#steel)" stroke="#888"/><ellipse cx="76" cy="71" rx="22" ry="18" fill="'+lens+'" stroke="#ddd"/>'+(tech==='halogen'?'<circle cx="76" cy="71" r="6" fill="#c6a466"/>':'');
  return art+rect(44,54,64,43,tech==='panel'?'url(#steel)':'url(#bakelite)','#90999b',4)+rect(49,59,54,33,lens,'#929998',3);
 }
 if(tech==='fluor'){
  art+=rect(64,88,24,19,'url(#ivory)','#969b98',4);
  for(const xx of [61,77])art+='<path d="M'+xx+' 89V53q0 -11 10 -11 3 0 3 7v40" fill="none" stroke="#909898" stroke-width="8"/><path d="M'+xx+' 89V53q0 -11 10 -11 3 0 3 7v40" fill="none" stroke="'+shade+'" stroke-width="5.5"/>';
 }else{
  art+=rect(65,86,22,20,'url(#steel)','#686f71',4);
  for(let n=0;n<4;n++)art+='<path d="M66 '+(91+3*n)+'l20 -2" stroke="#627176" stroke-width="1.5"/>';
  if(tech==='inc')art+='<path d="M66 90c-1 -12 -14 -17 -14 -33a24 24 0 0 1 48 0c0 16 -13 21 -14 33z" fill="'+(on?shade:'url(#glass)')+'" stroke="#d9e4dc"/><path d="M71 89l-5 -25 4 3 3 -3 4 3 3 -3 5 2 -5 23" fill="none" stroke="'+(on?'#fff9d2':'#796246')+'" stroke-width="1.5"/><path d="M59 56q0 -12 11 -16" fill="none" stroke="#fff" opacity=".7" stroke-width="3"/>';
  else art+='<path d="M52 65a24 26 0 0 1 48 0q0 4 -4 6H56q-4 -2 -4 -6z" fill="'+shade+'" stroke="#dce4dd"/><path d="M55 70h42l-12 20H67z" fill="url(#ivory)" stroke="#a4a9a4"/>';
 }
 return art;
}
function body(d,x,y,v,pilotLit){
 let artwork=d.model?receptacleFace(d):d.type==='lamp'?lampFace(lamps[d.id].type,live&&v>1):switchFace(d,pilotLit);
 return '<g transform="translate('+x+' '+y+')" aria-hidden="true">'+artwork+'</g>';
}
function screw(d,p,x,y){
 const mount=mounts[switchSpecs[d.type]?.base||d.type];
 const [dx,dy]=mount[p==='HS'?'H2':p==='NS'?'N2':p],cx=x+dx,cy=y+dy,key=d.id+'.'+p;
 pos[key]=[cx,cy];
 if(d.type==='lamp'&&lamps[d.id].type!=='inc'&&p!=='T'){
  const end=cx+(dx<76?-15:15),insulation=p==='N'?'#f0eee4':'#202224';
  pos[key]=[end,cy];
  return '<g class="terminal" role="button" tabindex="0" data-pin="'+key+'" aria-label="'+name(key)+'"><title>'+name(key)+'</title>'+rect(end-14,cy-15,28,30,'transparent')+'<path d="M'+(dx<76?x+57:x+94)+' '+(cy+4)+' L'+cx+' '+cy+' H'+end+'" fill="none" stroke="'+insulation+'" stroke-width="5"/><circle class="dot" cx="'+end+'" cy="'+cy+'" r="5" fill="#d7975f" stroke="'+(pick===key?'#c9ff76':'#e9be97')+'"/>'+txt(end,cy-11,p,11,'white','middle',700)+'</g>';
 }
 const fill=p==='T'?'#73bb72':p.startsWith('N')?'#dfE6e8':p==='C'?'#303235':'#d9ad60';
 const right=dx>=76,mark=p==='N2'?'N₂':p==='H2'?'H₂':p;
 return '<g class="terminal" role="button" tabindex="0" data-pin="'+key+'" aria-label="'+name(key)+'"><title>'+name(key)+'</title>'+rect(cx-13,cy-13,26,26,'transparent')+'<circle class="dot" cx="'+cx+'" cy="'+cy+'" r="7" fill="'+fill+'" stroke="'+(pick===key?'#c9ff76':'#d7e1df')+'" stroke-width="'+(pick===key?4:1.4)+'"/><path d="M'+(cx-3)+' '+(cy+3)+' l6 -6" stroke="'+(p==='C'?'#fff':'#354345')+'" stroke-width="2"/>'+txt(cx+(right?11:-11),cy+4,mark,12,'white',right?'start':'end',700)+'</g>';
}
let reportActive=false;
$('spliceTarget').innerHTML=[...slots].sort((a,b)=>a.owner.localeCompare(b.owner)||a.number-b.number).map(s=>'<option value="'+s.id+'">'+(s.owner==='P'?'Panel':'Caja '+s.owner)+' · Empalme '+s.number+' ('+s.id+')</option>').join('');
$('spliceTarget').value='E1';
$('spliceTarget').onchange=()=>{$('spliceStyle').value=spliceStyles[$('spliceTarget').value]||'cap'};
$('spliceStyle').onchange=()=>{if(live)return;spliceStyles[$('spliceTarget').value]=$('spliceStyle').value;render()};
function spliceFace(s){
 const {id,x,y}=s,lever=spliceStyles[id]==='lever';
 pos[id]=[x,y+10];
 const art=lever?'<path d="M-14 -10h28v19h-28z" fill="#c3c9c4" stroke="#737c7c"/>'+[-9,0,9].map(dx=>rect(dx-3,-9,6,13,'#ff8e22','#b25a12',2)+rect(dx-2,5,4,4,'#545750','none',1)).join(''):
 '<path d="M-10 9l3 -19q7 -6 14 0l3 19z" fill="#eba636" stroke="#92561e"/><path d="M-9 0l-5 5 5 2m18 -7l5 5 -5 2" fill="#d98823"/><path d="M-5 -8l-2 14m7 -15v16m5 -15l2 14" stroke="#ffe0a2"/>';
 return '<g transform="translate('+x+' '+y+')" class="terminal" role="button" tabindex="0" data-pin="'+id+'" aria-label="'+name(id)+'"><title>'+name(id)+' · '+(lever?'Palanca':'Capuchón')+'</title>'+rect(-20,-15,40,39,'transparent')+art+'<circle class="dot" cx="0" cy="10" r="3" fill="#b87842" stroke="'+(pick===id?'#c9ff76':'#e4b285')+'"/>'+txt(0,24,id,10,'white','middle')+'</g>';
}
function boxGround(id,x,y){
 const k=id+'.G';pos[k]=[x,y];
 return '<g class="terminal" tabindex="0" role="button" data-pin="'+k+'" aria-label="'+name(k)+'"><title>'+name(k)+'</title>'+rect(x-22,y-12,45,25,'transparent')+'<circle cx="'+x+'" cy="'+y+'" r="10" fill="url(#steel)"/><circle class="dot" cx="'+x+'" cy="'+y+'" r="7.5" fill="#328751" stroke="'+(pick===k?'#c9ff76':'#96dda6')+'"/><path d="M'+(x-4)+' '+(y+3)+'l8 -6" stroke="#123b25" stroke-width="2"/>'+txt(x+13,y+4,'⏚',13,'#baf3bf')+'</g>';
}
function render(){
 const result=solve(wires,switches,junctions,lamps);
 if(live&&result.faults.length){live=false;fault=result.faults.join(' ');feedback='Tablero desenergizado por la protección simulada.'}
 const diagnostic=$('diagnosis');
 diagnostic.hidden=!reportActive;
 if(reportActive){
  const issues=[...new Set([...result.faults,...result.warnings])];
  diagnostic.innerHTML='<strong>'+(result.faults.length?'Protección activada':issues.length?'Revisa el circuito':'Comprobación del circuito')+'</strong>'+
   (issues.length?'<ul>'+issues.map(msg=>'<li>'+msg+'</li>').join('')+'</ul>':'<p>'+(wires.length?'Sin errores detectados por el modelo.':'El tablero está sin cableado. Añade conductores para probarlo.')+'</p>');
 }
 const svg=$('diagram');let base='<defs>'+deviceMaterials+'<pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="#354959"/></pattern></defs>'+rect(0,0,1176,728,'url(#grid)')+txt(18,28,'ACOMETIDA',11,'#a8b8c5')+txt(194,28,'VISTA DE CABLEADO',11,'#a8b8c5');
 let total=0;
 for(const id of lampIds){
  const volts=result.readings[id];
  const power=live&&volts!==null?lamps[id].watts*(volts/120)**2:0;
  total+=power;
  $('power-'+id).textContent='Consumo simulado: '+Number(power.toFixed(2))+' W';
  $('lamp-'+id).disabled=live;
 }
 $('total-lamps').textContent='Consumo total de las luminarias: '+Number(total.toFixed(2))+' W';
 let pins='',controls='';
 base+=rect(13,51,147,510,'#203343','#476171',9)+txt(28,79,'Panel 120/240 V',16,'#eff5f2','start',700)+txt(28,99,'FASE DIVIDIDA',10,'#abc1cc');
 ['P.1','P.2','P.3','P.4','P.N','P.T'].forEach((k,j)=>{let y=141+j*55;base+=rect(23,y-19,125,38,'#192b3a','#415666',5)+txt(32,y+5,labels[k],14,'#e3ecec','start',600);pins+=pin(k,133,y,'',true)});
 base+=txt(28,470,'C3–C4 · bipolar',12,'#aebfc8');
 base+=rect(160,175,31,20,'#304554','#718492',0);
 rows.forEach((row,r)=>row.forEach((id,c)=>{let {x,y}=boxes.get(id),d=deviceList.find(dev=>dev.id===id),val=result.readings[id];
 $('empty-'+id).checked=!!d.empty;
 $('empty-'+id).disabled=live;
 if(d.model){$('outlet-'+id).value=d.model;$('outlet-'+id).disabled=live||d.empty}
 if(switchSpecs[d.type]){$('switch-box-'+id).disabled=live;$('type-'+id).disabled=!!d.empty;$('type-'+id).value=d.type}
 if(d.type==='lamp'){$('watts-'+id).disabled=!!d.empty;$('technology-'+id).disabled=!!d.empty}
 if(c<3)base+=rect(x+222,y+124,28,20,'#304554','#596b74',0);
 if(r<2)base+=rect(x+135,y+200,20,28,'#304554','#596b74',0);
 if(d.empty){base+=rect(x,y,222,200,'#192b39','#526779',8)+txt(x+15,y+25,id,14)+txt(x+78,y+69,'Sin dispositivo',13,'#acbeca','middle');return}
 base+=rect(x,y,222,200,'#213646','#577080',8)+rect(x+9,y+9,21,20,'#354f5f','none',4)+txt(x+19.5,y+24,id,14,'#d5f89f','middle',700)+txt(x+35,y+23,d.type==='lamp'?lampTypes[lamps[id].type].name:(d.model||switchSpecs[d.type]?.label||titles[d.type]),d.type==='240'?12:13,'#e0e9e9','start',600)+body(d,x,y,val,d.type==='pilot'&&live&&result.read(id+'.2',id+'.N')>1);
 if(['lamp','outlet','240'].includes(d.type)){base+=txt(x+78,y+154,live?(val===null?'Flotante':Math.round(val*10)/10+' V'):'— V',15,live&&val>0?'#d5f58e':'#b9c7d0','start',700)+txt(x+12,y+178,d.type==='lamp'?lamps[id].watts+' W · 120 V':d.model?outletSpecs[d.model].rating:'',11,'#96adbd')}
 if(outletSpecs[d.model]?.gfci){
  controls+='<g class="switchOp" role="button" tabindex="0" data-switch="gfci-'+id+'" aria-label="GFCI '+id+' '+(d.trip?'RESET':'TEST')+'">'+rect(x+16,y+137,58,24,'#354e58','#829987')+txt(x+45,y+153,d.trip?'RESET':'TEST',12,'white','middle')+'</g>';
 }
 if(switchSpecs[d.type]){
  const spec=switchSpecs[d.type],count=spec.keys||1;
  for(let n=1;n<=count;n++){
   const key=spec.keys?id+':'+n:id,on=!!switches[key];
   const state=spec.keys?n+(on?' ON':' OFF'):d.type==='four'?(on?'Cruzado':'Directo'):(switchSpecs[d.type].base||d.type)==='three'?(on?'C–V2':'C–V1'):(on?'Cerrado':'Abierto');
   const left=spec.keys?x+9+(n-1)*47:x+65,top=y+146,width=spec.keys?45:83;
   controls+='<g class="switchOp" role="button" tabindex="0" aria-pressed="'+on+'" data-switch="'+key+'" aria-label="Accionar interruptor '+id+(spec.keys?' tecla '+n:'')+'">'+rect(left,top,width,26,'#344e58','#738e86',4)+txt(left+width/2,top+17,state,12,'#d8f0cf','middle',700)+'</g>';
  }
  if(d.type==='pilot'){
   const lit=live&&(result.read(id+'.2',id+'.N')??0)>1;
   base+=txt(x+85,y+189,lit?'Piloto encendido':'Piloto apagado',10,lit?'#ffff89':'#b6c8cf','middle');
  }
  $('type-'+id).value=d.type;$('switch-box-'+id).disabled=live;
 }
 d.pins.forEach(p=>pins+=screw(d,p,x,y))
 }));
 for(const s of slots)pins+=spliceFace(s);
 for(const [id,box] of boxes)pins+=boxGround(id,box.x+184,box.y+183);
 $('spliceStyle').value=spliceStyles[$('spliceTarget').value]||'cap';$('spliceStyle').disabled=live;
 let paths=wires.map(([a,b,color],j)=>{let col=wireColors[color]?.[1]||([a,b].some(t=>t.endsWith('.T'))?'#a5d67f':[a,b].some(t=>t.endsWith('.N'))?'#d2dae0':palette[j%palette.length]);
 let path=conductorRoute(a,b,j).map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');
 return '<path d="'+path+'" fill="none" stroke="'+(color==='negro'?'#acb8bf':'#16232c')+'" stroke-width="4"/><path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"><title>'+name(a)+' ↔ '+name(b)+'</title></path>'}).join('');
 svg.innerHTML=base+paths+controls+pins;
 $('power').textContent=live?'Desenergizar':'Energizar tablero';$('powerState').textContent=live?'ACTIVA':'APAGADA';$('powerState').style.background=live?'#c8ef9d':'#edf0eb';
 $('wire').className=mode==='wire'?'selected':'';$('meter').className=mode==='meter'?'selected':'';
 $('first').value=pick||'';$('connect').textContent=mode==='wire'?'Instalar conductor':'Medir tensión/voltaje';$('connect').disabled=mode==='wire'&&live;
 $('selection').textContent=pick?'Seleccionado: '+name(pick):mode==='wire'?'Toca dos bornes. El cable seguirá los conductos entre cajas.':'Selecciona los dos puntos de medición.';
 $('counter').textContent=wires.length+' conductores';$('undo').disabled=live||!wires.length;
 $('feedback').textContent=feedback;
 $('meterValue').textContent='';if(meterPair){let [a,b]=meterPair,v=result.read(a,b);
 $('meterValue').textContent=(live?(v===null?'Sin referencia':Math.round(v*10)/10+' V'):'0 V · apagado')+' ('+meterPair.join(' ↔ ')+')'}
 $('wireColor').disabled=live||mode!=='wire';
 $('entries').innerHTML=wires.length?wires.map(([a,b,color],j)=>'<div>'+name(a)+' ↔ '+name(b)+' <select data-color="'+j+'" aria-label="Color del conductor '+(j+1)+'" '+(live?'disabled':'')+'>'+colorOptions(color||'auto')+'</select> <button data-remove="'+j+'" '+(live?'disabled':'')+'>Quitar</button></div>').join(''):'Ningún conductor instalado.';
 save()
}
function pair(a,b){if(!a||!b){feedback='Selecciona origen y destino.'}else if(a===b){feedback='Selecciona dos terminales diferentes.'}else if(mode==='meter'){meterPair=[a,b];feedback='Lectura entre '+name(a)+' y '+name(b)+'.'}else if(live){feedback='Desenergiza antes de editar.'}else{wires.push([a,b,selectedColor]);fault='';feedback='Conductor instalado entre '+name(a)+' y '+name(b)+'.'}pick=null;$('second').value='';render()}
function terminal(k){if(mode==='wire'&&live){feedback='Para medir, elige Medir. Para modificar, desenergiza.';render();return}if(pick===null){pick=k;feedback='Ahora selecciona el otro extremo.';render()}else pair(pick,k)}
function activate(e){
let pin=e.target.closest('[data-pin]'),sw=e.target.closest('[data-switch]');if(pin){const k=pin.dataset.pin;if(slotById.has(k)){$('spliceTarget').value=k;$('spliceTarget').onchange()}terminal(k)}if(sw){let id=sw.dataset.switch;if(id.startsWith('gfci-')){
 const d=deviceList.find(dev=>dev.id===id.slice(5)),r=solve(wires,switches,junctions,lamps),line=r.read(d.id+'.H',d.id+'.N');
 if(live&&line>=100&&line<=125){d.trip=!d.trip;feedback=d.id+(d.trip?' · TEST abrió la salida.':' · RESET restableció la salida.')}
 else feedback=d.id+' · Para probar el GFCI se requiere alimentación en LINE.';
 render();return}switches[id]=!switches[id];feedback='Interruptor '+id+' accionado.';render()}}
$('diagram').onclick=activate;$('diagram').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){let target=e.target.closest('[data-pin],[data-switch],[data-slot]');if(target){e.preventDefault();let k=target.dataset.pin||target.dataset.switch;activate(e);$('diagram').querySelector('[data-pin="'+k+'"],[data-switch="'+k+'"]')?.focus()}}};
$('first').onchange=()=>{pick=$('first').value||null;render()};$('connect').onclick=()=>pair($('first').value,$('second').value);
for(let m of ['wire','meter'])$(m).onclick=()=>{mode=m;pick=null;meterPair=null;$('second').value='';render()};
$('power').onclick=()=>{live=!live;reportActive=live;pick=null;fault='';feedback=live?'Tablero energizado. Acciona un interruptor o mide entre dos terminales.':'Tablero desenergizado. Puedes editar los conductores.';render()};
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
const lessons={four:['Control desde tres puntos','Dos interruptores de tres vías y uno de cuatro vías controlan la luminaria 1.'],blank:['Cableado libre','Comienza con el panel sin conductores.'],parallel:['Luminarias en paralelo','Dos lámparas de 120 V controladas por A.'],series:['Luminarias en serie','Compara la caída de tensión/voltaje en dos lámparas.'],three:['Control desde dos puntos','Los interruptores B y C controlan la luminaria 3.'],outlets:['Receptáculos de 120 y 240 V','Dos ramales de 120 V y un receptáculo bipolar de 240 V.']};
function applyExample(k){reportActive=false;if(k!=='blank')for(const d of deviceList){d.empty=false;if(d.model)configureOutlet(d,defaultOutlets[d.id])}if(k!=='blank')for(const [id,type] of Object.entries(defaultSwitchTypes))setSwitchType(id,k==='four'&&id==='A'?'four':type);const allocated=new Set();refreshOptions();wires=modelExamples[k].map(w=>[...w]);// Branches in the prepared exercises use splice points and one lead to each device contact.
 const counts=new Map();
 for(const wire of wires)for(const end of wire.slice(0,2))if(!end.startsWith('P.'))counts.set(end,(counts.get(end)||0)+1);
 for(const [end,count] of counts)if(count>1){
  const joint=(slots.find(s=>s.owner===ownerOf(end)&&!allocated.has(s.id))||slots.find(s=>!allocated.has(s.id))).id;allocated.add(joint);
  wires=wires.map(([a,b])=>[a===end?joint:a,b===end?joint:b]);wires.push([joint,end]);
 }
 refreshOptions();switches={A:true,B:false,C:false,D:false};live=false;mode='wire';pick=meterPair=null;example=k;$('second').value='';feedback=k==='blank'?'Selecciona dos terminales para instalar un conductor.':'Configuración cargada. Energiza el tablero para probarla.';$('modal').close();render()}
function confirmLoad(k){if(!wires.length){applyExample(k);return}modal('¿Reemplazar el cableado?','<p>La configuración seleccionada sustituirá el cableado y los empalmes. Los ejemplos con cableado también ocuparán las posiciones y cargarán sus tipos de interruptor y receptáculo.</p><button class="option" id="confirm">Cargar '+lessons[k][0]+'</button>');$('confirm').onclick=()=>applyExample(k)}
$('examples').onclick=()=>{modal('Configuraciones',Object.entries(lessons).map(([k,[t,d]])=>'<button class="option" data-example="'+k+'">'+t+'<p>'+d+'</p></button>').join(''));document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>confirmLoad(b.dataset.example))};
$('clear').onclick=()=>confirmLoad('blank');
$('help').onclick=()=>modal('Cómo usar el taller','<p><b>Cablear.</b> Con el tablero apagado, toca dos círculos. También puedes elegir origen y destino en las listas. Puedes conectar varios conductores al mismo borne en el simulador. Las derivaciones también se pueden representar con un empalme junto a la caja. En el receptáculo dúplex, H y H₂ comparten la lengüeta de fase; N y N₂ comparten la de neutro. Elige el color antes de conectar o cámbialo en Conductores instalados. Elige un empalme de la caja y cambia su conector entre capuchón y palanca. El tornillo verde de la caja admite un conductor independiente de la tierra del dispositivo. Los cables conectados al mismo empalme comparten continuidad eléctrica.</p><p><b>Probar.</b> Energiza, acciona A, B, C o D y observa las lecturas. Usa Medir para comparar dos puntos. Una isla sin referencia aparece como flotante.</p><p><b>Alimentación.</b> Modelo monofásico dividido de 120/240 V. C1 y C3 corresponden a L1, C2 y C4 a L2. C3 y C4 representan un ramal bipolar. N es neutro y T es tierra de equipos.</p><p><b>Modelo.</b> Cada luminaria usa una resistencia equivalente según los vatios seleccionados a 120 V. El ejercicio en serie permite estudiar la división de voltaje. Los receptáculos se miden sin carga. La protección simulada detecta conexiones incompatibles. El taller omite dimensionamiento, corriente de disparo y verificación normativa.</p>');
refreshOptions();
render();
