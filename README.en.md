<p align="center"><a href="README.md">Русский</a> · <strong>English</strong> · <a href="README.de.md">Deutsch</a></p>
<p align="center"><img src="public/logo.svg" width="112" alt="Clinical Compass logo"></p>
<h1 align="center">Clinical Compass</h1>
<p align="center">Explainable support for clinical follow-up<br>Clinician and patient workspaces</p>
<p align="center"><a href="docs/pitch/clinical-compass-defense.pdf">Presentation</a> · <a href="docs/demo/clinical-compass-demo.mp4">Demo video</a> · <a href="docs/physician-support-algorithm.md">Algorithm</a> · <a href="#run-locally">Run locally</a></p>

![Clinical Compass](docs/assets/presentation-cover.jpg)

Clinical Compass brings patient self-reports, PHQ-9 and GAD-7 scores, medical history, functioning and treatment information into one view. Each prompt shows the underlying observation, why it needs attention, what to clarify and its source.

**Project status:** working demonstration prototype. All built-in patient records are fictional. Clinical effectiveness and the scenario-based forecasts have not been externally validated. Do not enter real medical data into the public demo.

This README is available in three languages. The application interface, screenshots, presentation and detailed methodology are currently in Russian.

## Project materials

- [Presentation PDF — 30 main slides and 6 backup slides](docs/pitch/clinical-compass-defense.pdf).
- [Animated presentation for offline use](docs/pitch/clinical-compass-defense-offline.zip): extract the archive and open `index.html`.
- [Demo video with Russian captions, no voice-over](docs/demo/clinical-compass-demo.mp4).
- [Slide outline, speaker notes and references](docs/pitch/structure-36-slides.md).
- [Detailed algorithm with diagrams](docs/physician-support-algorithm.md).
- [Algorithm documentation in Word](docs/Алгоритм%20помощи%20врачу.docx).

The animated presentation is also available locally at `http://localhost:3000/pitch/index.html`. Use the arrow keys to navigate, `F` for full screen, `N` for notes and `G` for the overview.

## Two workspaces, one care pathway

![Clinician and patient interfaces](docs/assets/two-roles.jpg)

**Clinician:** appointments and records awaiting review, patient registry, individual records, interactive symptom trends, original questionnaire responses, prompts and follow-up scheduling.

![Clinician analytics](public/pitch/assets/doctor-analysis.jpg)

**Patient:** assigned questionnaires, a wellbeing diary, medication intake and unwanted-experience logs, appointments and a care plan. Private diary entries are kept separate from comments shared with the clinician.

![Patient workspace](public/pitch/assets/patient-home.jpg)

**Scheduling:** a traffic-light indicator flags a missing future appointment or an interval that exceeds the selected threshold after a confirmed session. Its colour reflects a scheduling issue, not clinical severity.

![Scheduling](public/pitch/assets/doctor-calendar.jpg)

## How the algorithm works

1. Reads structured records and an assessment date.
2. Checks dates, value ranges, responses, form versions and duplicates.
3. Retains a positive response to PHQ-9 item 9 separately, even when the total score is inconsistent.
4. Calculates comparable changes within each scale.
5. Considers symptoms alongside functioning and explicitly recorded context.
6. Produces prompts and conditional scenarios with explanations.
7. Leaves the clinician to review the evidence, make decisions and update the record.

The `support-0.3.0` engine is deterministic: the same data and assessment date produce the same result. A separate synthesis module reviews combinations of findings; its temporal validation is currently less strict.

A change in score is not a probability of remission. A symptom occurring during treatment does not establish that a medicine caused it. Item 9 requires direct clarification and does not replace a clinical safety assessment.

## Validation record

The demonstration dataset contains 7 fictional patient records and 15 questionnaire results. These test software branches; they are neither a training dataset nor a clinical sample.

```bash
npm run test:clinical
npx tsc --noEmit
```

The project's validation record dated **27 October 2026** reports 47 passing automated clinical-logic tests and a passing web-application type check. CI repeats these checks. The main user journeys were also checked in a local browser. No clinical study or load testing has been conducted.

## Run locally

You need Node.js 22 and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The start page provides demonstration entry points for clinician and patient roles. A clinician can issue an access code from a fictional record and link the patient workspace to it.

The demonstration API runs only in development mode. Data is held in process memory and in the browser. Use `npm run dev` for the demo workflow.

## Technology and structure

- Next.js 16, React 19, TypeScript and Recharts.
- `app/` — web interface and demonstration API.
- `components/doctor/` and `components/patient/` — the two workspaces.
- `lib/clinical-support.ts` — state, trends, scenarios and prompts.
- `lib/clinical-synthesis.ts` — a partial review of combined findings.
- `lib/patient-insights.ts` — scale categories and reminders.
- `tests/` — automated checks.
- `public/pitch/` — standalone animated presentation.
- `docs/` — methodology, presentation and video.
- `mobile/` — a separate experimental Expo project, excluded from the web application's type check.

## References

- [Russian clinical guideline 301_3, 2024 edition](https://apicr.minzdrav.gov.ru/api.ashx?id=301_3&op=GetClinrecPdf).
- [Russian clinical guideline 457_3, 2024 edition](https://apicr.minzdrav.gov.ru/api.ashx?id=457_3&op=GetClinrecPdf).
- [PHQ-9, Kroenke et al., 2001](https://pubmed.ncbi.nlm.nih.gov/11556941/).
- [GAD-7, Spitzer et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16717171/).
- [Measurement-based care, Zhu et al., 2021](https://www.psychiatrist.com/jcp/measurement-based-care-depression/).
- [PHQ-9 item 9, Na et al., 2018](https://pubmed.ncbi.nlm.nih.gov/29477096/).

Guideline versions must be checked again before a pilot. The 7-, 14- and 90-day windows and the conditional scenario horizon are prototype settings, not universal intervals prescribed by the guidelines.

## Next steps

![Scaling plan](docs/assets/scaling.jpg)

**Before a pilot:** consistent validation across modules, record history, a log of responses to signals, persistent secure storage, roles and auditing.

**During a pilot:** expert review of prompts; measurement of appointment-preparation time, false signals, workload and patient engagement.

**After demonstrating value:** medical-information-system integrations, team-based care and additional workflows. Drug databases, NLP and probabilistic models require separate sources and validation.

The prototype does not implement a live EMIAS integration, production-grade authentication, a complete drug-interaction database, drug or dose selection, or automatic emergency notification delivery.

## Visual identity

The project logo was supplied by its author and is used unchanged. The palette combines blue `#3F5C88`, light blue and white, with soft purple accents in the presentation. [Visual identity notes](docs/brand-identity.md).

Project team: **MedTech Minds**.