import type { AssessmentRecord, Tone } from "./patient-insights";

export type SupportInput = {
  age?: number;
  assessments?: AssessmentRecord[];
  historyFactors?: string[];
  medications?: {name:string;dose:string;schedule:string;active:boolean}[];
  checkIns?: {date:string; anxiety:number; energy:number; sleep:number; medication:string; sideEffects:string[]}[];
  functioning?: {date:string; impairment:"not-assessed"|"none"|"mild"|"moderate"|"severe"; note?:string};
};
type Instrument = "PHQ-9"|"GAD-7";
type Direction = "improving"|"worsening"|"stable"|"mixed"|"insufficient";
export type SupportSource = {id:string;title:string;url:string;section:string};
export type SupportAdvice = {id:string;priority:Tone;title:string;reason:string;action:string;reassess:string;sourceIds:string[]};
export type SupportTrajectory = {
  instrument:Instrument; latestDate:string; latestScore:number; max:number; category:string;
  points:number; spanDays:number; change:number|null; relativeChange:number|null;
  formVersion:string|null;
  direction:Direction; summary:string; recent:boolean;
};
export type ClinicalSupport = {
  version:"support-0.3.0"; asOf:string;
  state:{tone:Tone;title:string;summary:string;freshness:string;evidence:string[];unknowns:string[]};
  trajectories:SupportTrajectory[];
  forecast:{kind:"conditional"|"insufficient"|"review-first";title:string;summary:string;horizon:string;basis:string;scenarios:{title:string;condition:string;outlook:string}[]};
  advice:SupportAdvice[]; sources:SupportSource[]; dataIssues:string[];
};

export const supportSources:SupportSource[]=[
  {id:"depression",title:"Минздрав РФ · КР 301_3 · редакция 2024",url:"https://apicr.minzdrav.gov.ru/api.ashx?id=301_3&op=GetClinrecPdf",section:"§2.1, стр.16–18; §3.7, стр.46–50; §4–5, стр.53–55"},
  {id:"anxiety",title:"Минздрав РФ · КР 457_3 · редакция 2024",url:"https://apicr.minzdrav.gov.ru/api.ashx?id=457_3&op=GetClinrecPdf",section:"§2.1, стр.12–14; §3.3, стр.32–37; приложение Г2, стр.86–87"},
  {id:"phq",title:"Kroenke et al. · PHQ-9 · 2001",url:"https://pubmed.ncbi.nlm.nih.gov/11556941/",section:"Категории выраженности суммарного балла"},
];
const DAY=86400000;
function stamp(value:string):number {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const time=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time:NaN;
}
function todayKey(now:Date){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;}
export function clinicalSnapshotAt(patient:SupportInput,date:string,now=new Date()):{patient:SupportInput;now:Date}|null {
  const target=stamp(date),today=stamp(todayKey(now));
  if(!Number.isFinite(target)||target>today)return null;
  // Conservative lower bound for adult eligibility; this is not a reconstructed age.
  const minimumAge=typeof patient.age==="number"?patient.age-Math.ceil((today-target)/(365.25*DAY)):undefined;
  return {now:new Date(`${date}T12:00:00`),patient:{
    age:minimumAge!==undefined&&minimumAge>=18?minimumAge:undefined,
    assessments:patient.assessments?.filter(a=>a.date<=date),
    checkIns:patient.checkIns?.filter(c=>c.date<=date),
    functioning:patient.functioning&&patient.functioning.date<=date?patient.functioning:undefined,
    // Current medication list and undated history do not establish past exposure or context.
  }};
}
function safetyAnswer(a:AssessmentRecord){return a.instrument==="PHQ-9"&&(a.item9Positive===true||(Number.isInteger(a.answers?.[8])&&(a.answers?.[8]||0)>0&&(a.answers?.[8]||0)<=3));}
function validScore(a:AssessmentRecord){
  const count=a.instrument==="PHQ-9"?9:a.instrument==="GAD-7"?7:0;
  return count>0&&a.max===count*3&&Number.isInteger(a.score)&&a.score>=0&&a.score<=a.max&&(!a.answers||(a.answers.length===count&&a.answers.every(n=>Number.isInteger(n)&&n>=0&&n<=3)&&a.answers.reduce((sum,n)=>sum+n,0)===a.score));
}
function category(a:AssessmentRecord){
  if(a.instrument==="GAD-7") return a.score<5?"минимальный уровень":a.score<10?"умеренный уровень":a.score<15?"средний уровень":"высокий уровень";
  return a.score<5?"минимальная выраженность":a.score<10?"лёгкая выраженность":a.score<15?"умеренная выраженность":a.score<20?"умеренно высокая выраженность":"высокая выраженность";
}
function aggregate(directions:Direction[]):Direction {
  const known=directions.filter(d=>d!=="insufficient");
  if(!known.length)return "insufficient";
  if(known.includes("mixed")||(known.includes("improving")&&known.includes("worsening")))return "mixed";
  if(known.includes("worsening"))return "worsening";
  if(known.includes("improving"))return "improving";
  return "stable";
}

