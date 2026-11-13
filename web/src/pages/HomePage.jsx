import { Link } from 'react-router-dom';

function StatCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-300'
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function HomePage({ questions, onCreateAttempt, user }) {
  const recentAttempts = [
    { label: 'CS 2024 Set 1', score: '58 / 100', summary: '2 weak topics' },
    { label: 'Algo Revise', score: '82 / 100', summary: 'Strong performance' }
  ];

  const weakestTopics = [
    { topic: 'DBMS', score: 42 },
    { topic: 'Operating Systems', score: 48 },
    { topic: 'Networks', score: 52 }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-400 p-6 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-100">Welcome back</p>
            <h1 className="mt-2 text-3xl font-bold">{user?.email || 'Demo user'}</h1>
          </div>
          <button onClick={() => onCreateAttempt({ mode: 'weak-areas', minutes: 25, topics: ['DBMS', 'Operating Systems'], count: 10, types: ['MCQ'], years: [2024] })} className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
            Quick start
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Questions" value={questions.length} tone="blue" />
        <StatCard label="Streak" value="7 days" tone="green" />
        <StatCard label="Accuracy" value="71%" tone="orange" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">Quick start</h2>
          <div className="space-y-3">
            {[
              { label: 'Topic-wise test', mode: 'topic-wise', minutes: 20 },
              { label: 'Full paper', mode: 'year-wise', minutes: 60 },
              { label: 'Weak areas', mode: 'weak-areas', minutes: 30 },
              { label: 'Revision', mode: 'revision', minutes: 25 }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => onCreateAttempt({ mode: preset.mode, minutes: preset.minutes, count: 15, years: [2024], topics: ['Algorithms', 'DBMS'], types: ['MCQ', 'MSQ', 'NAT'] })}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-500 dark:border-slate-700"
              >
                <span>{preset.label}</span>
                <span className="text-sm text-slate-500">{preset.minutes} min</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">Recent attempts</h2>
          <div className="space-y-3">
            {recentAttempts.map((attempt) => (
              <div key={attempt.label} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800/80">
                <div className="flex items-center justify-between">
                  <strong>{attempt.label}</strong>
                  <span>{attempt.score}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{attempt.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Weakest topics</h2>
        <div className="space-y-3">
          {weakestTopics.map((item) => (
            <div key={item.topic}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{item.topic}</span>
                <span>{item.score}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-red-500" style={{ width: `${item.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

