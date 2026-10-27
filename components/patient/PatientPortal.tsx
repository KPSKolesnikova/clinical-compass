"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import BrandMark from "../BrandMark";
import { Activity, ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardList, ExternalLink, HeartPulse, LockKeyhole, Moon, NotebookPen, ShieldAlert, Sun, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getQuestionnaireId, questionnaires, type QuestionnaireId } from "../../lib/questionnaires";

type CheckIn = { id: string; date: string; anxiety: number; energy: number; sleep: number; medication: string; sideEffects: string[]; sharedComment: string; };
type Assessment = { id: string; date: string; instrument: string; score: number; max: number; answers?: number[]; item9Positive?: boolean; adaptation: string; };
type Medication = { id: string; name: string; dose: string; schedule: string; active: boolean; };
type Patient = { id: string; name: string; age: number; diagnosis?: string; history?: string; appointmentDate?: string; appointmentTime?: string; medications?: Medication[]; tests?: Array<{id: string;name: string;everyDays: number;active: boolean;nextDate: string}>; checkIns?: CheckIn[]; assessments?: Assessment[]; sessions?: Array<{id: string;date: string;title: string;patientNote: string;recommendation: string}>; };
type Tab = "Сегодня" | "Моя динамика" | "Встречи и план" | "Личный дневник" | "Помощь";
const demoPatient: Patient = { id: "CC-1042", name: "Анна М.", age: 29, appointmentDate: "2026-10-25", appointmentTime: "10:30", checkIns: [], assessments: [], sessions: [], medications: [], tests: [] };
const storeKey = "clinical-compass-demo-patients-v1";
const privatePrefix = "clinical-compass-private-journal-v1:";

