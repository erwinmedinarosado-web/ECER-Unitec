// Signed RMS potentials represent the opposite legs of the ideal split-phase supply.
const switchSpecs={
 single:{label:'Sencillo',pins:['1','2','T']},
 three:{label:'3 vías',pins:['C','V1','V2','T']},
 four:{label:'4 vías',pins:['A1','A2','B1','B2','T']},
 dual:{label:'Doble',pins:['L','S1','S2','T'],keys:2},
 triple:{label:'Triple',pins:['L','S1','S2','S3','T'],keys:3},
 pilot:{label:'Con luz piloto',pins:['1','2','N','T']},
 bipolar:{label:'Bipolar',pins:['L1','L2','S1','S2','T']}
};
const outletSpecs={
 '5-15R':{rating:'15 A · 125 V',pins:['H','N','H2','N2','T']},
 '5-20R':{rating:'20 A · 125 V',pins:['H','N','H2','N2','T']},
 '6-15R':{rating:'15 A · 250 V',pins:['X','Y','T']},
 '6-20R':{rating:'20 A · 250 V',pins:['X','Y','T']},
 '14-30R':{rating:'30 A · 125/250 V',pins:['X','Y','N','T']},
 '14-50R':{rating:'50 A · 125/250 V',pins:['X','Y','N','T']}
};
const defaultOutlets={W:'5-15R',X:'5-15R',Y:'6-15R',Z:'5-15R'};
function configureOutlet(d,model){
 d.model=model;d.pins=outletSpecs[model].pins;d.type=d.pins[0]==='H'?'outlet':'240';
}
const defaultSwitchTypes={A:'single',B:'three',C:'three',D:'single'};
const deviceList=[
 ...['1','2','3','4'].map(id=>({id,type:'lamp',pins:['H','N','T']})),
 ...Object.entries(defaultSwitchTypes).map(([id,type])=>({id,type,pins:switchSpecs[type].pins})),
 ...Object.entries(defaultOutlets).map(([id,model])=>{const d={id};configureOutlet(d,model);return d})
];
const sources={'P.1':120,'P.2':-120,'P.3':120,'P.4':-120,'P.N':0};
function terminals(){return [...Object.keys(sources),'P.T',...deviceList.filter(d=>!d.empty).flatMap(d=>d.pins.map(p=>d.id+'.'+p))]}
function solve(wires,switches,junctions=[],lamps={}){
 const parent=new Map(terminals().concat(junctions).map(k=>[k,k]));
 function root(k){while(parent.get(k)!==k){parent.set(k,parent.get(parent.get(k)));k=parent.get(k)}return k}
 function join(a,b){parent.set(root(a),root(b))}
 for(const d of deviceList.filter(d=>!d.empty&&d.pins.includes('H2'))){
  join(d.id+'.H',d.id+'.H2');join(d.id+'.N',d.id+'.N2');
 }
 for(const [a,b] of wires)join(a,b);
 for(const d of deviceList.filter(d=>!d.empty&&switchSpecs[d.type])){
  const id=d.id,active=switches[id];
  const contact=(a,b)=>join(id+'.'+a,id+'.'+b);
  switch(d.type){
   case 'single':case 'pilot':if(active)contact('1','2');break;
   case 'three':contact('C',active?'V2':'V1');break;
   case 'four':contact('A1',active?'B2':'B1');contact('A2',active?'B1':'B2');break;
   case 'bipolar':if(active){contact('L1','S1');contact('L2','S2')}break;
   default:for(let n=1;n<=switchSpecs[d.type].keys;n++)if(switches[id+':'+n])contact('L','S'+n);
  }
 }
 const byRoot=new Map(),fixed=new Map(),faults=[],warnings=[];
 for(const [p,v] of Object.entries(sources)){
 const r=root(p);if(byRoot.has(r)){faults.push(fixed.get(r)===v?'Alimentadores de circuitos distintos unidos.':'Cortocircuito entre conductores de alimentación.')}byRoot.set(r,p);fixed.set(r,v)}
 const earth=root('P.T');
 if(fixed.has(earth))faults.push(fixed.get(earth)===0?'Unión de neutro y tierra en el tablero de práctica.':'Contacto de línea con tierra de equipos.');
 const loads=deviceList.filter(d=>!d.empty&&d.type==='lamp').map(d=>[root(d.id+'.H'),root(d.id+'.N'),(lamps[d.id]?.watts??60)/14400]);
 const adj=new Map();function neighbor(a,b,g){if(!adj.has(a))adj.set(a,[]);adj.get(a).push([b,g])}
 for(const [a,b,g] of loads){if(a!==b){neighbor(a,b,g);neighbor(b,a,g)}}
 if(adj.has(earth))faults.push('Un terminal activo de luminaria está conectado al conductor de tierra.');
 // Equivalent conductance at rated voltage is P / (120 V)². Floating islands have no reference.
 let reached=new Set(fixed.keys()),queue=[...reached];for(const a of queue)for(const [b] of adj.get(a)||[])if(!reached.has(b)){reached.add(b);queue.push(b)}
 let unknown=[...reached].filter(r=>!fixed.has(r)),n=unknown.length;
 let matrix=unknown.map((r,i)=>{let row=Array(n+1).fill(0);for(const [t,g] of adj.get(r)||[]){row[i]+=g;if(fixed.has(t))row[n]+=g*fixed.get(t);else row[unknown.indexOf(t)]-=g}return row});
 for(let i=0;i<n;i++){let f=matrix[i][i];for(let k=i;k<=n;k++)matrix[i][k]/=f;for(let j=0;j<n;j++)if(j!==i){let m=matrix[j][i];for(let k=i;k<=n;k++)matrix[j][k]-=m*matrix[i][k]}}
 const volts=new Map(fixed);unknown.forEach((r,i)=>volts.set(r,matrix[i][n]));
 function read(a,b){a=root(a);b=root(b);if(a===b)return 0;const first=a===earth?0:volts.get(a),second=b===earth?0:volts.get(b);if(first===undefined||second===undefined)return null;return Math.abs(first-second)}
 const readings={};
 for(const d of deviceList){if(d.empty){readings[d.id]=null;continue}const [a,b]=d.pins;const v=read(d.id+'.'+a,d.id+'.'+b);readings[d.id]=v;
 const t=root(d.id+'.T');if(fixed.has(t)&&fixed.get(t)!==0)faults.push('Línea conectada al borne de tierra de '+d.id+'.');
 if(t===root('P.N')&&t!==earth)faults.push('Neutro conectado al borne de tierra de '+d.id+'.');
 if(d.model&&d.pins.length===4&&v!==null&&v>1&&root(d.id+'.N')!==root('P.N'))warnings.push('Revisa el neutro de '+d.id+'.');
 if(['outlet','240','lamp'].includes(d.type)){
 let active=d.pins.slice(0,2).map(p=>root(d.id+'.'+p));
 if(active.includes(earth))faults.push('Tierra usada como conductor de circuito en '+d.id+'.');
 if(v!==null&&v>1){if(t!==earth)warnings.push(d.id+' sin tierra de equipos.');if(d.type!=='240'&&v>121)warnings.push(d.id+' supera su valor nominal de 120 V.');if(d.type==='outlet'&&fixed.get(active[1])!==0)warnings.push('Revisa la polaridad de '+d.id+'.');if(d.type==='240'&&Math.abs(v-240)>1)warnings.push(d.id+' requiere 240 V.');}
 }}
 return {readings,read,faults:[...new Set(faults)],warnings};
}
const modelExamples={
 blank:[],
 four:[['P.1','B.C'],['B.V1','A.A1'],['B.V2','A.A2'],['A.B1','C.V1'],['A.B2','C.V2'],['C.C','1.H'],['P.N','1.N']],
 parallel:[['P.1','A.1'],['A.2','1.H'],['1.H','2.H'],['P.N','1.N'],['1.N','2.N']],
 series:[['P.1','A.1'],['A.2','1.H'],['1.N','2.H'],['2.N','P.N']],
 three:[['P.1','B.C'],['B.V1','C.V1'],['B.V2','C.V2'],['C.C','3.H'],['3.N','P.N']],
 outlets:[['P.1','W.H'],['P.N','W.N'],['P.2','X.H'],['P.N','X.N'],['P.3','Y.X'],['P.4','Y.Y']]
};
for(const [name,devices] of Object.entries({four:['A','B','C','1'],parallel:['A','1','2'],series:['A','1','2'],three:['B','C','3'],outlets:['W','X','Y']}))for(const id of devices)modelExamples[name].push(['P.T',id+'.T']);
