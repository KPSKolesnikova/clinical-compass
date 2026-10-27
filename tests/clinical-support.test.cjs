const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Match the app's ES2017 target; preserving Set/Map iteration matters here.
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync('lib/clinical-support.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText;
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { buildClinicalSupport, clinicalSnapshotAt } = loaded.exports;

const now = new Date(2026, 9, 26, 12, 0);
const assessment = (instrument, score, date, extra = {}) => ({
  instrument, score, date, max: instrument === 'PHQ-9' ? 27 : 21,
  adaptation: 'ru-v1', ...extra,
});
const phq = (score, date, extra) => assessment('PHQ-9', score, date, extra);
const gad = (score, date, extra) => assessment('GAD-7', score, date, extra);
const support = (extra = {}) => buildClinicalSupport({ age: 32, ...extra }, now);
const adviceIds = (result) => result.advice.map((item) => item.id);

test('historical snapshot cannot use current medication, undated history or later observations',()=>{
  const patient={age:32,historyFactors:['Соматические заболевания'],medications:[{name:'A',dose:'1',schedule:'утро',active:true}],assessments:[phq(9,'2026-10-01'),phq(1,'2026-10-26')],checkIns:[{date:'2026-10-26',anxiety:1,energy:5,sleep:5,medication:'yes',sideEffects:[]}],functioning:{date:'2026-10-26',impairment:'none'}};
  const snapshot=clinicalSnapshotAt(patient,'2026-10-01',now);
  assert.ok(snapshot);assert.equal(snapshot.patient.assessments.length,1);assert.equal(snapshot.patient.checkIns.length,0);assert.equal(snapshot.patient.functioning,undefined);assert.equal(snapshot.patient.historyFactors,undefined);assert.equal(snapshot.patient.medications,undefined);
});
test('historical snapshots reject impossible/future dates and do not assume adult age in the past',()=>{
  assert.equal(clinicalSnapshotAt({age:32},'2026-02-31',now),null);assert.equal(clinicalSnapshotAt({age:32},'2026-10-27',now),null);
  assert.equal(clinicalSnapshotAt({age:18},'2026-10-01',now).patient.age,undefined);
  assert.equal(clinicalSnapshotAt({age:18},'2026-10-26',now).patient.age,18);
});
test('reported medication without a recorded regimen stays an explained unknown',()=>{
  const result=support({assessments:[phq(2,'2026-10-24')],checkIns:[{date:'2026-10-25',anxiety:1,energy:5,sleep:5,medication:'yes',sideEffects:['Ничего']}]});
  assert.equal(result.state.tone,'amber');assert.ok(result.state.unknowns.some(s=>s.includes('схема')));assert.ok(adviceIds(result).includes('regimen-context'));
});

test('local calendar date is used consistently rather than the timestamp time of day', () => {
  const early = buildClinicalSupport({ age: 32, assessments: [phq(3, '2026-10-26')] }, new Date(2026, 9, 26, 0, 1));
  const late = buildClinicalSupport({ age: 32, assessments: [phq(3, '2026-10-26')] }, new Date(2026, 9, 26, 23, 59));
  assert.equal(early.asOf, '2026-10-26');
  assert.equal(late.asOf, early.asOf);
  assert.equal(early.trajectories[0].recent, true);
  assert.equal(late.trajectories[0].recent, true);
});

test('future, impossible and malformed assessment dates never become current evidence', () => {
  const result = support({ assessments: [
    phq(2, '2026-10-25'), phq(25, '2026-10-27'),
    phq(25, '2026-02-31'), phq(25, '26.10.2026'),
  ] });
  assert.equal(result.trajectories.length, 1);
  assert.equal(result.trajectories[0].latestDate, '2026-10-25');
  assert.equal(result.trajectories[0].latestScore, 2);
  assert.equal(result.dataIssues.length, 3);
  assert.ok(!result.state.evidence.some((item) => item.includes('25/27')));
});

test('invalid future safety entry is not presented as a current safety response', () => {
  const result = support({ assessments: [phq(1, '2026-10-27', { item9Positive: true })] });
  assert.equal(result.state.tone, 'neutral');
  assert.ok(!adviceIds(result).includes('safety'));
  assert.equal(result.trajectories.length, 0);
  assert.ok(result.dataIssues.length > 0);
});

test('freshness is inclusive at 14 calendar days and expires after that', () => {
  const boundary = support({ assessments: [phq(2, '2026-10-12')] });
  const stale = support({ assessments: [phq(2, '2026-10-11')] });
  assert.equal(boundary.trajectories[0].recent, true);
  assert.equal(stale.trajectories[0].recent, false);
  assert.equal(stale.state.tone, 'neutral');
  assert.equal(stale.forecast.kind, 'insufficient');
  assert.ok(adviceIds(stale).includes('refresh'));
});

test('fractional, negative, out-of-range and mismatched-max scores are excluded', () => {
  for (const record of [
    phq(1.5, '2026-10-25'), phq(-1, '2026-10-25'),
    phq(28, '2026-10-25'), phq(2, '2026-10-25', { max: 21 }),
    gad(22, '2026-10-25'), assessment('unknown', 2, '2026-10-25'),
  ]) {
    const result = support({ assessments: [record] });
    assert.equal(result.trajectories.length, 0);
    assert.equal(result.dataIssues.length, 1);
    assert.equal(result.forecast.kind, 'review-first');
  }
});

test('answer length, response bounds and answer sum must agree with the score', () => {
  for (const answers of [
    [1, 0], [4, 0, 0, 0, 0, 0, 0, 0, 0],
    [0.5, 0.5, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
  ]) {
    const result = support({ assessments: [phq(1, '2026-10-25', { answers })] });
    assert.equal(result.trajectories.length, 0);
    assert.ok(result.dataIssues.some((item) => item.includes('не согласованы')));
  }
  const valid = support({ assessments: [phq(1, '2026-10-25', { answers: [1, 0, 0, 0, 0, 0, 0, 0, 0] })] });
  assert.equal(valid.trajectories.length, 1);
});

test('an explicit item 9 answer overrides a low total even when the total is corrupt', () => {
  const result = support({ assessments: [phq(0, '2026-10-25', { answers: [0, 0, 0, 0, 0, 0, 0, 0, 1] })] });
  assert.equal(result.trajectories.length, 0);
  assert.equal(result.state.tone, 'red');
  assert.equal(result.forecast.kind, 'review-first');
  assert.ok(adviceIds(result).includes('safety'));
  assert.ok(result.dataIssues.length > 0);
});

test('cached safety flag is retained when the stored answer vector is incomplete', () => {
  const result = support({ assessments: [phq(1, '2026-10-25', { answers: [1], item9Positive: true })] });
  assert.equal(result.state.tone, 'red');
  assert.ok(adviceIds(result).includes('safety'));
  assert.equal(result.forecast.kind, 'review-first');
});

test('historical safety remains visible but is not classified as current urgency', () => {
  const result = support({ assessments: [
    phq(10, '2026-10-01', { item9Positive: true }), phq(4, '2026-10-25'),
  ] });
  assert.ok(adviceIds(result).includes('historical-safety'));
  assert.ok(!adviceIds(result).includes('safety'));
  assert.notEqual(result.state.tone, 'red');
  assert.ok(result.state.unknowns.some((item) => item.includes('исторический ответ')));
});

test('identical same-day copies do not inflate the amount of longitudinal evidence', () => {
  const last = phq(6, '2026-10-25', { id: 'last' });
  const result = support({ assessments: [phq(14, '2026-10-01'), last, { ...last, id: 'copy' }] });
  assert.equal(result.trajectories[0].points, 2);
  assert.equal(result.trajectories[0].direction, 'improving');
  assert.match(result.forecast.basis, /Основания предварительные/);
});

test('conflicting latest-day values prevent fallback to an older reassuring value', () => {
  const result = support({ assessments: [phq(2, '2026-10-01'), phq(3, '2026-10-25'), phq(20, '2026-10-25')] });
  assert.equal(result.trajectories.length, 0);
  assert.ok(result.state.unknowns.some((item) => item.includes('последний день')));
  assert.ok(result.dataIssues.some((item) => item.includes('противоречащие результаты')));
  assert.equal(result.forecast.kind, 'review-first');
});

test('a switch of form version starts a new comparable trajectory', () => {
  const result = support({ assessments: [
    phq(20, '2026-09-01'), phq(10, '2026-10-01'),
    phq(4, '2026-10-25', { adaptation: 'ru-v2' }),
  ] });
  assert.equal(result.trajectories[0].points, 1);
  assert.equal(result.trajectories[0].change, null);
  assert.equal(result.trajectories[0].direction, 'insufficient');
  assert.ok(result.dataIssues.some((item) => item.includes('версии формы различаются')));
});

test('a returning old version is not bridged across an intervening version', () => {
  const result = support({ assessments: [
    phq(20, '2026-10-01'), phq(12, '2026-10-10', { adaptation: 'ru-v2' }),
    phq(4, '2026-10-25'),
  ] });
  assert.equal(result.trajectories[0].points, 1);
  assert.equal(result.trajectories[0].change, null);
});

test('unsorted measurements are ordered by event date before computing change', () => {
  const result = support({ assessments: [phq(5, '2026-10-25'), phq(15, '2026-10-01'), phq(10, '2026-10-12')] });
  assert.equal(result.trajectories[0].change, -10);
  assert.equal(result.trajectories[0].spanDays, 24);
  assert.equal(result.trajectories[0].direction, 'improving');
});

test('conflicting PHQ-9 and GAD-7 directions yield mixed scenarios rather than a single improving outlook', () => {
  const result = support({ assessments: [
    phq(14, '2026-10-01'), phq(8, '2026-10-25'),
    gad(5, '2026-10-01'), gad(12, '2026-10-25'),
  ] });
  assert.equal(result.trajectories.find((item) => item.instrument === 'PHQ-9').direction, 'improving');
  assert.equal(result.trajectories.find((item) => item.instrument === 'GAD-7').direction, 'worsening');
  assert.equal(result.forecast.kind, 'conditional');
  assert.match(result.forecast.title, /Неоднородная динамика/);
  assert.ok(!adviceIds(result).includes('maintain-gains'));
});

test('within-series reversal is treated as mixed even when the net change is negative', () => {
  const result = support({ assessments: [phq(14, '2026-10-01'), phq(5, '2026-10-12'), phq(8, '2026-10-25')] });
  assert.equal(result.trajectories[0].change, -6);
  assert.equal(result.trajectories[0].direction, 'mixed');
  assert.match(result.forecast.title, /Неоднородная динамика/);
});

test('one point or a short measurement window does not create a trend forecast', () => {
  for (const assessments of [[phq(3, '2026-10-25')], [phq(10, '2026-10-22'), phq(3, '2026-10-25')]]) {
    const result = support({ assessments });
    assert.equal(result.trajectories[0].direction, 'insufficient');
    assert.equal(result.forecast.kind, 'insufficient');
    assert.equal(result.forecast.scenarios.length, 0);
  }
});

test('not-assessed functioning never becomes evidence of intact functioning', () => {
  const result = support({ assessments: [phq(2, '2026-10-25')], functioning: { date: '2026-10-25', impairment: 'not-assessed' } });
  assert.ok(result.state.unknowns.some((item) => item.includes('функционирования')));
  assert.ok(!result.state.evidence.some((item) => item.includes('ограничений не отмечено')));
  assert.ok(adviceIds(result).includes('functioning'));
});

test('stale or future functioning is excluded while fresh severe impairment prompts direct assessment', () => {
  for (const date of ['2026-10-01', '2026-10-27', '2026-02-31']) {
    const result = support({ assessments: [phq(2, '2026-10-25')], functioning: { date, impairment: 'severe' } });
    assert.ok(!adviceIds(result).includes('severe-function'));
    assert.notEqual(result.state.tone, 'red');
  }
  const severe = support({ assessments: [phq(2, '2026-10-25')], functioning: { date: '2026-10-25', impairment: 'severe' } });
  assert.equal(severe.state.tone, 'red');
  assert.equal(severe.forecast.kind, 'review-first');
  assert.ok(adviceIds(severe).includes('severe-function'));
});

test('unknown, invalid and minor age prevent adult intervention advice and conditional forecasting', () => {
  for (const age of [undefined, NaN, 17, 0]) {
    const result = support({ age, assessments: [phq(12, '2026-10-01'), phq(8, '2026-10-25')] });
    assert.equal(result.state.tone, 'neutral');
    assert.equal(result.forecast.kind, 'review-first');
    assert.ok(result.state.unknowns.some((item) => item.includes('Возраст')));
    assert.ok(!adviceIds(result).includes('depression-plan'));
    assert.ok(!adviceIds(result).includes('maintain-gains'));
  }
});

test('a safety response is not suppressed solely because age is missing or below 18', () => {
  for (const age of [undefined, 17]) {
    const result = support({ age, assessments: [phq(1, '2026-10-25', { item9Positive: true })] });
    assert.equal(result.state.tone, 'red');
    assert.ok(adviceIds(result).includes('safety'));
    assert.equal(result.forecast.kind, 'review-first');
  }
});

test('future diary entries cannot create present tolerability concerns', () => {
  const result = support({ assessments: [phq(2, '2026-10-25')], checkIns: [
    { date: '2026-10-27', anxiety: 5, energy: 1, sleep: 1, medication: 'side-effect', sideEffects: ['Тошнота'] },
  ] });
  assert.ok(!adviceIds(result).includes('tolerability'));
  assert.ok(result.state.unknowns.some((item) => item.includes('дневника')));
});

test('contradictory diary choices block an uncomplicated forecast and remain explicitly explained', () => {
  const result = support({ assessments: [phq(12, '2026-10-01'), phq(8, '2026-10-25')], checkIns: [
    { date: '2026-10-25', anxiety: 3, energy: 3, sleep: 3, medication: 'yes', sideEffects: ['Ничего', 'Тошнота'] },
  ] });
  assert.equal(result.forecast.kind, 'review-first');
  assert.ok(result.dataIssues.some((item) => item.includes('одновременно')));
});

test('scenario and recommendation output retains explanations and resolvable source references', () => {
  const result = support({ assessments: [phq(14, '2026-10-01'), phq(9, '2026-10-12'), phq(5, '2026-10-25')] });
  assert.equal(result.forecast.kind, 'conditional');
  assert.equal(result.forecast.scenarios.length, 3);
  assert.ok(result.forecast.scenarios.every((item) => item.condition && item.outlook));
  assert.match(result.forecast.basis, /не прошла внешнюю клиническую валидацию/);
  assert.ok(result.advice.every((item) => item.reason && item.action && item.reassess));
  const sourceIds = new Set(result.sources.map((item) => item.id));
  assert.ok(result.advice.every((item) => item.sourceIds.every((id) => sourceIds.has(id))));
});

test('fresh mild and moderate functional limitations cannot be coloured green by a low symptom total', () => {
  for (const impairment of ['mild', 'moderate']) {
    for (const date of ['2026-10-25', '2026-10-12']) {
      const result = support({
        assessments: [phq(2, '2026-10-25')],
        functioning: { date, impairment },
      });
      assert.equal(result.state.tone, 'amber', `${impairment}, ${date}`);
      assert.match(result.state.title, /ограничени/i);
      assert.ok(result.state.evidence.some((item) => item.includes('Функционирование')));
    }
  }
});

test('functional limitations outside the freshness window are not silently presented as current', () => {
  const result = support({
    assessments: [phq(2, '2026-10-25')],
    functioning: { date: '2026-10-11', impairment: 'moderate' },
  });
  assert.equal(result.state.tone, 'green');
  assert.ok(!result.state.evidence.some((item) => item.includes('Функционирование')));
  assert.ok(result.state.unknowns.some((item) => item.includes('функционирования')));
  const intact = support({
    assessments: [phq(2, '2026-10-25')],
    functioning: { date: '2026-10-25', impairment: 'none' },
  });
  assert.equal(intact.state.tone, 'green');
  assert.match(intact.state.evidence.join(' '), /ограничений не отмечено/);
});

test('missing or blank form versions remain unknown and never produce a strong comparability claim', () => {
  for (const adaptation of [undefined, '', '   ']) {
    const result = support({ assessments: [
      phq(14, '2026-10-01', { adaptation }),
      phq(9, '2026-10-12', { adaptation }),
      phq(5, '2026-10-25', { adaptation }),
    ] });
    assert.equal(result.trajectories[0].formVersion, null);
    assert.match(result.forecast.basis, /Основания предварительные/);
    assert.doesNotMatch(result.forecast.basis, /Есть не менее трёх сопоставимых точек/);
  }
  const known = support({ assessments: [phq(14, '2026-10-01'), phq(9, '2026-10-12'), phq(5, '2026-10-25')] });
  assert.equal(known.trajectories[0].formVersion, 'ru-v1');
  assert.match(known.forecast.basis, /Есть не менее трёх сопоставимых точек/);
});

test('an intervening unknown version cannot bridge two known-version segments', () => {
  const result = support({ assessments: [
    phq(14, '2026-10-01'),
    phq(9, '2026-10-12', { adaptation: undefined }),
    phq(5, '2026-10-25'),
  ] });
  assert.equal(result.trajectories[0].formVersion, 'ru-v1');
  assert.equal(result.trajectories[0].points, 1);
  assert.equal(result.trajectories[0].change, null);
  assert.doesNotMatch(result.forecast.basis, /Есть не менее трёх сопоставимых точек/);
});

test('absent and false cached safety flags do not make otherwise identical same-day results conflict', () => {
  const last = phq(2, '2026-10-25', { answers: [2, 0, 0, 0, 0, 0, 0, 0, 0] });
  const result = support({ assessments: [
    phq(10, '2026-10-01'), last, { ...last, item9Positive: false },
  ] });
  assert.equal(result.dataIssues.length, 0);
  assert.equal(result.trajectories.length, 1);
  assert.equal(result.trajectories[0].points, 2);
  assert.equal(result.trajectories[0].latestDate, '2026-10-25');
  assert.equal(result.trajectories[0].direction, 'improving');
});

test('a true versus false cached safety flag is still a substantive conflict and retains direct review', () => {
  const last = phq(2, '2026-10-25', { answers: [2, 0, 0, 0, 0, 0, 0, 0, 0] });
  const result = support({ assessments: [
    phq(10, '2026-10-01'), { ...last, item9Positive: true }, { ...last, item9Positive: false },
  ] });
  assert.ok(result.dataIssues.some((item) => item.includes('противоречащие результаты')));
  assert.equal(result.trajectories.length, 0);
  assert.equal(result.state.tone, 'red');
  assert.ok(adviceIds(result).includes('safety'));
});
