/**
 * Structured Server-Side Logger Utility
 * 
 * Invariants:
 * - Sanitizes all output to prevent credential/secret leakage
 * - Consistent ISO timestamps and log levels (INFO, WARN, ERROR)
 * - Lightweight, zero external dependencies
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'sessionsecret',
  'salt',
  'apikey',
  'authorization',
  'cookie',
  'hitpay_sg_salt',
  'hitpay_my_salt',
  'hitpay_sg_api_key',
  'hitpay_my_api_key'
]);

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact potential connection string credentials
    return data.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED_CREDENTIALS]@');
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

function formatLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] ${message}`;
  if (meta !== undefined) {
    const cleanMeta = sanitizeData(meta);
    return `${base} ${typeof cleanMeta === 'object' ? JSON.stringify(cleanMeta) : String(cleanMeta)}`;
  }
  return base;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(formatLog('INFO', message, meta));
  },

  warn(message: string, meta?: unknown): void {
    console.warn(formatLog('WARN', message, meta));
  },

  error(message: string, meta?: unknown): void {
    console.error(formatLog('ERROR', message, meta));
  }
};
