/**
 * Turns an API error into text for an alert.
 * It uses the response body when there is one. Otherwise it returns the fallback.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data === undefined || data === null || data === '') return fallback;
  if (typeof data === 'string') return data;
  const problem = data as { title?: string; errors?: unknown };
  if (problem.title) return problem.title;
  if (problem.errors) return JSON.stringify(problem.errors);
  return JSON.stringify(data);
}
