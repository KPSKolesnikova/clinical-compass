"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, UserPlus } from "lucide-react";

type Props = {
  onBack: () => void;
  onCreate: (name: string, phone: string) => void;
};

export function AddPatient({ onBack, onCreate }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const primaryBtn = "transition-all duration-100 ease-out shadow-[0_4px_0_0_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_0_0_hsl(var(--primary)/0.4)] active:shadow-[0_0_0_0_hsl(var(--primary)/0.4)] active:translate-y-1";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <ThemeToggle />
      <Button variant="ghost" className="absolute left-4 top-4" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Назад
      </Button>
      <Card className="w-full max-w-sm border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Новый пациент</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ФИО</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" />
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 916 123-45-67" />
          </div>
          <Button className={`h-12 w-full ${primaryBtn}`} onClick={() => onCreate(name, phone)}>
            Создать карточку и выдать код
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}