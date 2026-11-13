import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';

const resultData = [
  { name: 'Correct', value: 18 },
  { name: 'Wrong', value: 7 },
  { name: 'Unattempted', value: 5 }
];

export default function ResultPage({ attempt, questions }) {
  const score = attempt?.score || 0;
  const max = questions.reduce((sum, item) => sum + Number(item.marks || 1), 0);
  const accuracy = questions.length ? Math.round((questions.filter((q) => q.answer_source === 'official').length / questions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-400 p-6 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-50">Attempt result</p>
            <h1 className="mt-2 text-3xl font-bold">{score} / {max}</h1>
          </div>
          <Link to="/setup" className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">Retake</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm text-slate-500">Accuracy</h3>
          <div className="mt-2 text-2xl font-bold">{accuracy}%</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm text-slate-500">Violations</h3>
          <div className="mt-2 text-2xl font-bold">{attempt?.violations || 0}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm text-slate-500">Avg. time/question</h3>
          <div className="mt-2 text-2xl font-bold">1m 52s</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Section and topic analysis</h2>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resultData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Per-question review</h2>
        <div className="space-y-3">
          {questions.slice(0, 5).map((question, index) => (
            <div key={question.id || index} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Q{index + 1}</span>
                <span className="text-xs text-slate-500">{question.qtype}</span>
              </div>
              <p className="mt-2 text-sm">{question.question_text}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Wrong</span>
                <button className="rounded-full border border-slate-300 px-2 py-1 dark:border-slate-700">Bookmark</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

