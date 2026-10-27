"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Search, Plus, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  diagnosis: string;
  status: "green" | "amber" | "red";
};

type Appointment = {
  id: string;
  patientName: string;
  time: string;
  type: string;
  day: number;
  startHour: number;
  duration: number;
};

type Props = {
  patients: Patient[];
  appointments: Appointment[];
  onBack: () => void;
  onOpenPatient: (p: Patient) => void;
  onStartAppointment: (p: Patient) => void;
  onAddPatient: () => void;
  onAddAppointment: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
};

const hours = [8, 9, 10, 11, 12, 13, 14, 15];
const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function DoctorHome({
  patients,
  appointments,
  onBack,
  onOpenPatient,
  onStartAppointment,
  onAddPatient,
  onAddAppointment,
  onDeletePatient,
}: Props) {
  const [search, setSearch] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const needsAttention = patients.filter(p => p.status === "red" || p.status === "amber");
  const statusColor = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
  const typeColor: Record<string, string> = {
    "Контрольный": "bg-blue-100 border-blue-300 text-blue-800",
    "Первичный": "bg-emerald-100 border-emerald-300 text-emerald-800",
    "Коррекция": "bg-amber-100 border-amber-300 text-amber-800",
  };

  const primaryBtn = "transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]";

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Шапка */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-semibold">Кабинет врача</h1>
              <p className="text-sm text-muted-foreground">Анна Сергеевна · Психиатр</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button className={primaryBtn} onClick={onAddPatient}>
              <Plus className="mr-1.5 h-4 w-4" /> Пациент
            </Button>
          </div>
        </div>

        {/* Требуют внимания */}
        {needsAttention.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Требуют внимания</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {needsAttention.map(p => (
                <button
                  key={p.id}
                  onClick={() => onOpenPatient(p)}
                  className="flex min-w-[180px] items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition hover:shadow-md"
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${statusColor[p.status]}`} />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.diagnosis}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Список пациентов */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {filtered.map(p => (
                <Card key={p.id} className="border-none shadow-sm transition hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${statusColor[p.status]}`} />
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.diagnosis.split(" ").slice(0, 3).join(" ")}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeletePatient(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onStartAppointment(p)}>Приём</Button>
                      <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onOpenPatient(p)}>Карта</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Недельный календарь */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Расписание</CardTitle>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted-foreground">Неделя</span>
                <Button size="icon" variant="ghost" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Заголовки дней */}
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b text-center text-xs">
                    <div />
                    {days.map((d, i) => (
                      <div key={d} className={`py-2 font-medium ${i === 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {d} <span className="text-foreground">{10 + i}</span>
                      </div>
                    ))}
                  </div>

                  {/* Сетка времени */}
                  <div className="relative">
                    {hours.map(h => (
                      <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                        <div className="py-3 pr-2 text-right text-xs text-muted-foreground">{h}:00</div>
                        {days.map((_, di) => (
                          <div key={di} className="relative h-14 border-l" />
                        ))}
                      </div>
                    ))}

                    {/* Записи */}
                    {appointments.map(a => {
                      const dayIndex = (a.day % 7);
                      const top = (a.startHour - 8) * 56;
                      const height = a.duration * 56 - 4;
                      return (
                        <div
                          key={a.id}
                          className={`absolute rounded-lg border px-2 py-1 text-xs shadow-sm ${typeColor[a.type] || "bg-secondary"}`}
                          style={{
                            left: `calc(60px + ${(dayIndex / 7) * 100}% + 4px)`,
                            width: "calc(14.28% - 8px)",
                            top: `${top + 4}px`,
                            height: `${height}px`,
                          }}
                        >
                          <p className="font-medium leading-tight">{a.patientName.split(" ")[0]}</p>
                          <p className="opacity-80">{a.time}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}