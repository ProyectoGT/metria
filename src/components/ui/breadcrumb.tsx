import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
      {items.map((item, index) => (
        <span key={index} className="flex min-w-0 items-center gap-1.5">
          {index > 0 && <span className="select-none">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="truncate transition-colors hover:text-text-primary"
            >
              {item.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
