import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
] as const;

export function DashboardNav() {
  return (
    <nav
      className="border-b border-border bg-card px-6 py-2"
      aria-label="Main"
    >
      <ul className="flex flex-wrap gap-4 text-sm font-medium">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
