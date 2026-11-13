import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const trend = [
  { name: 'Jan', score: 54 },
  { name: 'Feb', score: 58 },
  { name: 'Mar', score: 62 },
  { name: 'Apr', score: 69 },
  { name: 'May', score: 73 }
];

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Progress</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Score trend</div>
          <div className="mt-2 text-2xl font-bold">+12%</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Streak</div>
          <div className="mt-2 text-2xl font-bold">7 days</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Weak topics</div>
          <div className="mt-2 text-2xl font-bold">3</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 font-semibold">Score trend</h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

