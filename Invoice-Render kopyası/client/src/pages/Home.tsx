import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { FileUploader } from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewHtml, setPreviewHtml] = useState<string>(""); // 🔹 YENİ
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("authToken")
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [, setLocation] = useLocation();

  const { toast } = useToast();

  const activeInvoice = invoices[activeIndex] ?? null;

  const fetchProfile = async (authToken: string) => {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      throw new Error("Failed to load profile");
    }
    const data = await res.json();
    setProfile(data);
  };

  const openSettings = () =>
    setLocation(profile?.role === "admin" ? "/admin" : "/account");

  const handleAuth = async () => {
    if (!authEmail || !authPassword) return;
    if (authMode === "register") {
      if (!authName || !authConfirmPassword) return;
      if (authPassword !== authConfirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please confirm your password.",
          variant: "destructive",
        });
        return;
      }
    }
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authMode === "register" ? authName : undefined,
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Auth failed");
      }

      if (authMode === "register") {
        setAuthPassword("");
        setAuthConfirmPassword("");
        toast({
          title: "Registration submitted",
          description: "Your account is pending admin approval.",
        });
        setAuthMode("login");
        return;
      }

      localStorage.setItem("authToken", data.token);
      setToken(data.token);
      setAuthPassword("");
      await fetchProfile(data.token).catch(() => null);
      toast({
        title: "Logged in",
        description: "You can now use the invoice tools.",
      });
    } catch (err) {
      toast({
        title: "Authentication failed",
        description:
          err instanceof Error
            ? err.message
            : "Check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setInvoices([]);
    setFiles([]);
    setPreviewHtml("");
    setProfile(null);
    setLocation("/");
  };

  const updateInvoice = (patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? { ...inv, invoice: { ...inv.invoice, ...patch } }
          : inv
      )
    );

  const updateBuyer = (patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? { ...inv, buyer: { ...inv.buyer, ...patch } }
          : inv
      )
    );

  const updateSeller = (patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? { ...inv, seller: { ...inv.seller, ...patch } }
          : inv
      )
    );

  const updatePayment = (patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? { ...inv, payment: { ...inv.payment, ...patch } }
          : inv
      )
    );

  const updateTotals = (patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? { ...inv, totals: { ...inv.totals, ...patch } }
          : inv
      )
    );

  const updateLine = (index: number, patch: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? {
              ...inv,
              lines: inv.lines.map((line: any, i: number) =>
                i === index ? { ...line, ...patch } : line
              ),
            }
          : inv
      )
    );

  const applyAllValue = (path: string, value: any) =>
    setInvoices((prev: any[]) =>
      prev.map((inv) => {
        if (path.startsWith("lines.")) {
          const [, indexStr, field] = path.split(".");
          const index = Number(indexStr);
          if (!Number.isFinite(index) || !field) return inv;
          if (!inv.lines || !inv.lines[index]) return inv;
          return {
            ...inv,
            lines: inv.lines.map((line: any, i: number) =>
              i === index ? { ...line, [field]: value } : line
            ),
          };
        }

        const [group, field] = path.split(".");
        if (!group || !field) return inv;
        return {
          ...inv,
          [group]: {
            ...inv[group],
            [field]: value,
          },
        };
      })
    );

  const ApplyAllButton = ({ onApply }: { onApply: () => void }) => (
    <button
      type="button"
      className="text-xs text-primary underline mt-1"
      onClick={onApply}
    >
      Apply to all loaded PDFs
    </button>
  );

  const addLine = () =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? {
              ...inv,
              lines: [
                ...inv.lines,
                {
                  description: "",
                  date: inv.invoice?.date ?? "",
                  qty: "1.00",
                  unit: "SERVICE",
                  unit_price: "",
                  vat: "0.00%",
                  total: "",
                },
              ],
            }
          : inv
      )
    );

  const removeLine = (index: number) =>
    setInvoices((prev: any[]) =>
      prev.map((inv, idx) =>
        idx === activeIndex
          ? {
              ...inv,
              lines: inv.lines.filter((_: any, i: number) => i !== index),
            }
          : inv
      )
    );

  // 1️⃣ XML/PDF → JSON (PARSE)
  const handleParse = async () => {
    if (!files.length || !token) return;

    setLoading(true);

    try {
      const responses = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const isPdf = file.name.toLowerCase().endsWith(".pdf");
          const endpoint = isPdf
            ? "/api/invoice/parse-pdf"
            : "/api/invoice/parse";

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          const data = await res.json();
          return { ...data, __fileName: file.name };
        })
      );

      setInvoices(responses);
      setActiveIndex(0);

      toast({
        title: "Files Parsed",
        description: "Invoice data loaded. You can now edit fields.",
      });
    } catch (err) {
      toast({
        title: "Parse Failed",
        description: "Failed to parse the uploaded files.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ JSON → HTML PREVIEW (LIVE)
  useEffect(() => {
    if (!activeInvoice || !token) return;

    const fetchPreview = async () => {
      try {
        const res = await fetch("/api/invoice/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(activeInvoice),
        });

        const html = await res.text();
        console.log("HTML LENGTH:", html.length);
        console.log("HTML PREVIEW:", html.slice(0, 300));
        setPreviewHtml(html);
      } catch (err) {
        console.error("Preview fetch failed", err);
      }
    };

    fetchPreview();
  }, [activeInvoice, token]);

  useEffect(() => {
    if (!token) return;
    fetchProfile(token).catch(() => null);
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        userEmail={profile?.email}
        userName={profile?.name}
        userRole={profile?.role}
        onOpenSettings={openSettings}
        onLogout={handleLogout}
      />

      <main className="flex-1 container mx-auto px-4 py-10 space-y-6">
        {!token ? (
          <div className="max-w-lg mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{authMode === "login" ? "Login" : "Register"}</CardTitle>
                <CardDescription>
                  Sign in to access invoice tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {authMode === "register" && (
                  <div className="space-y-1">
                    <Label className="min-h-[32px] flex items-end">Full Name</Label>
                    <input
                      className="w-full border p-2 rounded"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="min-h-[32px] flex items-end">Email</Label>
                  <input
                    type="email"
                    className="w-full border p-2 rounded"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="min-h-[32px] flex items-end">Password</Label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full border p-2 rounded pr-12"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {authMode === "register" && (
                  <div className="space-y-1">
                    <Label className="min-h-[32px] flex items-end">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full border p-2 rounded pr-12"
                        value={authConfirmPassword}
                        onChange={(e) =>
                          setAuthConfirmPassword(e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full text-base font-semibold"
                  onClick={handleAuth}
                  disabled={authLoading}
                >
                  {authLoading
                    ? authMode === "login"
                      ? "Logging in..."
                      : "Registering..."
                    : authMode === "login"
                    ? "Login"
                    : "Register"}
                </Button>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>
                    {authMode === "login"
                      ? "Need an account?"
                      : "Already have an account?"}
                  </span>
                  <button
                    className="text-primary underline"
                    onClick={() =>
                      setAuthMode(authMode === "login" ? "register" : "login")
                    }
                  >
                    {authMode === "login" ? "Register" : "Login"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            {/* ================= FILE UPLOAD ================= */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    XML & PDF Upload
                  </CardTitle>
                  <CardDescription>
                    Upload XML or PDF, edit invoice fields, and generate PDF
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Label className="min-h-[32px] flex items-end">Source Files</Label>
                  <FileUploader onFileSelect={setFiles} selectedFiles={files} />

                  <Separator />

                  <Button
                    className="w-full text-base font-semibold"
                    onClick={handleParse}
                    disabled={!files.length || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      "Parse Files"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

        {/* ================= GENERATE PDF ================= */}
        {activeInvoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="text-base font-semibold text-slate-700">
              Generate PDF
            </div>
            <Button
              variant="outline"
              className="w-full text-lg font-semibold py-6"
              onClick={async () => {
                try {
                  if (!token) {
                    throw new Error("Missing token");
                  }

                  const targets = invoices.length
                    ? invoices
                    : [activeInvoice];

                  for (const item of targets) {
                    const res = await fetch("/api/invoice/pdf", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(item),
                    });

                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const baseName =
                      item?.invoice?.number ||
                      item?.__fileName?.replace(/\.xml$/i, "") ||
                      "invoice";

                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${baseName}.pdf`;
                    a.click();

                    window.URL.revokeObjectURL(url);
                  }

                } catch (err) {
                  toast({
                    title: "PDF Error",
                    description: "Failed to generate PDF",
                    variant: "destructive",
                  });
                }
              }}
            >
              Generate PDF
            </Button>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* ================= EDITABLE FIELDS ================= */}
          {activeInvoice && (
            <motion.div
              className="space-y-6 min-w-0 w-full lg:basis-[40%] lg:max-w-[40%] lg:shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Edit Fields</CardTitle>
                  <CardDescription>
                    These changes will reflect instantly in the preview and PDF
                  </CardDescription>
                  {invoices.length > 1 && (
                    <div className="mt-3 space-y-1">
                      <Label className="min-h-[32px] flex items-end">Active Invoice</Label>
                      <select
                        className="w-full border p-2 rounded"
                        value={activeIndex}
                        onChange={(e) => setActiveIndex(Number(e.target.value))}
                      >
                        {invoices.map((inv, idx) => (
                          <option key={idx} value={idx}>
                            {inv.__fileName || inv.invoice?.number || `Invoice ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-8">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Invoice Details
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Invoice Number</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.invoice.number}
                          onChange={(e) =>
                            updateInvoice({ number: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("invoice.number", activeInvoice.invoice.number)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Invoice Date</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.invoice.date}
                          onChange={(e) => updateInvoice({ date: e.target.value })}
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("invoice.date", activeInvoice.invoice.date)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Service Date</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.invoice.service_date}
                          onChange={(e) =>
                            updateInvoice({ service_date: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "invoice.service_date",
                              activeInvoice.invoice.service_date
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Terms</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.invoice.payment_terms}
                          onChange={(e) =>
                            updateInvoice({ payment_terms: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "invoice.payment_terms",
                              activeInvoice.invoice.payment_terms
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Due Date</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.invoice.due_date}
                          onChange={(e) =>
                            updateInvoice({ due_date: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "invoice.due_date",
                              activeInvoice.invoice.due_date
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Buyer Details
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Customer Name</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.name}
                          onChange={(e) => updateBuyer({ name: e.target.value })}
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("buyer.name", activeInvoice.buyer.name)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Customer Company</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.company}
                          onChange={(e) =>
                            updateBuyer({ company: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "buyer.company",
                              activeInvoice.buyer.company
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0 md:col-span-3">
                        <Label className="min-h-[32px] flex items-end">Customer Address</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.address}
                          onChange={(e) =>
                            updateBuyer({ address: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "buyer.address",
                              activeInvoice.buyer.address
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Customer City</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.city}
                          onChange={(e) => updateBuyer({ city: e.target.value })}
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("buyer.city", activeInvoice.buyer.city)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Customer Country</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.country}
                          onChange={(e) =>
                            updateBuyer({ country: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "buyer.country",
                              activeInvoice.buyer.country
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Customer No</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.buyer.customer_no}
                          onChange={(e) =>
                            updateBuyer({ customer_no: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "buyer.customer_no",
                              activeInvoice.buyer.customer_no
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Seller Details
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Seller Company</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.company}
                          onChange={(e) =>
                            updateSeller({ company: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.company",
                              activeInvoice.seller.company
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0 md:col-span-3">
                        <Label className="min-h-[32px] flex items-end">Seller Address</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.address}
                          onChange={(e) =>
                            updateSeller({ address: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.address",
                              activeInvoice.seller.address
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Seller City</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.city}
                          onChange={(e) => updateSeller({ city: e.target.value })}
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.city",
                              activeInvoice.seller.city
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Seller Country</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.country}
                          onChange={(e) =>
                            updateSeller({ country: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.country",
                              activeInvoice.seller.country
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Tax Office</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.tax_office}
                          onChange={(e) =>
                            updateSeller({ tax_office: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.tax_office",
                              activeInvoice.seller.tax_office
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Tax No</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.tax_no}
                          onChange={(e) =>
                            updateSeller({ tax_no: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("seller.tax_no", activeInvoice.seller.tax_no)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Seller Email</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.email}
                          onChange={(e) => updateSeller({ email: e.target.value })}
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("seller.email", activeInvoice.seller.email)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Seller Website</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.seller.website}
                          onChange={(e) =>
                            updateSeller({ website: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "seller.website",
                              activeInvoice.seller.website
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Payment Details
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Bank</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.bank}
                          onChange={(e) =>
                            updatePayment({ bank: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("payment.bank", activeInvoice.payment.bank)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Branch</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.branch_name}
                          onChange={(e) =>
                            updatePayment({ branch_name: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.branch_name",
                              activeInvoice.payment.branch_name
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Branch Code</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.branch_code}
                          onChange={(e) =>
                            updatePayment({ branch_code: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.branch_code",
                              activeInvoice.payment.branch_code
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Account Name</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.account_name}
                          onChange={(e) =>
                            updatePayment({ account_name: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.account_name",
                              activeInvoice.payment.account_name
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Account Number</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.account_number}
                          onChange={(e) =>
                            updatePayment({ account_number: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.account_number",
                              activeInvoice.payment.account_number
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment IBAN</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.iban}
                          onChange={(e) =>
                            updatePayment({ iban: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("payment.iban", activeInvoice.payment.iban)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment SWIFT</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.swift}
                          onChange={(e) =>
                            updatePayment({ swift: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue("payment.swift", activeInvoice.payment.swift)
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0 md:col-span-3">
                        <Label className="min-h-[32px] flex items-end">Payment Bank Address</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.bank_address}
                          onChange={(e) =>
                            updatePayment({ bank_address: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.bank_address",
                              activeInvoice.payment.bank_address
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Payment Holder</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.payment.holder}
                          onChange={(e) =>
                            updatePayment({ holder: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "payment.holder",
                              activeInvoice.payment.holder
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Totals
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Subtotal</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.totals.subtotal}
                          onChange={(e) =>
                            updateTotals({ subtotal: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "totals.subtotal",
                              activeInvoice.totals.subtotal
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">VAT Rate</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.totals.vat_rate}
                          onChange={(e) =>
                            updateTotals({ vat_rate: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "totals.vat_rate",
                              activeInvoice.totals.vat_rate
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">VAT Amount</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.totals.vat_amount}
                          onChange={(e) =>
                            updateTotals({ vat_amount: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "totals.vat_amount",
                              activeInvoice.totals.vat_amount
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="min-h-[32px] flex items-end">Grand Total</Label>
                        <input
                          className="w-full border p-2 rounded"
                          value={activeInvoice.totals.grand_total}
                          onChange={(e) =>
                            updateTotals({ grand_total: e.target.value })
                          }
                        />
                        <ApplyAllButton
                          onApply={() =>
                            applyAllValue(
                              "totals.grand_total",
                              activeInvoice.totals.grand_total
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Line Items
                    </div>
                    {activeInvoice.lines.map((line: any, index: number) => (
                      <div key={index} className="mt-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold text-slate-700">
                            Line Item {index + 1}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLine(index)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1 min-w-0 md:col-span-2">
                            <Label className="min-h-[32px] flex items-end">Line Description</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.description}
                              onChange={(e) =>
                                updateLine(index, {
                                  description: e.target.value,
                                })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(
                                  `lines.${index}.description`,
                                  line.description
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line Date</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.date}
                              onChange={(e) =>
                                updateLine(index, { date: e.target.value })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(`lines.${index}.date`, line.date)
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line Qty</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.qty}
                              onChange={(e) =>
                                updateLine(index, { qty: e.target.value })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(`lines.${index}.qty`, line.qty)
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line Unit</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.unit}
                              onChange={(e) =>
                                updateLine(index, { unit: e.target.value })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(`lines.${index}.unit`, line.unit)
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line Unit Price</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.unit_price}
                              onChange={(e) =>
                                updateLine(index, {
                                  unit_price: e.target.value,
                                })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(
                                  `lines.${index}.unit_price`,
                                  line.unit_price
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line VAT</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.vat}
                              onChange={(e) =>
                                updateLine(index, { vat: e.target.value })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(`lines.${index}.vat`, line.vat)
                              }
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label className="min-h-[32px] flex items-end">Line Total</Label>
                            <input
                              className="w-full border p-2 rounded"
                              value={line.total}
                              onChange={(e) =>
                                updateLine(index, { total: e.target.value })
                              }
                            />
                            <ApplyAllButton
                              onApply={() =>
                                applyAllValue(`lines.${index}.total`, line.total)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={addLine}
                      >
                        Add Line Item
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* RIGHT – HTML PREVIEW */}
          <div className="min-w-0 w-full lg:basis-[60%] lg:max-w-[60%]">
              <div className="w-full max-w-[820px] mx-auto border rounded-xl bg-white overflow-auto p-10">
                {!activeInvoice ? (
                  <div className="h-[800px] flex items-center justify-center text-muted-foreground">
                    Upload and parse an XML file to see preview.
                  </div>
                ) : previewHtml ? (
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="h-[800px] flex items-center justify-center text-red-500">
                    Preview HTML is empty
                  </div>
                )}
              </div>
          </div>
        </div>
          </>
        )}
      </main>
</div>
);
}
