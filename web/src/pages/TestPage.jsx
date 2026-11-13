import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockMath, InlineMath } from 'react-katex';
import { useFullscreenGuard } from '../lib/fullscreen';

const paletteColors = {
  unvisited: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  unanswered: 'bg-white text-slate-800 ring-1 ring-slate-300 dark:bg-slate-900 dark:text-slate-200',
  answered: 'bg-emerald-500 text-white',
  review: 'bg-amber-400 text-slate-900',
  answeredReview: 'bg-violet-500 text-white'
};

function rawLatex(text) {
  const pattern = /\$([^$]+)\$/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    segments.push({ type: 'math', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', value: text.slice(lastIndex) });
  return segments;
}

function renderText(content) {
  if (!content) return null;
  const segments = rawLatex(content);
  return segments.map((segment, index) =>
    segment.type === 'math' ? (
      <span key={index} className="inline-block align-middle">
        <InlineMath math={segment.value} />
      </span>
    ) : (
      <span key={index}>{segment.value}</span>
    )
  );
}

export default function TestPage({ attempt, questions, onSubmit }) {
  const navigate = useNavigate();
  const storageKey = 'gate-demo-responses';
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState(() => JSON.parse(localStorage.getItem(storageKey) || '{}'));
  const [violations, setViolations] = useState(attempt?.violations || 0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!attempt?.ends_at) return 0;
    const diff = new Date(attempt.ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
  });
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [numpadValue, setNumpadValue] = useState('');
  const question = questions[index] || questions[0];
  const questionId = question?.id || index;

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(responses));
  }, [responses]);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, new Date(attempt.ends_at).getTime() - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  const handleViolation = () => {
    setViolations((value) => value + 1);
    setShowOverlay(true);
  };

  useFullscreenGuard(handleViolation);

  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  useEffect(() => {
    if (!attempt && questions.length) navigate('/setup');
  }, [attempt, navigate, questions]);

  function openFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setShowOverlay(false);
  }

  function getResponseValue(questionKey) {
    return responses[questionKey] ?? '';
  }

  function setResponseValue(nextValue) {
    setResponses((state) => ({ ...state, [questionId]: nextValue }));
  }

  function handleSubmit() {
    onSubmit(responses);
  }

  function markForReview() {
    setResponses((state) => ({ ...state, [`__review_${questionId}`]: true }));
    setIndex((value) => Math.min(value + 1, questions.length - 1));
  }

  function clearResponse() {
    setResponses((state) => {
      const next = { ...state };
      delete next[questionId];
      delete next[`__review_${questionId}`];
      return next;
    });
  }

  function handleNumpadInput(digit) {
    const current = getResponseValue(questionId);
    setResponseValue(`${current}${digit}`);
  }

  function getPaletteClass(questionItem, currentIndex) {
    const key = questionItem.id || currentIndex;
    const value = responses[key];
    const reviewed = responses[`__review_${key}`];
    if (reviewed && value) return paletteColors.answeredReview;
    if (reviewed) return paletteColors.review;
    if (value === undefined || value === '') return paletteColors.unanswered;
    if (value) return paletteColors.answered;
    return paletteColors.unvisited;
  }

  const remainingMinutes = Math.floor(timeLeft / 60);
  const remainingSeconds = timeLeft % 60;
  const isWarning = timeLeft <= 600 && timeLeft > 60;
  const isCritical = timeLeft <= 60;

  if (!question) return null;

  return (
    <div className="space-y-4" onContextMenu={(event) => event.preventDefault()}>
      <style>{`* { user-select: none; }`}</style>
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Question {index + 1} / {questions.length}</div>
            <div className="font-semibold">{question.topic || 'General'}</div>
          </div>
          <div className={`rounded-full px-3 py-1 font-semibold ${isCritical ? 'bg-red-500 text-white' : isWarning ? 'bg-amber-400 text-slate-900' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'}`}>
            {remainingMinutes}:{String(remainingSeconds).padStart(2, '0')}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id || i}
              onClick={() => setIndex(i)}
              className={`flex h-10 items-center justify-center rounded-lg text-xs font-semibold ${getPaletteClass(q, i)}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="text-lg font-medium">
            {renderText(question.question_text || 'Question text not available')}
          </div>

          {question.image_url ? (
            <img src={question.image_url} alt="Question figure" className="max-h-72 w-auto rounded-2xl border border-slate-200" />
          ) : null}

          {question.qtype === 'MCQ' && (
            <div className="space-y-2">
              {question.options?.map((option) => (
                <label key={option.value || option.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <input
                    type="radio"
                    name={`mcq-${question.id}`}
                    checked={getResponseValue(questionId) === option.value}
                    onChange={() => setResponseValue(option.value)}
                  />
                  <span>{option.label || option.value}. {option.text || option.value}</span>
                </label>
              ))}
            </div>
          )}

          {question.qtype === 'MSQ' && (
            <div className="space-y-2">
              {question.options?.map((option) => {
                const selected = Array.isArray(getResponseValue(questionId))
                  ? getResponseValue(questionId)
                  : [];
                const checked = selected.includes(option.value);
                return (
                  <label key={option.value || option.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const current = Array.isArray(getResponseValue(questionId)) ? getResponseValue(questionId) : [];
                        const next = event.target.checked ? [...current, option.value] : current.filter((value) => value !== option.value);
                        setResponseValue(next);
                      }}
                    />
                    <span>{option.label || option.value}. {option.text || option.value}</span>
                  </label>
                );
              })}
            </div>
          )}

          {question.qtype === 'NAT' && (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="decimal"
                value={getResponseValue(questionId)}
                onChange={(event) => setResponseValue(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-lg dark:border-slate-700"
                placeholder="Enter numeric answer"
              />
              <div className="grid grid-cols-4 gap-2">
                {['1', '2', '3', '/', '4', '5', '6', '.', '7', '8', '9', '0', '⌫', 'C', 'OK'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === '⌫') {
                        setResponseValue(String(getResponseValue(questionId)).slice(0, -1));
                      } else if (key === 'C') {
                        setResponseValue('');
                      } else if (key === 'OK') {
                        setResponseValue(getResponseValue(questionId));
                      } else {
                        setResponseValue(String(getResponseValue(questionId)) + key);
                      }
                    }}
                    className="rounded-xl bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-800"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => setIndex((value) => Math.max(value - 1, 0))} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700">Previous</button>
          <button onClick={() => { setIndex((value) => Math.min(value + 1, questions.length - 1)); }} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700">Save & Next</button>
          <button onClick={markForReview} className="rounded-xl border border-amber-400 px-3 py-2 text-amber-600 dark:text-amber-300">Mark for Review</button>
          <button onClick={clearResponse} className="rounded-xl border border-red-400 px-3 py-2 text-red-500">Clear Response</button>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleSubmit} className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white">Submit</button>
        </div>
      </div>

      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            <h2 className="text-xl font-bold">Exam warning</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              You left full screen or switched tabs. This counts as a violation.
            </p>
            <button onClick={openFullscreen} className="mt-4 rounded-xl bg-blue-500 px-4 py-2 font-semibold text-white">
              Re-enter full screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
