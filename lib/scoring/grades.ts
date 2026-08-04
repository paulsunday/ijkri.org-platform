import type { ScoreGrade } from "@/lib/generated/prisma";

export const GRADE_THRESHOLDS: { grade: ScoreGrade; minScore: number }[] = [
  { grade: "A_PLUS", minScore: 90 },
  { grade: "A", minScore: 80 },
  { grade: "B_PLUS", minScore: 70 },
  { grade: "B", minScore: 60 },
  { grade: "C", minScore: 0 },
];

export function gradeForScore(score: number): ScoreGrade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.minScore) {
      return threshold.grade;
    }
  }

  return "C";
}

export const GRADE_LABELS: Record<ScoreGrade, string> = {
  A_PLUS: "A+",
  A: "A",
  B_PLUS: "B+",
  B: "B",
  C: "C",
};
