// Signed RMS potentials represent the opposite legs of the ideal split-phase supply.
const deviceList=[
 ...['1','2','3','4'].map(id=>({id,type:'lamp',pins:['H','N','T']})),
 ...['A','D'].map(id=>({id,type:'single',pins:['1','2','T']})),
 ...['B','C'].map(id=>({id,type:'three',pins:['C','V1','V2','T']})),
 ...['W','X','Z'].map(id=>({id,type:'outlet',pins:['H','N','T']})),
 {id:'Y',type:'240',pins:['X','Y','T']}
];
const sources={'P.1':120,'P.2':-120,'P.3':120,'P.4':-120,'P.N':0};
const terminals=[...Object.keys(sources),'P.T',...deviceList.flatMap(d=>d.pins.map(p=>d.id+'.'+p))];
function solve(wires,switches,junctions=[],lamps={}){
 const parent=new Map(terminals.concat(junctions).map(k=>[k,k]));
 function root(k){while(parent.get(k)!==k){parent.set(k,parent.get(parent.get(k)));k=parent.get(k)}return k}
 function join(a,b){parent.set(root(a),root(b))}
 for(const [a,b] of wires)join(a,b);
 for(const id of ['A','D'])if(switches[id])join(id+'.1',id+'.2');
 for(const id of ['B','C'])join(id+'.C',id+(switches[id]?'.V2':'.V1'));
 const byRoot=new Map(),fixed=new Map(),faults=[],warnings=[];
 for(const [p,v] of Object.entries(sources)){
 const r=root(p);if(byRoot.has(r)){faults.push(fixed.get(r)===v?'Alimentadores de circuitos distintos unidos.':'Cortocircuito entre conductores de alimentación.')}byRoot.set(r,p);fixed.set(r,v)}
 const earth=root('P.T');
 if(fixed.has(earth))faults.push(fixed.get(earth)===0?'Unión de neutro y tierra en el tablero de práctica.':'Contacto de línea con tierra de equipos.');
 const loads=deviceList.filter(d=>d.type==='lamp').map(d=>[root(d.id+'.H'),root(d.id+'.N'),(lamps[d.id]?.watts??60)/14400]);
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
 for(const d of deviceList){const [a,b]=d.pins;const v=read(d.id+'.'+a,d.id+'.'+b);readings[d.id]=v;
 const t=root(d.id+'.T');if(fixed.has(t)&&fixed.get(t)!==0)faults.push('Línea conectada al borne de tierra de '+d.id+'.');
 if(t===root('P.N')&&t!==earth)faults.push('Neutro conectado al borne de tierra de '+d.id+'.');
 if(['outlet','240','lamp'].includes(d.type)){
 let active=d.pins.slice(0,2).map(p=>root(d.id+'.'+p));
 if(active.includes(earth))faults.push('Tierra usada como conductor de circuito en '+d.id+'.');
 if(v!==null&&v>1){if(t!==earth)warnings.push(d.id+' sin tierra de equipos.');if(d.type!=='240'&&v>121)warnings.push(d.id+' supera su valor nominal de 120 V.');if(d.type==='outlet'&&fixed.get(active[1])!==0)warnings.push('Revisa la polaridad de '+d.id+'.');if(d.type==='240'&&Math.abs(v-240)>1)warnings.push(d.id+' requiere 240 V.');}
 }}
 return {readings,read,faults:[...new Set(faults)],warnings};
}
const modelExamples={
 blank:[],
 parallel:[['P.1','A.1'],['A.2','1.H'],['1.H','2.H'],['P.N','1.N'],['1.N','2.N']],
 series:[['P.1','A.1'],['A.2','1.H'],['1.N','2.H'],['2.N','P.N']],
 three:[['P.1','B.C'],['B.V1','C.V1'],['B.V2','C.V2'],['C.C','3.H'],['3.N','P.N']],
 outlets:[['P.1','W.H'],['P.N','W.N'],['P.2','X.H'],['P.N','X.N'],['P.3','Y.X'],['P.4','Y.Y']]
};
for(const [name,devices] of Object.entries({parallel:['A','1','2'],series:['A','1','2'],three:['B','C','3'],outlets:['W','X','Y']}))for(const id of devices)modelExamples[name].push(['P.T',id+'.T']);
