import type { NormalizedInvoice } from "@shared/schema";

/**
 * NormalizedInvoice → Template data (HTML / PDF)
 * UK Service Export – VAT 0%
 */
export function mapToInvoiceModel(invoice: NormalizedInvoice) {
  const currency =
    invoice.totals?.currency ||
    invoice.currencyCode ||
    "TRY";

  return {
    /* ================= INVOICE ================= */
    invoice: {
      number: invoice.invoiceNumber,
      date: invoice.issueDate,
      service_date: invoice.issueDate,
      payment_terms: "Payment due within 7 days",
      due_date: "",
    },

    /* ================= SELLER (TURKEY) ================= */
    seller: {
      company: invoice.supplier.name,          // ✅ DOĞRU ALAN
      address: invoice.supplier.address,
      city: invoice.supplier.city,
      country: invoice.supplier.country || "Turkey",
      tax_office: "",                           // ❗ XML’de yoksa boş bırak
      tax_no: invoice.supplier.taxId,           // ✅ SADECE BU VAR
      email: invoice.supplier.email,
      website: invoice.supplier.website,
    },

    /* ================= BUYER (UK) ================= */
    buyer: {
      name: invoice.customer.name,
      address: invoice.customer.address,
      city: invoice.customer.city,
      country: invoice.customer.country || "United Kingdom",
      company_reg_no: "",
      vat_no: "",
    },

    /* ================= SERVICE LINES ================= */
    lines: invoice.lines.map((line) => ({
      description: line.description,
      qty: line.quantity.toFixed(2),
      unit: line.unit,
      unit_price: `${currency} ${line.unitPrice.toFixed(2)}`,
      total: `${currency} ${line.total.toFixed(2)}`,
    })),

    /* ================= TOTALS ================= */
    totals: {
      subtotal: `${currency} ${(
        invoice.totals.taxExclusiveAmount ??
        invoice.totals.lineExtensionAmount
      ).toFixed(2)}`,
      vat_amount: `${currency} 0.00`,
      grand_total: `${currency} ${invoice.totals.payableAmount.toFixed(2)}`,
    },

    /* ================= PAYMENT (SABİT – BANK) ================= */
    payment: {
      bank: "YAPI VE KREDI BANKASI A.S.",
      branch_name: "Dolayoba",
      branch_code: "1084",
      account_name: "PAYIZ YAZILIM REKLAMCILIK DANISMANLIK LIMITED SIRKETI",
      account_number: "24723663",
      iban: "TR910006701000000024723663",
      swift: "YAPITRISFEX",
      bank_address:
        "Cinardere Mahallesi, Akseki Sokak No:1, Pendik, Istanbul, Turkey",
      holder: "PAYIZ Yazılım Reklamcılık Danışmanlık Ltd. Şti.",
    },
  };
}
