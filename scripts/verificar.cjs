const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const main = read('programa-1.js');
const gallery = read('programa-2.js');
new vm.Script(main);
new vm.Script(gallery);
const bank = JSON.parse(vm.runInNewContext(main.slice(0, main.indexOf(';let exam=')) + ';JSON.stringify(BANK)'));
const photos = JSON.parse(vm.runInNewContext(gallery.split(';(()=>')[0] + ';JSON.stringify(PHOTOS)'));
assert.equal(bank.length, 1000);
assert.equal(new Set(bank.map(q => q.id)).size, 1000);
assert.equal(new Set(bank.map(q => q.q)).size, 1000);
for (const q of bank) {
  assert.ok(q.q && q.topic && q.source);
  assert.equal(q.options.length, 4);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
}
const refs = new Set([...photos.map(p => p.file), ...bank.flatMap(q => [q.diagram, ...(q.original_images || [])]).filter(Boolean)]);
for (const file of refs) {
  const resolved = path.resolve(root, file);
  assert.ok(resolved.startsWith(root + path.sep), file);
  assert.ok(fs.statSync(resolved).size > 0, file);
}
const start = main.indexOf('function balancedQuestions()');
const end = main.indexOf('\nfunction start()', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({ BANK: bank, shuffle: a => [...a].sort(() => Math.random() - .5) });
vm.runInContext(main.slice(start, end), context);
for (let i = 0; i < 100; i++) {
  const selected = vm.runInContext('balancedQuestions()', context);
  assert.equal(selected.length, 50);
  assert.equal(new Set(selected.map(q => q.id)).size, 50);
  assert.equal(new Set(selected.map(q => q.topic)).size, new Set(bank.map(q => q.topic)).size);
}
assert.ok(!main.includes(String.raw`EXAMEN_\\d`), 'Expresión de referencias incorrecta');
for (const file of ['programa-1.js', 'programa-2.js', 'estilos-1.css', 'estilos-2.css']) assert.ok(read('index.html').includes(file));
console.log(`OK: ${bank.length} preguntas; ${photos.length} entradas de galería; ${refs.size} archivos de imagen; 100 exámenes equilibrados de 50 preguntas.`);
