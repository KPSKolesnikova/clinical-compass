"use client";
import { formatAge } from "../../lib/patient-insights";
import ClinicalSupportPanel from "./ClinicalSupportPanel";
import FollowUpBadge from "./FollowUpBadge";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, CalendarClock, Check, ChevronRight, ClipboardPlus, FilePlus2, FileText, FileUp, Download, Eye, FlaskConical, KeyRound, Plus, Search, ShieldAlert, UserRoundPlus, X, Database, ExternalLink } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { psychiatricDemoCases } from "../../lib/psychiatric-demo-cases";
import { synthesizeClinicalContext } from "../../lib/clinical-synthesis";

type Medication = { id: string; name: string; dose: string; schedule: string; active: boolean };
type TestPlan = { id: string; name: string; everyDays: number; active: boolean; nextDate: string };
type PatientDocument = {id:string;name:string;category:string;date:string;source:string;uploadedBy:string;description:string;content?:string;contentType?:string;dataUrl?:string};
type Patient = { id: string; name: string; age: number; createdAt: string; functioning?:{date:string;impairment:"not-assessed"|"none"|"mild"|"moderate"|"severe";note?:string}; lastSessionDate?:string; therapyStartedAt?: string; followUpDays?: number; allergySubstances?:string[]; historyFactors?:string[]; diagnosis: string; history: string; allergies: string; documents?:PatientDocument[]; emias?:{status:"simulated";externalId:string;importedAt:string}; medications: Medication[]; tests: TestPlan[]; appointmentDate: string; appointmentTime: string; accessCode: string; checkIns?: Array<{id:string;date:string;anxiety:number;energy:number;sleep:number;medication:string;sideEffects:string[];sharedComment:string}>; assessments?: Array<{id:string;date:string;instrument:string;score:number;max:number;answers?:number[];item9Positive?:boolean;adaptation:string}>; reviewedAssessmentIds?: string[]; sessions?: Array<{id:string;date:string;title:string;patientNote:string;recommendation:string}>; caseScenario?: {title:string;signals:string[];expectedResponse:string}; };
type Tab = "Обзор" | "Аналитика" | "Диагноз и анамнез" | "Лечение" | "Тесты" | "Документы";
type Dialog = "patient" | "medication" | "test" | "appointment" | null;
type PatientFilter = "all" | "review" | "appointments" | "tests";
const MAX_PATIENTS = 20;
const diagnosisSuggestions = [
  { title: "Депрессивный эпизод и рекуррентное депрессивное расстройство", code: "F32, F33", guideline: "КР 301_3", url: "https://cr.minzdrav.gov.ru/preview-cr/301_3", terms: "депрессия депрессивный эпизод рекуррентное" },
  { title: "Тревожно-фобические расстройства", code: "F40", guideline: "КР 455_3", url: "https://cr.minzdrav.gov.ru/preview-cr/455_3", terms: "тревожное фобия фобическое" },
  { title: "Паническое расстройство", code: "F41.0", guideline: "КР 456_3", url: "https://cr.minzdrav.gov.ru/preview-cr/456_3", terms: "паническое паника" },
  { title: "Генерализованное тревожное расстройство", code: "F41.1", guideline: "КР 457_3", url: "https://cr.minzdrav.gov.ru/preview-cr/457_3", terms: "генерализованное тревожное гтр" },
  { title: "Биполярное аффективное расстройство", code: "F31", guideline: "КР 675_2 · редакция 2025", url: "https://cr.minzdrav.gov.ru/preview-cr/675_2", terms: "биполярное бар мания гипомания" },
  { title: "Посттравматическое стрессовое расстройство", code: "F43.1", guideline: "КР 753_1 · ред. 2023; проект обновления на экспертизе", url: "https://cr.minzdrav.gov.ru/preview-cr/753_1", terms: "посттравматическое стрессовое птср травма" },
];
const initialPatients: Patient[] = psychiatricDemoCases as Patient[];
const today = new Date().toISOString().slice(0, 10);
const mergeDemoCases = (records: Patient[]) => {
  const recordsById = new Map(records.map((item) => [item.id, item]));
  const seeds = psychiatricDemoCases as Patient[];
  const seedIds = new Set(seeds.map((patient) => patient.id));
  const obsoleteIds = new Set(["CC-1042", "CC-1043", "CC-1044", "DEMO-CLIN-08", "DEMO-CLIN-09", "DEMO-CLIN-10"]);
  const seeded = seeds.map((seed) => {
    const saved = recordsById.get(seed.id);
    const savedDiagnosis = saved?.diagnosis?.trim() || "";
    const diagnosis = !savedDiagnosis || /^Не внес[её]н/i.test(savedDiagnosis) ? seed.diagnosis : savedDiagnosis;
    return { ...seed, ...(saved || {}), diagnosis, name: saved?.name && !/^[А-ЯЁа-яё]+ [А-ЯЁ]\.$/.test(saved.name) ? saved.name : seed.name, emias: saved?.emias || seed.emias, documents: saved?.documents?.length ? saved.documents : seed.documents };
  });
  return [...seeded, ...records.filter((patient) => !seedIds.has(patient.id) && !obsoleteIds.has(patient.id))].slice(0, MAX_PATIENTS);
};
const makeId = () => Math.random().toString(36).slice(2, 9);
const cleanDisplayText = (value: string) => { let text = value; const replacements: Array<[string, string]> = [["ДЕМО-ДОКУМЕНТ · НЕ ЕМИАС", "Структурированная сводка"], ["ДЕМО-ДАННЫЕ · НЕ РЕАЛЬНЫЕ РЕЗУЛЬТАТЫ", "Результаты опросников"], ["Демо-генерация · не ЕМИАС", "Карта пациента"], ["Демо-генерация · тестовые значения", "Результаты опросников"], ["Синтетическая учебная сводка. Не является реальным медицинским документом.", "Структурированная сводка для обсуждения на приёме."], ["Учебный материал для демонстрации интерфейса. Не использовать как медицинское заключение.", "Сводка подготовлена для обсуждения с пациентом и проверки врачом."], ["Вымышленная запись: ", ""], ["Учебный сценарий: ", ""], [" · демонстрация", ""], [" — демонстрация", ""], [" · симуляция", ""], [" · демо", ""], ["Демо", ""], ["демо", ""], ["Демонстрационный сценарий", "Карточка пациента"], ["демонстрационный сценарий", "карточка пациента"], ["ДЕМО-ДАННЫЕ", "Результаты опросников"]]; for (const [from, to] of replacements) text = text.split(from).join(to); return text.replace(/Смоделировано результатов:[^.]*\. Итоги не относятся к реальному пациенту\./gi, "Количество записей внесено в карту; интерпретацию выполняет врач.").replace(/DEMO/gi, "").replace(/симуляция/gi, "").replace(/демонстрация/gi, "").replace(/сгенерированные данные/gi, "").replace(/Учебный сценарий/gi, "").replace(/учебный сценарий/gi, "").replace(/вымышленная запись/gi, "").replace(/ ·  · /g, " · ").replace(/  +/g, " ").trim(); };

