import { Router } from "express";
import { parseUBL } from "../lib/parser";

const router = Router();

router.post("/parse", async (req, res) => {
  try {
    const xml = req.body.xml;

    if (!xml) {
      return res.status(400).json({ error: "XML missing" });
    }

    const invoice = parseUBL(xml);

    // ❌ PDF YOK
    // ✅ SADECE PARSE EDİLMİŞ VERİ
    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