/** Deterministic, inspectable support; scenario logic is not a calibrated prediction model. */
export function buildClinicalSupport(patient:SupportInput,now=new Date()):ClinicalSupport {
  const asOf=todayKey(now),today=stamp(asOf),issues:string[]=[],unknowns:string[]=[];
  const dated=(patient.assessments||[]).filter(a=>{
    const d=stamp(a.date);
    if(!Number.isFinite(d)||d>today){issues.push(`${a.instrument}: дата ${a.date} некорректна или находится в будущем; результат исключён.`);return false;}
    return true;
  });
  const safety=dated.filter(safetyAnswer).sort((a,b)=>a.date.localeCompare(b.date));
  const recentSafety=safety.filter(a=>today-stamp(a.date)<=14*DAY);
  const usable=dated.filter(a=>{if(!validScore(a)){issues.push(`${a.instrument}, ${a.date}: балл, максимум или ответы не согласованы; результат не интерпретирован.`);return false;}return true;});
  const trajectories:SupportTrajectory[]=[];
  for(const instrument of ["PHQ-9","GAD-7"] as Instrument[]){
    const series=usable.filter(a=>a.instrument===instrument).sort((a,b)=>a.date.localeCompare(b.date));
    if(!series.length)continue;
    const latest=series.at(-1)!;
    const latestVersion=latest.adaptation?.trim()||"unspecified";
    const versions=new Set(series.map(a=>a.adaptation?.trim()||"unspecified"));
    if(versions.size>1)issues.push(`${instrument}: версии формы различаются; динамика считается только внутри последнего непрерывного участка одной версии.`);
    // Never bridge across an intervening form version, even if an old version reappears.
    let start=series.length-1;
    while(start>0&&(series[start-1].adaptation?.trim()||"unspecified")===latestVersion)start--;
    const comparable=series.slice(start).filter(a=>stamp(a.date)>=stamp(latest.date)-90*DAY);
    const byDate=new Map<string,AssessmentRecord[]>();
    comparable.forEach(a=>byDate.set(a.date,[...(byDate.get(a.date)||[]),a]));
    const unique:AssessmentRecord[]=[];
    for(const [date,items] of byDate){
      if(items.some(a=>a.score!==items[0].score||Boolean(a.item9Positive)!==Boolean(items[0].item9Positive)||JSON.stringify(a.answers)!==JSON.stringify(items[0].answers))){issues.push(`${instrument}, ${date}: противоречащие результаты одной даты; точка исключена из динамики.`);continue;}
      unique.push(items[0]);
    }
    const point=unique.at(-1);
    // A disputed latest day must not silently fall back to an older reassuring result.
    if(!point||point.date!==latest.date){unknowns.push(`${instrument}: последний день содержит противоречащие результаты; состояние по шкале требует проверки.`);continue;}
    const first=unique[0],span=Math.round((stamp(point.date)-stamp(first.date))/DAY),change=unique.length>=2?point.score-first.score:null;
    let direction:Direction="insufficient";
    if(change!==null&&span>=7){
      const signs=unique.slice(1).map((a,i)=>Math.sign(a.score-unique[i].score));
      direction=signs.includes(-1)&&signs.includes(1)?"mixed":change<0?"improving":change>0?"worsening":"stable";
    }
    const directionText={improving:"снижение симптомной нагрузки",worsening:"рост симптомной нагрузки",stable:"суммарный балл без изменения",mixed:"колебания, неоднородная динамика",insufficient:"данных для направления динамики недостаточно"}[direction];
    const recent=today-stamp(point.date)<=14*DAY;
    trajectories.push({instrument,latestDate:point.date,latestScore:point.score,max:point.max,category:category(point),formVersion:latestVersion==="unspecified"?null:latestVersion,points:unique.length,spanDays:span,change,relativeChange:change!==null&&first.score>0?Math.round(change/first.score*100):null,direction,recent,summary:`${unique.length} точк(и) за ${span} дн.: ${directionText}${change===null?"":`; ${first.score} → ${point.score} (${change>0?"+":""}${change})`}.`});
    if(latestVersion==="unspecified")unknowns.push(`${instrument}: версия формы не указана; сопоставимость переводов/форм не подтверждена.`);
    if(!recent)unknowns.push(`${instrument}: последний результат ${point.date}; требуется обновление для оценки текущего состояния.`);
  }
  const checks=(patient.checkIns||[]).filter(c=>Number.isFinite(stamp(c.date))&&stamp(c.date)<=today).sort((a,b)=>a.date.localeCompare(b.date));
  const recentChecks=checks.filter(c=>today-stamp(c.date)<=14*DAY);
  const effects=recentChecks.filter(c=>c.sideEffects.some(e=>e!=="Ничего"&&e.trim()));
  const missed=recentChecks.filter(c=>c.medication==="missed"||c.medication==="side-effect");
  const reportedTreatment=recentChecks.some(c=>["yes","late","missed","side-effect"].includes(c.medication));
  const missingRegimen=reportedTreatment&&!(patient.medications||[]).some(m=>m.active);
  if(missingRegimen)unknowns.push("Дневник содержит отметки о приёме, но действующая лекарственная схема в карте не внесена.");
  const contradictory=recentChecks.some(c=>c.sideEffects.includes("Ничего")&&c.sideEffects.some(e=>e!=="Ничего"&&e.trim()));
  if(contradictory)issues.push("В дневнике одновременно выбраны «Ничего» и жалобы; переносимость требует уточнения.");
  const functioning=patient.functioning&&["none","mild","moderate","severe"].includes(patient.functioning.impairment)&&Number.isFinite(stamp(patient.functioning.date))&&stamp(patient.functioning.date)<=today&&today-stamp(patient.functioning.date)<=14*DAY?patient.functioning:undefined;
  if(!functioning)unknowns.push("Нет свежей отдельной оценки повседневного функционирования.");
  if(!recentChecks.length)unknowns.push("Нет записей дневника за последние 14 дней.");
  if(!trajectories.length)unknowns.push("Нет пригодных для интерпретации результатов PHQ-9/GAD-7.");
  if(safety.length&&!recentSafety.length)unknowns.push(`Есть исторический ответ по пункту 9 (${safety.at(-1)!.date}); его текущая актуальность неизвестна.`);
  const recent=trajectories.filter(t=>t.recent),severe=recent.some(t=>t.latestScore>=15),burden=recent.some(t=>t.latestScore>=5);
  const activation=patient.historyFactors?.includes("Эпизоды подъёма настроения/активности в анамнезе")||false;
  const ageEligible=typeof patient.age==="number"&&Number.isFinite(patient.age)&&patient.age>=18;
  if(!ageEligible)unknowns.push("Возраст взрослого пациента не подтверждён; взрослые рекомендации автоматически не применяются.");
  const urgentReview=recentSafety.length>0||functioning?.impairment==="severe";
  const functionalLimits=functioning&&functioning.impairment!=="none";
  const tone:Tone=urgentReview?"red":!ageEligible?"neutral":severe?"red":functionalLimits?"amber":!recent.length?"neutral":burden||effects.length||missed.length||activation||issues.length||missingRegimen?"amber":"green";
  const stateTitle=urgentReview?"Нужна прямая оценка специалистом":!ageEligible?"Нужна возрастная проверка":functionalLimits?"Есть ограничения повседневного функционирования":!recent.length?"Текущее состояние требует обновления данных":severe?"Выраженная симптомная нагрузка":issues.length?"Есть вопросы к качеству измерений":burden?"Сохраняются симптомы":effects.length||missed.length||activation||missingRegimen?"Есть факторы, требующие внимания":"Низкие текущие баллы по заполненным шкалам";
  const evidence=recent.map(t=>`${t.instrument}, ${t.latestDate}: ${t.latestScore}/${t.max} — ${t.category}.`);
  if(recentSafety.length)evidence.unshift(`Ответ по пункту 9 PHQ-9 от ${recentSafety.at(-1)!.date}; текущие намерения и план из шкалы не определяются.`);
  if(functioning)evidence.push(`Функционирование (${functioning.date}): ${{none:"ограничений не отмечено",mild:"лёгкие ограничения",moderate:"умеренные ограничения",severe:"выраженные ограничения"}[functioning.impairment as "none"|"mild"|"moderate"|"severe"]}.`);
  const latestCheck=recentChecks.at(-1);
  if(latestCheck&&[latestCheck.anxiety,latestCheck.energy,latestCheck.sleep].every(n=>Number.isInteger(n)&&n>=1&&n<=5))evidence.push(`Дневник ${latestCheck.date}: тревога ${latestCheck.anxiety}/5, энергия ${latestCheck.energy}/5, сон ${latestCheck.sleep}/5. Субъективные оценки, не часы сна и не диагностические критерии.`);
  if(effects.length)evidence.push(`Жалобы на переносимость: ${effects.length} запис(и) дневника за 14 дней.`);
  const overall=aggregate(recent.map(t=>t.direction));
  const strong=trajectories.length>0&&trajectories.every(t=>t.points>=3&&t.spanDays>=14&&t.recent&&t.formVersion!==null);
  const reviewFirst=urgentReview||activation||issues.length>0||!ageEligible;
  const insufficient=!recent.length||overall==="insufficient";
  const forecast:ClinicalSupport["forecast"]={
    kind:reviewFirst?"review-first":insufficient?"insufficient":"conditional",
    title:reviewFirst?"Прогноз зависит от клинического уточнения":insufficient?"Для прогноза пока мало сопоставимых данных":overall==="improving"?"Есть основания для сценария дальнейшего улучшения":overall==="worsening"?"При сохранении факторов возможно дальнейшее ухудшение":overall==="mixed"?"Неоднородная динамика: несколько сценариев":"Сценарий сохранения симптомной нагрузки при неизменных условиях",
    summary:reviewFirst?"Сначала уточните приоритетные сигналы и качество данных; общий низкий балл их не отменяет.":insufficient?"Добавьте повторную оценку тем же инструментом и данные о функционировании; один результат не описывает траекторию.":overall==="improving"?"Наблюдаемое снижение баллов может продолжиться при устойчивом функционировании и сохранении эффективных условий помощи. Ремиссия из этой траектории не следует.":overall==="worsening"?"Рост баллов указывает на необходимость пересмотреть формулировку случая и барьеры помощи; без изменений симптомная нагрузка может сохраняться или нарастать.":overall==="mixed"?"Разные показатели или соседние измерения меняются в разных направлениях. Единой благоприятной траектории из этих данных не следует.":"Стабильный балл описывает отсутствие зарегистрированного сдвига, а не доказанную неэффективность терапии.",
    horizon:"Следующие 2–4 недели · условный сценарий",
    basis:`${strong?"Есть не менее трёх сопоставимых точек каждой шкалы за ≥14 дней и свежий последний результат.":"Основания предварительные: мало точек, короткий период, есть устаревшие данные или не указана версия формы."} Для каждой шкалы используется до 90 дней перед последним результатом. Логика сценариев авторская и не прошла внешнюю клиническую валидацию; проценты вероятности не рассчитываются.`,
    scenarios:reviewFirst||insufficient?[]:[
      {title:"При сохранении условий",condition:"Сопоставимая оценка, прежние условия помощи и отсутствие новых стрессоров.",outlook:overall==="improving"?"Возможно продолжение снижения симптомной нагрузки.":overall==="worsening"?"Возможно сохранение или нарастание нагрузки.":"Возможно сохранение нагрузки или дальнейшие колебания."},
      {title:"Благоприятный сценарий",condition:"Устранены обсуждённые барьеры, улучшается повседневное функционирование.",outlook:"Возможно более устойчивое улучшение; подтвердите его повторной оценкой и рассказом пациента."},
      {title:"При появлении новых факторов",condition:"Новые стрессоры, ухудшение функционирования, переносимости или вовлечённости.",outlook:"Возможно ухудшение даже после снижения баллов; пересмотрите план и сроки контакта."},
    ],
  };
  const advice:SupportAdvice[]=[];
  const add=(a:SupportAdvice)=>advice.push(a);
  if(recentSafety.length)add({id:"safety",priority:"red",title:"Провести прямую оценку безопасности",reason:`Пункт 9 отмечен ${recentSafety.at(-1)!.date}.`,action:"Уточните актуальные мысли, намерения, план, доступ к средствам, прошлые эпизоды и поддержку. При непосредственной опасности организуйте экстренную медицинскую оценку по локальному протоколу.",reassess:"Не откладывать актуальную беседу до следующего заполнения шкалы.",sourceIds:["depression"]});
  if(functioning?.impairment==="severe")add({id:"severe-function",priority:"red",title:"Уточнить выраженное ограничение функционирования",reason:`От ${functioning.date} специалистом отмечены выраженные ограничения.`,action:"Оцените самообслуживание, поддержку и потребность в совместной медицинской помощи; при непосредственной угрозе жизни или неспособности обеспечить базовую безопасность организуйте срочную оценку.",reassess:"После прямого контакта и уточнения конкретных ограничений.",sourceIds:["depression"]});
  if(safety.length&&!recentSafety.length)add({id:"historical-safety",priority:"amber",title:"Уточнить актуальность исторического сигнала",reason:`Положительный ответ по пункту 9 сохранён от ${safety.at(-1)!.date}.`,action:"На ближайшем контакте уточните текущее состояние и документируйте прямую оценку. Исторический ответ сам по себе не устанавливает текущую неотложность.",reassess:"При новых ответах или изменении состояния — повторная оценка.",sourceIds:["depression"]});
  if(activation)add({id:"activation",priority:"amber",title:"Уточнить эпизоды подъёма настроения",reason:"В анамнезе отмечен подъём настроения/активности; низкий PHQ-9 его не исключает.",action:"Уточните длительность и эпизодичность, потребность во сне, последствия и вещества. При подозрении на маниакальный/гипоманиакальный эпизод предложите оценку психиатром.",reassess:"После уточнения эпизодов и медицинского заключения.",sourceIds:["depression"]});
  if(ageEligible&&recent.some(t=>t.instrument==="PHQ-9"&&t.latestScore>=5))add({id:"depression-plan",priority:severe?"amber":"neutral",title:"Обсудить план психологической помощи",reason:"В свежем PHQ-9 сохраняются депрессивные симптомы; диагноз шкалой не подтверждается.",action:"После формулировки случая обсудите психообразование, согласованные цели и применимость КПТ или интерперсонального подхода с учётом подготовки специалиста и предпочтений пациента.",reassess:"Оценивать симптомы и функционирование в ходе работы; при ухудшении пересматривать план.",sourceIds:["depression"]});
  if(ageEligible&&recent.some(t=>t.instrument==="GAD-7"&&t.latestScore>=5))add({id:"anxiety-plan",priority:"neutral",title:"Выбрать мишени работы с тревогой",reason:"GAD-7 указывает на сохраняющиеся тревожные симптомы; требуется уточнение клинической картины.",action:"Уточните триггеры, избегание и влияние тревоги на жизнь. При подходящей формулировке случая обсудите КПТ, обучение саморегуляции и релаксации.",reassess:"Повторно оценивать тревогу и достижение согласованных целей.",sourceIds:["anxiety"]});
  if(ageEligible&&(effects.length||missed.length))add({id:"tolerability",priority:"amber",title:"Согласовать проверку переносимости и схемы",reason:`За 14 дней: ${effects.length} отметок жалоб, ${missed.length} затруднений приёма.`,action:"Уточните реальные препараты, сроки симптомов и альтернативные причины; предложите обсудить переносимость с назначившим врачом. Дозы и отмену этот алгоритм не подбирает.",reassess:"После сверки схемы и при каждом новом симптоме.",sourceIds:["depression","anxiety"]});
  if(ageEligible&&missingRegimen)add({id:"regimen-context",priority:"amber",title:"Сверить фактический приём со схемой в карте",reason:"Есть отметки о приёме, но действующие назначения отсутствуют.",action:"Уточните фактически принимаемые средства и назначившего врача. Не связывайте динамику с конкретной терапией до сверки.",reassess:"После уточнения актуальной схемы и временной последовательности.",sourceIds:["depression","anxiety"]});
  if(ageEligible&&severe)add({id:"medical-review",priority:"amber",title:"Обсудить совместное ведение с психиатром",reason:"В свежей шкале выраженный уровень симптомов.",action:"Сопоставьте баллы, функционирование и беседу; обсудите медицинскую оценку и совместный план помощи при подтверждённой клинической необходимости.",reassess:"Срок контакта определите по реальному состоянию, а не одному баллу.",sourceIds:["depression","anxiety"]});
  if(!functioning)add({id:"functioning",priority:"neutral",title:"Добавить оценку функционирования",reason:"Изменение балла не показывает само по себе восстановление повседневной жизни.",action:"Обсудите работу/учёбу, отношения, самообслуживание и согласованные цели; зафиксируйте ограничения и дату оценки.",reassess:"Сопоставлять с повторными измерениями симптомов.",sourceIds:["depression","anxiety"]});
  if(ageEligible&&overall==="improving"&&!reviewFirst)add({id:"maintain-gains",priority:"green",title:"Закреплять достигнутые изменения",reason:"В сопоставимых измерениях снижается симптомная нагрузка.",action:"Обсудите полезные навыки, ранние признаки ухудшения и согласованный план действий при их появлении. Не завершайте наблюдение по одному низкому баллу.",reassess:"Подтвердить устойчивость улучшения и функционирование на повторном контакте.",sourceIds:["depression"]});
  if(!recent.length)add({id:"refresh",priority:"neutral",title:"Обновить исходную оценку",reason:"Нет свежих пригодных результатов для текущей сводки.",action:"Согласуйте повторную оценку тем же инструментом, клиническую беседу и уточнение жалоб. Старые результаты сохранены как история.",reassess:"Пересчитать сводку после новых данных.",sourceIds:["depression","anxiety"]});
  return {version:"support-0.3.0",asOf,state:{tone,title:stateTitle,summary:recent.length?"Рабочая оценка по последним доступным самоотчётам; подтвердите её клинической беседой и оценкой функционирования.":"Исторические результаты не позволяют описать состояние на сегодня.",freshness:"Свежими для этой сводки считаются записи не старше 14 дней; это настройка алгоритма, а не норматив срока наблюдения.",evidence,unknowns},trajectories,forecast,advice,sources:supportSources,dataIssues:issues};
}
