"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Heart, Pill, Activity, Shield, BookOpen, BarChart3, ClipboardList, CheckCircle2 } from "lucide-react";

type Props = {
  checkinDone: boolean;
  medTaken: boolean;
  onCheckin: () => void;
  onDiary: () => void;
  onStats: () => void;
  onStartTest: (test: "gad7" | "phq9") => void;
  onTakeMed: () => void;
};

export function PatientHome({ checkinDone, medTaken, onCheckin, onDiary, onStats, onStartTest, onTakeMed }: Props) {
  const primaryBtn = "transition-all duration-100 ease-out shadow-[0_4px_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.4)] active:shadow-[0_0_0_0_hsl(var(--primary)/0.4)] active:translate-y-1";
  const outlineBtn = "transition-all duration-100 ease-out shadow-[0_3px_0_0_hsl(var(--border))] hover:shadow-[0_1px_0_0_hsl(var(--border))] active:shadow-none active:translate-y-0.5 hover:bg-accent/40";

  const rings = [
    { done: checkinDone, color: "stroke-emerald-500", label: "Чекин" },
    { done: medTaken, color: "stroke-blue-500", label: "Препарат" },
    { done: false, color: "stroke-amber-500", label: "Тест" },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Верхняя навигация */}
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-primary"><Heart className="mr-1 h-4 w-4" /> Главная</Button>
            <Button variant="ghost" size="sm" onClick={onDiary}><BookOpen className="mr-1 h-4 w-4" /> Дневник</Button>
            <Button variant="ghost" size="sm" onClick={onStats}><BarChart3 className="mr-1 h-4 w-4" /> Статистика</Button>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Добрый день</h1>
            <p className="text-sm text-muted-foreground">Как вы себя чувствуете сегодня?</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Левая колонка */}
          <div className="space-y-4">
            {/* Чекин */}
            <Card className={`border-none shadow-sm ${checkinDone ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ежедневный чекин</p>
                    <p className="font-medium">
                      {checkinDone ? "Ты молодец! На сегодня чекин пройден" : "Коротко расскажи о себе"}
                    </p>
                  </div>
                  {checkinDone ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Heart className="h-5 w-5 text-primary" />}
                </div>
                {!checkinDone && (
                  <Button className={`mt-4 w-full ${primaryBtn}`} onClick={onCheckin}>Начать чекин</Button>
                )}
              </CardContent>
            </Card>

            {/* Тесты */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Тесты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">GAD-7 · Тревога</p>
                    <p className="text-xs text-muted-foreground">Доступен через 4 дня</p>
                  </div>
                  <Button size="sm" variant="outline" disabled>Заблокирован</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  <div>
                    <p className="font-medium text-sm">PHQ-9 · Депрессия</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Пройден · 8 баллов</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onStartTest("phq9")}>Посмотреть</Button>
                </div>
              </CardContent>
            </Card>

            {/* Препарат */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${medTaken ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-primary/10"}`}>
                    <Pill className={`h-5 w-5 ${medTaken ? "text-emerald-600" : "text-primary"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Авиандр 20 мг</p>
                    <p className="text-sm text-muted-foreground">{medTaken ? "Сегодня уже принял" : "Сегодня в 20:00"}</p>
                  </div>
                  {!medTaken && (
                    <Button size="sm" className={primaryBtn} onClick={onTakeMed}>Принял</Button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
                  {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((d, i) => (
                    <div key={d} className="flex flex-col items-center gap-1">
                      <span className="text-muted-foreground">{d}</span>
                      <div className={`h-6 w-6 rounded-full border-2 ${i < 3 || medTaken && i === 3 ? "border-emerald-500 bg-emerald-500" : "border-muted bg-secondary"}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            {/* Кольца */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Сегодня</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative h-32 w-32">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    {rings.map((r, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={38 - i * 10}
                        fill="none"
                        strokeWidth="8"
                        className={r.done ? r.color : "stroke-secondary"}
                        strokeDasharray={r.done ? "100 0" : "0 100"}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {rings.filter(r => r.done).length}/3
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  {rings.map(r => (
                    <div key={r.label} className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${r.done ? "bg-emerald-500" : "bg-muted"}`} />
                      {r.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Совет дня */}
            <Card className="border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Совет дня</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Сделайте короткую прогулку на 10–15 минут. Даже небольшая активность помогает снизить тревогу.</p>
              </CardContent>
            </Card>

            <Button variant="outline" className={`h-12 w-full justify-start gap-3 ${outlineBtn}`}>
              <Shield className="h-5 w-5" /> Поддержка и помощь
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}