import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import type { NormalizedInvoice } from "@shared/schema";
import { standardTemplate, minimalTemplate } from "./templates";

interface PDFOptions {
  language: "en" | "tr";
  template: "standard" | "minimal";
}

/* ======================================================
   HANDLEBARS HELPERS (XML → PDF YOLU İÇİN)
====================================================== */
Handlebars.registerHelper("formatCurrency", (value, currency) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
});

Handlebars.registerHelper("formatDate", (dateString) => {
  return new Date(dateString).toLocaleDateString();
});

/* ======================================================
   1️⃣ XML → PDF (ESKİ SİSTEM – KORUNDU)
====================================================== */
export async function generatePDF(
  invoice: NormalizedInvoice,
  options: PDFOptions
): Promise<Buffer> {
  const templateSource =
    options.template === "minimal" ? minimalTemplate : standardTemplate;

  const template = Handlebars.compile(templateSource);

  const labels = {
    en: {
      invoice: "COMMERCIAL INVOICE",
      billTo: "Bill To",
      from: "From",
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      total: "Total",
      subtotal: "Subtotal",
      tax: "Tax",
      grandTotal: "Grand Total",
      date: "Date",
      invoiceNo: "Invoice No",
      notes: "Notes",
      disclaimer:
        "This document is a commercial copy. The original e-Archive XML remains the legally valid document.",
    },
    tr: {
      invoice: "TİCARİ FATURA",
      billTo: "Sayın",
      from: "Gönderen",
      description: "Açıklama",
      qty: "Miktar",
      unitPrice: "Birim Fiyat",
      total: "Toplam",
      subtotal: "Ara Toplam",
      tax: "KDV",
      grandTotal: "Genel Toplam",
      date: "Tarih",
      invoiceNo: "Fatura No",
      notes: "Notlar",
      disclaimer:
        "Bu belge ticari bir kopyadır. Yasal olarak geçerli belge e-Arşiv XML dosyasıdır.",
    },
  };

  const html = template({
    ...invoice,
    labels: labels[options.language],
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/* ======================================================
   2️⃣ HTML → PDF (YENİ SİSTEM – PREVIEW İLE AYNI)
====================================================== */
export async function generatePDFFromHtml(
  html: string
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // 🔴 EN KRİTİK SATIR
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "40px",
        right: "40px",
        bottom: "40px",
        left: "40px",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
