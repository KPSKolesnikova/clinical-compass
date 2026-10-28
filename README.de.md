<p align="center"><a href="README.md">Русский</a> · <a href="README.en.md">English</a> · <strong>Deutsch</strong></p>
<p align="center"><img src="public/logo.svg" width="112" alt="Logo von Clinical Compass"></p>
<h1 align="center">Clinical Compass</h1>
<p align="center">Nachvollziehbare Unterstützung bei der klinischen Verlaufskontrolle<br>Arbeitsbereiche für Behandelnde und Patientinnen und Patienten</p>
<p align="center"><a href="docs/pitch/clinical-compass-defense.pdf">Präsentation</a> · <a href="docs/demo/clinical-compass-demo.mp4">Demovideo</a> · <a href="docs/physician-support-algorithm.md">Algorithmus</a> · <a href="#lokal-starten">Lokal starten</a></p>

![Clinical Compass](docs/assets/presentation-cover.jpg)

Clinical Compass führt Selbstberichte, PHQ-9- und GAD-7-Werte, Anamnese, Alltagsfunktionsniveau und Behandlungsinformationen in einer Ansicht zusammen. Jeder Hinweis zeigt die zugrunde liegende Beobachtung, den Anlass zur Prüfung, eine Frage zur weiteren Abklärung und die Quelle.

**Projektstand:** funktionsfähiger Demonstrationsprototyp. Sämtliche integrierten Patientenakten sind fiktiv. Die klinische Wirksamkeit und die szenariobasierten Prognosen wurden nicht extern validiert. In der öffentlichen Demo dürfen keine echten medizinischen Daten eingegeben werden.

Diese Projektbeschreibung liegt in drei Sprachen vor. Die Benutzeroberfläche, Bildschirmaufnahmen, Präsentation und ausführliche Methodendokumentation sind derzeit auf Russisch.

## Projektmaterialien

- [Präsentation als PDF — 30 Haupt- und 6 Reservefolien](docs/pitch/clinical-compass-defense.pdf).
- [Animierte Präsentation für die Offline-Nutzung](docs/pitch/clinical-compass-defense-offline.zip): Archiv entpacken und `index.html` öffnen.
- [Demovideo mit russischen Untertiteln, ohne Sprachaufnahme](docs/demo/clinical-compass-demo.mp4).
- [Folienübersicht, Vortragsnotizen und Quellen](docs/pitch/structure-36-slides.md).
- [Ausführliche Beschreibung des Algorithmus mit Diagrammen](docs/physician-support-algorithm.md).
- [Algorithmusdokumentation als Word-Datei](docs/Алгоритм%20помощи%20врачу.docx).

Die animierte Präsentation lässt sich lokal unter `http://localhost:3000/pitch/index.html` öffnen. Navigation mit den Pfeiltasten, `F` für Vollbild, `N` für Notizen und `G` für die Übersicht.

## Zwei Arbeitsbereiche in einem Behandlungspfad

![Oberflächen für Behandelnde und Patienten](docs/assets/two-roles.jpg)

**Für Behandelnde:** Termine und Einträge zur Prüfung, Patientenübersicht, Einzelakten, interaktive Verlaufsansichten, ursprüngliche Fragebogenantworten, Hinweise und die Planung weiterer Kontakte.

![Verlaufsansicht für Behandelnde](public/pitch/assets/doctor-analysis.jpg)

**Für Patientinnen und Patienten:** zugewiesene Fragebögen, ein Befindenstagebuch, Angaben zur Medikamenteneinnahme und zu unerwünschten Empfindungen, Termine und ein Behandlungsplan. Private Tagebucheinträge sind von den Kommentaren getrennt, die mit den Behandelnden geteilt werden.

![Patientenbereich](public/pitch/assets/patient-home.jpg)

**Terminplanung:** Eine organisatorische Ampel weist auf einen fehlenden Folgetermin oder die Überschreitung des gewählten Intervalls nach einem bestätigten Termin hin. Ihre Farbe bewertet keinen klinischen Schweregrad.

![Terminplanung](public/pitch/assets/doctor-calendar.jpg)

## Funktionsweise des Algorithmus

1. Liest strukturierte Einträge und einen Bewertungsstichtag ein.
2. Prüft Datumsangaben, Wertebereiche, Antworten, Formularversionen und Duplikate.
3. Erhält eine positive Antwort auf PHQ-9-Item 9 gesondert, auch wenn der Gesamtwert nicht mit den Einzelantworten übereinstimmt.
4. Berechnet vergleichbare Veränderungen innerhalb jeder Skala.
5. Betrachtet Symptome zusammen mit dem Alltagsfunktionsniveau und ausdrücklich dokumentiertem Kontext.
6. Erstellt nachvollziehbare Hinweise und bedingte Szenarien.
7. Überlässt die Prüfung der Grundlagen, Entscheidungen und die Aktualisierung der Akte den Behandelnden.

Die Engine `support-0.3.0` ist deterministisch: Gleiche Daten und derselbe Stichtag ergeben dasselbe Ergebnis. Ein separates Synthesemodul betrachtet Kombinationen von Befunden; seine zeitliche Validierung ist derzeit weniger streng.

