import { useState } from 'react';

const modes = [
  ['Topic-wise', 'topic-wise'], ['Year-wise full paper', 'year-wise'], ['Custom', 'custom'],
  ['Random mix', 'random-mix'], ['Weak-areas', 'weak-areas'], ['Revision', 'revision'],
  ['AI Practice', 'ai-practice']
];

export default function TestSetupPage({ onCreateAttempt }) {
  const [mode, setMode] = useState('topic-wise');
  const [minutes, setMinutes] = useState(30);
  const [count, setCount] = useState(15);
  const [selectedTopics, setSelectedTopics] = useState(['Algorithms', 'DBMS']);
  const [types, setTypes] = useState(['MCQ', 'MSQ']);
  const [years, setYears] = useState([2024, 2025]);

  function toggleValue(value, list, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function handleStart() {
    onCreateAttempt({ mode, minutes: Number(minutes), count: Number(count), topics: selectedTopics, types, years, random: mode === 'random-mix' || mode === 'weak-areas' });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Test setup</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose mode and timing for your practice.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{modes.map(([label, value]) => <button key={value} onClick={() => setMode(value)} className={`min-h-12 rounded-2xl border px-3 py-3 text-left ${mode === value ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700'}`}>{label}{value === 'ai-practice' && <span className="mt-1 block text-xs font-semibold text-violet-600">Generated questions only</span>}</button>)}</div>
      </section>
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-3 font-semibold">Duration: {minutes} minutes</h2><input aria-label="Duration in minutes" type="range" min="10" max="180" step="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="w-full" /></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><label className="font-semibold">Question count<input type="number" min="1" max="100" value={count} onChange={(event) => setCount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label></div>
      </section>
      {mode !== 'ai-practice' && <>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-3 font-semibold">Topics</h2><div className="flex flex-wrap gap-2">{['Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Compiler Design', 'Theory of Computation'].map((topic) => <button key={topic} onClick={() => toggleValue(topic, selectedTopics, setSelectedTopics)} className={`min-h-10 rounded-full border px-3 py-1.5 text-sm ${selectedTopics.includes(topic) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{topic}</button>)}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-3 font-semibold">Question types and years</h2><div className="flex flex-wrap gap-2">{['MCQ', 'MSQ', 'NAT'].map((type) => <button key={type} onClick={() => toggleValue(type, types, setTypes)} className={`min-h-10 rounded-full border px-3 py-1.5 ${types.includes(type) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{type}</button>)}</div><div className="mt-4 flex flex-wrap gap-2">{[2022, 2023, 2024, 2025, 2026].map((year) => <button key={year} onClick={() => toggleValue(year, years, setYears)} className={`min-h-10 rounded-full border px-3 ${years.includes(year) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{year}</button>)}</div></section>
      </>}
      <button onClick={handleStart} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">Start {mode === 'ai-practice' ? 'AI Practice' : 'Attempt'}</button>
    </div>
  );
}
