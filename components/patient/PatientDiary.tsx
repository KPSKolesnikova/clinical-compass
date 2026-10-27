"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Heart, BookOpen, BarChart3 } from "lucide-react";

type DiaryEntry = {
  id: string;
  date: string;
  method: string;
  content: string;
  mood: number;
};

type Props = {
  diaries: DiaryEntry[];
  onNew: () => void;
  onHome: () => void;
  onStats: () => void;
};

const methods = ["Ежедневный чекин (Амалия)", "Запись мыслей (КПТ)", "Дневник активности", "Дневник сна", "Благодарности", "Симптомы и триггеры"];

export function PatientDiary({ diaries, onNew, onHome, onStats }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return diaries.filter(d => {
      const matchSearch = d.content.toLowerCase().includes(search.toLowerCase());
      const matchMethod = filter === "all" || d.method === filter;
      return matchSearch && matchMethod;
    });
  }, [diaries, search, filter]);

  const primaryBtn = "transition-all duration-100 ease-out shadow-[0_4px_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.4)] active:shadow-[0_0_0_0_hsl(var(--primary)/0.4)] active:translate-y-1";

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Дневник</h1>
          <Button size="sm" className={primaryBtn} onClick={onNew}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Все</Button>
          {methods.map(m => (
            <Button key={m} size="sm" variant={filter === m ? "default" : "outline"} onClick={() => setFilter(m)} className="whitespace-nowrap">
              {m.split(" ")[0]}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Записей нет</p>
          ) : (
            filtered.map(d => (
              <Card key={d.id} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{d.date}</p>
                      <p className="text-sm font-medium">{d.method}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{d.mood}/10</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm">{d.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-around py-3">
          <Button variant="ghost" size="sm" onClick={onHome} className="flex-col gap-1 h-auto"><Heart className="h-5 w-5" /><span className="text-xs">Главная</span></Button>
          <Button variant="ghost" size="sm" className="flex-col gap-1 h-auto text-primary"><BookOpen className="h-5 w-5" /><span className="text-xs">Дневник</span></Button>
          <Button variant="ghost" size="sm" onClick={onStats} className="flex-col gap-1 h-auto"><BarChart3 className="h-5 w-5" /><span className="text-xs">Статистика</span></Button>
        </div>
      </div>
    </main>
  );
}
