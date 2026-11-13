import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResultPage({ attempt, questions }) {
  const [explanations, setExplanations] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');
  const score = attempt?.score ?? 0;
  const max = questions.reduce((sum, item) => sum + Number(item.marks || 1), 0);
  const review = questions.map((question, index) => ({ question, index }));
  const chartData = ['Correct', 'Wrong', 'Unattempted'].map((name) => ({ name, value: review.filter(({ index }) => attempt?.result?.details?.[index]?.status === name.toLowerCase()).length }));

  async function explain(question) {
    if (!supabase || !question.id || String(question.id).startsWith('ai-q-')) {
      setError('Sign in with Supabase and use a database question to request an explanation.');
      return;
    }
    setError(''); setLoadingId(question.id);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('explain-question', { body: { question_id: question.id } });
      if (invokeError) throw invokeError;
      setExplanations((current) => ({ ...current, [question.id]: data.explanation }));
    } catch (requestError) {
      setError(requestError.message || 'Explanation request failed.');
    } finally { setLoadingId(null); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-green-400 p-6 text-white"><p className="text-sm">{attempt?.config?.mode === 'ai-practice' ? 'AI Practice result' : 'Attempt result'}</p><div className="mt-2 flex items-center justify-between"><h1 className="text-3xl font-bold">{score} / {max}</h1><Link to="/setup" className="rounded-full bg-white/20 px-4 py-2 font-semibold">Retake</Link></div></section>
      {attempt?.config?.mode === 'ai-practice' && <p className="rounded-xl border border-violet-300 bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950 dark:text-violet-200">AI Practice uses generated questions. Answers may be uncertain; verify important concepts independently.</p>}
      <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border p-4 dark:border-slate-800"><div className="text-sm text-slate-500">Accuracy</div><strong>{attempt?.result?.accuracy ?? 0}%</strong></div><div className="rounded-2xl border p-4 dark:border-slate-800"><div className="text-sm text-slate-500">Violations</div><strong>{attempt?.violations || 0}</strong></div><div className="rounded-2xl border p-4 dark:border-slate-800"><div className="text-sm text-slate-500">Attempted</div><strong>{attempt?.result?.attempted ?? 0} / {questions.length}</strong></div></section>
      <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-3 font-semibold">Question analysis</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <section className="space-y-3"><h2 className="font-semibold">Per-question review</h2>{review.map(({ question, index }) => <article key={question.id || index} className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><strong>Q{index + 1} · {question.qtype}</strong>{question.is_generated && <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-900 dark:text-violet-100">AI generated · uncertain</span>}</div><p className="mt-2">{question.question_text}</p><button disabled={loadingId === question.id} onClick={() => explain(question)} className="mt-3 min-h-10 rounded-xl border border-blue-500 px-3 text-sm text-blue-700 disabled:opacity-50 dark:text-blue-300">{loadingId === question.id ? 'Explaining…' : 'Explain'}</button>{explanations[question.id] && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{explanations[question.id]}</div>}</article>)}</section>
    </div>
  );
}
