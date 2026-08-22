const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(value: string, label: string) {
  return value.trim() ? undefined : `${label} is required.`;
}

export function email(value: string) {
  if (!value.trim()) return 'Email is required.';
  if (value.trim().length > 254) return 'Email must be 254 characters or fewer.';
  return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Enter a valid email address.';
}

export function password(value: string) {
  if (!value) return 'Password is required.';
  if (value.length < 12) return 'Password must contain at least 12 characters.';
  return value.length <= 72 ? undefined : 'Password must be 72 characters or fewer.';
}

export function confirmation(value: string, expected: string) {
  if (!value) return 'Confirm your password.';
  return value === expected ? undefined : 'Passwords do not match.';
}

export function maxLength(value: string, label: string, maximum: number) {
  return value.length <= maximum ? undefined : `${label} must be ${maximum} characters or fewer.`;
}

export function requiredMaxLength(value: string, label: string, maximum: number) {
  return required(value, label) ?? maxLength(value.trim(), label, maximum);
}

export function quantity(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'Quantity must be a number.';
  if (parsed < 0) return 'Quantity must be zero or greater.';
  return parsed < 1_000_000_000 ? undefined : 'Quantity is too large.';
}
