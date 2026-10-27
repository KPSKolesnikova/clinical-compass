const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText)(m,m.exports);return m.exports;}
const {followUpStatus,assessmentStatus,therapyDuration,doctorGreeting}=load('lib/patient-insights.ts');
const {synthesizeClinicalContext}=load('lib/clinical-synthesis.ts');
const now=new Date(2026,9,26,12,0);
test('greeting respects morning/day/evening/night boundaries and patronymic',()=>{
 for(const [hour,label] of [[4,'Добрый вечер'],[5,'Доброе утро'],[11,'Доброе утро'],[12,'Добрый день'],[17,'Добрый день'],[18,'Добрый вечер'],[22,'Добрый вечер'],[23,'Добрый вечер']]) assert.deepEqual(doctorGreeting('Колесникова Полина Сергеевна',hour),{name:'Полина Сергеевна',salutation:label});
});
test('missing session history does not invent a completed appointment',()=>{
 const status=followUpStatus({appointmentDate:'2026-09-01',appointmentTime:'10:00'},now);assert.equal(status.tone,'amber');assert.match(status.detail,/не подтверждает/);
});
test('past slot today needs booking; future slot today remains booked',()=>{
 assert.equal(followUpStatus({appointmentDate:'2026-10-26',appointmentTime:'11:00'},now).tone,'amber');assert.equal(followUpStatus({appointmentDate:'2026-10-26',appointmentTime:'13:00'},now).tone,'green');
});
test('long gap stays visible even when a new session is scheduled',()=>{
 const p={sessions:[{date:'2026-08-01'}],appointmentDate:'2026-10-30',followUpDays:30};assert.equal(followUpStatus(p,now).tone,'red');assert.match(followUpStatus(p,now).detail,/уже назначена/);
});
test('custom interval and future/invalid sessions do not produce false overdue status',()=>{
 assert.equal(followUpStatus({sessions:[{date:'2026-10-01'}],followUpDays:14},now).tone,'red');assert.equal(followUpStatus({sessions:[{date:'2026-11-01'},{date:'2026-02-31'}]},now).tone,'amber');
});
test('explicit confirmed session date participates in the reminder',()=>{
 assert.equal(followUpStatus({lastSessionDate:'2026-09-01',appointmentDate:'2026-10-30'},now).tone,'red');assert.equal(followUpStatus({lastSessionDate:'2026-10-25',appointmentDate:'2026-10-30'},now).tone,'green');
});
test('therapy is not inferred from card creation, tests or malformed dates',()=>{
 assert.match(therapyDuration(undefined,now),/не указана/);assert.match(therapyDuration('2026-11-01',now),/не указана/);assert.match(therapyDuration('2026-02-31',now),/не указана/);assert.match(therapyDuration('2026-10-01',now),/25 дн/);
});
test('scale categories and unknown/out-of-range values',()=>{
 assert.equal(assessmentStatus({instrument:'PHQ-9',score:4,max:27,date:'2026-10-26'}).tone,'green');assert.equal(assessmentStatus({instrument:'GAD-7',score:10,max:21,date:'2026-10-26'}).tone,'amber');assert.equal(assessmentStatus({instrument:'GAD-7',score:15,max:21,date:'2026-10-26'}).tone,'red');assert.equal(assessmentStatus({instrument:'PHQ-9',score:28,max:27,date:'2026-10-26'}).tone,'neutral');assert.equal(assessmentStatus({instrument:'other',score:2,max:7,date:'2026-10-26'}).tone,'neutral');
});
test('raw item 9 raises review even if cached safety flag is absent',()=>{
 const a={instrument:'PHQ-9',score:1,max:27,date:'2026-10-26',answers:[0,0,0,0,0,0,0,0,1]};assert.match(assessmentStatus(a).title,/пункта 9/);assert.ok(synthesizeClinicalContext({id:'p',name:'p',assessments:[{...a,id:'a'}]}).signals.some(s=>s.id==='phq9-item9'));
});
test('inconsistent answer sum is not interpreted as clinical improvement',()=>{
 assert.equal(assessmentStatus({instrument:'PHQ-9',score:0,max:27,date:'2026-10-26',answers:[3,0,0,0,0,0,0,0,0]}).tone,'neutral');
});
test('duplicate regimen and explicitly entered history retain explanations',()=>{
 const p={id:'p',name:'p',historyFactors:['Беременность или лактация'],medications:[{name:'A',dose:'1',schedule:'утро',active:true},{name:'a',dose:'1',schedule:'вечер',active:true}]};const signals=synthesizeClinicalContext(p).signals;assert.ok(signals.some(s=>s.id==='duplicate-regimen'));assert.ok(signals.some(s=>s.id==='reproductive-context'));assert.ok(signals.every(s=>s.provenance&&s.action));
});
test('nothing alone is not a side-effect; contradictory choices are explicit',()=>{
 const c={date:'2026-10-26',anxiety:2,energy:3,sleep:3,medication:'yes',sideEffects:['Ничего']};assert.ok(!synthesizeClinicalContext({id:'p',name:'p',checkIns:[c]}).signals.some(s=>s.id==='patient-reported-treatment'));assert.ok(synthesizeClinicalContext({id:'p',name:'p',checkIns:[{...c,sideEffects:['Ничего','Тошнота']}]}).signals.some(s=>s.id==='conflicting-effects'));
});
test('only active exact structured allergen match triggers; no free-text negation parsing',()=>{
 const p={id:'p',name:'p',allergies:'Аллергии на сертралин нет',medications:[{name:'Сертралин',dose:'50',schedule:'утром',active:true}]};assert.ok(!synthesizeClinicalContext(p).signals.some(s=>s.id==='allergen-match'));assert.ok(synthesizeClinicalContext({...p,allergySubstances:['сертралин']}).signals.some(s=>s.id==='allergen-match'));assert.ok(!synthesizeClinicalContext({...p,allergySubstances:['сертралин'],medications:[{...p.medications[0],active:false}]}).signals.some(s=>s.id==='allergen-match'));
});
test('coincidence compares same scale and pre-result diary window only',()=>{
 const a=(id,date,score)=>({id,date,instrument:'GAD-7',score,max:21});const c=date=>({date,anxiety:4,energy:2,sleep:2,medication:'missed',sideEffects:[]});const p={id:'p',name:'p',assessments:[a('1','2026-10-01',5),a('2','2026-10-26',10)]};assert.ok(synthesizeClinicalContext({...p,checkIns:[c('2026-10-25')]}).signals.some(s=>s.id==='worse-and-tolerability-GAD-7'));assert.ok(!synthesizeClinicalContext({...p,checkIns:[c('2026-10-27')]}).signals.some(s=>s.id==='worse-and-tolerability-GAD-7'));assert.ok(!synthesizeClinicalContext({...p,checkIns:[c('bad-date')]}).signals.some(s=>s.id==='worse-and-tolerability-GAD-7'));
});
