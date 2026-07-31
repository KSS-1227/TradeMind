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
  if (c === undefined || c === null) return 0;
  const s = c.toString();
  return s.includes("%") ? parseInt(s, 10) : Math.round(Number(s) * 100);
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
