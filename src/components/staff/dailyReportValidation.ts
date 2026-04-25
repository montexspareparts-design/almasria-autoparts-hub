// Pure validation helpers for StaffDailyReport.
// Extracted so the missing-required logic can be unit-tested independently.

export type DynQuestionType = "number" | "boolean" | "choice" | "text" | "textarea";

export interface DynQuestion {
  id: string;
  question_type: DynQuestionType;
  is_required: boolean;
}

export interface DynAnswer {
  number?: number | null;
  boolean?: boolean | null;
  choice?: string | null;
  text?: string | null;
}

export type DynAnswersMap = Record<string, DynAnswer | undefined>;

/**
 * Returns true when the given answer satisfies the question's expected input.
 * - number: must be a non-null numeric value (0 is allowed)
 * - boolean: must be explicitly true/false (not null/undefined)
 * - choice: must have a truthy choice string
 * - text/textarea: must have non-whitespace text
 */
export function isAnswerFilled(q: DynQuestion, a: DynAnswer | undefined): boolean {
  if (!a) return false;
  switch (q.question_type) {
    case "number":
      return a.number != null;
    case "boolean":
      return a.boolean != null;
    case "choice":
      return !!a.choice;
    case "text":
    case "textarea":
      return !!a.text?.trim();
    default:
      return false;
  }
}

/**
 * Returns the list of required questions that have not been answered yet.
 * Non-required questions are always excluded.
 */
export function computeMissingRequired(
  questions: DynQuestion[],
  answers: DynAnswersMap
): DynQuestion[] {
  return questions.filter((q) => {
    if (!q.is_required) return false;
    return !isAnswerFilled(q, answers[q.id]);
  });
}
