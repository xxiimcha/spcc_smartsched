// Shared types & exports used by the feature

export type Proficiency = "beginner" | "intermediate" | "advanced";
export type Willingness = "willing" | "not_willing";

export type PrefMap = Record<number, Proficiency | undefined>;
export type WillingMap = Record<number, Willingness | undefined>;

export type Snap = { prof: Proficiency; will?: Willingness };

export const GRADE_LEVEL_OPTIONS = ["11", "12"] as const;

export type SelectionRow = {
  id: number;
  code: string;
  name: string;
  proficiency: Proficiency;
  willingness?: Willingness;
  strand?: string;
  gradeLevel?: string | number;
  units?: number;
  type?: string;
};

export type DiffRow = {
  id: number;
  code: string;
  name: string;
  strand?: string;
  gradeLevel?: string | number;
  // for updated rows
  oldProf?: Proficiency;
  newProf?: Proficiency;
  oldWill?: Willingness;
  newWill?: Willingness;
};