export default function PatientPortal({ theme, onToggleTheme, onBack }: { theme: "light" | "dark"; onToggleTheme: () => void; onBack: () => void }) {
  const [patient, setPatient] = useState<Patient>(demoPatient);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("Сегодня");
  const [notice, setNotice] = useState("");
  const [anxiety, setAnxiety] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [medication, setMedication] = useState("not-set");
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [shareComment, setShareComment] = useState(false);
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<QuestionnaireId | null>(null);
  useEffect(() => { if (activeQuestionnaire) document.getElementById("patient-questionnaire")?.scrollIntoView({ block: "start", behavior: "instant" }); }, [activeQuestionnaire]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [journal, setJournal] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [connected, setConnected] = useState(false);
  const inviteRef = useRef("");
  const connectedRef = useRef(false);
  inviteRef.current = inviteCode;
  connectedRef.current = connected;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) {
        const records = JSON.parse(saved) as Patient[];
        const found = records.find((item) => item.id === demoPatient.id);
        if (found) setPatient({ ...demoPatient, ...found, checkIns: found.checkIns || [], assessments: found.assessments || [], sessions: found.sessions || [] });
      }
    } catch { /* Keep the synthetic starter card when demo storage is unavailable. */ }
    try { setJournal(localStorage.getItem(privatePrefix + demoPatient.id) || ""); } catch { /* Local journal remains unavailable for this session. */ }
    setLoaded(true);
    const poll = window.setInterval(async () => {
      try {
        const code = inviteRef.current.trim();
        const url = connectedRef.current && code ? `/api/demo/patients?code=${encodeURIComponent(code)}` : "/api/demo/patients";
        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json() as { patient?: Patient; patients?: Patient[] };
        const match = data.patient || data.patients?.find((item) => item.id === demoPatient.id);
        if (response.ok && match) setPatient((current) => JSON.stringify(current) === JSON.stringify(match) ? current : { ...current, ...match });
      } catch { /* Offline demo continues to use device storage. */ }
    }, 2500);
    return () => window.clearInterval(poll);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      const records = JSON.parse(localStorage.getItem(storeKey) || "[]") as Patient[];
      const next = records.some((item) => item.id === patient.id) ? records.map((item) => item.id === patient.id ? patient : item) : [patient, ...records];
      localStorage.setItem(storeKey, JSON.stringify(next));
      void fetch("/api/demo/patients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "patch", patientId: patient.id, patch: patient }) }).catch(() => undefined);
    } catch { /* Do not claim data was saved if local storage is unavailable. */ }
  }, [loaded, patient]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(privatePrefix + patient.id, journal); } catch { /* Private journal remains local to this device. */ }
  }, [journal, loaded, patient.id]);

  const checkIns = patient.checkIns || [];
  const assessments = patient.assessments || [];
  const todaysCheckIn = checkIns.find((item) => item.date === new Date().toISOString().slice(0, 10));
  const chartData = useMemo(() => {
    const days = new Map<string, { date: string; anxiety?: number; energy?: number; sleep?: number }>();
    checkIns.forEach((item) => days.set(item.date, { ...days.get(item.date), date: item.date, anxiety: item.anxiety, energy: item.energy, sleep: item.sleep }));
    assessments.forEach((item) => days.set(item.date, { ...days.get(item.date), date: item.date, [item.instrument]: item.score } as { date: string; anxiety?: number; energy?: number; sleep?: number }));
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [checkIns, assessments]);
  const connectWithCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) { setNotice("Введите код, который выдал врач."); return; }
    try {
      const response = await fetch(`/api/demo/patients?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json() as { patient?: Patient; error?: string };
      if (!response.ok || !data.patient) { setNotice(data.error || "Не удалось найти карточку по этому коду."); return; }
      setPatient({ ...demoPatient, ...data.patient }); setInviteCode(code); setConnected(true);
      try { setJournal(localStorage.getItem(privatePrefix + data.patient.id) || ""); } catch { setJournal(""); }
      setNotice("Кабинет связан с картой пациента.");
    } catch { setNotice("Не удалось связаться с сервером. Попробуйте ещё раз."); }
  };
  const updatePatient = (patch: Partial<Patient>) => setPatient((current) => ({ ...current, ...patch }));

  const saveCheckIn = () => {
    const today = new Date().toISOString().slice(0, 10);
    const item: CheckIn = { id: Math.random().toString(36).slice(2, 9), date: today, anxiety, energy, sleep, medication, sideEffects, sharedComment: shareComment ? comment.trim() : "" };
    const next = [...checkIns.filter((entry) => entry.date !== today), item].sort((a, b) => a.date.localeCompare(b.date));
    updatePatient({ checkIns: next });
    setNotice("Отметка сохранена в карте пациента. Врач увидит её после обновления списка; это не медицинское уведомление.");
  };
  const beginQuestionnaire = (name: string) => {
    const id = getQuestionnaireId(name);
    if (!id) { setNotice("Для этого опросника пока не добавлена согласованная цифровая форма. Обратитесь к врачу."); return; }
    setTab("Моя динамика"); setActiveQuestionnaire(id); setQuestionIndex(0); setAnswers([]); setNotice("");
  };
  const answerQuestion = (value: number) => {
    const next = [...answers]; next[questionIndex] = value; setAnswers(next);
    const questionnaire = activeQuestionnaire ? questionnaires[activeQuestionnaire] : null;
    if (!questionnaire) return;
    if (questionIndex + 1 < questionnaire.questions.length) setQuestionIndex(questionIndex + 1);
    else {
      const item: Assessment = { id: Math.random().toString(36).slice(2, 9), date: new Date().toISOString().slice(0, 10), instrument: questionnaire.id, score: next.reduce((sum, response) => sum + response, 0), max: questionnaire.max, answers: next, ...(questionnaire.id === "PHQ-9" ? { item9Positive: next[8] > 0 } : {}), adaptation: "Русскоязычная версия; интерпретируйте результат совместно с врачом" };
      updatePatient({ assessments: [...assessments, item].sort((a, b) => a.date.localeCompare(b.date)) });
      setActiveQuestionnaire(null); setNotice(item.item9Positive ? "Ответ сохранён. Пожалуйста, обсудите его с врачом напрямую. Система не отправляет экстренные уведомления." : "Ответы сохранены в карте пациента. Результат не является диагнозом.");
      setTab("Моя динамика");
    }
  };
  const toggleEffect = (value: string) => setSideEffects((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  const nav: Tab[] = ["Сегодня", "Моя динамика", "Встречи и план", "Личный дневник", "Помощь"];

  return <main className={"patient-portal " + (theme === "dark" ? "theme-dark" : "")}>
    <header className="pp-header"><div className="pp-brand"><span className="pp-mark"><BrandMark/></span><div><b>Клинический Компас</b><small>Личный кабинет</small></div></div><div className="pp-actions"><button className="pp-back" onClick={onBack}><ArrowLeft size={15}/>Назад</button><button className="pp-theme" onClick={onToggleTheme} aria-label="Сменить тему">{theme === "light" ? <Moon size={17}/> : <Sun size={17}/>}</button></div></header>
    <div className="pp-shell"><aside className="pp-side"><div className="pp-person"><div className="pp-avatar">{patient.name.split(" ").map((part) => part[0]).join("").slice(0,2)}</div><div><b>{patient.name.split("·")[0].trim()}</b><small>Личный кабинет</small></div></div><nav>{nav.map((item, index) => <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{[<Activity key="a" size={17}/>,<HeartPulse key="b" size={17}/>,<CalendarDays key="c" size={17}/>,<NotebookPen key="d" size={17}/>,<ShieldAlert key="e" size={17}/>][index]}{item}<ChevronRight size={14}/></button>)}</nav><div className="pp-side-note"><LockKeyhole size={15}/><span>Личный дневник не отображается врачу.</span></div></aside>
      <section className="pp-content">{!connected && <div className="pp-connect"><div><b>Связать кабинет с врачом</b><small>Введите код доступа, выданный врачом.</small></div><input aria-label="Код доступа" value={inviteCode} onChange={(e)=>setInviteCode(e.target.value)} placeholder="Например, ACCESS-ABC123"/><button onClick={connectWithCode}>Подключить</button></div>}<div className="pp-title"><div><span className="pp-eyebrow">ВАШ ПЛАН ПОДДЕРЖКИ</span><h1>{tab === "Сегодня" ? "Спокойный шаг на сегодня" : tab}</h1><p>Здесь только ваши данные и договорённости с врачом.</p></div></div>
        {tab === "Сегодня" && <div className="pp-grid">
          <section className="pp-card pp-checkin"><div className="pp-card-heading"><div><span className="pp-eyebrow">ЕЖЕДНЕВНАЯ ОТМЕТКА</span><h2>Как прошёл ваш день?</h2></div><span className="pp-time">≈ 1 минута</span></div>{todaysCheckIn ? <div className="pp-saved"><Check size={17}/>Сегодняшняя отметка сохранена. Её можно изменить, заполнив форму ещё раз.</div> : null}
            <div className="pp-range"><div><label htmlFor="pp-anxiety">Тревога</label><span>{anxiety} из 5</span></div><input id="pp-anxiety" type="range" min="1" max="5" value={anxiety} onChange={(e) => setAnxiety(Number(e.target.value))}/><small>1 — почти не ощущалась · 5 — была очень сильной</small></div>
            <div className="pp-range"><div><label htmlFor="pp-energy">Энергия</label><span>{energy} из 5</span></div><input id="pp-energy" type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(Number(e.target.value))}/><small>1 — совсем мало сил · 5 — сил было достаточно</small></div>
            <div className="pp-range"><div><label htmlFor="pp-sleep">Качество сна</label><span>{sleep} из 5</span></div><input id="pp-sleep" type="range" min="1" max="5" value={sleep} onChange={(e) => setSleep(Number(e.target.value))}/><small>1 — очень плохое · 5 — хорошее</small></div>
            {patient.medications?.some((item) => item.active) && <fieldset className="pp-choice"><legend>Отметка о приёме назначенного препарата</legend>{[["yes","Принял(а)"],["late","Принял(а) позже"],["missed","Не принял(а)"],["side-effect","Не смог(ла) из-за самочувствия"]].map(([value,label])=><label key={value}><input type="radio" name="pp-medication" value={value} checked={medication===value} onChange={()=>setMedication(value)}/>{label}</label>)}</fieldset>}
            <div className="pp-range"><label>Что беспокоило?</label><div className="pp-chips">{["Тошнота","Головокружение","Сон","Другое","Ничего"].map((item)=><button type="button" key={item} className={sideEffects.includes(item)?"active":""} onClick={()=>toggleEffect(item)}>{item}</button>)}</div></div>
            <label className="pp-comment">Комментарий для себя<textarea value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Можно оставить пустым."/></label><label className="pp-share"><input type="checkbox" checked={shareComment} onChange={(e)=>setShareComment(e.target.checked)}/><span><b>Поделиться комментарием с врачом</b><small>Без отметки он останется только здесь. Комментарий сохраняется в карте пациента; срочные сообщения не отправляются.</small></span></label>
            <button className="pp-primary" onClick={saveCheckIn}><Check size={16}/>Сохранить отметку</button>
          </section>
          <section className="pp-card"><div className="pp-card-heading"><div><span className="pp-eyebrow">БЛИЖАЙШАЯ ВСТРЕЧА</span><h2>{patient.appointmentDate ? patient.appointmentDate : "Дата не назначена"}</h2></div><CalendarDays size={20}/></div><p>{patient.appointmentDate ? "Время " + (patient.appointmentTime || "уточняется") : "Уточните дату следующего приёма у врача."}</p><div className="pp-appointment-note">Записи и рекомендации появятся здесь после согласования с врачом.</div></section>
          <section className="pp-card"><div className="pp-card-heading"><div><span className="pp-eyebrow">НАЗНАЧЕННЫЕ ТЕСТЫ</span><h2>Опросники</h2></div><ClipboardList size={20}/></div>{patient.tests?.filter((item)=>item.active).length ? patient.tests.filter((item)=>item.active).map((test)=><div className="pp-test-row" key={test.id}><span><b>{test.name}</b><small>По плану врача · следующий срок {test.nextDate}</small></span><button onClick={()=>beginQuestionnaire(test.name)}>Пройти в приложении <ChevronRight size={14}/></button></div>) : <p>Опросники пока не назначены.</p>}<button className="pp-secondary" onClick={()=>setTab("Моя динамика")}>Открыть мои результаты</button></section>
          <section className="pp-card"><div className="pp-card-heading"><div><span className="pp-eyebrow">ПЛАН ВРАЧА</span><h2>Назначения</h2></div><HeartPulse size={20}/></div>{patient.medications?.filter((item)=>item.active).length ? patient.medications.filter((item)=>item.active).map((med)=><div className="pp-test-row" key={med.id}><span><b>{med.name}</b><small>{med.dose} · {med.schedule}</small></span></div>) : <p>Активных назначений нет.</p>}<small className="pp-muted">Не меняйте лечение самостоятельно. При вопросах свяжитесь с лечащим врачом.</small></section>
        </div>}
        {tab === "Моя динамика" && <div className="pp-grid">
          <section className="pp-card pp-span"><div className="pp-card-heading"><div><span className="pp-eyebrow">ТИХИЙ ПРОГРЕСС</span><h2>Ваши отметки состояния</h2></div></div><p>Нейтральный график только ваших ответов. Он не сравнивает вас с другими людьми и не устанавливает диагноз.</p>{chartData.length ? <div className="pp-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{top:15,right:18,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 5" stroke={theme==="dark"?"#31445a":"#e9eef4"}/><XAxis dataKey="date" tick={{fontSize:10,fill:theme==="dark"?"#9aabbd":"#77879b"}}/><YAxis domain={[1,5]} ticks={[1,2,3,4,5]} tick={{fontSize:10,fill:theme==="dark"?"#9aabbd":"#77879b"}}/><Tooltip/><Line type="monotone" dataKey="anxiety" name="Тревога" stroke="#5f8fca" strokeWidth={2.5} dot={{r:3}} connectNulls/><Line type="monotone" dataKey="energy" name="Энергия" stroke="#75a38c" strokeWidth={2.5} dot={{r:3}} connectNulls/><Line type="monotone" dataKey="PHQ-9" name="PHQ-9, общий балл" stroke="#9888bd" strokeWidth={2} dot={{r:3}} connectNulls/><Line type="monotone" dataKey="GAD-7" name="GAD-7, общий балл" stroke="#c59d62" strokeWidth={2} dot={{r:3}} connectNulls/></LineChart></ResponsiveContainer></div> : <div className="pp-empty">График появится после первых отметок. Здесь нет оценок, серий или рейтингов.</div>}</section>
          <section className="pp-card pp-span"><span className="pp-eyebrow">НАЗНАЧЕННЫЕ ОПРОСНИКИ</span><h2>Пройти тест в приложении</h2><p>Ответы сохраняются в карте и становятся видны врачу. Опросник дополняет беседу и не устанавливает диагноз.</p>{patient.tests?.filter((item)=>item.active).length ? patient.tests.filter((item)=>item.active).map((test)=>{const formId=getQuestionnaireId(test.name); return <div className="pp-test-row" key={test.id}><span><b>{test.name}</b><small>{formId ? `${questionnaires[formId].questions.length} вопросов · ${questionnaires[formId].recall}` : "Цифровая форма требует согласования с врачом"}</small></span><button disabled={!formId} onClick={()=>beginQuestionnaire(test.name)}>{formId ? "Начать" : "Недоступен"} <ChevronRight size={14}/></button></div>}) : <p>Нет активных опросников от врача.</p>}</section>
          {activeQuestionnaire && <section id="patient-questionnaire" className="pp-card pp-span pp-questionnaire"><div className="pp-card-heading"><div><span className="pp-eyebrow">{activeQuestionnaire} · ВОПРОС {questionIndex+1} ИЗ {questionnaires[activeQuestionnaire].questions.length}</span><h2>{questionnaires[activeQuestionnaire].recall}</h2></div><button className="pp-secondary" onClick={()=>setActiveQuestionnaire(null)}>Выйти</button></div><div className="pp-question-progress"><span style={{width:`${((questionIndex+1)/questionnaires[activeQuestionnaire].questions.length)*100}%`}}/></div><h3>{questionnaires[activeQuestionnaire].questions[questionIndex]}</h3><div className="pp-answer-list">{questionnaires[activeQuestionnaire].responses.map((label,index)=><button key={label} onClick={()=>answerQuestion(index)}>{label}<ChevronRight size={15}/></button>)}</div><small className="pp-muted">Вы можете остановиться в любой момент. Заполненный опросник не заменяет разговор с врачом.</small></section>}
          <section className="pp-card"><span className="pp-eyebrow">ИСТОРИЯ ОПРОСНИКОВ</span><h2>Результаты</h2>{assessments.length ? <div className="pp-history">{[...assessments].reverse().map((item)=><div key={item.id}><span><b>{item.instrument}</b><small>{item.date} · выбранная русскоязычная версия</small></span><strong>{item.score}/{item.max}</strong>{item.item9Positive&&<em>Нужен прямой контакт</em>}</div>)}</div> : <p>Пока нет сохранённых результатов.</p>}<small className="pp-muted">Шкалы — дополнительная информация для обсуждения со специалистом.</small></section>
          {assessments.some((item)=>item.item9Positive)&&<section className="pp-card pp-safety-card pp-span"><ShieldAlert size={20}/><div><h2>Пожалуйста, свяжитесь со специалистом</h2><p>Отметка сохранена в карте врача; экстренное уведомление не отправлялось. Если опасность непосредственная, обратитесь в местную экстренную службу. Контакты клиники должны быть добавлены организаторами.</p><a href="tel:112">Позвонить в экстренную службу · 112</a></div></section>}
        </div>}
        {tab === "Встречи и план" && <div className="pp-grid"><section className="pp-card"><span className="pp-eyebrow">КАЛЕНДАРЬ</span><h2>Предстоящий контакт</h2><p>{patient.appointmentDate ? patient.appointmentDate + " · " + (patient.appointmentTime||"время уточняется") : "Запланированных встреч нет."}</p>{patient.sessions?.map((item)=><div className="pp-session" key={item.id}><b>{item.date} · {item.title}</b>{item.patientNote&&<p>{item.patientNote}</p>}{item.recommendation&&<div className="pp-appointment-note">Рекомендации врача: {item.recommendation}</div>}</div>)}</section><section className="pp-card"><span className="pp-eyebrow">ТЕРАПИЯ</span><h2>Назначения врача</h2>{patient.medications?.filter((item)=>item.active).map((med)=><div className="pp-test-row" key={med.id}><span><b>{med.name}</b><small>{med.dose} · {med.schedule}</small></span></div>)}<p className="pp-muted">Назначения можно только просматривать. Для изменения обратитесь к врачу.</p></section></div>}
        {tab === "Личный дневник" && <section className="pp-card pp-journal"><div className="pp-card-heading"><div><span className="pp-eyebrow">ТОЛЬКО ДЛЯ ВАС</span><h2>Личный дневник</h2></div><LockKeyhole size={18}/></div><p>Эти записи хранятся только на этом устройстве и не показываются врачу. Добавьте тему, которую хотите обсудить на встрече.</p><textarea value={journal} onChange={(e)=>setJournal(e.target.value)} placeholder="Запись для себя"/></section>}
        {tab === "Помощь" && <div className="pp-grid"><section className="pp-card pp-span"><span className="pp-eyebrow">ЕСЛИ ВАМ СЕЙЧАС ТЯЖЕЛО</span><h2>Связь и безопасность</h2><p>Приложение не обеспечивает круглосуточное наблюдение и не отправляет автоматические оповещения врачу. Не ждите ответа приложения при срочной ситуации.</p><div className="pp-help-box"><ShieldAlert size={18}/><span><b>Если опасность непосредственная</b><small>Обратитесь в местную экстренную службу. В России можно позвонить по номеру 112. Контакты лечащего врача нужно заранее получить в клинике.</small></span></div><a className="pp-emergency" href="tel:112">Позвонить 112</a></section><section className="pp-card"><h2>Данные и приватность</h2><p>Записи дневника хранятся только на этом устройстве и не передаются врачу.</p></section></div>}
        {notice&&<div className="pp-toast" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Закрыть"><X size={15}/></button></div>}
      </section>
    </div>
  </main>;
}

