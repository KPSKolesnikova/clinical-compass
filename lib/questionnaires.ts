export type QuestionnaireId = "PHQ-9" | "GAD-7";
export type Questionnaire = { id: QuestionnaireId; title: string; recall: string; questions: string[]; responses: string[]; max: number };

// Russian display copy for a working prototype. The exact version and translation must be approved by clinical owners before clinical use.
export const questionnaires: Record<QuestionnaireId, Questionnaire> = {
  "PHQ-9": {
    id: "PHQ-9", title: "Опросник о состоянии здоровья", recall: "За последние 2 недели",
    questions: [
      "Мало интереса или удовольствия от занятий",
      "Подавленное настроение, грусть или чувство безнадёжности",
      "Трудности с засыпанием или поддержанием сна, либо слишком долгий сон",
      "Усталость или недостаток энергии",
      "Снижение аппетита или переедание",
      "Недовольство собой — ощущение, что вы подвели себя или близких",
      "Трудности с концентрацией, например при чтении или просмотре",
      "Заметная окружающим медлительность движений или речи — либо, наоборот, беспокойство и суетливость",
      "Мысли о том, что лучше было бы умереть, или о причинении себе вреда",
    ],
    responses: ["Совсем нет", "Несколько дней", "Более половины дней", "Почти каждый день"], max: 27,
  },
  "GAD-7": {
    id: "GAD-7", title: "Шкала тревоги", recall: "За последние 2 недели",
    questions: [
      "Нервозность, тревога или ощущение напряжения",
      "Невозможность остановить или контролировать тревожные мысли",
      "Чрезмерное беспокойство по разным поводам",
      "Трудности с расслаблением",
      "Беспокойство настолько сильное, что трудно усидеть на месте",
      "Раздражительность или лёгкая вспыльчивость",
      "Страх, будто может случиться что-то ужасное",
    ],
    responses: ["Совсем нет", "Несколько дней", "Более половины дней", "Почти каждый день"], max: 21,
  },
};

export function getQuestionnaireId(name: string): QuestionnaireId | null {
  const normalized = name.trim().toUpperCase().replace(/\s+/g, "");
  if (normalized.includes("PHQ-9") || normalized.includes("PHQ9")) return "PHQ-9";
  if (normalized.includes("GAD-7") || normalized.includes("GAD7")) return "GAD-7";
  return null;
}