export default function PatientWorkspace({ openPatientId, onPatientOpened, openNewPatient, onNewPatientOpened, returnToOverview, onReturnToOverview, onAddAppointment }: { returnToOverview?: boolean; onReturnToOverview?: () => void; onAddAppointment?: (id:string) => void; openPatientId?: string; onPatientOpened?: () => void; openNewPatient?: boolean; onNewPatientOpened?: () => void }) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<Tab>("Обзор");
  const [query, setQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState<PatientFilter>("all");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [patientName, setPatientName] = useState("");
  const [creatingPatient,setCreatingPatient]=useState(false);

  const [patientAge, setPatientAge] = useState("");
  const [patientDiagnosis, setPatientDiagnosis] = useState("");
  const [diagnosisSuggestionsOpen, setDiagnosisSuggestionsOpen] = useState(false);
  const [emiasInfoOpen, setEmiasInfoOpen] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState("");
  const [form, setForm] = useState({ name: "", dose: "", schedule: "", days: "14", date: today, time: "10:00" });
  const [dashboardTest, setDashboardTest] = useState("");
  const [dashboardMetric, setDashboardMetric] = useState("total");
  const [dashboardPeriod, setDashboardPeriod] = useState("90");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [clinicalSaved, setClinicalSaved] = useState(true);

  useEffect(() => {
    if (!openPatientId) return;
    const timer = window.setTimeout(() => { setSelectedId(openPatientId); setTab("Обзор"); setNotice(""); onPatientOpened?.(); }, 0);
    return () => window.clearTimeout(timer);
  }, [openPatientId, onPatientOpened]);

  useEffect(() => {
    if (!openNewPatient) return;
    const timer = window.setTimeout(() => { setSelectedId(""); setPatientName(""); setPatientAge(""); setPatientDiagnosis(""); setDiagnosisSuggestionsOpen(false); setEmiasInfoOpen(false); setDialog("patient"); onNewPatientOpened?.(); }, 0);
    return () => window.clearTimeout(timer);
  }, [openNewPatient, onNewPatientOpened]);
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      let localPatients = initialPatients;
      try {
        const raw = localStorage.getItem("clinical-compass-demo-patients-v1");
        if (raw) localPatients = JSON.parse(raw) as Patient[];
        localPatients = mergeDemoCases(localPatients);
      } catch { /* Demo records can be recreated if local storage is unavailable. */ }
      if (!active) return;
      setPatients(localPatients);
      setLoaded(true);
      try {
        const remote = await fetch("/api/demo/patients", { cache: "no-store" });
        const data = await remote.json() as { patients?: Patient[] };
        if (remote.ok && data.patients?.length && active) setPatients(mergeDemoCases(data.patients));
        else if (remote.ok) await fetch("/api/demo/patients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "replace", patients: localPatients }) });
      } catch { /* Local device storage remains available when server sync is offline. */ }
    };
    void hydrate();
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch("/api/demo/patients", { cache: "no-store" });
        const data = await response.json() as { patients?: Patient[] };
        if (response.ok && data.patients && active) { const merged = mergeDemoCases(data.patients); setPatients((current) => JSON.stringify(current) === JSON.stringify(merged) ? current : merged); }
      } catch { /* Keep the last locally saved synthetic view. */ }
    }, 2500);
    return () => { active = false; window.clearInterval(poll); };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("clinical-compass-demo-patients-v1", JSON.stringify(patients));
    const timer = window.setTimeout(() => {
      void fetch("/api/demo/patients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "replace", patients }) }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loaded, patients]);

  const selected = patients.find((patient) => patient.id === selectedId);
  const needsReview = (patient: Patient) => Boolean(patient.assessments?.some((item) => item.item9Positive && !patient.reviewedAssessmentIds?.includes(item.id)));
  const filtered = useMemo(() => patients.filter((p) => {
    const matchesQuery = (p.name + " " + p.id + " " + (p.caseScenario?.title || "")).toLowerCase().includes(query.toLowerCase());
    const matchesFilter = patientFilter === "all" || (patientFilter === "review" && needsReview(p)) || (patientFilter === "appointments" && Boolean(p.appointmentDate)) || (patientFilter === "tests" && p.tests.some((item) => item.active));
    return matchesQuery && matchesFilter;
  }), [patients, query, patientFilter]);
  const todayAppointments = patients.filter((patient) => patient.appointmentDate === today).length;
  const patientsForReview = patients.filter(needsReview).length;
  const openTestCount = patients.reduce((count, patient) => count + patient.tests.filter((item) => item.active).length, 0);
  const update = (changes: Partial<Patient>) => setPatients((items) => items.map((p) => p.id === selectedId ? { ...p, ...changes } : p));
  const startDialog = (kind: Exclude<Dialog, null>) => {
    if (kind === "patient") { setPatientName(""); setPatientAge(""); setPatientDiagnosis(""); setDiagnosisSuggestionsOpen(false); setEmiasInfoOpen(false); }
    setForm({ name: "", dose: "", schedule: "", days: "14", date: selected?.appointmentDate || today, time: selected?.appointmentTime || "10:00" });
    setEditingMedicationId(""); setDialog(kind);
  };
  const editMedication = (medication: Medication) => {
    setEditingMedicationId(medication.id);
    setForm({ name: medication.name, dose: medication.dose, schedule: medication.schedule, days: "14", date: today, time: "10:00" });
    setDialog("medication");
  };
  const createPatient = async () => {
    if(creatingPatient)return;
    if (patients.length >= MAX_PATIENTS) { setNotice(`Достигнут лимит карточек: ${MAX_PATIENTS} пациентов.`); return; }
    const age = Number(patientAge);
    if (patientName.trim().split(/\s+/).length < 2 || age < 0 || age > 120) { setNotice("Укажите фамилию и имя пациента, а также корректный возраст."); return; }
    const id = "CC-" + Math.floor(1000 + Math.random() * 8999); const code = "ACCESS-" + Math.random().toString(36).slice(2, 8).toUpperCase(); const patient: Patient = { id, name: patientName.trim(), age, createdAt: today, diagnosis: patientDiagnosis.trim(), history: "", allergies: "Не уточнены", medications: [], tests: [], appointmentDate: "", appointmentTime: "", accessCode: code };
    setCreatingPatient(true);
    try { const response=await fetch("/api/demo/patients",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"create",patient})}); if(!response.ok)throw new Error(); } catch { setCreatingPatient(false); setNotice("Не удалось сохранить новую карточку. Повторите попытку; данные формы сохранены."); return; }
    setCreatingPatient(false);
    setPatients((items) => [patient, ...items]); setSelectedId(patient.id); setTab("Обзор"); setDialog(null); setPatientName(""); setPatientAge(""); setPatientDiagnosis(""); setDiagnosisSuggestionsOpen(false); setEmiasInfoOpen(false);
    setNotice(`Карточка создана. Код доступа: ${code}.`);
  };
  const saveDialog = () => {
    if (!selected) return;
    if (dialog === "medication") {
      if (!form.name.trim()) { setNotice("Укажите название препарата."); return; }
      if (editingMedicationId) { update({ medications: selected.medications.map((medication) => medication.id === editingMedicationId ? { ...medication, name: form.name.trim(), dose: form.dose.trim(), schedule: form.schedule.trim() } : medication) }); setNotice("Назначение обновлено. Проверьте клиническую безопасность по актуальным источникам."); } else { update({ medications: [...selected.medications, { id: makeId(), name: form.name.trim(), dose: form.dose.trim(), schedule: form.schedule.trim(), active: true }] }); setNotice("Назначение добавлено. Проверьте клиническую безопасность по актуальным источникам."); }
      setNotice("Назначение добавлено. Проверьте клиническую безопасность по актуальным источникам.");
    } else if (dialog === "test") {
      if (!form.name.trim()) { setNotice("Укажите название шкалы или теста."); return; }
      const days = Math.max(1, Number(form.days) || 14);
      update({ tests: [...selected.tests, { id: makeId(), name: form.name.trim(), everyDays: days, active: true, nextDate: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) }] });
      setNotice("Тест добавлен в план наблюдения.");
    } else if (dialog === "appointment") {
      update({ appointmentDate: form.date, appointmentTime: form.time });
      setNotice("Запись сохранена. Проверьте дату и время.");
    }
    setDialog(null);
  };
  const invite = () => {
    const code = "ACCESS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    update({ accessCode: code });
    setNotice("Создан код доступа: " + code);
  };
  const safety = selected ? [
    selected.allergies.toLowerCase().includes("не уточ") ? "Аллергии и реакции на препараты не уточнены." : "",
    selected.medications.some((m) => !m.dose.trim()) ? "У одного или нескольких назначений не указана дозировка." : "",
    new Set(selected.medications.filter((m) => m.active).map((m) => m.name.trim().toLowerCase())).size < selected.medications.filter((m) => m.active).length ? "Есть совпадающие названия активных препаратов; проверьте возможные дубли." : "",
    "Справочник взаимодействий, противопоказаний и доз не подключён.",
  ].filter(Boolean) : [];

  const urgentAssessments = selected?.assessments?.filter((item) => item.item9Positive && !selected.reviewedAssessmentIds?.includes(item.id)) || [];
  const latestCheckIn = selected?.checkIns?.slice(-1)[0];
  const assessmentTests = [...new Set(selected?.assessments?.map((item) => item.instrument) || [])];
  const activeDashboardTest = dashboardTest || assessmentTests[0] || "";
  const cutoff = dashboardPeriod === "all" ? "0000-00-00" : new Date(Date.now() - Number(dashboardPeriod) * 86400000).toISOString().slice(0,10);
  const dashboardData = (selected?.assessments || []).filter((item) => item.instrument === activeDashboardTest && item.date >= cutoff).sort((a,b)=>a.date.localeCompare(b.date)).map((item) => ({ date: item.date, score: dashboardMetric === "total" ? item.score : item.answers?.[Number(dashboardMetric)] ?? null }));
  const latestDashboard = dashboardData.at(-1);
  const sharedComment = [...(selected?.checkIns || [])].reverse().find((item) => item.sharedComment)?.sharedComment;
  const synthesis = selected ? synthesizeClinicalContext(selected) : null;
  const displayDocuments = (selected?.documents || []).map((item) => ({ ...item, name: cleanDisplayText(item.name), source: cleanDisplayText(item.source), uploadedBy: cleanDisplayText(item.uploadedBy), description: cleanDisplayText(item.description), content: item.content ? cleanDisplayText(item.content) : item.content }));
  const selectedDocument = displayDocuments.find((item) => item.id === selectedDocumentId);
  const uploadDocument = (file?: File) => {
    if (!selected || !file) return;
    const existingBytes = patients.reduce((sum, record) => sum + (record.documents||[]).reduce((bytes, document) => bytes + Math.floor((document.dataUrl?.length||0)*0.72), 0), 0);
    if (file.size > 1_500_000 || existingBytes + file.size > 2_000_000) { setNotice("Лимит вложений: до 1,5 МБ на файл и до 2 МБ суммарно."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const document: PatientDocument = { id: makeId(), name: file.name, category: "Вложение врача", date: today, source: "Добавлено врачом", uploadedBy: "Колесникова Полина Сергеевна", description: "Проверьте источник, принадлежность пациенту и содержание документа.", dataUrl: String(reader.result || ""), contentType: file.type || "application/octet-stream" };
      update({ documents: [document, ...(selected.documents || [])] }); setNotice("Файл добавлен в карту пациента.");
    };
    reader.onerror = () => setNotice("Не удалось прочитать файл."); reader.readAsDataURL(file);
  };
  const downloadDocument = async (document: PatientDocument) => {
    try {
      const blob = document.dataUrl ? await (await fetch(document.dataUrl)).blob() : new Blob([document.content || ""], { type: document.contentType || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = document.name; anchor.click(); URL.revokeObjectURL(url);
    } catch { setNotice("Не удалось открыть вложение."); }
  };
  const markUrgentReviewed = () => { if (!selected) return; update({ reviewedAssessmentIds: [...new Set([...(selected.reviewedAssessmentIds || []), ...urgentAssessments.map((item) => item.id)])] }); setNotice("Отметка о просмотре сохранена. Это не подтверждает, что пациенту позвонили или отправили уведомление."); };
  if (selected) return <div className="pw">
    <div className="pw-top"><button className="pw-back" onClick={() => { if(returnToOverview) onReturnToOverview?.(); else setSelectedId(""); setNotice(""); }}><ArrowLeft size={16}/> {returnToOverview ? "Назад к обзору" : "К списку пациентов"}</button></div>
    <div className="pw-record-head"><div className="pw-avatar"><UserRoundPlus size={22}/></div><div className="pw-ident"><div className="pw-eyebrow">КАРТА ПАЦИЕНТА</div><h1>{selected.name.split("·")[0].trim()}</h1><p>{formatAge(selected.age)} · создана {selected.createdAt}</p></div><button className="pw-button secondary" onClick={invite}><KeyRound size={16}/>{selected.accessCode ? "Обновить код доступа" : "Выдать доступ"}</button></div>
    <nav className="pw-tabs">{(["Обзор", "Аналитика", "Диагноз и анамнез", "Лечение", "Тесты", "Документы"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Обзор" && <div className="pw-grid"><div className="pw-span"><ClinicalSupportPanel patient={selected}/></div>
      {urgentAssessments.length > 0 && <section className="pw-card pw-span pw-urgent-review"><div className="pw-card-title"><div><span className="pw-urgent-label">ТРЕБУЕТСЯ ПРЯМОЙ КЛИНИЧЕСКИЙ ПРОСМОТР</span><h2>Пациент отметил ответ на пункт безопасности PHQ-9</h2><p>Последний сигнал: {urgentAssessments[urgentAssessments.length-1].date}. Это не диагноз и не автоматическая оценка риска; требуется прямое уточнение по локальному протоколу.</p></div><ShieldAlert size={20}/></div><div className="pw-caution">Сигнал сохранён в карте пациента. Внешнее или экстренное уведомление не отправлялось.</div><button className="pw-button secondary" onClick={markUrgentReviewed}><Check size={15}/>Отметить, что сигнал просмотрен</button></section>}
      {synthesis && <section className="pw-card pw-span pw-clinical-synthesis"><div className="pw-card-title"><div><span className="pw-eyebrow">ОБЗОР КЛИНИЧЕСКИХ ДАННЫХ</span><h2>{synthesis.signals.some((item)=>item.priority==="direct-review")?"Нужен прямой клинический просмотр":synthesis.signals.some((item)=>item.priority==="review")?"Есть пункты для клинической проверки":"Проверьте полноту записи"}</h2><p>{synthesis.signals.length} сигналов к просмотру · {synthesis.missingContext.length} пробелов · {synthesis.documentsCount} документов</p></div><Activity size={19}/></div>{synthesis.signals.length ? <div className="pw-synthesis-list">{synthesis.signals.map((signal)=><article className={`pw-synthesis-item ${signal.priority}`} key={signal.id}><div><b>{signal.title}</b><p>{signal.detail}</p><small><strong>Источник:</strong> {signal.provenance}</small><p><strong>Дальше:</strong> {signal.action}</p></div><span>{signal.priority==="direct-review"?"ПРЯМОЙ ПРОСМОТР":signal.priority==="review"?"ПРОВЕРИТЬ":"КОНТЕКСТ"}</span></article>)}</div> : <div className="pw-synthesis-empty">В доступных структурированных данных нет сигналов, предусмотренных алгоритмом подсказок. Это не означает отсутствия риска или заболевания.</div>}{synthesis.missingContext.length>0&&<details className="pw-missing-context"><summary>Не хватает данных ({synthesis.missingContext.length})</summary><ul>{synthesis.missingContext.map((item)=><li key={item}>{item}</li>)}</ul></details>}<p className="pw-synthesis-disclaimer">{synthesis.disclaimer}</p></section>}
      {selected.caseScenario && <section className="pw-card pw-span pw-scenario-card"><div className="pw-card-title"><div><span className="pw-scenario-label">КЛИНИЧЕСКИЙ КОНТЕКСТ</span><h2>{selected.caseScenario.title}</h2><p>Сведения из карты для обсуждения и проверки на приёме.</p></div><Activity size={19}/></div><div className="pw-scenario-signals"><b>Что требует внимания</b><ul>{selected.caseScenario.signals.map((signal)=><li key={signal}>{signal}</li>)}</ul></div><div className="pw-scenario-response"><b>Что важно уточнить</b><p>{selected.caseScenario.expectedResponse}</p></div></section>}
      {latestCheckIn && <section className="pw-card"><div className="pw-card-title"><div><h2>Последняя отметка пациента</h2><p>{latestCheckIn.date} · тревога {latestCheckIn.anxiety}/5 · энергия {latestCheckIn.energy}/5 · сон {latestCheckIn.sleep}/5</p></div><Activity size={18}/></div><p><b>Приём:</b> {latestCheckIn.medication === "yes" ? "принял(а)" : latestCheckIn.medication === "late" ? "позже обычного" : latestCheckIn.medication === "missed" ? "не принял(а)" : latestCheckIn.medication === "side-effect" ? "не смог(ла) из-за самочувствия" : "отметка не задана"}</p><p><b>Самочувствие:</b> {latestCheckIn.sideEffects.length ? latestCheckIn.sideEffects.join(", ") : "не отмечены побочные явления"}</p>{sharedComment && <div className="pw-shared-comment"><b>Комментарий, которым пациент согласился поделиться</b><p>{sharedComment}</p></div>}</section>}
      {selected.assessments?.length ? <section className="pw-card"><div className="pw-card-title"><div><h2>Результаты шкал</h2><p>Самоотчёт для обсуждения, не диагноз</p></div><ClipboardPlus size={18}/></div>{[...selected.assessments].reverse().slice(0,4).map((item)=><div className="pw-assessment-row" key={item.id}><span><b>{item.instrument}</b><small>{item.date} · версия: {item.adaptation}</small></span><strong>{item.score}/{item.max}</strong>{item.item9Positive&&<em>Прямое уточнение</em>}</div>)}</section> : null}
      {selected.sessions?.length ? <section className="pw-card pw-span"><div className="pw-card-title"><div><h2>План и заметки для пациента</h2><p>Записи, подготовленные врачом</p></div></div>{[...selected.sessions].reverse().map((session)=><div className="pw-session-row" key={session.id}><b>{session.date} · {session.title}</b>{session.patientNote&&<p>{session.patientNote}</p>}{session.recommendation&&<small>План: {session.recommendation}</small>}</div>)}</section> : null}
      <section className="pw-card"><div className="pw-card-title"><div><h2>Ближайшая запись</h2><p>Расписание визитов</p></div><CalendarClock size={19}/></div>{selected.appointmentDate ? <div className="pw-appointment"><b>{selected.appointmentDate}</b><span>{selected.appointmentTime}</span></div> : <p className="pw-empty">Запись пока не назначена</p>}<button className="pw-button secondary" onClick={() => startDialog("appointment")}><CalendarClock size={15}/>{selected.appointmentDate ? "Перенести / изменить" : "Записать пациента"}</button></section>
      <section className="pw-card"><div className="pw-card-title"><div><h2>Клиническая сводка</h2><p>Заполняется и проверяется врачом</p></div></div><p><b>Диагноз:</b> {cleanDisplayText(selected.diagnosis || "не внесён")}</p><p><b>Анамнез:</b> {cleanDisplayText(selected.history || "не заполнен")}</p><p><b>Аллергии:</b> {cleanDisplayText(selected.allergies)}</p><button className="pw-button secondary" onClick={() => setTab("Диагноз и анамнез")}>Открыть данные <ChevronRight size={15}/></button></section>
      <section className="pw-card pw-span"><div className="pw-card-title"><div><h2>Проверка полноты данных</h2><p>Подсказки не заменяют клиническое решение</p></div><ShieldAlert size={19}/></div><ul className="pw-safety-list">{safety.map((item) => <li key={item}>{item}</li>)}</ul><div className="pw-caution">Система не выдаёт рекомендации по препаратам или дозам: валидированная медицинская база ещё не подключена.</div></section>
    </div>}
    {tab === "Аналитика" && <section className="pw-card pw-span pw-results-dashboard"><div className="pw-card-title"><div><span className="pw-eyebrow">ДИНАМИКА ОТВЕТОВ</span><h2>Аналитика пациента</h2><p>Все графики и показатели относятся только к этой карточке.</p></div><Activity size={19}/></div><div className="pw-dashboard-filters"><label>Опросник<select value={activeDashboardTest} onChange={(e)=>setDashboardTest(e.target.value)} disabled={!assessmentTests.length}>{assessmentTests.length ? assessmentTests.map((test)=><option key={test}>{test}</option>) : <option value="">Пока нет результатов</option>}</select></label><label>Метрика<select value={dashboardMetric} onChange={(e)=>setDashboardMetric(e.target.value)}><option value="total">Итоговый балл</option>{(selected.assessments?.find((item)=>item.instrument===activeDashboardTest)?.answers || []).map((_,index)=><option key={index} value={String(index)}>Пункт {index+1}</option>)}</select></label><label>Период<select value={dashboardPeriod} onChange={(e)=>setDashboardPeriod(e.target.value)}><option value="30">30 дней</option><option value="90">90 дней</option><option value="180">6 месяцев</option><option value="365">12 месяцев</option><option value="all">Всё время</option></select></label></div>{dashboardData.length ? <><div className="pw-dashboard-summary"><span>Попаданий в период <b>{dashboardData.length}</b></span><span>Последнее значение <b>{latestDashboard?.score ?? "—"}</b></span></div><div className="pw-dashboard-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={dashboardData} margin={{top:12,right:18,left:0,bottom:6}}><CartesianGrid strokeDasharray="3 5" stroke="#e8eef4"/><XAxis dataKey="date" tick={{fontSize:11,fill:"#78899b"}}/><YAxis domain={dashboardMetric==="total"?[0,"auto"]:[0,3]} allowDecimals={false} tick={{fontSize:11,fill:"#78899b"}}/><Tooltip/><Line type="monotone" dataKey="score" name={dashboardMetric==="total"?"Итоговый балл":"Ответ по пункту"} stroke="#527fae" strokeWidth={2.5} dot={{r:4}} connectNulls/></LineChart></ResponsiveContainer></div></> : <div className="pw-empty">После прохождения назначенного опросника здесь появится аналитика. Отсутствие результата не является оценкой состояния.</div>}<div className="pw-caution">Результаты шкал — данные для обсуждения. Они не устанавливают диагноз и не дают автоматическую рекомендацию по лечению.</div></section>}
    {tab === "Диагноз и анамнез" && <section className="pw-card pw-editor"><div className="pw-card-title"><div><h2>Диагноз и анамнез</h2><p>Клиническое решение остаётся за врачом</p></div><button className={`pw-button ${clinicalSaved?"clinical-save-ok":""}`} onClick={async()=>{try{const response=await fetch("/api/demo/patients",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"patch",patientId:selected.id,patch:{diagnosis:selected.diagnosis,history:selected.history,allergies:selected.allergies,therapyStartedAt:selected.therapyStartedAt,lastSessionDate:selected.lastSessionDate,followUpDays:selected.followUpDays,allergySubstances:selected.allergySubstances,historyFactors:selected.historyFactors,functioning:selected.functioning||null}})});if(!response.ok)throw new Error();setClinicalSaved(true);setNotice("Изменения сохранены в карточке пациента.")}catch{setClinicalSaved(false);setNotice("Не удалось подтвердить сохранение. Проверьте подключение и повторите.")}}}><Check size={15}/>{clinicalSaved?"Данные сохранены":"Сохранить данные"}</button></div><label>Формулировка диагноза<input value={cleanDisplayText(selected.diagnosis)} onChange={(e) => { update({ diagnosis: e.target.value }); setClinicalSaved(false); }} placeholder="Введите формулировку или оставьте пустым"/></label><div className="care-editor-grid"><label>Начало терапии<input type="date" max={today} value={selected.therapyStartedAt||""} onInput={e=>{update({therapyStartedAt:e.currentTarget.value});setClinicalSaved(false)}} onChange={e=>{update({therapyStartedAt:e.target.value});setClinicalSaved(false)}}/></label><label>Последняя проведённая сессия<input type="date" max={today} value={selected.lastSessionDate||""} onInput={e=>{update({lastSessionDate:e.currentTarget.value});setClinicalSaved(false)}} onChange={e=>{update({lastSessionDate:e.target.value});setClinicalSaved(false)}}/></label><label>Интервал напоминания о сессии, дней<input type="number" min="1" max="365" value={selected.followUpDays||30} onChange={e=>{update({followUpDays:Math.max(1,Math.min(365,Number(e.target.value)||30))});setClinicalSaved(false)}}/></label></div><p>Интервал — настройка расписания врача, не медицинский норматив.</p><label>Вещества с подтверждённой реакцией (по одному на строку)<textarea value={(selected.allergySubstances||[]).join("\n")} onChange={e=>{update({allergySubstances:e.target.value.split("\n")});setClinicalSaved(false)}} placeholder="Укажите точное название вещества. Синонимы и состав не сопоставляются автоматически."/></label><fieldset className="care-history-factors"><legend>Оценка повседневного функционирования</legend><label>Дата оценки<input type="date" max={today} value={selected.functioning?.date||""} onInput={e=>{update({functioning:{date:e.currentTarget.value,impairment:selected.functioning?.impairment||"not-assessed",note:selected.functioning?.note}});setClinicalSaved(false)}} onChange={e=>{update({functioning:{date:e.target.value,impairment:selected.functioning?.impairment||"not-assessed",note:selected.functioning?.note}});setClinicalSaved(false)}}/></label><label>Ограничения<select value={selected.functioning?.impairment||"not-assessed"} onChange={e=>{if(e.target.value==="not-assessed"){update({functioning:undefined})}else update({functioning:{date:selected.functioning?.date||today,impairment:e.target.value as "not-assessed"|"none"|"mild"|"moderate"|"severe",note:selected.functioning?.note}});setClinicalSaved(false)}}><option value="not-assessed">Не оценено</option><option value="none">Ограничений не отмечено</option><option value="mild">Лёгкие ограничения</option><option value="moderate">Умеренные ограничения</option><option value="severe">Выраженные ограничения</option></select></label><label>Что изменилось в работе, отношениях и самообслуживании<textarea value={selected.functioning?.note||""} onChange={e=>{update({functioning:{date:selected.functioning?.date||today,impairment:selected.functioning?.impairment||"not-assessed",note:e.target.value}});setClinicalSaved(false)}}/></label></fieldset><fieldset className="care-history-factors"><legend>Факторы, подтверждённые в беседе</legend>{["Эпизоды подъёма настроения/активности в анамнезе","Семейный анамнез расстройств настроения","Соматические заболевания","Употребление психоактивных веществ","Значимое стрессовое событие","Беременность или лактация"].map(f=><label key={f}><input type="checkbox" checked={selected.historyFactors?.includes(f)||false} onChange={e=>{update({historyFactors:e.target.checked?[...(selected.historyFactors||[]),f]:(selected.historyFactors||[]).filter(x=>x!==f)});setClinicalSaved(false)}}/>{f}</label>)}<small>Отсутствие отметки означает «не внесено», а не отсутствие фактора.</small></fieldset><label>Анамнез жизни и заболевания<textarea value={cleanDisplayText(selected.history)} onChange={(e) => { update({ history: e.target.value }); setClinicalSaved(false); }} placeholder="Клинически значимая информация"/></label><label>Аллергии и нежелательные реакции<textarea value={cleanDisplayText(selected.allergies)} onChange={(e) => { update({ allergies: e.target.value }); setClinicalSaved(false); }} placeholder="Уточнить у пациента"/></label><p className="pw-caution">Данные сохраняются при подтверждении кнопкой. Сверьте их с пациентом и медицинскими источниками; приложение не подтверждает достоверность исходных сведений.</p></section>}
    {tab === "Лечение" && <section className="pw-card"><div className="pw-card-title"><div><h2>Назначения и динамика</h2><p>Назначения пациента</p></div><button className="pw-button" onClick={() => startDialog("medication")}><Plus size={16}/>Добавить назначение</button></div>{selected.medications.length ? <div className="pw-list">{selected.medications.map((med) => <div className="pw-list-row" key={med.id}><div><b>{med.name}</b><small>{med.dose || "дозировка не указана"} · {med.schedule || "режим не указан"}</small></div><button className="pw-text-button" type="button" onClick={() => editMedication(med)}>Изменить</button><label className="pw-toggle"><input type="checkbox" checked={med.active} onChange={(e) => update({ medications: selected.medications.map((item) => item.id === med.id ? { ...item, active: e.target.checked } : item) })}/><span>{med.active ? "Активно" : "Завершено"}</span></label><button className="pw-icon-button" title="Удалить назначение" onClick={() => update({ medications: selected.medications.filter((item) => item.id !== med.id) })}><X size={16}/></button></div>)}</div> : <p className="pw-empty">Назначений пока нет.</p>}<div className="pw-caution">Перед назначением врач проверяет показания, анамнез, аллергии, взаимодействия и дозу по актуальным источникам. Автоматической проверки взаимодействий и дозировок нет.</div></section>}
    {tab === "Тесты" && <><section className="pw-card"><div className="pw-card-title"><div><h2>Шкалы и тесты</h2><p>План и частота заполнения</p></div><button className="pw-button" onClick={() => startDialog("test")}><FilePlus2 size={16}/>Добавить тест</button></div>{selected.tests.length ? <div className="pw-list">{selected.tests.map((test) => <div className="pw-list-row" key={test.id}><div className="pw-test-icon"><FlaskConical size={17}/></div><div className="pw-grow"><b>{test.name}</b><small>Каждые {test.everyDays} дн. · следующий: {test.nextDate}</small></div><label className="pw-toggle"><input type="checkbox" checked={test.active} onChange={(e) => update({ tests: selected.tests.map((item) => item.id === test.id ? { ...item, active: e.target.checked } : item) })}/><span>{test.active ? "Открыт" : "Закрыт"}</span></label><button className="pw-icon-button" title="Удалить тест" onClick={() => update({ tests: selected.tests.filter((item) => item.id !== test.id) })}><X size={16}/></button></div>)}</div> : <p className="pw-empty">Тесты не назначены.</p>}<div className="pw-caution">Формы PHQ-9 и GAD-7 проходят внутри приложения. Другие методики появятся после добавления и клинического утверждения цифровой формы.</div></section>
      <section className="pw-card pw-span pw-results-dashboard"><div className="pw-card-title"><div><span className="pw-eyebrow">ДИНАМИКА ОТВЕТОВ</span><h2>Дашборд результатов</h2><p>Выберите шкалу, показатель и период для этой карточки</p></div><Activity size={19}/></div>
      <div className="pw-dashboard-filters"><label>Опросник<select value={activeDashboardTest} onChange={(e)=>setDashboardTest(e.target.value)} disabled={!assessmentTests.length}>{assessmentTests.length ? assessmentTests.map((test)=><option key={test}>{test}</option>) : <option value="">Пока нет результатов</option>}</select></label><label>Метрика<select value={dashboardMetric} onChange={(e)=>setDashboardMetric(e.target.value)}><option value="total">Итоговый балл</option>{(selected?.assessments?.find((item)=>item.instrument===activeDashboardTest)?.answers || []).map((_,index)=><option key={index} value={String(index)}>Пункт {index+1}</option>)}</select></label><label>Период<select value={dashboardPeriod} onChange={(e)=>setDashboardPeriod(e.target.value)}><option value="30">30 дней</option><option value="90">90 дней</option><option value="180">6 месяцев</option><option value="365">12 месяцев</option><option value="all">Всё время</option></select></label></div>
      {dashboardData.length ? <><div className="pw-dashboard-summary"><span>Попаданий в период <b>{dashboardData.length}</b></span><span>Последнее значение <b>{latestDashboard?.score ?? "—"}</b></span></div><div className="pw-dashboard-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={dashboardData} margin={{top:12,right:18,left:0,bottom:6}}><CartesianGrid strokeDasharray="3 5" stroke="#e8eef4"/><XAxis dataKey="date" tick={{fontSize:11,fill:"#78899b"}}/><YAxis domain={dashboardMetric==="total"?[0,"auto"]:[0,3]} allowDecimals={false} tick={{fontSize:11,fill:"#78899b"}}/><Tooltip/><Line type="monotone" dataKey="score" name={dashboardMetric==="total"?"Итоговый балл":"Ответ по пункту"} stroke="#527fae" strokeWidth={2.5} dot={{r:4}} connectNulls/></LineChart></ResponsiveContainer></div></> : <div className="pw-empty">После прохождения назначенного опросника здесь появится график. Ответы передаются врачу вместе с итоговым баллом.</div>}
      <div className="pw-caution">Результат предназначен для обсуждения и не является автоматической оценкой диагноза или риска. Результат предназначен для обсуждения; диагноз и риск оценивает врач.</div></section></>}
    {tab === "Документы" && <section className="pw-card pw-documents"><div className="pw-card-title"><div><span className="pw-eyebrow">ДОКУМЕНТЫ КАРТЫ</span><h2>Прикреплённые материалы</h2><p>{(selected.documents||[]).length} файлов</p></div><label className="pw-button"><FileUp size={16}/>Добавить файл<input className="pw-file-input" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(event)=>{uploadDocument(event.target.files?.[0]);event.target.value=""}}/></label></div><div className="pw-document-source"><ShieldAlert size={15}/><span>Проверьте автора, дату, принадлежность пациенту и содержание файла. Текст и изображения автоматически не распознаются.</span></div>{displayDocuments.length ? <div className="pw-document-list">{displayDocuments.map((document)=><article className="pw-document-row" key={document.id}><span className="pw-document-icon"><FileText size={19}/></span><div className="pw-grow"><b>{document.name}</b><small>{document.category} · {document.date}</small><small>{document.source} · {document.uploadedBy}</small><p>{document.description}</p></div><button className="pw-icon-button" title="Показать сведения" onClick={()=>setSelectedDocumentId(selectedDocumentId===document.id?"":document.id)}><Eye size={16}/></button><button className="pw-icon-button" title="Скачать файл" onClick={()=>void downloadDocument(document)}><Download size={16}/></button></article>)}</div> : <p className="pw-empty">В этой карточке пока нет документов.</p>}{selectedDocument&&<div className="pw-document-preview"><div><b>{selectedDocument.name}</b><button className="pw-icon-button" onClick={()=>setSelectedDocumentId("")} aria-label="Закрыть просмотр"><X size={15}/></button></div><p>{selectedDocument.description}</p><small>Источник: {selectedDocument.source} · Автор: {selectedDocument.uploadedBy}</small>{selectedDocument.content&&<pre>{selectedDocument.content}</pre>}<button className="pw-button secondary" onClick={()=>void downloadDocument(selectedDocument)}><Download size={15}/>Скачать</button></div>}</section>}
    {notice && <div className="pw-toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Закрыть"><X size={14}/></button></div>}
    {dialog && dialog !== "patient" && <div className="pw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}><form className="pw-dialog" onSubmit={(e) => { e.preventDefault(); saveDialog(); }}><button type="button" className="pw-close" onClick={() => setDialog(null)} aria-label="Закрыть"><X size={18}/></button><div className="pw-eyebrow">НОВАЯ КАРТОЧКА</div><h2>{dialog === "medication" ? "Новое назначение" : dialog === "test" ? "Добавить тест" : "Запись на приём"}</h2>
      {dialog === "medication" ? <><label>Препарат<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название"/></label><label>Доза<input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="По назначению врача"/></label><label>Режим приёма<input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="По назначению врача"/></label></> : dialog === "test" ? <><label>Тест или шкала<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например, PHQ-9"/></label><label>Повторять каждые (дней)<input type="number" min="1" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })}/></label></> : <><label>Дата<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label><label>Время<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}/></label></>}
      <div className="pw-dialog-foot"><button type="button" className="pw-button secondary" onClick={() => setDialog(null)}>Отмена</button><button type="submit" className="pw-button"><Check size={15}/>{dialog === "medication" && editingMedicationId ? "Сохранить изменения" : "Сохранить"}</button></div></form></div>}
  </div>;

  return <div className="pw pw-directory">
    <div className="pw-heading"><div><div className="pw-eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО ВРАЧА</div><h1>Пациенты</h1><p>Карточки, результаты опросников и ближайшие встречи — в одном месте.</p></div><button className="pw-button pw-new-patient" onClick={() => startDialog("patient")} disabled={patients.length >= MAX_PATIENTS} title={patients.length >= MAX_PATIENTS ? `Достигнут лимит ${MAX_PATIENTS} карточек` : undefined}><UserRoundPlus size={17}/>Добавить пациента</button></div>
    <div className="pw-summary pw-summary-modern"><button onClick={()=>setPatientFilter("all")}><span>Все карточки</span><b>{patients.length}</b><small>Открыть реестр <ChevronRight size={13}/></small></button><button onClick={()=>setPatientFilter("appointments")}><span>Ближайшие записи</span><b>{todayAppointments}</b><small>На сегодня <CalendarClock size={13}/></small></button><button onClick={()=>setPatientFilter("tests")}><span>Активные опросники</span><b>{openTestCount}</b><small>Назначены врачом <ClipboardPlus size={13}/></small></button><button className={patientsForReview ? "attention" : ""} onClick={()=>setPatientFilter("review")}><span>Требуют просмотра</span><b>{patientsForReview}</b><small>{patientsForReview ? "Проверить отмеченные сигналы" : "Нет новых отметок"}<ChevronRight size={13}/></small></button></div>
    <section className="pw-directory-panel"><div className="pw-directory-toolbar"><div><h2>Реестр пациентов</h2><p>{filtered.length} из {patients.length} карточек · нажмите на карточку, чтобы открыть</p></div><label className="pw-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Имя, номер или сценарий"/><kbd>⌕</kbd></label></div>
      <div className="pw-filter-row" role="group" aria-label="Фильтр пациентов">{([['all','Все пациенты',patients.length],['review','Требуют внимания',patientsForReview],['appointments','Есть запись',patients.filter((p)=>p.appointmentDate).length],['tests','Назначены тесты',patients.filter((p)=>p.tests.some((t)=>t.active)).length]] as const).map(([key,label,count])=><button key={key} className={patientFilter===key?'active':''} onClick={()=>setPatientFilter(key)}>{label}<span>{count}</span></button>)}</div>
      {filtered.length ? <div className="pw-patient-list pw-patient-grid">{filtered.map((p) => {
        const attention = needsReview(p); const latest = p.assessments?.at(-1);
        const initials = p.name.split(/\s+/).slice(0,2).map((part)=>part[0]).join("").replace("·","");
        return <article className={`pw-patient-card ${attention?'has-attention':''}`} key={p.id}><button className="care-card-open" onClick={() => { setSelectedId(p.id); setTab("Обзор"); setNotice(""); }}>
          <span className="pw-patient-card-top"><span className="pw-avatar small">{initials || <UserRoundPlus size={18}/>}</span><span className={`pw-state ${attention?'review':'routine'}`}>{attention ? <><ShieldAlert size={13}/>Нужен просмотр</> : <>Карта пациента</>}</span><ChevronRight className="pw-card-arrow" size={17}/></span>
          <span className="pw-patient-card-name">{p.name.split("·")[0].trim()}</span><span className="pw-patient-card-meta">{formatAge(p.age)}</span>
          <span className="pw-patient-card-topic">{p.diagnosis || "Диагноз не внесён"}</span>
          <span className="pw-patient-card-bottom"><span>{latest ? <><ClipboardPlus size={14}/>{latest.instrument}: {latest.score}/{latest.max}</> : <><ClipboardPlus size={14}/>Нет результатов</>}</span><span>{p.appointmentDate ? <><CalendarClock size={14}/>{p.appointmentDate} · {p.appointmentTime}</> : "Без записи"}</span></span>
          
        </button><div className="care-card-actions"><FollowUpBadge patient={p}/><button className="pw-button secondary" onClick={()=>onAddAppointment?.(p.id)}><CalendarClock size={14}/>Запись</button></div></article>;
      })}</div> : <div className="pw-empty pw-directory-empty"><Search size={24}/><b>Ничего не найдено</b><span>Попробуйте изменить запрос или сбросить фильтр.</span><button className="pw-button secondary" onClick={()=>{setQuery("");setPatientFilter("all")}}>Сбросить фильтр</button></div>}
    </section>
    {notice && <div className="pw-toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Закрыть"><X size={14}/></button></div>}
    {dialog === "patient" && <div className="pw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setDialog(null); if(returnToOverview) onReturnToOverview?.(); } }}><form className="pw-dialog pw-new-patient-dialog" onSubmit={(e) => { e.preventDefault(); createPatient(); }}><button type="button" className="pw-close" onClick={() => { setDialog(null); if(returnToOverview) onReturnToOverview?.(); }} aria-label="Закрыть"><X size={18}/></button><div className="pw-eyebrow">НОВАЯ КАРТОЧКА</div><h2>Новый пациент</h2><p className="pw-dialog-intro">Создайте карточку, чтобы добавить расписание, план шкал и клиническую информацию. Пациентов: {patients.length}.</p><label>ФИО<input required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Фамилия Имя Отчество" autoComplete="name"/></label><label>Возраст<input required type="number" min="0" max="120" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="Полных лет" inputMode="numeric"/></label><label className="pw-diagnosis-label">Диагноз или клиническая формулировка<div className="pw-diagnosis-autocomplete"><div className="pw-diagnosis-input-wrap"><Search size={15}/><textarea rows={2} value={patientDiagnosis} onFocus={() => setDiagnosisSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setDiagnosisSuggestionsOpen(false), 150)} onChange={(e) => { setPatientDiagnosis(e.target.value); setDiagnosisSuggestionsOpen(true); }} placeholder="Начните вводить диагноз" autoComplete="off" aria-autocomplete="list" aria-expanded={diagnosisSuggestionsOpen}></textarea></div>{diagnosisSuggestionsOpen&&<div className="pw-diagnosis-options" role="listbox" aria-label="Подсказки по клиническим рекомендациям">{diagnosisSuggestions.filter(item => !patientDiagnosis.trim() || `${item.title} ${item.code} ${item.terms}`.toLocaleLowerCase("ru-RU").includes(patientDiagnosis.trim().toLocaleLowerCase("ru-RU"))).map(item=><div className="pw-diagnosis-option" key={item.code}><button type="button" role="option" onMouseDown={e=>e.preventDefault()} onClick={()=>{setPatientDiagnosis(`${item.title} (${item.code})`);setDiagnosisSuggestionsOpen(false)}}><b>{item.title}</b><small>МКБ-10: {item.code} · {item.guideline}</small></button><a href={item.url} target="_blank" rel="noreferrer" aria-label={`Открыть ${item.guideline}`}><ExternalLink size={13}/></a></div>)}{diagnosisSuggestions.filter(item => !patientDiagnosis.trim() || `${item.title} ${item.code} ${item.terms}`.toLocaleLowerCase("ru-RU").includes(patientDiagnosis.trim().toLocaleLowerCase("ru-RU"))).length===0&&<p>Совпадений среди подсказок проекта нет. Врач может внести формулировку вручную.</p>}</div>}</div><small className="pw-diagnosis-caption">Подсказки по действующим КР Минздрава РФ для тематики проекта. Выбор и постановка диагноза — решение врача.</small></label><section className="pw-emias-card"><div className="pw-emias-card-icon"><Database size={18}/></div><div className="pw-emias-card-main"><b>Данные из ЕМИАС</b><small>Необязательный шаг — можно добавить сейчас или вернуться к нему позже.</small></div><button type="button" className="pw-emias-add" onClick={()=>setEmiasInfoOpen(open=>!open)}><Plus size={14}/>Добавить данные</button>{emiasInfoOpen&&<div className="pw-emias-info"><b>Подключение ЕМИАС пока не настроено</b><span>Создайте карточку без импорта. Данные можно будет связать позже, когда интеграция станет доступна.</span><button type="button" onClick={()=>setEmiasInfoOpen(false)}>Понятно, продолжить без ЕМИАС</button></div>}</section><p className="pw-dialog-note">После создания карточки можно выдать пациенту код доступа. Данные ЕМИАС для создания не требуются.</p><div className="pw-dialog-foot"><button type="button" className="pw-button secondary" onClick={() => { setDialog(null); if(returnToOverview) onReturnToOverview?.(); }}>Отмена</button><button type="submit" className="pw-button" disabled={creatingPatient}><Check size={15}/>{creatingPatient?"Сохранение…":"Создать карточку"}</button></div></form></div>}
  </div>;
}








