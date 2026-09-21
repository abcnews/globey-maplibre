/**
 * Sanitises and parses a raw input string or number into a valid positive CoreMedia ID.
 *
 * @param input Raw input value
 * @returns Positive numeric CMID, or null if invalid
 */
export function parseCmid(input: string | number | undefined | null): number | null {
  if (input === undefined || input === null) return null;
  const str = String(input).trim();
  if (!str) return null;
  const num = Number(str);
  if (isNaN(num) || !Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

/**
 * Checks whether an input represents a valid positive integer CoreMedia ID.
 *
 * @param input Raw input value
 */
export function isValidCmid(input: string | number | undefined | null): boolean {
  return parseCmid(input) !== null;
}
