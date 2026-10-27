export type DemoPatient = { id: string; accessCode?: string; [key: string]: unknown };
type DemoState = { patients: DemoPatient[]; updatedAt: string };

declare global {
  // Kept only in the local Next.js development process for a synthetic demo.
  var __clinicalCompassDemoState: DemoState | undefined;
}

export function readDemoState(): DemoState {
  if (!globalThis.__clinicalCompassDemoState) {
    globalThis.__clinicalCompassDemoState = { patients: [], updatedAt: new Date().toISOString() };
  }
  return globalThis.__clinicalCompassDemoState;
}

export function replaceDemoPatients(patients: DemoPatient[]): DemoState {
  globalThis.__clinicalCompassDemoState = { patients, updatedAt: new Date().toISOString() };
  return globalThis.__clinicalCompassDemoState;
}

export function patchDemoPatient(patientId: string, patch: Partial<DemoPatient>): DemoState | null {
  const state = readDemoState();
  const index = state.patients.findIndex((patient) => patient.id === patientId);
  if (index < 0) return null;
  state.patients[index] = { ...state.patients[index], ...patch, id: patientId };
  state.updatedAt = new Date().toISOString();
  return state;
}
