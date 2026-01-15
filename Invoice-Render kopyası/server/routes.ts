console.log(">>> routes.ts LOADED");

import type { Express, Request, Response } from "express";
import type { Server } from "http";
import multer from "multer";
import { generatePDFFromHtml } from "./lib/pdf";
import { api } from "@shared/routes";
import { parseUBL } from "./lib/parser";
import { generatePDF } from "./lib/pdf";
import { renderInvoiceHtml } from "./templates/renderInvoiceTemplate";
import { mapToInvoiceModel } from "./lib/mapToInvoiceTemplate";
import { parseInvoicePdf } from "./lib/parseInvoicePdf";
import { db } from "./db";
import { pdfs, users, userChangeRequests } from "@shared/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  comparePassword,
  ensureAdminUser,
  hashPassword,
  requireAuth,
  requireAdmin,
  signToken,
} from "./lib/auth";

// Multer setup (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log(">>> registerRoutes CALLED");
  await ensureAdminUser();

  /* ===============================
     AUTH
  =============================== */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password required" });
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const inserted = await db
        .insert(users)
        .values({ name, email, passwordHash, role: "user", status: "pending" })
        .returning();

      const user = inserted[0];
      return res.status(202).json({ status: user.status });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const found = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!found.length) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = found[0];
      if (user.status !== "approved" && user.role !== "admin") {
        return res.status(403).json({ message: "Account pending approval" });
      }
      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return res.json({ token });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const user = (req as Request & { user?: { userId: number } }).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const found = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (!found.length) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(found[0]);
  });

  app.get(
    "/api/admin/users",
    requireAuth,
    requireAdmin,
    async (_req: Request, res: Response) => {
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users);
      return res.json(allUsers);
    }
  );

  app.patch(
    "/api/admin/users/:id",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const userId = Number(req.params.id);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const { name, email, role, status, password } = req.body || {};
      const updates: Record<string, any> = {};
      if (typeof name === "string") updates.name = name;
      if (typeof email === "string") updates.email = email;
      if (typeof role === "string") updates.role = role;
      if (typeof status === "string") updates.status = status;

      if (typeof password === "string" && password.trim()) {
        updates.passwordHash = await hashPassword(password);
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({ message: "No updates provided" });
      }

      if (updates.email) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, updates.email))
          .limit(1);
        if (existing.length && existing[0].id !== userId) {
          return res.status(409).json({ message: "Email already registered" });
        }
      }

      const updated = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
        });

      if (!updated.length) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(updated[0]);
    }
  );

  app.get(
    "/api/admin/change-requests",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const query = db
        .select({
          id: userChangeRequests.id,
          userId: userChangeRequests.userId,
          field: userChangeRequests.field,
          value: userChangeRequests.value,
          status: userChangeRequests.status,
          createdAt: userChangeRequests.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(userChangeRequests)
        .innerJoin(users, eq(users.id, userChangeRequests.userId));

      const rows = status
        ? await query.where(eq(userChangeRequests.status, status))
        : await query;

      return res.json(rows);
    }
  );

  app.post(
    "/api/admin/change-requests/:id/approve",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const requestId = Number(req.params.id);
      if (!Number.isFinite(requestId)) {
        return res.status(400).json({ message: "Invalid request id" });
      }

      const found = await db
        .select()
        .from(userChangeRequests)
        .where(eq(userChangeRequests.id, requestId))
        .limit(1);

      if (!found.length) {
        return res.status(404).json({ message: "Request not found" });
      }

      const request = found[0];
      const updates: Record<string, any> = {};
      if (request.field === "name") updates.name = request.value;
      if (request.field === "email") updates.email = request.value;
      if (request.field === "password") {
        updates.passwordHash = request.isHashed
          ? request.value
          : await hashPassword(request.value);
      }

      if (updates.email) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, updates.email))
          .limit(1);
        if (existing.length && existing[0].id !== request.userId) {
          return res.status(409).json({ message: "Email already registered" });
        }
      }

      if (Object.keys(updates).length) {
        await db.update(users).set(updates).where(eq(users.id, request.userId));
      }

      const updated = await db
        .update(userChangeRequests)
        .set({ status: "approved", reviewedAt: new Date() })
        .where(eq(userChangeRequests.id, requestId))
        .returning({ id: userChangeRequests.id, status: userChangeRequests.status });

      return res.json(updated[0]);
    }
  );

  app.post(
    "/api/admin/change-requests/:id/reject",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const requestId = Number(req.params.id);
      if (!Number.isFinite(requestId)) {
        return res.status(400).json({ message: "Invalid request id" });
      }

      const updated = await db
        .update(userChangeRequests)
        .set({ status: "rejected", reviewedAt: new Date() })
        .where(eq(userChangeRequests.id, requestId))
        .returning({ id: userChangeRequests.id, status: userChangeRequests.status });

      if (!updated.length) {
        return res.status(404).json({ message: "Request not found" });
      }

      return res.json(updated[0]);
    }
  );

  app.get(
    "/api/user/change-requests",
    requireAuth,
    async (req: Request, res: Response) => {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const unseen = req.query.unseen === "1" || req.query.unseen === "true";

      const conditions = [eq(userChangeRequests.userId, user.userId)];
      if (status) {
        conditions.push(eq(userChangeRequests.status, status));
      }
      if (unseen) {
        conditions.push(isNull(userChangeRequests.seenAt));
      }

      const rows = await db
        .select({
          id: userChangeRequests.id,
          field: userChangeRequests.field,
          status: userChangeRequests.status,
          createdAt: userChangeRequests.createdAt,
          reviewedAt: userChangeRequests.reviewedAt,
          seenAt: userChangeRequests.seenAt,
        })
        .from(userChangeRequests)
        .where(and(...conditions));
      return res.json(rows);
    }
  );

  app.post(
    "/api/user/change-requests",
    requireAuth,
    async (req: Request, res: Response) => {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { field, value } = req.body || {};
      if (!field || typeof field !== "string" || typeof value !== "string") {
        return res.status(400).json({ message: "field and value required" });
      }

      const allowed = ["name", "email", "password"];
      if (!allowed.includes(field)) {
        return res.status(400).json({ message: "Unsupported field" });
      }

      const storedValue =
        field === "password" ? await hashPassword(value) : value;

      const inserted = await db
        .insert(userChangeRequests)
        .values({
          userId: user.userId,
          field,
          value: storedValue,
          isHashed: field === "password",
          status: "pending",
        })
        .returning({
          id: userChangeRequests.id,
          status: userChangeRequests.status,
        });

      return res.status(201).json(inserted[0]);
    }
  );

  app.post(
    "/api/user/change-requests/mark-seen",
    requireAuth,
    async (req: Request, res: Response) => {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { ids } = req.body || {};
      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ message: "ids required" });
      }

      await db
        .update(userChangeRequests)
        .set({ seenAt: new Date() })
        .where(
          and(
            eq(userChangeRequests.userId, user.userId),
            inArray(userChangeRequests.id, ids)
          )
        );

      return res.json({ ok: true });
    }
  );

  app.get(
    "/api/admin/pending-users",
    requireAuth,
    requireAdmin,
    async (_req: Request, res: Response) => {
      const pending = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.status, "pending"));

      return res.json(pending);
    }
  );

  app.post(
    "/api/admin/approve-user",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }

      const updated = await db
        .update(users)
        .set({ status: "approved" })
        .where(eq(users.id, Number(userId)))
        .returning({ id: users.id, status: users.status });

      if (!updated.length) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(updated[0]);
    }
  );

  app.post(
    "/api/admin/reject-user",
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }

      const removed = await db
        .delete(users)
        .where(eq(users.id, Number(userId)))
        .returning({ id: users.id });

      if (!removed.length) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ id: removed[0].id });
    }
  );

  /* ===============================
     HEALTH CHECK
  =============================== */
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  /* ===============================
     1️⃣ XML → PDF (ESKİ SİSTEM)
     (Dokunulmadı – geriye uyumluluk)
  =============================== */
  app.post(
    api.convert.path,
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const xmlContent = req.file.buffer.toString("utf-8");
        const language = (req.body.language as "en" | "tr") || "en";
        const template =
          (req.body.template as "standard" | "minimal") || "standard";

        const invoiceData = parseUBL(xmlContent);

        const pdfBuffer = await generatePDF(invoiceData, {
          language,
          template,
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${invoiceData.invoiceNumber}.pdf"`
        );
        res.send(pdfBuffer);
      } catch (err) {
  console.error("JSON → PDF error (FULL):", err);

  const message =
    err instanceof Error ? err.message : "Failed to generate PDF";

  res.status(500).json({ message });
}

    }
  );

  /* ===============================
     2️⃣ XML → JSON (ANA AKIŞ)
  =============================== */
  app.post(
    "/api/invoice/parse",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const xmlContent = req.file.buffer.toString("utf-8");

        const normalized = parseUBL(xmlContent);
        const invoiceModel = mapToInvoiceModel(normalized);
        console.log("Parsed supplier taxId:", normalized?.supplier?.taxId);
        console.log("Mapped seller tax_no:", invoiceModel?.seller?.tax_no);

        // ❗ Sadece JSON dönüyoruz
        res.json(invoiceModel);
      } catch (err) {
        console.error("Parse XML error:", err);
        res.status(500).json({ message: "Failed to parse XML" });
      }
    }
  );

  app.post(
    "/api/invoice/parse-pdf",
    requireAuth,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const invoiceModel = await parseInvoicePdf(req.file.buffer);
        res.json(invoiceModel);
      } catch (err) {
        console.error("Parse PDF error:", err);
        res.status(500).json({ message: "Failed to parse PDF" });
      }
    }
  );

  /* ===============================
     3️⃣ JSON → HTML PREVIEW (LIVE)
  =============================== */
  app.post(
    "/api/invoice/preview",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        console.log("🔎 PREVIEW BODY:", req.body);

        const invoiceModel = req.body;
        const html = renderInvoiceHtml(invoiceModel);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } catch (err) {
        console.error("Preview HTML error:", err);
        res.status(500).send("Failed to render preview");
      }
    }
  );

  /* ===============================
     4️⃣ JSON → PDF (GERÇEK PDF)
     (Preview ile birebir)
  =============================== */
  app.post(
  "/api/invoice/pdf",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      const invoiceModel = req.body;

      // 1️⃣ JSON → HTML
      const html = renderInvoiceHtml(invoiceModel);

      console.log("📄 PDF HTML LENGTH:", html.length);
      console.log("📄 PDF HTML PREVIEW:", html.slice(0, 200));

      // 2️⃣ HTML → PDF  ✅ DOĞRU YOL
      const pdfBuffer = await generatePDFFromHtml(html);

      if (user?.userId) {
        const fileName = `${invoiceModel.invoice.number}.pdf`;
        await db.insert(pdfs).values({
          userId: user.userId,
          fileName,
          invoiceNumber: invoiceModel.invoice.number,
          pdfData: Buffer.from(pdfBuffer).toString("base64"),
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoiceModel.invoice.number}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("JSON → PDF error:", err);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  }
);


  /* ===============================
     5️⃣ HTML PREVIEW (TEST / DEBUG)
  =============================== */
  app.get("/api/invoice/preview-html", requireAuth, (_req, res) => {
    const demoModel = {
      invoice: {
        number: "TEST-1",
        date: "13/01/2026",
        service_date: "13/01/2026",
        payment_terms: "30 days",
        due_date: "12/02/2026",
      },
      buyer: {
        name: "David Jones",
        company: "Customer Company Ltd.",
        address: "Four Bow Road",
        city: "London N4 3SG",
        country: "United Kingdom",
        customer_no: "1",
      },
      lines: [
        {
          description: "Example product",
          date: "13/01/2026",
          qty: "1.00",
          unit: "h",
          unit_price: "£100.00",
          vat: "0.00%",
          total: "£100.00",
        },
      ],
      totals: {
        subtotal: "£100.00",
        vat_rate: "0.00%",
        vat_amount: "£0.00",
        grand_total: "£100.00",
      },
      seller: {
        company: "PAYIZ",
        address: "Istanbul",
        city: "Istanbul",
        country: "Turkey",
        tax_office: "Pendik",
        tax_no: "1234567890",
        email: "info@example.com",
        website: "https://example.com",
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

    const html = renderInvoiceHtml(demoModel);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  app.get("/api/user/pdfs", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as Request & { user?: { userId: number } }).user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const records = await db
        .select({
          id: pdfs.id,
          fileName: pdfs.fileName,
          invoiceNumber: pdfs.invoiceNumber,
          createdAt: pdfs.createdAt,
        })
        .from(pdfs)
        .where(eq(pdfs.userId, user.userId))
        .orderBy(pdfs.createdAt);

      return res.json(records);
    } catch (err) {
      console.error("List PDFs error:", err);
      return res.status(500).json({ message: "Failed to load PDFs" });
    }
  });

  app.get(
    "/api/user/pdfs/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = (req as Request & { user?: { userId: number } }).user;
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const pdfId = Number(req.params.id);
        if (!Number.isFinite(pdfId)) {
          return res.status(400).json({ message: "Invalid id" });
        }

        const found = await db
          .select({
            fileName: pdfs.fileName,
            pdfData: pdfs.pdfData,
          })
          .from(pdfs)
          .where(and(eq(pdfs.id, pdfId), eq(pdfs.userId, user.userId)))
          .limit(1);

        const record = found[0];
        if (!record) {
          return res.status(404).json({ message: "PDF not found" });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${record.fileName}"`
        );
        return res.send(Buffer.from(record.pdfData, "base64"));
      } catch (err) {
        console.error("Download PDF error:", err);
        return res.status(500).json({ message: "Failed to download PDF" });
      }
    }
  );

  return httpServer;
}
