interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired records periodically to prevent memory leaks in long-lived serverless instances
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60 * 1000
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetInSeconds: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= limit) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { success: false, remaining: 0, resetInSeconds };
  }

  record.count += 1;
  store.set(identifier, record);
  return { success: true, remaining: limit - record.count, resetInSeconds: Math.ceil((record.resetTime - now) / 1000) };
}
