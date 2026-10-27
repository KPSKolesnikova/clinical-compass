"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Heart, Activity, Moon, Users } from "lucide-react";

type Props = {
  onBack: () => void;
  onSubmit: () => void;
};

export function PatientCheckin({ onBack, onSubmit }: Props) {
  const [anxiety, setAnxiety] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [people, setPeople] = useState(5);

  const primaryBtn = "transition-all duration-100 ease-out shadow-[0_4px_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.4)] active:shadow-[0_0_0_0_hsl(var(--primary)/0.4)] active:translate-y-1";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Чекин по Амалии</h1>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="flex items-center gap-2"><Heart className="h-4 w-4" /> Тревога</Label>
            <input type="range" min="1" max="10" value={anxiety} onChange={(e) => setAnxiety(Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-right text-sm text-muted-foreground">{anxiety}/10</p>
          </div>
          <div>
            <Label className="flex items-center gap-2"><Activity className="h-4 w-4" /> Энергия</Label>
            <input type="range" min="1" max="10" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-right text-sm text-muted-foreground">{energy}/10</p>
          </div>
          <div>
            <Label className="flex items-center gap-2"><Moon className="h-4 w-4" /> Сон</Label>
            <input type="range" min="1" max="10" value={sleep} onChange={(e) => setSleep(Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-right text-sm text-muted-foreground">{sleep}/10</p>
          </div>
          <div>
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Общение</Label>
            <input type="range" min="1" max="10" value={people} onChange={(e) => setPeople(Number(e.target.value))} className="mt-2 w-full" />
            <p className="text-right text-sm text-muted-foreground">{people}/10</p>
          </div>

          <Button className={`w-full ${primaryBtn}`} onClick={onSubmit}>
            Сохранить чекин
          </Button>
        </div>
      </div>
    </main>
  );
}