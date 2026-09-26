/**
 * Consistent API response helpers
 * Format: { success, data, message }
 */
export function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res, data = null, message = 'Created') {
  return ok(res, data, message, 201);
}

export function fail(res, message = 'Request failed', status = 400, data = null) {
  return res.status(status).json({ success: false, data, message });
}
