import { describe, expect, it } from "vitest";
import { ANSWER_KEY, scoreExam } from "../shared/course";

describe("Sou Eletricista assessment", () => {
  it("scores a perfect attempt at 100%", () => {
    expect(scoreExam([...ANSWER_KEY])).toBe(100);
  });

  it("scores a half-correct attempt at 50%", () => {
    const answers = [...ANSWER_KEY].map((answer, index) => index < 5 ? answer : (answer + 1) % 4);
    expect(scoreExam(answers)).toBe(50);
  });

  it("scores an empty attempt at 0%", () => {
    expect(scoreExam(Array(10).fill(-1))).toBe(0);
  });
});
