/**
 * Shared task reconciliation: status from progress, delay flag, and PATCH payload for API sync.
 */

export function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 0% → TODO; (0,100) → IN_PROGRESS; 100% → DONE with completionDate (today if missing). */
export function deriveStatusFromProgress(
  task: { progressPercent: number; completionDate: string | null },
  todayIso: string
): { status: string; completionDate: string | null } {
  const p = Number(task.progressPercent);
  if (!Number.isFinite(p) || p < 0) {
    return { status: 'TODO', completionDate: null };
  }
  if (p >= 100) {
    return {
      status: 'DONE',
      completionDate: task.completionDate || todayIso,
    };
  }
  if (p > 0) {
    return { status: 'IN_PROGRESS', completionDate: null };
  }
  return { status: 'TODO', completionDate: null };
}

/**
 * Delayed only for unfinished work: today is past endDate and progress is still under 100%.
 * Tasks at 100% / DONE are never flagged here (even if completed after endDate).
 */
export function computeTaskIsDelayed(
  task: {
    progressPercent: number;
    endDate: string;
  },
  todayIso: string
): boolean {
  const p = Number(task.progressPercent);
  if (!task.endDate || !Number.isFinite(p) || p >= 100) {
    return false;
  }
  return todayIso > task.endDate;
}

export function buildTaskReconcilePatch(
  task: { status: string; completionDate: string | null; progressPercent: number },
  todayIso: string
): Partial<{ status: string; completionDate: string | null }> | null {
  const derived = deriveStatusFromProgress(task, todayIso);
  const patch: Partial<{ status: string; completionDate: string | null }> = {};
  if (derived.status !== task.status) {
    patch.status = derived.status;
  }
  const nextC = derived.completionDate ?? null;
  const currC = task.completionDate ?? null;
  if (nextC !== currC) {
    patch.completionDate = nextC;
  }
  return Object.keys(patch).length ? patch : null;
}
