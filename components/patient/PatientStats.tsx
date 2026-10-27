"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, BookOpen, BarChart3 } from "lucide-react";

type Props = {
  onHome: () => void;
  onDiary: () => void;
};

export function PatientStats({ onHome, onDiary }: Props) {
  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-6 text-2xl font-semibold">Статистика</h1>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-primary">5</p>
              <p className="text-xs text-muted-foreground">Записей</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold text-primary">3</p>
              <p className="text-xs text-muted-foreground">Дней подряд</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Динамика тревоги</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-end gap-1">
              {[6, 5, 4, 3].map((v, i) => (
                <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${v * 10}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Календарь заполнений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: 30 }, (_, i) => {
                const filled = i > 25 || i === 18 || i === 20;
                return (
                  <div
                    key={i}
                    className={`flex h-8 items-center justify-center rounded ${filled ? "bg-primary/30 text-primary" : "bg-secondary"}`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-around py-3">
          <Button variant="ghost" size="sm" onClick={onHome} className="h-auto flex-col gap-1">
            <Heart className="h-5 w-5" /><span className="text-xs">Главная</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onDiary} className="h-auto flex-col gap-1">
            <BookOpen className="h-5 w-5" /><span className="text-xs">Дневник</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-auto flex-col gap-1 text-primary">
            <BarChart3 className="h-5 w-5" /><span className="text-xs">Статистика</span>
          </Button>
        </div>
      </div>
    </main>
  );
}