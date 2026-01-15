import fs from "fs";
import path from "path";

/* ================================
   MODEL (GERÇEK JSON İLE UYUMLU)
================================ */

export type InvoiceModel = {
  invoice: {
    number: string;
    date: string;
    service_date?: string;
    payment_terms?: string;
    due_date?: string;
  };

  buyer: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    company_reg_no?: string;
    vat_no?: string;
  };

  seller: {
    company: string;
    address?: string;
    city?: string;
    country?: string;
    tax_office?: string;
    tax_no?: string;
    email?: string;
    website?: string;
  };

  payment: {
    bank?: string;
    branch_name?: string;
    branch_code?: string;
    account_name?: string;
    account_number?: string;
    iban?: string;
    swift?: string;
    bank_address?: string;
    holder?: string;
  };

  lines: Array<{
    description: string;
    qty: string;
    unit?: string;
    unit_price: string;
    total: string;
  }>;

  totals: {
    subtotal: string;
    vat_amount: string;
    grand_total: string;
  };
};

/* ================================
   HTML ESCAPE (ÇÖKMEZ)
================================ */

function escapeHtml(value?: string | number) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ================================
   RENDER
================================ */

export function renderInvoiceHtml(model: InvoiceModel) {
  const templatePath = path.join(
    process.cwd(),
    "server",
    "templates",
    "invoice.html"
  );

  /* LOGO → BASE64 */
  const logoPath = path.join(
    process.cwd(),
    "server",
    "templates",
    "payiz-logo.png"
  );

  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  let html = fs.readFileSync(templatePath, "utf8");

  /* ================================
     LINE ITEMS
  ================================ */

  const lineItemsHtml = model.lines
    .map(
      (l) => `
<tr>
  <td class="desc">${escapeHtml(l.description)}</td>
  <td class="num">${escapeHtml(l.qty)}</td>
  <td class="num">${escapeHtml(l.unit_price)}</td>
  <td class="num">${escapeHtml(l.total)}</td>
</tr>`
    )
    .join("");

  /* ================================
     PLACEHOLDER REPLACEMENTS
  ================================ */

  const replacements: Record<string, string> = {
    "{{logo_data_uri}}": logoDataUri,

    /* INVOICE */
    "{{invoice.number}}": escapeHtml(model.invoice.number),
    "{{invoice.date}}": escapeHtml(model.invoice.date),
    "{{invoice.service_date}}": escapeHtml(model.invoice.service_date),
    "{{invoice.payment_terms}}": escapeHtml(model.invoice.payment_terms),
    "{{invoice.due_date}}": escapeHtml(model.invoice.due_date),

    /* BUYER */
    "{{buyer.name}}": escapeHtml(model.buyer.name),
    "{{buyer.address}}": escapeHtml(model.buyer.address),
    "{{buyer.city}}": escapeHtml(model.buyer.city),
    "{{buyer.country}}": escapeHtml(model.buyer.country),
    "{{buyer.company_reg_no}}": escapeHtml(model.buyer.company_reg_no),
    "{{buyer.vat_no}}": escapeHtml(model.buyer.vat_no),

    /* SELLER */
    "{{seller.company}}": escapeHtml(model.seller.company),
    "{{seller.address}}": escapeHtml(model.seller.address),
    "{{seller.city}}": escapeHtml(model.seller.city),
    "{{seller.country}}": escapeHtml(model.seller.country),
    "{{seller.tax_office}}": escapeHtml(model.seller.tax_office),
    "{{seller.tax_no}}": escapeHtml(model.seller.tax_no),
    "{{seller.email}}": escapeHtml(model.seller.email),
    "{{seller.website}}": escapeHtml(model.seller.website),

    /* TOTALS */
    "{{totals.subtotal}}": escapeHtml(model.totals.subtotal),
    "{{totals.vat_amount}}": escapeHtml(model.totals.vat_amount),
    "{{totals.grand_total}}": escapeHtml(model.totals.grand_total),

    /* PAYMENT */
    "{{payment.bank}}": escapeHtml(model.payment.bank),
    "{{payment.branch_name}}": escapeHtml(model.payment.branch_name),
    "{{payment.branch_code}}": escapeHtml(model.payment.branch_code),
    "{{payment.account_name}}": escapeHtml(model.payment.account_name),
    "{{payment.account_number}}": escapeHtml(model.payment.account_number),
    "{{payment.iban}}": escapeHtml(model.payment.iban),
    "{{payment.swift}}": escapeHtml(model.payment.swift),
    "{{payment.bank_address}}": escapeHtml(model.payment.bank_address),
    "{{payment.holder}}": escapeHtml(model.payment.holder),

    /* LINES */
    "{{line_items}}": lineItemsHtml,
  };

  for (const [k, v] of Object.entries(replacements)) {
    html = html.replaceAll(k, v);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
</head>
<body>
${html}
</body>
</html>`;
}
