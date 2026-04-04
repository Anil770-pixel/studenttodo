/**
 * ============================================================
 * StudentOS — Global Error Handler
 * ============================================================
 * Provides a unified error framework for all API/Groq calls.
 * Returns structured error objects that the UI can consume.
 * ============================================================
 */

// ─── Error Code Definitions ───────────────────────────────────────────────────
export const ERROR_CODES = {
    BAD_INPUT: 'ERR_400_BAD_INPUT',
    UNAUTHORIZED: 'ERR_401_UNAUTHORIZED',
    NOT_FOUND: 'ERR_404_NOT_FOUND',
    RATE_LIMIT: 'ERR_429_RATE_LIMIT',
    AI_FAIL: 'ERR_500_AI_FAIL',
};

// ─── User-friendly messages per error code ────────────────────────────────────
const ERROR_MESSAGES = {
    [ERROR_CODES.BAD_INPUT]: 'Oops! Please check your input and try again.',
    [ERROR_CODES.UNAUTHORIZED]: 'Session expired. Please log in again.',
    [ERROR_CODES.NOT_FOUND]: 'Could not find what you were looking for.',
    [ERROR_CODES.RATE_LIMIT]: 'Slow down! You\'re clicking too fast. Wait a moment.',
    [ERROR_CODES.AI_FAIL]: '🤖 AI is resting right now. Try again in a few seconds.',
};

/**
 * Creates a structured StudentOS error object.
 * @param {string} code - One of ERROR_CODES values
 * @param {string} [detail] - Optional technical detail for logging
 * @returns {{ code: string, message: string, detail?: string }}
 */
export function createError(code, detail = '') {
    const message = ERROR_MESSAGES[code] || 'An unexpected error occurred.';
    const err = new Error(message);
    err.code = code;
    err.userMessage = message;
    err.detail = detail;
    console.error(`[StudentOS Error] ${code}:`, detail || message);
    return err;
}

/**
 * Wraps any async function with global error handling.
 * Returns { data, error } — never throws.
 *
 * Usage:
 *   const { data, error } = await safeCall(() => analyzeProgress(...));
 *   if (error) showErrorToast(error.userMessage);
 *
 * @param {Function} fn - Async function to wrap
 * @param {string} [errorCode] - Override error code (default: ERR_500_AI_FAIL)
 */
export async function safeCall(fn, errorCode = ERROR_CODES.AI_FAIL) {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (rawError) {
        // If it already has our structure, use it
        if (rawError.code && rawError.userMessage) {
            return { data: null, error: rawError };
        }

        // Map HTTP status codes from Groq/Firebase to our codes
        const status = rawError?.status || rawError?.response?.status;
        let mappedCode = errorCode;

        if (status === 400) mappedCode = ERROR_CODES.BAD_INPUT;
        else if (status === 401 || status === 403) mappedCode = ERROR_CODES.UNAUTHORIZED;
        else if (status === 404) mappedCode = ERROR_CODES.NOT_FOUND;
        else if (status === 429) mappedCode = ERROR_CODES.RATE_LIMIT;

        const structured = createError(mappedCode, rawError?.message || String(rawError));
        return { data: null, error: structured };
    }
}

/**
 * Simple rate limiter for AI calls — prevents spamming the AI button.
 * Returns true if allowed, false if rate limited.
 *
 * @param {string} key - Unique identifier (e.g. 'ai_suggest', 'analyze')
 * @param {number} cooldownMs - Cooldown between calls in milliseconds
 */
const _rateLimitMap = {};
export function checkRateLimit(key, cooldownMs = 10000) {
    const now = Date.now();
    const lastCall = _rateLimitMap[key] || 0;

    if (now - lastCall < cooldownMs) {
        return false; // Rate limited
    }

    _rateLimitMap[key] = now;
    return true; // Allowed
}

/**
 * Validates task input fields.
 * @param {{ title: string, date?: string }} task
 * @throws {Error} with code ERR_400_BAD_INPUT
 */
export function validateTaskInput(task) {
    if (!task || typeof task.title !== 'string' || task.title.trim().length === 0) {
        throw createError(ERROR_CODES.BAD_INPUT, 'Task title is required and must be a string.');
    }
    if (task.title.trim().length > 200) {
        throw createError(ERROR_CODES.BAD_INPUT, 'Task title is too long (max 200 characters).');
    }
    if (task.date && isNaN(new Date(task.date).getTime())) {
        throw createError(ERROR_CODES.BAD_INPUT, 'Invalid date provided for task.');
    }
    return true;
}
