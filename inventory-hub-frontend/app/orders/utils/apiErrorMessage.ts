/**
 * Turns an API error into text for an alert.
 * It uses the response body when there is one.
 * Without a body it returns the fallback and the error's own message, for example a network error.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data === undefined || data === null || data === '') {
    const message = (err as { message?: unknown })?.message;
    return typeof message === 'string' && message ? `${fallback}：${message}` : fallback;
  }
  if (typeof data === 'string') return data;
  const problem = data as { title?: string; errors?: unknown };
  if (problem.title) return problem.title;
  if (problem.errors) return JSON.stringify(problem.errors);
  return JSON.stringify(data);
}
