import { validationResult } from 'express-validator';
import { fail } from '../utils/apiResponse.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, errors.array()[0].msg, 422, errors.array());
  }
  next();
}
