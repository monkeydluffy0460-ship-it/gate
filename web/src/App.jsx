import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { signInWithEmail, signOut } from './lib/supabase';
import { useDarkMode } from './lib/hooks';
import fakeQuestions from './data/fakeQuestions.json';
import { scoreAttempt } from './lib/scoring';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import TestSetupPage from './pages/TestSetupPage';
import TestPage from './pages/TestPage';
import ResultPage from './pages/ResultPage';
import ProgressPage from './pages/ProgressPage';
import NotesPage from './pages/NotesPage';

const STORAGE_KEYS = {
  user: 'gate-demo-user',
  attempt: 'gate-demo-attempt',
  responses: 'gate-demo-responses',
  theme: 'gate-theme'
};

function App() {
  const { darkMode, setDarkMode } = useDarkMode();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null'));
  const [attempt, setAttempt] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.attempt) || 'null'));
  const [questions, setQuestions] = useState(() => fakeQuestions);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (attempt) {
      localStorage.setItem(STORAGE_KEYS.attempt, JSON.stringify(attempt));
    } else {
      localStorage.removeItem(STORAGE_KEYS.attempt);
    }
  }, [attempt]);

  useEffect(() => {
    localStorage.setItem('gate-demo-questions', JSON.stringify(questions));
  }, [questions]);

  async function handleLogin(email) {
    try {
      const { user: authUser } = await signInWithEmail(email);
      setUser({ email: authUser.email || email });
      navigate('/');
    } catch (error) {
      setUser({ email });
      navigate('/');
    }
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch {}
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    navigate('/login');
  }

  function createAttempt(config) {
    const endsAt = Date.now() + config.minutes * 60 * 1000;
    const newAttempt = {
      id: crypto.randomUUID(),
      user_id: user?.email || 'demo-user',
      started_at: new Date().toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      submitted_at: null,
      config,
      score: 0,
      violations: 0
    };
    setAttempt(newAttempt);
    localStorage.setItem(STORAGE_KEYS.responses, JSON.stringify({}));
    navigate('/test');
    return newAttempt;
  }

  function submitAttempt(finalResponses) {
    const result = scoreAttempt(questions, finalResponses);
    const updated = { ...attempt, score: result.total, submitted_at: new Date().toISOString(), result };
    setAttempt(updated);
    localStorage.setItem(STORAGE_KEYS.attempt, JSON.stringify(updated));
    navigate('/result');
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 px-2 py-1 text-sm font-bold text-white">GATE</div>
            <span className="font-semibold">Mock Test Trainer</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <button onClick={handleLogout} className="rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-700">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 text-sm">
          {[
            ['/', 'Home'],
            ['/setup', 'Test Setup'],
            ['/progress', 'Progress'],
            ['/notes', 'Notes']
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 ${isActive ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage questions={questions} onCreateAttempt={createAttempt} user={user} />} />
          <Route path="/setup" element={<TestSetupPage onCreateAttempt={createAttempt} />} />
          <Route path="/test" element={<TestPage attempt={attempt} questions={questions} onSubmit={submitAttempt} />} />
          <Route path="/result" element={<ResultPage attempt={attempt} questions={questions} />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
