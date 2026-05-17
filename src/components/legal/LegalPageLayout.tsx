import Link from "next/link";
import type { LegalDocument, LegalItem } from "@/content/legal/types";

function RenderItem({ item }: { item: LegalItem }) {
  if (item.type === "paragraph") {
    return <p className="text-sm leading-relaxed text-text-secondary">{item.text}</p>;
  }
  if (item.type === "list") {
    return (
      <ul className="space-y-1.5 pl-1">
        {item.items.map((text, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    );
  }
  if (item.type === "definition") {
    return (
      <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-sm font-semibold text-text-primary">{item.term}</p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.definition}</p>
      </div>
    );
  }
  return null;
}

function Section({ section }: { section: LegalDocument["sections"][number] }) {
  return (
    <section id={section.id} className="space-y-4 scroll-mt-24">
      <h2 className="text-base font-semibold text-text-primary">{section.title}</h2>
      <div className="space-y-3">
        {section.body.map((item, i) => (
          <RenderItem key={i} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function LegalPageLayout({ doc }: { doc: LegalDocument }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface shadow-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 md:px-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-primary"
          >
            <span className="text-primary">←</span>
            Metria CRM
          </Link>
          <nav className="flex items-center gap-4 text-xs text-text-secondary">
            <Link href="/legal/privacidad" className="transition-colors hover:text-text-primary">
              Privacidad
            </Link>
            <Link href="/legal/condiciones" className="transition-colors hover:text-text-primary">
              Condiciones
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
        {/* Document header */}
        <div className="mb-10 border-b border-border pb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Master Iberica Immobiliaria 2025 S.L.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Ultima actualizacion: {doc.lastUpdated}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary">{doc.intro}</p>
        </div>

        {/* Index */}
        <nav className="mb-10 rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Indice">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Indice</p>
          <ol className="space-y-1.5">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-text-secondary transition-colors hover:text-primary"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10 divide-y divide-border">
          {doc.sections.map((section) => (
            <div key={section.id} className="pt-10 first:pt-0">
              <Section section={section} />
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} Master Iberica Immobiliaria 2025 S.L. · CIF B22440390
            </p>
            <nav className="flex gap-4 text-xs">
              <Link href="/legal/privacidad" className="text-text-secondary transition-colors hover:text-text-primary">
                Politica de privacidad
              </Link>
              <Link href="/legal/condiciones" className="text-text-secondary transition-colors hover:text-text-primary">
                Condiciones del servicio
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
