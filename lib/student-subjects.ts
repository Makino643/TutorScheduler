/** Serialize `Student.subjects` JSON for form display. */
export function subjectsToCommaString(subjects: unknown): string {
  if (!Array.isArray(subjects)) return "";
  return subjects.filter((x): x is string => typeof x === "string").join(", ");
}
