/**
 * Generates a unique invoice number
 * Format: INV-YYYYMMDD-XXXX (e.g. INV-20240615-4821)
 */
function generateInvoiceNumber() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ""); // 20240615
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return `INV-${datePart}-${randomPart}`;
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
