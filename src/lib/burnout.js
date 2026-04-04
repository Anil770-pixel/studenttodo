/**
 * burnout.js — Burnout Predictor logic
 *
 * Each time a user postpones a task, we increment `postponeCount` on that
 * task's Firestore document.  When postponeCount reaches OVERWHELM_THRESHOLD,
 * we surface the Anti-Gravity modal.
 *
 * Schema addition on a task document:
 *   postponeCount  : number   (how many times user has hit "Postpone")
 *   lastPostponed  : string   (ISO date of last postponement, for UX display)
 */

import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const OVERWHELM_THRESHOLD = 3;   // Trigger Anti-Gravity after N postpones

/**
 * Record one postpone for a task and bump its date to tomorrow.
 * Returns { overwhelmed: true, task } when the threshold is crossed.
 */
export async function recordPostpone(uid, task) {
    const taskRef = doc(db, 'users', uid, 'tasks', task.id);

    // Bump postpone counter atomically
    await updateDoc(taskRef, {
        postponeCount: increment(1),
        lastPostponed: new Date().toISOString().split('T')[0],
        date: nextDay(task.date),
    });

    // Read back the new count
    const snap = await getDoc(taskRef);
    const newCount = snap.data()?.postponeCount || 1;
    const overwhelmed = newCount >= OVERWHELM_THRESHOLD;

    return {
        overwhelmed,
        postponeCount: newCount,
        updatedTask: { ...task, postponeCount: newCount, date: nextDay(task.date) },
    };
}

/**
 * After Anti-Gravity Mode is activated, reset the postpone counter so
 * the modal doesn't keep firing.
 */
export async function resetPostponeCount(uid, taskId) {
    const taskRef = doc(db, 'users', uid, 'tasks', taskId);
    await updateDoc(taskRef, { postponeCount: 0 });
}

/**
 * Replace a parent task with 4 micro-tasks in the task list.
 * Returns the new micro-task array (optimistic, before Firestore write).
 */
export function buildMicroTaskObjects(parentTask, microTitles) {
    const today = new Date().toISOString().split('T')[0];
    return microTitles.map((title, i) => ({
        title,
        completed: false,
        category: parentTask.category || 'Study',
        date: today,
        isMicroTask: true,
        parentTitle: parentTask.title,
        order: i,
        postponeCount: 0,
    }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nextDay(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}
