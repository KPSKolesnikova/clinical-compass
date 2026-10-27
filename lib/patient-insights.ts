export type Tone = "green" | "amber" | "red" | "neutral";
export type AssessmentRecord = { id?: string; date: string; instrument: string; score: number; max: number; answers?: number[]; item9Positive?: boolean; adaptation?: string };
export type FollowUpPatient = { appointmentDate?: string; appointmentTime?: string; followUpDays?: number; lastSessionDate?:string; sessions?: { date: string }[] };
export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function formatAge(age:number) {
  const last=age%10, teen=age%100;
  return `${age} ${teen>=11&&teen<=14?"лет":last===1?"год":last>=2&&last<=4?"года":"лет"}`;
}
const dayStamp = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : NaN;
};
export function followUpStatus(patient: FollowUpPatient, now = new Date()) {
  const today = dayStamp(localDay(now));
  // This is an organisational reminder, not a recommended medical interval.
  const interval = Number.isFinite(patient.followUpDays) && Number(patient.followUpDays)>0 ? Number(patient.followUpDays) : 30;
  const last = [...(patient.sessions || []).map(s=>dayStamp(s.date)),dayStamp(patient.lastSessionDate)].filter(d=>Number.isFinite(d)&&d<=today).sort((a,b)=>b-a)[0];
  const gap = last === undefined ? null : Math.floor((today-last)/86400000);
  const scheduled = dayStamp(patient.appointmentDate);
  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(patient.appointmentTime || "");
  const todayPending = scheduled===today && (!timeValid || patient.appointmentTime! >= `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
  const future = scheduled>today || todayPending;
  const overdue = gap !== null && gap>interval;
  if (overdue) return { tone:"red" as Tone, title:`Перерыв ${gap} дн.`, detail:`Последняя документированная сессия: ${new Date(last).toISOString().slice(0,10)}. Интервал контроля ${interval} дн.${future?" Следующая встреча уже назначена.":" Следующая встреча не назначена."} Это организационный порог, не оценка тяжести.` };
  if (!future) return { tone:"amber" as Tone, title:"Нужна запись", detail:`Будущая встреча не указана.${gap===null?" Дата проведённой сессии неизвестна; прошедшая запись не подтверждает, что приём состоялся.":` После последней сессии ${gap} дн.`}` };
  return { tone:"green" as Tone, title:"Встреча назначена", detail:`${patient.appointmentDate} · ${patient.appointmentTime||"время уточняется"}.${gap===null?" История проведённых сессий не заполнена.":` После последней сессии ${gap} дн.`} Статус касается только расписания.` };
}
export function assessmentStatus(item?: AssessmentRecord) {
  if (!item) return {tone:"neutral" as Tone,title:"Нет результата",detail:"Клиническая значимость не определена: нужны данные и беседа с пациентом."};
  const count=item.instrument==="PHQ-9"?9:item.instrument==="GAD-7"?7:0;
  if (!count || !Number.isInteger(item.score) || item.score<0 || item.score>count*3 || item.max!==count*3) return {tone:"neutral" as Tone,title:"Проверьте результат",detail:"Неизвестная шкала или некорректные баллы. Автоматическая интерпретация недоступна."};
  if (item.instrument==="PHQ-9" && (item.item9Positive || (item.answers?.[8]??0)>0)) return {tone:"red" as Tone,title:"Прямой просмотр пункта 9",detail:`${item.date}: есть ответ по пункту безопасности. Уточните актуальность, мысли, намерения, план и защитные факторы непосредственно с пациентом. Балл не определяет суицидальный риск.`};
  if(item.answers && (item.answers.length!==count || item.answers.some(a=>!Number.isInteger(a)||a<0||a>3) || item.answers.reduce((a,b)=>a+b,0)!==item.score)) return {tone:"neutral" as Tone,title:"Проверьте исходные ответы",detail:"Ответы и суммарный балл не согласованы. Шкальная категория не определяется до проверки исходной формы."};
  const level=item.instrument==="GAD-7"?(item.score<5?"Минимальный уровень":item.score<10?"Умеренный уровень":item.score<15?"Средний уровень":"Высокий уровень"):(item.score<5?"Минимальная выраженность":item.score<10?"Лёгкая выраженность":item.score<15?"Умеренная выраженность":item.score<20?"Умеренно высокая выраженность":"Высокая выраженность");
  return {tone:(item.score>=15?"red":item.score>=5?"amber":"green") as Tone,title:level,detail:`${item.date} · ${item.instrument}: ${item.score}/${item.max}. Категория суммарного балла на дату заполнения; текущее состояние неизвестно. Клиническую значимость врач уточняет по функционированию, анамнезу и беседе. Это не диагноз, не оценка срочности и не заключение о ремиссии.`};
}
export function therapyDuration(start?: string, now=new Date()) {
  const stamp=dayStamp(start), today=dayStamp(localDay(now));
  if (!Number.isFinite(stamp)||stamp>today) return "Дата начала терапии не указана";
  return `В терапии ${Math.floor((today-stamp)/86400000)} дн. · с ${start}`;
}
export function doctorGreeting(name: string, hour: number) {
  const parts=name.trim().split(/\s+/);
  return {name:parts.length>=3?parts.slice(1).join(" "):parts.length===2?parts[1]:parts[0]||"коллега", salutation:hour>=5&&hour<12?"Доброе утро":hour>=12&&hour<18?"Добрый день":"Добрый вечер"};
}
export const scaleSources = {
  "PHQ-9": {title:"PHQ-9 · исходное исследование, 2001",url:"https://pubmed.ncbi.nlm.nih.gov/11556941/"},
  "GAD-7": {title:"GAD-7 · КР 457_3, приложение Г2, стр.86",url:"https://apicr.minzdrav.gov.ru/api.ashx?id=457_3&op=GetClinrecPdf#page=86"},
};
