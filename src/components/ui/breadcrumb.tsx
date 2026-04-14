import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-sm text-text-secondary">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="select-none">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-text-primary transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
