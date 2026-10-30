const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const bank=JSON.parse(read('banco-ampliado.json')),motor=read('motor-estudio.js');
const store=new Map();let failAt=-1,writes=0;
const storage={get length(){return store.size},key:i=>[...store.keys()][i],getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k),setItem(k,v){if(++writes===failAt)throw Error('Quota');store.set(k,v)}};
const ctx=vm.createContext({localStorage:storage,TextEncoder,Date,Intl,console});
vm.runInContext("const BANK_REVISION='2026-10-29-auditoria320';const BANK="+JSON.stringify(bank)+';'+read('aprendizaje.js')+motor.slice(motor.indexOf('function orderedQuestion('),motor.indexOf('function saveAttempt('))+motor.slice(motor.indexOf('function restoreRecord('),motor.indexOf('function resume('))+read('calendario-examenes.js')+read('mejoras-estudio.js'),ctx);
const run=s=>vm.runInContext(s,ctx);const json=s=>JSON.parse(run('JSON.stringify('+s+')'));
const profile={version:3,history:[{id:'sample',kind:'topic',date:'29/10/2026',pct:50,good:1,total:2}],topics:{[bank[0].topic]:{total:2,good:1,seen:[String(bank[0].id)]}},mistakes:[String(bank[0].id)],srs:{[bank[0].id]:{stage:0,due:1793280000000,lastAt:null}}};
store.set('electricidadStudyV3',JSON.stringify(profile));store.set('electricidadReadingV1',JSON.stringify({theme:'dark',text:'large'}));store.set('ecer-original-Examen_1-2','Notas con ñ, fórmulas y <texto>.');store.set('otro-sitio','no tocar');
const before=json('backupSnapshot()');assert.equal(Object.keys(before.data).length,3);assert.equal(run('validateBackup(backupSnapshot()).app'),'academia-electrica');
run('const saved=backupSnapshot()');store.set('electricidadStudyV3','cambiado');store.set('ecer-original-Examen_2-1','nota nueva');run('replaceBackup(saved)');assert.deepEqual(json('backupSnapshot().data'),before.data);assert.equal(store.get('otro-sitio'),'no tocar');
for(const corrupt of [{...before,version:99},{...before,data:{bad:'1'}},{...before,data:{electricidadStudyV3:JSON.stringify({...profile,mistakes:['no-existe']})}},{...before,data:{electricidadStudyV3:JSON.stringify({...profile,topics:{[bank[0].topic]:{total:1,good:2,seen:[]}}})}},{...before,data:{electricidadAttemptV3:'{"version":3}'}},{...before,data:{electricidadQuestionReportsV1:'[null]'}}]){ctx.corrupt=corrupt;assert.throws(()=>run('replaceBackup(corrupt)'));assert.deepEqual(json('backupSnapshot().data'),before.data)}
ctx.corrupt=JSON.parse('{"app":"academia-electrica","version":1,"data":{"__proto__":"x"}}');assert.throws(()=>run('validateBackup(corrupt)'));
// A failure partway through the write restores the previous snapshot.
ctx.incoming={app:'academia-electrica',version:1,data:{electricidadReadingV1:'{"theme":"light","text":"normal"}',electricidadStudyGoalV1:'{"kind":"personal","date":"2026-12-14","minutes":20}'}};
failAt=writes+2;assert.throws(()=>run('replaceBackup(incoming)'),/conservaron/);assert.deepEqual(json('backupSnapshot().data'),before.data);failAt=-1;
// Current saved attempt format and shuffled choices survive the backup.
const qs=bank.slice(0,2).map(q=>({id:q.id,order:[3,1,0,2]}));const attempt={version:3,id:'resume-me',kind:'topic',questions:qs,answers:[0,null],flags:[true,false],index:1,startedAt:1793280000000,timed:false,deadline:null};
store.set('electricidadAttemptV3',JSON.stringify(attempt));assert.equal(run('validateBackup(backupSnapshot()).app'),'academia-electrica');
ctx.attempt=attempt;assert.equal(run('restoreRecord(attempt)[0].options[0]'),bank[0].options[3]);
run('let p={version:3,history:[],topics:{},mistakes:[],srs:{}};let q=orderedQuestion(BANK[0],[3,1,0,2]);updateReviewCard(p,q,false,100,0);updateReviewCard(p,q,false,200,null)');assert.equal(run('p.srs[String(q.id)].wrongCount'),2);assert.equal(run('p.srs[String(q.id)].lastWrongOption'),null);run('updateReviewCard(p,q,false,300,0)');assert.equal(run('p.srs[String(q.id)].lastWrongOption'),3);run('updateReviewCard(p,q,true,400,2)');assert.equal(run('p.srs[String(q.id)].wrongCount'),3);assert.equal(run('recurrentQuestions(p).length'),1);
assert.equal(run('validCivil("2026-02-30")'),false);assert.equal(run('validCivil("2028-02-29")'),true);
ctx.planProfile=profile;assert.equal(run('planDays({date:"2026-11-10",minutes:20},planProfile,"2026-10-29").length'),7);assert.equal(run('planDays({date:"2026-10-29",minutes:20},planProfile,"2026-10-29").length'),0);assert.equal(run('planDays({date:"2026-10-30",minutes:20},planProfile,"2026-10-29")[0].task.includes("documentos")'),true);assert.equal(run('planDays({date:"2026-11-10",minutes:20},planProfile,"2026-10-29")[0].topic'),bank[0].topic);
ctx.calendar=JSON.parse(read('fechas-examenes.json'));
for(let i=0;i<3;i++){const ics=run('calendarFile(calendar,'+i+')'),unfold=ics.replace(/\r\n /g,'');assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2);for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);assert.ok(unfold.includes('DTSTART;VALUE=DATE:20261105'));assert.ok(unfold.includes('DTEND;VALUE=DATE:20261106'));assert.ok(unfold.includes(i===2?'DTEND;VALUE=DATE:20261207':'DTEND;VALUE=DATE:20261215'));assert.ok(!unfold.includes('TZID='));}
assert.equal(run('icsEscape("a,b;c\\nd")'),'a\\,b\\;c\\nd');
console.log('OK: copia y restauración exactas, notas, claves ajenas intactas, rechazo de datos inválidos y recuperación ante fallo de escritura; opción errónea canónica, recurrencia y plan por fecha; 3 ICS con cierre, DTEND exclusivo y plegado UTF-8.');
