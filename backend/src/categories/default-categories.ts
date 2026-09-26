// Specialties the product already expects. "Uncategorized" is only the
// placeholder created at consultant signup and is not in this list.
// Keep the SQL seed migration in sync with these names.
export const DEFAULT_CATEGORY_NAMES = [
  'Legal',
  'Medical',
  'Tax Advisory',
  'Educational Consulting',
  'Financial Planning',
  'Career Coaching',
  'Immigration',
  'Mental Health Counseling',
] as const;
