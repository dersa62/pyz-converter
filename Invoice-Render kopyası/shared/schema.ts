import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We don't necessarily need a DB for a stateless converter, 
// but we'll keep a log of conversions if needed, or just use this for type definitions.
// For now, we'll define the Invoice Model structure that we extract from XML.

export const normalizedInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  issueDate: z.string(), // YYYY-MM-DD
  uuid: z.string(),
  currencyCode: z.string(),
  
  supplier: z.object({
    name: z.string(),
    taxId: z.string().optional(),
    taxOffice: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
  }),

  customer: z.object({
    name: z.string(),
    taxId: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),

  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
    taxRate: z.number(),
    taxAmount: z.number(),
    total: z.number(),
  })),

  totals: z.object({
    lineExtensionAmount: z.number(), // Subtotal excluding tax
    taxExclusiveAmount: z.number(),
    taxInclusiveAmount: z.number(), // Grand Total
    payableAmount: z.number(),
    taxTotal: z.number(),
    currency: z.string(),
  }),
  
  notes: z.array(z.string()).optional(),
});

export type NormalizedInvoice = z.infer<typeof normalizedInvoiceSchema>;

// For the API Request (multipart/form-data) - we can't fully type the file here, 
// but we can type the other fields.
export const conversionOptionsSchema = z.object({
  language: z.enum(["en", "tr"]).default("en"),
  template: z.enum(["standard", "minimal"]).default("standard"),
});

export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("User"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pdfs = pgTable("pdfs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  fileName: text("file_name").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  pdfData: text("pdf_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userChangeRequests = pgTable("user_change_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  field: text("field").notNull(),
  value: text("value").notNull(),
  isHashed: boolean("is_hashed").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  seenAt: timestamp("seen_at"),
});
