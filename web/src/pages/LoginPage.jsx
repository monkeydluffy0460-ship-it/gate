import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(email.trim());
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500 text-xl font-bold text-white">G</div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in with your email to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 outline-none ring-0 focus:border-blue-500 dark:border-slate-700"
            />
          </label>
          <button type="submit" className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white">
            Send magic link
          </button>
          <button type="button" onClick={() => onLogin('demo@gate.local')} className="w-full rounded-xl border border-slate-300 py-3 font-semibold dark:border-slate-700">
            Continue as demo user
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
