"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type Props = {
  testType: "gad7" | "phq9";
  onBack: () => void;
  onComplete: (score: number) => void;
};

const gad7 = [
  "Чувство нервозности, тревоги или напряжения",
  "Неспособность остановить или контролировать беспокойство",
  "Чрезмерное беспокойство по разным поводам",
  "Трудности с расслаблением",
  "Настолько беспокойны, что трудно усидеть на месте",
  "Легко раздражаетесь или становитесь нетерпеливы",
  "Чувство страха, будто может случиться что-то ужасное",
];

const phq9 = [
  "Мало интереса или удовольствия от того, что вы делаете",
  "Чувство подавленности, депрессии или безнадёжности",
  "Проблемы с засыпанием, сном или слишком долгий сон",
  "Чувство усталости или недостатка энергии",
  "Плохой аппетит или переедание",
  "Плохое мнение о себе — или чувство, что вы неудачник",
  "Трудности с концентрацией внимания",
  "Двигаетесь или говорите так медленно, что другие могли это заметить? Или наоборот — беспокойны?",
  "Мысли о том, что вам было бы лучше умереть, или о причинении себе вреда",
];

export function PatientTest({ testType, onBack, onComplete }: Props) {
  const questions = testType === "gad7" ? gad7 : phq9;
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const primaryBtn = "transition-all duration-100 ease-out shadow-[0_4px_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.4)] active:shadow-[0_0_0_0_hsl(var(--primary)/0.4)] active:translate-y-1";

  const score = answers.reduce((sum, a) => sum + (a >= 0 ? a : 0), 0);
  const allAnswered = answers.every(a => a >= 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">{testType === "gad7" ? "GAD-7" : "PHQ-9"}</h1>
            <p className="text-sm text-muted-foreground">За последние 2 недели, как часто вас беспокоило следующее?</p>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-medium">{i + 1}. {q}</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {["Ни разу", "Несколько дней", "Более половины дней", "Почти каждый день"].map((label, v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={answers[i] === v ? "default" : "outline"}
                    className="h-auto py-2 text-xs"
                    onClick={() => {
                      const next = [...answers];
                      next[i] = v;
                      setAnswers(next);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <Button
            className={`w-full ${primaryBtn}`}
            disabled={!allAnswered}
            onClick={() => onComplete(score)}
          >
            Завершить · {score} баллов
          </Button>
        </div>
      </div>
    </main>
  );
}