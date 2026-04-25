import { describe, it, expect } from "vitest";
import {
  computeMissingRequired,
  isAnswerFilled,
  type DynQuestion,
  type DynAnswersMap,
} from "../dailyReportValidation";

const q = (over: Partial<DynQuestion> & Pick<DynQuestion, "id" | "question_type">): DynQuestion => ({
  is_required: true,
  ...over,
});

describe("isAnswerFilled", () => {
  it("number: accepts 0 and positive values, rejects null/undefined", () => {
    const nq = q({ id: "n", question_type: "number" });
    expect(isAnswerFilled(nq, { number: 0 })).toBe(true);
    expect(isAnswerFilled(nq, { number: 42 })).toBe(true);
    expect(isAnswerFilled(nq, { number: null })).toBe(false);
    expect(isAnswerFilled(nq, undefined)).toBe(false);
    expect(isAnswerFilled(nq, {})).toBe(false);
  });

  it("boolean: accepts true and false, rejects null/undefined", () => {
    const bq = q({ id: "b", question_type: "boolean" });
    expect(isAnswerFilled(bq, { boolean: true })).toBe(true);
    expect(isAnswerFilled(bq, { boolean: false })).toBe(true);
    expect(isAnswerFilled(bq, { boolean: null })).toBe(false);
    expect(isAnswerFilled(bq, {})).toBe(false);
  });

  it("choice: accepts non-empty string, rejects empty/null", () => {
    const cq = q({ id: "c", question_type: "choice" });
    expect(isAnswerFilled(cq, { choice: "yes" })).toBe(true);
    expect(isAnswerFilled(cq, { choice: "" })).toBe(false);
    expect(isAnswerFilled(cq, { choice: null })).toBe(false);
  });

  it("text/textarea: rejects whitespace-only and empty strings", () => {
    const tq = q({ id: "t", question_type: "text" });
    const taq = q({ id: "ta", question_type: "textarea" });
    expect(isAnswerFilled(tq, { text: "hello" })).toBe(true);
    expect(isAnswerFilled(taq, { text: "  multi line  " })).toBe(true);
    expect(isAnswerFilled(tq, { text: "   " })).toBe(false);
    expect(isAnswerFilled(tq, { text: "" })).toBe(false);
    expect(isAnswerFilled(tq, { text: null })).toBe(false);
  });
});

describe("computeMissingRequired", () => {
  it("returns empty when there are no questions", () => {
    expect(computeMissingRequired([], {})).toEqual([]);
  });

  it("ignores non-required questions even when unanswered", () => {
    const questions: DynQuestion[] = [
      { id: "1", question_type: "text", is_required: false },
      { id: "2", question_type: "number", is_required: false },
    ];
    expect(computeMissingRequired(questions, {})).toEqual([]);
  });

  it("flags only required questions that are unanswered", () => {
    const questions: DynQuestion[] = [
      { id: "req-text", question_type: "text", is_required: true },
      { id: "opt-text", question_type: "text", is_required: false },
      { id: "req-num", question_type: "number", is_required: true },
      { id: "req-bool", question_type: "boolean", is_required: true },
    ];
    const answers: DynAnswersMap = {
      "req-num": { number: 0 }, // filled (0 is valid)
      "req-bool": { boolean: false }, // filled
      // req-text is missing
    };
    const missing = computeMissingRequired(questions, answers);
    expect(missing.map((m) => m.id)).toEqual(["req-text"]);
  });

  it("treats whitespace-only text as missing", () => {
    const questions: DynQuestion[] = [
      { id: "t", question_type: "textarea", is_required: true },
    ];
    const missing = computeMissingRequired(questions, { t: { text: "   \n  " } });
    expect(missing).toHaveLength(1);
  });

  it("preserves the original question order in the missing list", () => {
    const questions: DynQuestion[] = [
      { id: "a", question_type: "text", is_required: true },
      { id: "b", question_type: "choice", is_required: true },
      { id: "c", question_type: "number", is_required: true },
    ];
    const answers: DynAnswersMap = { b: { choice: "x" } };
    const missing = computeMissingRequired(questions, answers);
    expect(missing.map((m) => m.id)).toEqual(["a", "c"]);
  });

  it("handles a fully-answered required set", () => {
    const questions: DynQuestion[] = [
      { id: "1", question_type: "text", is_required: true },
      { id: "2", question_type: "number", is_required: true },
      { id: "3", question_type: "boolean", is_required: true },
      { id: "4", question_type: "choice", is_required: true },
    ];
    const answers: DynAnswersMap = {
      "1": { text: "ok" },
      "2": { number: 5 },
      "3": { boolean: true },
      "4": { choice: "A" },
    };
    expect(computeMissingRequired(questions, answers)).toEqual([]);
  });
});
