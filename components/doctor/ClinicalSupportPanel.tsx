"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BookOpen, ExternalLink, Minus, Sparkles } from "lucide-react";
import BrandMark from "../BrandMark";
import { buildClinicalSupport, type SupportInput, type SupportSource } from "../../lib/clinical-support";

type Props = { patient: SupportInput; now?: Date; compact?: boolean };
const directionLabels = {
  improving: "Снижение баллов",
  worsening: "Рост баллов",
  stable: "Без изменения",
  mixed: "Неоднородная динамика",
  insufficient: "Нужны повторные данные",
};
const shortSource = (source: SupportSource) => source.title.match(/КР\s+\d+_\d+/)?.[0] || source.title.split("·").slice(0, 2).join("·").trim();

export default function ClinicalSupportPanel({ patient, now, compact = false }: Props) {
  const [fallbackNow, setFallbackNow] = useState(() => new Date());
  useEffect(() => {
    if (now) return;
    const timer = window.setInterval(() => setFallbackNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, [now]);
  const report = buildClinicalSupport(patient, now || fallbackNow);
  const visibleAdvice = compact ? report.advice.slice(0, 3) : report.advice;

  return <section className={`clinical-support ${compact ? "clinical-support-compact" : ""}`} aria-label="Клиническая оценка и прогноз">
    <header className="cs-header">
      <div className="cs-heading-symbol"><BrandMark /></div>
      <div><span className="dd-kicker">ПОДДЕРЖКА КЛИНИЧЕСКОГО РЕШЕНИЯ</span><h2>Клиническая оценка и прогноз</h2><p>Сводка на {report.asOf} · основания, сценарии и следующий шаг</p></div>
      <span className="cs-mode">{compact ? "На дату тестирования" : "Для специалиста"}</span>
    </header>

    <div className={`cs-state ${report.state.tone}`}>
      <div className="cs-section-label"><Activity size={16} /><span>Текущее состояние по данным</span><span className={`care-status ${report.state.tone}`}><i aria-hidden="true" />{report.state.tone === "neutral" ? "Нужны данные" : report.state.tone === "red" ? "Приоритетный просмотр" : report.state.tone === "amber" ? "Требует внимания" : "Низкие баллы"}</span></div>
      <h3>{report.state.title}</h3><p>{report.state.summary}</p>
      {report.state.evidence.length > 0 && <ul className="cs-evidence">{report.state.evidence.map((evidence, index) => <li key={`${index}-${evidence}`}>{evidence}</li>)}</ul>}
      <details className="cs-data-details"><summary>Давность и полнота данных{report.state.unknowns.length > 0 ? ` · ${report.state.unknowns.length} уточнений` : ""}</summary><p>{report.state.freshness}</p>{report.state.unknowns.map((unknown, index) => <p key={index}>{unknown}</p>)}</details>
    </div>

    {report.trajectories.length > 0 && <div className="cs-trajectories" aria-label="Наблюдаемая динамика по шкалам">{report.trajectories.map(trajectory => {
      const TrendIcon = trajectory.direction === "improving" ? ArrowDownRight : trajectory.direction === "worsening" ? ArrowUpRight : Minus;
      return <article className="cs-trajectory" key={trajectory.instrument}>
        <div className="cs-trajectory-top"><b>{trajectory.instrument}</b><span className={trajectory.recent ? "cs-fresh" : "cs-stale"}>{trajectory.latestDate}{!trajectory.recent ? " · обновить" : ""}</span></div>
        <div className="cs-trajectory-score"><strong>{trajectory.latestScore}<small>/{trajectory.max}</small></strong><span>{trajectory.category}</span></div>
        <div className={`cs-direction ${trajectory.direction}`}><TrendIcon size={16} />{directionLabels[trajectory.direction]}</div>
        <p>{trajectory.summary}</p>
        {trajectory.relativeChange !== null && <small className="cs-observed-change">Изменение к первой точке: <b>{trajectory.relativeChange > 0 ? "+" : ""}{trajectory.relativeChange}%</b> · наблюдение, не вероятность</small>}
      </article>;
    })}</div>}

    <div className={`cs-forecast ${report.forecast.kind}`}>
      <div className="cs-section-label"><Sparkles size={17} /><span>Условный прогноз</span><span className="cs-horizon">{report.forecast.horizon}</span></div>
      <h3>{report.forecast.title}</h3><p>{report.forecast.summary}</p>
      {report.forecast.scenarios.length > 0 && <div className="cs-scenarios">{report.forecast.scenarios.map((scenario, index) => <article key={scenario.title}><span className="cs-scenario-number">0{index + 1}</span><h4>{scenario.title}</h4><p>{scenario.condition}</p><strong>{scenario.outlook}</strong></article>)}</div>}
      <details className="cs-data-details"><summary>На чём основан прогноз</summary><p>{report.forecast.basis}</p></details>
    </div>

    {visibleAdvice.length > 0 && <div className="cs-advice-section"><div className="cs-advice-heading"><h3>Рекомендации специалисту</h3><span>{report.advice.length} по данным этой карты</span></div><ol className="cs-advice-list">{visibleAdvice.map((advice, index) => <li key={advice.id}>
      <div className={`cs-advice-index ${advice.priority}`}>{String(index + 1).padStart(2, "0")}</div>
      <div className="cs-advice-body"><h4>{advice.title}</h4><p>{advice.action}</p><details><summary>Основание и пересмотр</summary><p><b>Почему:</b> {advice.reason}</p><p><b>Когда пересмотреть:</b> {advice.reassess}</p></details><div className="cs-advice-sources">{advice.sourceIds.map(id => report.sources.find(source => source.id === id)).filter((source): source is SupportSource => Boolean(source)).map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" title={`${source.title} · ${source.section}`}><BookOpen size={12} />{shortSource(source)}<ExternalLink size={10} /></a>)}</div></div>
    </li>)}</ol>{compact && report.advice.length > visibleAdvice.length && <p className="cs-compact-note">Полный список рекомендаций доступен в основной аналитике карты.</p>}</div>}

    {report.dataIssues.length > 0 && <details className="cs-issues"><summary>Проверить качество исходных данных · {report.dataIssues.length}</summary><ul>{report.dataIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></details>}
    <footer className="cs-footer"><details><summary><BookOpen size={14} />Источники и методика</summary><div className="cs-source-list">{report.sources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><b>{source.title}<ExternalLink size={12} /></b><span>{source.section}</span></a>)}</div><p>Рекомендации опираются на указанные тексты. Сценарный прогноз — объяснимая логика алгоритма без внешней клинической валидации. Актуальность самой новой редакции КР проверяется отдельно.</p></details><span>{report.version}</span></footer>
  </section>;
}
