const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../programa-1.js'),'utf8');
function element(){return {children:[],style:{},classList:{toggle(){},add(){}},append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=nodes},textContent:'',innerHTML:'',value:''}}
const elements=new Map();const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,createTextNode:text=>({textContent:text})};
const storage=new Map();const ctx=vm.createContext({document,window:{scrollTo(){},print(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{search:''},URLSearchParams,confirm:()=>true});
vm.runInContext(source,ctx);
for(let pass=0;pass<20;pass++){
 vm.runInContext('start()',ctx);
 const data=JSON.parse(vm.runInContext('JSON.stringify(exam)',ctx));
 const baseline=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../banco-ampliado.json'),'utf8'));
 for(const q of data){const original=baseline.find(x=>x.id===q.id);assert.equal(q.options[q.answer],original.options[original.answer]);if(q.optionExplanations)for(let i=0;i<4;i++)assert.equal(q.optionExplanations[i],original.optionExplanations[original.options.indexOf(q.options[i])]);}
 vm.runInContext('answers=exam.map(q=>q.answer);finish()',ctx);
 assert.equal(elements.get('score').textContent,'100%');assert.equal(elements.get('correct').textContent,'50/50');assert.equal(elements.get('review').children.length,50);
 vm.runInContext('answers=exam.map(q=>(q.answer+1)%4);finish()',ctx);
 assert.equal(elements.get('score').textContent,'0%');
}
assert.equal(JSON.parse(storage.get('electricidadScores')).length,15);
console.log('OK: claves y razones conservadas al mezclar opciones; calificación 100% y 0%; revisión de 50 e historial limitado.');
