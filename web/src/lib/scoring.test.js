import { describe, expect, it } from 'vitest';
import { scoreQuestion, scoreAttempt } from './scoring';

describe('MCQ scoring', () => {
  it('awards a correct 1-mark MCQ', () => {
    const result = scoreQuestion({ qtype: 'MCQ', marks: 1, answer: 'B' }, 'B');
    expect(result.score).toBe(1);
    expect(result.correct).toBe(true);
  });

  it('applies negative marking for wrong 1-mark MCQ', () => {
    const result = scoreQuestion({ qtype: 'MCQ', marks: 1, answer: 'B' }, 'A');
    expect(result.score).toBe(-1 / 3);
  });

  it('applies negative marking for 2-mark MCQ', () => {
    const result = scoreQuestion({ qtype: 'MCQ', marks: 2, answer: 'B' }, 'A');
    expect(result.score).toBe(-2 / 3);
  });
});

describe('MSQ scoring', () => {
  it('marks exactly matching selections as correct', () => {
    const result = scoreQuestion({ qtype: 'MSQ', marks: 2, answer: 'A;C' }, ['A', 'C']);
    expect(result.score).toBe(2);
  });

  it('awards no partial credit for wrong set', () => {
    const result = scoreQuestion({ qtype: 'MSQ', marks: 2, answer: 'A;C' }, ['A']);
    expect(result.score).toBe(0);
  });
});

describe('NAT scoring', () => {
  it('accepts a value within a numeric range', () => {
    const result = scoreQuestion({ qtype: 'NAT', marks: 1, nat_min: 4.5, nat_max: 4.7 }, '4.6');
    expect(result.score).toBe(1);
  });

  it('rejects values outside the accepted range', () => {
    const result = scoreQuestion({ qtype: 'NAT', marks: 1, nat_min: 4.5, nat_max: 4.7 }, '5');
    expect(result.score).toBe(0);
  });
});

describe('attempt scoring', () => {
  it('aggregates question-level score', () => {
    const questions = [
      { qtype: 'MCQ', marks: 1, answer: 'B' },
      { qtype: 'MSQ', marks: 2, answer: 'A;C' },
      { qtype: 'NAT', marks: 1, nat_min: 4.5, nat_max: 4.7 }
    ];
    const responses = ['B', ['A', 'C'], '4.6'];
    const result = scoreAttempt(questions, responses);
    expect(result.total).toBe(4);
  });
});
