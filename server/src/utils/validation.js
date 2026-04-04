function isEmptyValue(value) {
  return value === undefined || value === null || value === '';
}

export function createAppError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function requireTrimmedString(value, fieldName) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    throw createAppError(`${fieldName} is required.`, 400);
  }

  return normalized;
}

export function parsePositiveInteger(value, fieldName, { required = true } = {}) {
  if (isEmptyValue(value)) {
    if (required) {
      throw createAppError(`${fieldName} is required.`, 400);
    }

    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createAppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
}

export function parseOptionalBoolean(value) {
  if (isEmptyValue(value)) {
    return undefined;
  }

  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  throw createAppError('Boolean value is invalid.', 400);
}

export function normalizeIntegerList(value) {
  const source = Array.isArray(value)
    ? value
    : isEmptyValue(value)
      ? []
      : [value];

  const normalized = source
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1);

  return [...new Set(normalized)].sort((left, right) => left - right);
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
