import type { InvoiceModel } from "../templates/renderInvoiceTemplate";
import pdfParse from "pdf-parse";

const normalizeLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00ad/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

const normalizeText = (text: string) =>
  text
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

const findValue = (lines: string[], label: string) => {
  const lowerLabel = label.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (lower.includes(lowerLabel)) {
      const idx = lower.indexOf(lowerLabel);
      const after = line.slice(idx + label.length).replace(/^[:\s]+/, "").trim();
      if (after) return after;
      if (lines[i + 1]) return lines[i + 1];
    }
  }
  return "";
};

const findValueRegex = (text: string, label: string) => {
  const pattern = new RegExp(`${label}\\s*[:]?\\s*([^\\n]+)`, "i");
  const match = pattern.exec(text);
  return match ? match[1].trim() : "";
};

const findValueBetween = (text: string, label: string, endLabels: string[]) => {
  const endPattern = endLabels
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(
    `${label}\\s*[:]?\\s*([\\s\\S]*?)(?=${endPattern}|$)`,
    "i"
  );
  const match = pattern.exec(text);
  return match ? match[1].trim() : "";
};

const findSectionRegex = (text: string, start: string, end: string[]) => {
  const endPattern = end.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(
    `${start}[\\s\\S]*?(?=${endPattern}|$)`,
    "i"
  );
  const match = pattern.exec(text);
  return match ? match[0] : "";
};

const parseDate = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return `${day}/${month}/${year}`;
  }
  return value.trim();
};

const findDateAfterLabel = (text: string, label: string) => {
  const pattern = new RegExp(
    `${label}\\s*[:]?\\s*([0-9]{2})\\D*([0-9]{2})\\D*([0-9]{4})`,
    "i"
  );
  const match = pattern.exec(text);
  if (!match) return "";
  return `${match[1]}/${match[2]}/${match[3]}`;
};

const pickLast = (values: string[]) =>
  values.filter(Boolean)[values.filter(Boolean).length - 1] || "";

const parseVkns = (text: string) =>
  Array.from(text.matchAll(/VKN\s*:\s*(\d+)/gi)).map((m) => m[1]);

const normalizeCurrencyAmount = (raw: string, currency?: string) => {
  const cleaned = raw.replace(/\s/g, "");
  const cur = currency || cleaned.replace(/[\d.,]/g, "");
  const num = cleaned.replace(/[^\d.,]/g, "");
  const normalized = num.replace(/\./g, "").replace(",", ".");
  if (!cur) return normalized;
  const value = Number.isFinite(Number(normalized))
    ? Number(normalized).toFixed(2)
    : normalized;
  return `${cur} ${value}`;
};

const cleanEmailSuffix = (value: string) => {
  if (!value) return "";
  return value
    .replace(/\s*E[-\s]?Posta:\s*.+$/i, "")
    .replace(/\s*EPosta:\s*.+$/i, "")
    .replace(/\s*E[-\s]?Mail:\s*.+$/i, "")
    .trim();
};

const normalizeCountry = (value: string) => {
  if (!value) return "";
  if (/United Kingdom/i.test(value)) return "United Kingdom";
  if (/Turkey|Türkiye/i.test(value)) return "Turkey";
  if (/Yurtdış/i.test(value)) return "Yurtdışı";
  return value;
};

const extractCurrencyAmount = (raw: string, currency = "GBP") => {
  const match = /([0-9.,]+)\s*([A-Z]{3})/.exec(raw);
  if (match) {
    return normalizeCurrencyAmount(match[1], match[2]);
  }
  const numMatch = /([0-9]+[.,][0-9]{2})/.exec(raw);
  if (numMatch) {
    return normalizeCurrencyAmount(numMatch[1], currency);
  }
  return `${currency} 0.00`;
};

const formatVatRate = (raw: string) => {
  const match = /([0-9.,]+)/.exec(raw);
  if (!match) return "0.00%";
  const value = match[1].replace(",", ".");
  return `${value}%`;
};

const parseMoneyValue = (value: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.,]/g, "");
  const matches =
    cleaned.match(/\d+[.,]\d{2}/g) ||
    cleaned.match(/\d+[.,]\d+/g) ||
    [];
  const candidate = matches[0] || cleaned;
  const lastDot = candidate.lastIndexOf(".");
  const lastComma = candidate.lastIndexOf(",");
  const decimalSep = lastComma > lastDot ? "," : ".";
  const normalized =
    decimalSep === ","
      ? candidate.replace(/\./g, "").replace(",", ".")
      : candidate.replace(/,/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value: number, currency = "GBP") =>
  `${currency} ${value.toFixed(2)}`;

const findGbpAmountAfterLabel = (text: string, label: string) => {
  const pattern = new RegExp(
    `${label}\\s*([0-9.,]+)\\s*GBP`,
    "i"
  );
  const match = pattern.exec(text);
  if (match) {
    return normalizeCurrencyAmount(match[1], "GBP");
  }
  return "";
};

