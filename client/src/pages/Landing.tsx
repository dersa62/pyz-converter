import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_60%)]" />
          <div className="container mx-auto px-4 py-16 relative">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                XML & PDF to PDF Converter
              </p>
              <h1 className="mt-4 text-4xl md:text-5xl font-display font-bold text-slate-900 leading-tight">
                PYZ Converter
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                XML and PDF to PDF converter with a fast template changer.
                Upload invoices, edit the layout, and export consistent PDFs in
                minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/converter">
                  <Button className="px-10 py-7 text-lg font-semibold">
                    Converter
                  </Button>
                </Link>
                <div className="text-sm text-slate-500 self-center">
                  Secure processing • Instant preview • Multi-file support
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Invoice editor
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Edit seller, buyer, line items, totals, and payment details with
                live preview.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                PDF editor
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Upload PDFs, extract invoice data, and re-export with a clean
                template.
              </p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Template changer
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Keep your branding consistent and instantly update invoice
                templates.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Built for teams who need reliable invoice conversions
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              PYZ Converter is an invoice editor, PDF editor, and template
              changer in one place. It helps businesses that regularly convert
              XML invoices and PDFs into polished PDFs for clients, accounting,
              or archiving. If you are looking for an XML and PDF to PDF
              converter, invoice template changer, or an invoice editor that
              keeps layouts consistent, this is built for you.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
