import { useState } from 'react';

const modes = ['Topic-wise', 'Year-wise full paper', 'Custom', 'Random mix', 'Weak-areas', 'Revision'];

export default function TestSetupPage({ onCreateAttempt }) {
  const [mode, setMode] = useState('Topic-wise');
  const [minutes, setMinutes] = useState(30);
  const [count, setCount] = useState(15);
  const [selectedTopics, setSelectedTopics] = useState(['Algorithms', 'DBMS']);
  const [types, setTypes] = useState(['MCQ', 'MSQ']);

  function toggleTopic(topic) {
    setSelectedTopics((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]
    );
  }

  function toggleType(type) {
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  const handleStart = () => {
    onCreateAttempt({
      mode,
      minutes,
      count,
      topics: selectedTopics,
      types,
      years: [2024, 2025],
      random: mode === 'Random mix' || mode === 'Weak-areas'
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Test setup</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the mode and timing for your next mock test.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Mode</h2>
        <div className="grid grid-cols-2 gap-3">
          {modes.map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`rounded-2xl border px-3 py-3 text-left ${mode === item ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Timing</h2>
          <input type="range" min="10" max="180" value={minutes} step="5" onChange={(e) => setMinutes(Number(e.target.value))} className="w-full" />
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{minutes} minutes</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Question count</h2>
          <input type="number" min="5" max="60" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {['Algorithms', 'DBMS', 'OS', 'Networks', 'Compiler', 'Theory of Computation'].map((topic) => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`rounded-full border px-3 py-1.5 text-sm ${selectedTopics.includes(topic) ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Question types</h2>
        <div className="flex flex-wrap gap-2">
          {['MCQ', 'MSQ', 'NAT'].map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`rounded-full border px-3 py-1.5 text-sm ${types.includes(type) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleStart} className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-lg font-semibold text-white">
        Start Attempt
      </button>
    </div>
  );
}

