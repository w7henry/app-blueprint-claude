// Deterministic mapping from quiz answers to a program and a weekly schedule.
// The rules live in the creator config; first matching rule wins.

import type { CreatorConfig, Weekday } from '../../creators/schema';

export type QuizAnswers = Record<string, string>;

export interface PlanChoice {
  programId: string;
  /** Answer id of the "days" question that defines the schedule actually used. */
  daysKey: string;
  schedule: Weekday[];
  /** Finishers are dropped for short sessions. */
  shortSessions: boolean;
  /** Creator-voice explanation when a rule adjusted the plan. */
  note?: string;
  /** Index of the matching rule, or -1 for the default program. */
  ruleIndex: number;
}

export function matchRule(when: Record<string, string[]>, answers: QuizAnswers): boolean {
  return Object.entries(when).every(([q, allowed]) => answers[q] !== undefined && allowed.includes(answers[q]));
}

export function resolvePlan(creator: Pick<CreatorConfig, 'quiz'>, answers: QuizAnswers): PlanChoice {
  const { quiz } = creator;
  const ruleIndex = quiz.rules.findIndex((r) => matchRule(r.when, answers));
  const rule = ruleIndex >= 0 ? quiz.rules[ruleIndex] : undefined;
  const programId = rule?.program ?? quiz.defaultProgram;

  const daysQuestion = quiz.questions.find((q) => q.id === 'days');
  const fallbackDays = daysQuestion?.options[Math.floor((daysQuestion.options.length - 1) / 2)]?.id ?? Object.keys(quiz.schedules)[0];
  const chosen = answers.days && quiz.schedules[answers.days] ? answers.days : fallbackDays;
  const daysKey = rule?.scheduleAs ?? chosen;

  return {
    programId,
    daysKey,
    schedule: quiz.schedules[daysKey],
    shortSessions: answers.session !== undefined && quiz.shortSessionAnswers.includes(answers.session),
    note: rule?.note,
    ruleIndex,
  };
}

/** True when every question has an answer that exists in the config. */
export function isComplete(creator: Pick<CreatorConfig, 'quiz'>, answers: QuizAnswers): boolean {
  return creator.quiz.questions.every((q) => q.options.some((o) => o.id === answers[q.id]));
}

/** Drops answers that no longer exist in the config (e.g. after a copy change). */
export function sanitizeAnswers(creator: Pick<CreatorConfig, 'quiz'>, answers: QuizAnswers): QuizAnswers {
  const out: QuizAnswers = {};
  for (const q of creator.quiz.questions) {
    const a = answers[q.id];
    if (a && q.options.some((o) => o.id === a)) out[q.id] = a;
  }
  return out;
}