Eine Änderung des Skalenwerts ist keine Wahrscheinlichkeit für eine Remission. Dass ein Symptom während einer Behandlung auftritt, belegt keine Arzneimittelkausalität. Item 9 erfordert eine direkte Abklärung und ersetzt keine klinische Sicherheitsbeurteilung.

## Bisherige Prüfungen

Der Demonstrationsdatensatz enthält 7 fiktive Akten und 15 Fragebogenergebnisse. Damit werden Programmverzweigungen geprüft; es handelt sich weder um einen Trainingsdatensatz noch um eine klinische Stichprobe.

```bash
npm run test:clinical
npx tsc --noEmit
```

Laut dem dokumentierten Prüfstand vom **27. Oktober 2026** waren 47 automatisierte Tests der klinischen Logik und die Typprüfung der Webanwendung erfolgreich. CI führt diese Prüfungen erneut aus. Die wichtigsten Nutzungsabläufe wurden außerdem im lokalen Browser überprüft. Eine klinische Studie und Lasttests wurden nicht durchgeführt.

## Lokal starten

Voraussetzungen: Node.js 22 und npm. Im Hauptverzeichnis des Repositories:

```bash
npm ci
npm run dev
```

`http://localhost:3000` öffnen. Die Startseite bietet Demo-Einstiege für beide Rollen. Im Behandelndenbereich lässt sich aus einer fiktiven Akte ein Zugangscode erzeugen, um den Patientenbereich damit zu verknüpfen.

Die Demo-API funktioniert nur im Entwicklungsmodus. Daten werden im Arbeitsspeicher des Prozesses und im Browser gespeichert. Für den Demoablauf ist `npm run dev` vorgesehen.

## Technik und Verzeichnisstruktur

- Next.js 16, React 19, TypeScript und Recharts.
- `app/` — Weboberfläche und Demo-API.
- `components/doctor/` und `components/patient/` — die beiden Arbeitsbereiche.
- `lib/clinical-support.ts` — Zustand, Verläufe, Szenarien und Hinweise.
- `lib/clinical-synthesis.ts` — teilweise Auswertung von Befundkombinationen.
- `lib/patient-insights.ts` — Skalenkategorien und Erinnerungen.
- `tests/` — automatisierte Prüfungen.
- `public/pitch/` — eigenständig nutzbare animierte Präsentation.
- `docs/` — Methodik, Präsentation und Video.
- `mobile/` — separates experimentelles Expo-Projekt; nicht Teil der Typprüfung der Webanwendung.

## Quellen

- [Russische klinische Leitlinie 301_3, Fassung 2024](https://apicr.minzdrav.gov.ru/api.ashx?id=301_3&op=GetClinrecPdf).
- [Russische klinische Leitlinie 457_3, Fassung 2024](https://apicr.minzdrav.gov.ru/api.ashx?id=457_3&op=GetClinrecPdf).
- [PHQ-9, Kroenke et al., 2001](https://pubmed.ncbi.nlm.nih.gov/11556941/).
- [GAD-7, Spitzer et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16717171/).
- [Measurement-based Care, Zhu et al., 2021](https://www.psychiatrist.com/jcp/measurement-based-care-depression/).
- [PHQ-9-Item 9, Na et al., 2018](https://pubmed.ncbi.nlm.nih.gov/29477096/).

Vor einem Pilotprojekt muss die Aktualität der Leitlinienfassungen erneut geprüft werden. Die Zeitfenster von 7, 14 und 90 Tagen sowie der bedingte Szenariohorizont sind Einstellungen des Prototyps, keine allgemeingültigen Fristen aus den Leitlinien.

## Weitere Entwicklung

![Plan für die Weiterentwicklung](docs/assets/scaling.jpg)

**Vor einem Pilotprojekt:** einheitliche Validierung der Module, Aktenhistorie, Protokoll der Reaktionen auf Hinweise, dauerhafte geschützte Speicherung, Rollen und Auditierung.

**Im Pilotprojekt:** fachliche Bewertung der Hinweise sowie Messung der Vorbereitungszeit für Kontakte, von Fehlalarmen, Arbeitsbelastung und Patientenbeteiligung.

**Nach dem Nutzennachweis:** Anbindung an medizinische Informationssysteme, gemeinsame Betreuung im Team und weitere Abläufe. Arzneimitteldatenbanken, NLP und probabilistische Modelle benötigen eigene Quellen und eine gesonderte Validierung.

Eine produktive EMIAS-Anbindung, produktionsreife Authentifizierung, eine vollständige Datenbank für Arzneimittelinteraktionen, die Auswahl von Arzneimitteln oder Dosierungen und die automatische Zustellung von Notfallmeldungen sind nicht implementiert.

## Gestaltung

Das Projektlogo wurde vom Urheber bereitgestellt und unverändert übernommen. Die Farbpalette besteht aus Blau `#3F5C88`, Hellblau und Weiß; die Präsentation ergänzt dezente violette Akzente. [Hinweise zur visuellen Identität](docs/brand-identity.md).

Projektteam: **MedTech Minds**.