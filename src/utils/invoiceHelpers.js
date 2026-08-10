/**
 * Generates a short unique invoice number.
 * Format: WF-YYMMDD-XXXX (e.g. WF-260810-4821)
 */
function generateInvoiceNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `WF-${yy}${mm}${dd}-${randomPart}`;
}

/**
 * Formats a number as currency string
 * e.g. 1500 → "$1,500.00"
 * e.g. 1500, "INR" → "₹1,500.00"
 */
function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export { generateInvoiceNumber, formatCurrency };
