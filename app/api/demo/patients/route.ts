import { patchDemoPatient, readDemoState, replaceDemoPatients, type DemoPatient } from "../../../../lib/demo-store";
import { psychiatricDemoCases } from "../../../../lib/psychiatric-demo-cases";


function demoDisabled() {
  return process.env.NODE_ENV !== "development";
}

export async function GET(request: Request) {
  if (demoDisabled()) return Response.json({ error: "Demo API доступен только в локальном режиме разработки." }, { status: 404 });
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim().toUpperCase();
  let state = readDemoState();
  const seeds = psychiatricDemoCases as DemoPatient[];
  const seedIds = new Set(seeds.map((patient) => patient.id));
  const obsoleteIds = new Set(["CC-1042", "CC-1043", "CC-1044", "DEMO-CLIN-08", "DEMO-CLIN-09", "DEMO-CLIN-10"]);
  const savedById = new Map<string, DemoPatient>(state.patients.map((patient) => [patient.id, patient]));
  const seededPatients = seeds.map((seed) => {
    const saved = savedById.get(seed.id);
    const savedDiagnosis = typeof saved?.diagnosis === "string" ? saved.diagnosis.trim() : "";
    const diagnosis = !savedDiagnosis || /^Не внес[её]н/i.test(savedDiagnosis) ? seed.diagnosis : savedDiagnosis;
    return { ...seed, ...(saved || {}), diagnosis, name: typeof saved?.name === "string" && !/^[А-ЯЁа-яё]+ [А-ЯЁ]\.$/.test(saved.name) ? saved.name : seed.name, emias: saved?.emias || seed.emias, documents: Array.isArray(saved?.documents) && saved.documents.length ? saved.documents : seed.documents };
  });
  const additionalPatients = state.patients.filter((patient) => !seedIds.has(patient.id) && !obsoleteIds.has(patient.id));
  const activeCohort = [...seededPatients, ...additionalPatients].slice(0, 20);
  if (JSON.stringify(state.patients) !== JSON.stringify(activeCohort)) state = replaceDemoPatients(activeCohort);
  if (code) {
    const patient = state.patients.find((item) => item.accessCode?.toUpperCase() === code);
    if (!patient) return Response.json({ error: "Код не найден." }, { status: 404 });
    return Response.json({ patient, updatedAt: state.updatedAt, demoOnly: true });
  }
  return Response.json({ patients: state.patients, updatedAt: state.updatedAt, demoOnly: true });
}

export async function POST(request: Request) {
  if (demoDisabled()) return Response.json({ error: "Demo API доступен только в локальном режиме разработки." }, { status: 404 });
  let body: { action?: string; patients?: DemoPatient[]; patient?: DemoPatient; patientId?: string; patch?: Partial<DemoPatient> };
  try { body = await request.json(); } catch { return Response.json({ error: "Некорректный JSON." }, { status: 400 }); }

  if (body.action === "create" && body.patient && typeof body.patient.id === "string" && typeof body.patient.name === "string") {
    const state = readDemoState();
    if (state.patients.length >= 20) return Response.json({ error: "Достигнут лимит: 20 карточек." }, { status: 400 });
    if (state.patients.some(patient => patient.id === body.patient!.id)) return Response.json({ error: "Карточка уже существует." }, { status: 409 });
    const next = replaceDemoPatients([...state.patients, body.patient]);
    return Response.json({ patient: body.patient, updatedAt: next.updatedAt, demoOnly: true }, { status: 201 });
  }
  if (body.action === "replace" && Array.isArray(body.patients)) {
    if (body.patients.length > 20) return Response.json({ error: "Достигнут лимит: 20 карточек." }, { status: 400 });
    const state = replaceDemoPatients(body.patients);
    return Response.json({ updatedAt: state.updatedAt, count: state.patients.length, demoOnly: true });
  }
  if (body.action === "patch" && body.patientId && body.patch && typeof body.patch === "object") {
    const state = patchDemoPatient(body.patientId, body.patch);
    if (!state) return Response.json({ error: "Карточка не найдена." }, { status: 404 });
    return Response.json({ updatedAt: state.updatedAt, demoOnly: true });
  }
  return Response.json({ error: "Неизвестная операция." }, { status: 400 });
}




