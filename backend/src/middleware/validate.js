import ApiError from '../utils/ApiError.js';

/**
 * Validates req.body against a Zod schema and replaces req.body with the
 * parsed (and type-coerced) result.
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw ApiError.badRequest(details[0]?.message || 'Invalid request data.', details);
  }
  req.body = result.data;
  next();
};

export default validateBody;
