const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const main = read('programa-1.js')+read('pasos-calculo.js')+read('aprendizaje.js')+read('motor-estudio.js');
const gallery = read('programa-2.js');
new vm.Script(main);
new vm.Script(gallery);
const bank = JSON.parse(vm.runInNewContext(read('programa-1.js') + ';JSON.stringify(BANK)'));
const photos = JSON.parse(vm.runInNewContext(gallery.split(';(()=>')[0] + ';JSON.stringify(PHOTOS)'));
assert.equal(photos.length, 515);
assert.equal(new Set(photos.map(p=>p.file)).size, photos.length, 'Fotografía duplicada en la galería');
assert.equal(bank.length, 320);
assert.equal(new Set(bank.map(q => q.id)).size, bank.length);
const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
assert.equal(new Set(bank.map(q => normalize(q.q))).size, bank.length);
const leakAudit=JSON.parse(read('auditoria_preguntas.json'));
assert.equal(leakAudit.removedAnswerLeaks.length,17);
for(const removed of leakAudit.removedAnswerLeaks) assert.ok(!bank.some(q=>q.id===removed.id));
for(const q of bank) {
 assert.ok(!q.q.includes('identificación incluida en los repasos?'));
 const key=normalize(q.options[q.answer]), stem=normalize(q.q);
 if(key.length>=4) assert.ok(!(' '+stem+' ').includes(' '+key+' '),'La clave aparece en el enunciado: '+q.id);
}
for (const q of bank) {
  assert.ok(q.q && q.topic && q.source);
  assert.equal(q.options.length, 4);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  if(q.diagram) {
   const svg=read(q.diagram);
   if(svg.includes('paralelo')) assert.ok(!svg.includes('M560 70H620V170H560'),'Puente que cortocircuita el paralelo: '+q.id);
   assert.ok(!normalize(svg.replace(/<[^>]+>/g,' ')).includes(normalize(q.options[q.answer])),'Solución escrita en el diagrama: '+q.id);
  }
}
const refs = new Set([...photos.map(p => p.file), ...bank.flatMap(q => [q.visual, q.diagram, ...(q.original_images || [])]).filter(Boolean)]);
for (const file of refs) {
  const resolved = path.resolve(root, file);
  assert.ok(resolved.startsWith(root + path.sep), file);
  assert.ok(fs.statSync(resolved).size > 0, file);
}
const start = main.indexOf('function balancedQuestions(');
const end = main.indexOf('\nfunction show(', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({ BANK: bank, shuffle: a => [...a].sort(() => Math.random() - .5) });
vm.runInContext(main.slice(start, end), context);
for (let i = 0; i < 100; i++) {
  const selected = vm.runInContext('balancedQuestions()', context);
  assert.equal(selected.length, 50);
  assert.ok(selected.filter(q=>['Ley de Ohm','Potencia'].includes(q.topic)).length<=10,'Más del 20% de Ohm y Potencia en un examen');
  assert.equal(new Set(selected.map(q => q.id)).size, 50);
  assert.ok(new Set(selected.map(q => q.similarityFamily)).size>=40,'Poca diversidad de familias');
}
assert.ok(!main.includes(String.raw`EXAMEN_\\d`), 'Expresión de referencias incorrecta');
for (const file of ['programa-1.js', 'estilos-1.css', 'estilos-2.css']) assert.ok(read('index.html').includes(file));
assert.ok(read('index.html').includes('originales.html'));
const crypto = require('node:crypto');
const originals = JSON.parse(read('originales/datos.json'));
assert.equal(originals.documents.length, 40);
assert.equal(originals.documents.reduce((n,d)=>n+d.pages.length,0),254);
const sourceHashes = new Set();
for (const doc of originals.documents) {
 const source = fs.readFileSync(path.join(root,doc.sourceDownload));
 const pdf = fs.readFileSync(path.join(root,doc.file));
 const hash = content => crypto.createHash('sha256').update(content).digest('hex');
 assert.equal(hash(source), doc.sourceSha256);
 assert.equal(hash(pdf), doc.pdfSha256);
 assert.equal(pdf.subarray(0,5).toString(), '%PDF-');
 assert.ok(!sourceHashes.has(doc.sourceSha256),'Fuente duplicada: '+doc.id);
 sourceHashes.add(doc.sourceSha256);
 assert.equal(doc.pages.map(p=>p.number).join(','),Array.from({length:doc.pages.length},(_,i)=>i+1).join(','));
}
assert.equal(originals.sourceFiles.length,60);
for (const original of originals.sourceFiles) assert.ok(sourceHashes.has(original.sha256), original.name);
for (const q of bank.filter(q=>q.originalEvidence)) {
 const evidence = q.originalEvidence;
 const doc = originals.documents.find(d=>d.id===evidence.document);
 assert.ok(doc && doc.pages.some(p=>p.number===evidence.page));
}
const imageAudit=JSON.parse(read('auditoria_imagenes_preguntas.json'));
assert.equal(imageAudit.sourceLocatedAdaptations,24);
assert.equal(bank.filter(q=>q.originalEvidence).length,26);
assert.equal(imageAudit.diagramQuestions.length,bank.filter(q=>q.diagram).length);
for(const checked of imageAudit.diagramQuestions) {
 const q=bank.find(q=>q.id===checked.id);
 assert.equal(q.diagram,checked.file);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,checked.file))).digest('hex'),checked.sha256);
}
console.log('OK: 60 archivos fuente representados por sus 40 contenidos únicos, integridad SHA-256 y 254 páginas originales completas.');
console.log(`OK: ${bank.length} preguntas; ${photos.length} entradas de galería; ${refs.size} archivos de imagen; 100 exámenes equilibrados de 50 preguntas.`);
const practice=JSON.parse(read('practica-originales/datos.json'));
const practiceAudit=JSON.parse(read('practica-originales/auditoria.json'));
new vm.Script(read('practica.js'));
assert.equal(practice.documents.length,40);
assert.equal(practice.totals.sourcePages,254);
assert.equal(practice.totals.practicePages,221);
assert.equal(practice.totals.excludedPages,33);
assert.equal(practice.status,'visual_review_complete_with_source_limitations');
let accounted=0;
for(const d of practice.documents){
 const src=originals.documents.find(x=>x.id===d.id);
 const audited=practiceAudit.documents.find(x=>x.document===d.id);
 assert.ok(src && audited);
 assert.equal(d.sourceFile,src.file);assert.equal(d.sourceDownload,src.sourceDownload);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,d.practiceFile))).digest('hex'),d.practiceSha256);
 assert.equal(d.practiceSha256,audited.practiceSha256);
 assert.deepEqual(d.pages.map(p=>p.pdfPage),Array.from({length:d.pages.length},(_,i)=>i+1));
 assert.equal(new Set(d.pages.map(p=>p.sourcePage)).size,d.pages.length);
 assert.deepEqual(audited.sourcePageDisposition.map(p=>p.sourcePage),src.pages.map(p=>p.number));
 accounted+=audited.sourcePageDisposition.length;
 for(const p of audited.sourcePageDisposition){
  assert.ok(['practice','answered_duplicate','reference_appendix'].includes(p.disposition));
  assert.equal(p.disposition==='practice',d.pages.some(x=>x.sourcePage===p.sourcePage));
 }
 for(const p of d.pages){assert.ok(p.text.trim());assert.ok(Array.isArray(p.warnings));}
 for(const q of audited.questions.filter(q=>q.limitations.length)){
  assert.ok(d.pages.find(p=>p.sourcePage===q.sourcePage).warnings.length,'Falta aviso de fuente incompleta');
 }
}
assert.equal(accounted,254);
assert.ok(read('index.html').includes('practica.html'));
assert.ok(read('originales.html').includes('practica.html'));
assert.ok(!/id="visor-solucion"[^>]*\bsrc=/.test(read('practica.html')),'Solución cargada antes de solicitarla');
console.log('OK: 40 hojas PDF, 221 páginas de práctica y disposición de las 254 páginas fuente; avisos de las limitaciones presentes.');

