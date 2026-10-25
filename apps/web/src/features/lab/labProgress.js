import { api } from '@/lib/api';

// Records where the learner is in a pathway. Failures are ignored: progress must never block studying.
export function markProgress(pathway, object, complete) {
  const body = { pathway, object, ...(complete === undefined ? {} : { complete }) };
  return api('lab/progress', { method: 'POST', body }).catch(() => null);
}