const findCurrencyAmount = (text: string, label: string) => {
  const pattern = new RegExp(
    `${label}\\s*([0-9.,]+)\\s*([A-Z]{3})`,
    "i"
  );
  const match = pattern.exec(text);
  if (match) {
    return normalizeCurrencyAmount(match[1], match[2]);
  }
  return normalizeCurrencyAmount(findValueRegex(text, label));
};

const findCurrencyAmountPreferred = (
  text: string,
  label: string,
  currency: string
) => {
  const pattern = new RegExp(
    `${label}\\s*([0-9.,]+)\\s*([A-Z]{3})`,
    "ig"
  );
  const matches = Array.from(text.matchAll(pattern)).map((m) => ({
    amount: m[1],
    currency: m[2],
  }));
  const preferred = matches.find((m) => m.currency === currency);
  if (preferred) {
    return normalizeCurrencyAmount(preferred.amount, preferred.currency);
  }
  if (matches[0]) {
    return normalizeCurrencyAmount(matches[0].amount, matches[0].currency);
  }
  return normalizeCurrencyAmount(findValueRegex(text, label));
};

const parseLineItems = (flatText: string) => {
  const section =
    findSectionRegex(flatText, "Mal HizmetAçıklama", [
      "Mal Hizmet Toplam Tutarı",
      "Ödenecek Tutar",
      "Vergiler Dahil Toplam Tutar",
    ]) ||
    findSectionRegex(flatText, "Description of Service", [
      "Subtotal",
      "VAT",
      "Total Payable",
      "VAT Exemption",
    ]);

  const regex =
    /(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*Adet\s+([0-9.,]+)\s*([A-Z]{3})\s+%?([0-9.,]+)\s+%?([0-9.,]+)\s+([0-9.,]+)\s*([A-Z]{3})\s+([0-9.,]+)\s*([A-Z]{3})/gi;
  const items: InvoiceModel["lines"] = [];
  let match;
  while ((match = regex.exec(section)) !== null) {
    const qty = match[3].replace(",", ".");
    const unit = "Adet";
    const unitPrice = normalizeCurrencyAmount(match[4], match[5]);
    const vatRate = `${match[6].replace(",", ".")}%`;
    const vatAmount = normalizeCurrencyAmount(match[8], match[9]);
    const total = normalizeCurrencyAmount(match[10], match[11]);
    items.push({
      description: match[2].trim(),
      date: "",
      qty,
      unit,
      unit_price: unitPrice,
      vat: vatRate,
      total,
    });
  }

  if (!items.length && section) {
    const fallback = /(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*Adet\s+([0-9.,]+)\s*([A-Z]{3})/i.exec(
      section
    );
    if (fallback) {
      items.push({
        description: fallback[2].trim(),
        date: "",
        qty: fallback[3].replace(",", "."),
        unit: "Adet",
        unit_price: normalizeCurrencyAmount(fallback[4], fallback[5]),
        vat: "",
        total: "",
      });
    }
  }

  return items;
};

export async function parseInvoicePdf(
  buffer: Buffer
): Promise<InvoiceModel> {
  const parsed = await pdfParse(buffer);
  const lines = normalizeLines(parsed.text);
  const flatText = normalizeText(parsed.text);

  const invoiceNumber =
    findValueBetween(flatText, "Fatura No", [
      "Fatura Tipi",
      "Gönderim Şekli",
      "Düzenleme Tarihi",
      "Düzenleme Zamanı",
      "Son Ödeme Tarihi",
    ]) ||
    findValue(lines, "Invoice No") ||
    findValueRegex(flatText, "Invoice No") ||
    (flatText.match(/\bPAY\d{6,}\b/i)?.[0] ?? "");
  const invoiceDate =
    findDateAfterLabel(flatText, "Düzenleme Tarihi") ||
    parseDate(findValueRegex(flatText, "Düzenleme Tarihi")) ||
    parseDate(findValue(lines, "Invoice Date")) ||
    parseDate(findValueRegex(flatText, "Invoice Date")) ||
    "";
  const serviceDate = invoiceDate;
  const dueDate =
    findDateAfterLabel(flatText, "Son Ödeme Tarihi") ||
    parseDate(findValueRegex(flatText, "Son Ödeme Tarihi"));

  const sellerCompanyMatch = flatText.match(
    /PAYİZ\s+[A-ZİĞÜŞÖÇ\s]+ŞİRKETİ/i
  );
  const sellerCompany = sellerCompanyMatch ? sellerCompanyMatch[0] : "";
  const sellerAddressMatch = sellerCompany
    ? new RegExp(
        `${sellerCompany}\\s+(.+?)\\s+Telefon:`,
        "i"
      ).exec(flatText)
    : null;
  const sellerAddress = sellerAddressMatch ? sellerAddressMatch[1].trim() : "";
  const sellerCity =
    sellerAddress.includes("/")
      ? sellerAddress.split("/").pop()?.trim() ?? ""
      : sellerAddress.split(",").pop()?.trim() ?? "";
  const sellerCountry = sellerAddress ? "Turkey" : "";
  const sellerTaxOffice =
    findValueBetween(flatText, "Vergi Dairesi", ["VKN", "Ticaret Sicil"]) || "";
  const emails = Array.from(
    flatText.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)
  ).map((m) => m[0]);
  const sellerEmail =
    findValue(lines, "Contact") || findValueRegex(flatText, "Contact") || pickLast(emails);

  const sellerWebsite = findValueRegex(flatText, "Web Sitesi") || "";

  const subtotalRaw =
    findGbpAmountAfterLabel(flatText, "Mal Hizmet Toplam Tutarı") ||
    findCurrencyAmountPreferred(flatText, "Mal Hizmet Toplam Tutarı", "GBP");
  const totalPayableRaw =
    findGbpAmountAfterLabel(flatText, "Ödenecek Tutar") ||
    findCurrencyAmountPreferred(flatText, "Ödenecek Tutar", "GBP");
  const vatRateMatch = /VAT\s*\(([^)]+)\)/i.exec(flatText);
  const vatRateRaw =
    vatRateMatch?.[1] ||
    flatText.match(/KDV\s*Oranı\s*%?(\d+(?:[.,]\d+)?)/i)?.[1] ||
    flatText.match(/Hesaplanan KDV\(%?([0-9.,]+)\)/i)?.[1] ||
    "0";
  const vatRate = formatVatRate(vatRateRaw || "0");

  const iban = findValue(lines, "IBAN") || findValueRegex(flatText, "IBAN");
  const swift = findValue(lines, "SWIFT") || findValueRegex(flatText, "SWIFT");

  const lineItems = parseLineItems(flatText);

  const vkns = parseVkns(flatText);
  const buyerVkn = vkns[0] || "";
  const sellerVkn = vkns[1] || vkns[0] || "";

  const buyerBlockMatch = /SAYIN\s+(.+?)(Telefon:|EPosta:|VKN:|Özelleştirme|Fatura No:)/i.exec(
    flatText
  );
  const buyerBlock = buyerBlockMatch ? buyerBlockMatch[1].trim() : "";
  const firstDigitIndex = buyerBlock.search(/\d/);
  const buyerName =
    firstDigitIndex > 0
      ? buyerBlock.slice(0, firstDigitIndex).trim()
      : buyerBlock;
  const buyerAddressRaw =
    firstDigitIndex > 0 ? buyerBlock.slice(firstDigitIndex).trim() : "";
  const buyerAddress = cleanEmailSuffix(buyerAddressRaw)
    .replace(/\s*Yurtdışı\/\s*Yurtdışı\s*/gi, " ")
    .trim();
  const buyerCountryMatch = buyerAddress.match(
    /United Kingdom|Turkey|Türkiye|Yurtdışı/i
  );
  const buyerCountry = normalizeCountry(
    buyerCountryMatch ? buyerCountryMatch[0] : ""
  );
  const buyerParts = buyerAddress.split(",").map((p) => p.trim()).filter(Boolean);
  const buyerCity = buyerParts.length > 1 ? buyerParts[buyerParts.length - 2] : "";

  const linesWithDate = (lineItems.length ? lineItems : []).map((item) => ({
    ...item,
    date: item.date || invoiceDate,
  }));

  const lineTotals = linesWithDate.map((item) =>
    parseMoneyValue(item.total || item.unit_price)
  );
  const subtotalValue = lineTotals.reduce((sum, value) => sum + value, 0);
  const totalPayableValue = subtotalValue;

  console.log("PDF_PARSE_LINE_TOTALS:", lineTotals);
  console.log("PDF_PARSE_SUBTOTAL_VALUE:", subtotalValue);

  return {
    invoice: {
      number: invoiceNumber,
      date: invoiceDate,
      service_date: serviceDate,
      payment_terms: "",
      due_date: dueDate,
    },
    buyer: {
      name: buyerName,
      company: buyerName,
      address: buyerAddress,
      city: buyerCity,
      country: buyerCountry,
      customer_no: buyerVkn,
    },
    lines: linesWithDate.length
      ? linesWithDate
      : [
          {
            description: "",
            date: serviceDate,
            qty: "",
            unit: "",
            unit_price: "",
            vat: "",
            total: "",
          },
        ],
    totals: {
      subtotal: formatMoney(subtotalValue, "GBP"),
      vat_rate: vatRate,
      vat_amount: "GBP 0.00",
      grand_total: formatMoney(totalPayableValue, "GBP"),
    },
    seller: {
      company: sellerCompany,
      address: sellerAddress,
      city: sellerCity,
      country: sellerCountry,
      tax_office: sellerTaxOffice,
      tax_no: sellerVkn,
      email: sellerEmail,
      website: sellerWebsite,
    },
    payment: {
      bank: "YAPI VE KREDI BANKASI A.S.",
      branch_name: "Dolayoba",
      branch_code: "1084",
      account_name: "PAYIZ YAZILIM REKLAMCILIK DANISMANLIK LTD.",
      account_number: "24723663",
      iban: "TR910006701000000024723663",
      swift: "YAPITRISFEX",
      bank_address:
        "Cinardere Mahallesi, Akseki Sokak No:1, Pendik, Istanbul, Turkey",
      holder: "PAYIZ Yazilim Reklamcilik Danismanlik Ltd. Sti.",
    },
  };
}