const distribution=JSON.parse(read('auditoria_distribucion.json'));
assert.equal(distribution.total,220); // Audit of the published baseline, preserved as history.
assert.equal(distribution.removedAdditionalIds.length,763);
assert.ok(bank.filter(q=>distribution.limitedTopics.includes(q.topic)).length/bank.length<=0.20);
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const baseline=JSON.parse(read('auditoria_base_220.json'));
assert.equal(baseline.length,220);
for(const original of baseline){
 const current=bank.find(q=>q.id===original.id);assert.ok(current,'Pregunta previa eliminada: '+original.id);
 for(const field of ['q','options','answer','diagram','originalEvidence','original_images'])assert.deepEqual(current[field],original[field],'Contenido original alterado: '+original.id+' '+field);
}
for(const q of bank){assert.ok(q.explanation && q.explanation.length>20,'Falta explicación: '+q.id);assert.ok(q.references && q.references.length,'Falta referencia: '+q.id);if(q.optionExplanations)assert.equal(q.optionExplanations.length,4)}
assert.equal(bank.filter(q=>String(q.id).startsWith('ampliacion-')).length,72);
assert.equal(bank.filter(q=>String(q.id).startsWith('mejora-')).length,16);
const expandedContext=vm.createContext({BANK:bank,shuffle:a=>[...a].sort(()=>Math.random()-.5)});
vm.runInContext(main.slice(start,end),expandedContext);
for(let i=0;i<1000;i++){
 const selected=vm.runInContext('balancedQuestions()',expandedContext);
 for(const [group,n] of [['calculos',10],['circuitos',8],['aplicaciones',32]])assert.equal(selected.filter(q=>q.examGroup===group).length,n);
 assert.equal(new Set(selected.map(q=>q.id)).size,50);
}
assert.deepEqual(JSON.parse(read('banco-ampliado.json')),bank);
for(const f of ['repaso.html','index.html'])assert.ok(read(f).includes('320'));
assert.ok(read('index.html').includes('repaso.html'));
assert.ok(read('repaso.html').includes('NEC 2020'));
console.log('OK: 320 preguntas, 100 nuevas, 220 previas conservadas; explicaciones y fuentes completas; 1,000 exámenes con cuotas 10/8/32.');

assert.ok(read('index.html').includes('motor-estudio.js'));
for(const q of bank){assert.ok(['basica','aplicacion','analisis'].includes(q.difficulty));assert.ok(q.similarityFamily);}
for(const photo of JSON.parse(read('auditoria_mejoras_estudio.json')).fotografiasNuevas)assert.ok(fs.statSync(path.join(root,'imagenes/materiales',photo.archivo)).size>0);
