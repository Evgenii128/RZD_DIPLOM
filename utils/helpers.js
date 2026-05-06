async function generateRequestNumber(pool) {
  const year = new Date().getFullYear();
  try {
    const [rows] = await pool.execute(
      "SELECT request_number FROM requests WHERE request_number LIKE ? ORDER BY request_number DESC LIMIT 1",
      [`REQ-${year}-%`],
    );

    if (rows.length === 0) return `REQ-${year}-001`;

    const lastNumber = rows[0].request_number;
    const parts = lastNumber.split("-");
    if (parts.length < 3) return `REQ-${year}-001`;

    const lastSeq = parseInt(parts[2]);
    if (isNaN(lastSeq)) return `REQ-${year}-001`;

    const nextSeq = lastSeq + 1;
    return `REQ-${year}-${nextSeq.toString().padStart(3, "0")}`;
  } catch (error) {
    console.error("Ошибка генерации номера заявки:", error);
    const timestamp = Date.now().toString().slice(-6);
    return `REQ-${year}-${timestamp}`;
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("ru-RU");
  } catch {
    return dateString;
  }
}

module.exports = { generateRequestNumber, formatCurrency, formatDate };
