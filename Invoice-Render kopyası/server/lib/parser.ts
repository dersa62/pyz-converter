import { XMLParser } from "fast-xml-parser";
import type { NormalizedInvoice } from "@shared/schema";

export function parseUBL(xmlContent: string): NormalizedInvoice {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
  });

  const parsed = parser.parse(xmlContent);
  const invoice = parsed.Invoice;

  if (!invoice) {
    throw new Error("Invalid UBL XML: Root 'Invoice' element not found");
  }

  /* ======================
     HELPERS
  ====================== */
  const getVal = (node: any) => {
    if (!node) return "";
    if (typeof node === "object" && node["#text"]) return node["#text"];
    return node;
  };

  const getArray = (node: any) => {
    if (!node) return [];
    return Array.isArray(node) ? node : [node];
  };

  /* ======================
     SUPPLIER
  ====================== */
  const supplierParty = invoice.AccountingSupplierParty?.Party || {};

  // Supplier name
  const supplierName =
    getVal(supplierParty.PartyName?.Name) ||
    getVal(supplierParty.PartyTaxScheme?.TaxScheme?.Name) ||
    "Unknown Supplier";

  // Supplier VKN
  const supplierTaxId =
    getArray(supplierParty.PartyIdentification)
      .map((p: any) =>
        p?.ID?.["@_schemeID"] === "VKN" ? getVal(p.ID) : ""
      )
      .find(Boolean) || "";

  // Tax Office
  const supplierTaxOffice = getVal(
    supplierParty.PartyTaxScheme?.TaxScheme?.Name
  );

  // Supplier Address
  const supplierPostal = supplierParty.PostalAddress || {};

  const supplierAddress = [
    getVal(supplierPostal.StreetName),
    getVal(supplierPostal.BuildingNumber),
    getVal(supplierPostal.CitySubdivisionName),
    getVal(supplierPostal.CityName),
    getVal(supplierPostal.PostalZone),
    getVal(supplierPostal.Country?.Name),
  ]
    .filter(Boolean)
    .join(", ");

  /* ======================
     CUSTOMER
  ====================== */
  const customerParty = invoice.AccountingCustomerParty?.Party || {};

  const customerName =
    getVal(customerParty.PartyName?.Name) ||
    `${getVal(customerParty.Person?.FirstName)} ${getVal(
      customerParty.Person?.FamilyName
    )}`.trim() ||
    "Unknown Customer";

  const customerTaxId =
    getArray(customerParty.PartyIdentification)
      .map((p: any) =>
        p?.ID?.["@_schemeID"] === "VKN" ? getVal(p.ID) : ""
      )
      .find(Boolean) || "";

  const customerPostal = customerParty.PostalAddress || {};

  const customerAddress = [
    getVal(customerPostal.StreetName),
    getVal(customerPostal.BuildingNumber),
    getVal(customerPostal.CitySubdivisionName),
    getVal(customerPostal.CityName),
    getVal(customerPostal.PostalZone),
    getVal(customerPostal.Country?.Name),
  ]
    .filter(Boolean)
    .join(", ");

  /* ======================
     LINES
  ====================== */
  const lines = getArray(invoice.InvoiceLine).map((line: any) => {
    const item = line.Item || {};
    const price = line.Price || {};

    const quantity = parseFloat(getVal(line.InvoicedQuantity) || "0");
    const unitPrice = parseFloat(getVal(price.PriceAmount) || "0");
    const lineExtensionAmount = parseFloat(
      getVal(line.LineExtensionAmount) || "0"
    );

    const taxTotal = getArray(line.TaxTotal)[0] || {};
    const taxAmount = parseFloat(getVal(taxTotal.TaxAmount) || "0");
    const taxSubtotal = getArray(taxTotal.TaxSubtotal)[0] || {};
    const taxRate = parseFloat(
      getVal(taxSubtotal.TaxCategory?.Percent) || "0"
    );

    return {
      description: getVal(item.Name),
      quantity,
      unit: line.InvoicedQuantity?.["@_unitCode"] || "UNIT",
      unitPrice,
      taxRate,
      taxAmount,
      total: lineExtensionAmount + taxAmount,
    };
  });

  /* ======================
     TOTALS
  ====================== */
  const monetaryTotal = invoice.LegalMonetaryTotal || {};

  /* ======================
     RETURN
  ====================== */
  return {
    invoiceNumber: getVal(invoice.ID),
    issueDate: getVal(invoice.IssueDate),
    uuid: getVal(invoice.UUID),
    currencyCode: getVal(invoice.DocumentCurrencyCode),

    supplier: {
      name: supplierName,
      taxId: supplierTaxId,
      taxOffice: supplierTaxOffice,
      address: supplierAddress,
      email: getVal(supplierParty.Contact?.ElectronicMail),
      phone: getVal(supplierParty.Contact?.Telephone),
      website: getVal(supplierParty.WebsiteURI),
    },

    customer: {
      name: customerName,
      taxId: customerTaxId,
      address: customerAddress,
      city: getVal(customerPostal.CityName),
      country: getVal(customerPostal.Country?.Name),
    },

    lines,

    totals: {
      lineExtensionAmount: parseFloat(
        getVal(monetaryTotal.LineExtensionAmount) || "0"
      ),
      taxExclusiveAmount: parseFloat(
        getVal(monetaryTotal.TaxExclusiveAmount) || "0"
      ),
      taxInclusiveAmount: parseFloat(
        getVal(monetaryTotal.TaxInclusiveAmount) || "0"
      ),
      payableAmount: parseFloat(
        getVal(monetaryTotal.PayableAmount) || "0"
      ),
      taxTotal: parseFloat(
        getVal(invoice.TaxTotal?.TaxAmount) || "0"
      ),
      currency: getVal(invoice.DocumentCurrencyCode),
    },

    notes: getArray(invoice.Note).map((n: any) => getVal(n)),
  };
}
