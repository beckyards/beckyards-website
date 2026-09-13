// Formats digits as a US phone number while typing: "5551234567" -> "(555) 123-4567".
// Anything beyond 10 digits is ignored so pasting a longer string doesn't overflow the shape.
export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const len = digits.length;

  if (len === 0) return '';
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
