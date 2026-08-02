/**
 * Formats a number to Indian currency locale (en-IN)
 */
export const fmt = (n) => {
  if (n === undefined || n === null || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN");
};

/**
 * Parses confidence percentage strings/numbers into 0-100 integer range
 */
export const parseConf = (c) => {
  if (c === undefined || c === null || c === "") return null;
  const text = String(c).trim();
  if (text.endsWith("%")) {
    const percentage = Number.parseFloat(text);
    return Number.isFinite(percentage) ? percentage : null;
  }
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return value >= 0 && value <= 1 ? value * 100 : value;
};

/**
 * Formats a decimal return or percent string safely
 */
export const fmtPercent = (val) => {
  if (val === undefined || val === null) return "0%";
  const num = Number(val);
  if (isNaN(num)) return val.toString();
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};
