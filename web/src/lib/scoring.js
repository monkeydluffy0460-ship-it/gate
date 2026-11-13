export function normalizeAnswerValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toUpperCase()).sort();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toUpperCase();
}

export function scoreQuestion(question, response) {
  const qtype = question.qtype || 'MCQ';
  const marks = Number(question.marks || 1);

  if (qtype === 'MCQ') {
    const selected = normalizeAnswerValue(response);
    const correct = normalizeAnswerValue(question.answer) === selected;
    const negative = marks / 3;
    return {
      score: correct ? marks : selected ? -negative : 0,
      correct,
      attempted: Boolean(selected)
    };
  }

  if (qtype === 'MSQ') {
    const expected = normalizeAnswerValue(question.answer).split(';').filter(Boolean);
    const selected = normalizeAnswerValue(response);
    const correct = JSON.stringify(expected) === JSON.stringify(selected);
    return {
      score: correct ? marks : 0,
      correct,
      attempted: selected.length > 0
    };
  }

  if (qtype === 'NAT') {
    const value = Number(normalizeAnswerValue(response));
    const min = Number(question.nat_min ?? Number.NEGATIVE_INFINITY);
    const max = Number(question.nat_max ?? Number.POSITIVE_INFINITY);
    const entered = response !== '' && response !== null && response !== undefined;
    const correct = entered && !Number.isNaN(value) && value >= min && value <= max;
    return {
      score: correct ? marks : 0,
      correct,
      attempted: entered
    };
  }

  return { score: 0, correct: false, attempted: false };
}

export function scoreAttempt(questions, responses) {
  let total = 0;
  let attempted = 0;
  let correct = 0;

  questions.forEach((question, index) => {
    const result = scoreQuestion(question, responses[index]);
    total += result.score;
    attempted += result.attempted ? 1 : 0;
    if (result.correct) correct += 1;
  });

  return { total, attempted, correct, max: questions.reduce((sum, question) => sum + Number(question.marks || 1), 0) };
}
