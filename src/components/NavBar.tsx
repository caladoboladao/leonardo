"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Protocolos" },
  { href: "/lembretes", label: "Lembretes" },
  { href: "/historico", label: "Histórico" },
  { href: "/configuracoes", label: "Configurações" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            Protocolos Societários
          </span>
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
