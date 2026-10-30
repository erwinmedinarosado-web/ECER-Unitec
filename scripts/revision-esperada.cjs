const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const originalFixes=JSON.parse(fs.readFileSync(path.join(root,'correcciones-calculo.json'),'utf8'));
const auditFixes=JSON.parse(fs.readFileSync(path.join(root,'correcciones-auditoria-320.json'),'utf8'));
const language=JSON.parse(fs.readFileSync(path.join(root,'normalizacion-idioma.json'),'utf8')).changes;
module.exports=q=>{const result=JSON.parse(JSON.stringify(q));const old=originalFixes.find(x=>x.id===q.id);if(old&&result.explanation===old.before)result.explanation=old.after;const patch=auditFixes.find(x=>x.id===q.id);if(patch)for(const [key,change] of Object.entries(patch.changes))result[key]=change.after;const wording=language.find(x=>x.id===q.id);if(wording)for(const [key,change] of Object.entries(wording.changes))result[key]=change.after;return result};
