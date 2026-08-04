import { describe, expect, it } from "vitest";

import { gradeForScore } from "./grades";

describe("gradeForScore", () => {
  it("returns C below 60", () => {
    expect(gradeForScore(0)).toBe("C");
    expect(gradeForScore(59)).toBe("C");
  });

  it("returns B from 60 to 69", () => {
    expect(gradeForScore(60)).toBe("B");
    expect(gradeForScore(69)).toBe("B");
  });

  it("returns B_PLUS from 70 to 79", () => {
    expect(gradeForScore(70)).toBe("B_PLUS");
    expect(gradeForScore(79)).toBe("B_PLUS");
  });

  it("returns A from 80 to 89", () => {
    expect(gradeForScore(80)).toBe("A");
    expect(gradeForScore(89)).toBe("A");
  });

  it("returns A_PLUS at 90 and above", () => {
    expect(gradeForScore(90)).toBe("A_PLUS");
    expect(gradeForScore(100)).toBe("A_PLUS");
  });
});
