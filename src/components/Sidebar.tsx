"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Protocolos", icon: IconTable },
  { href: "/concluidos", label: "Concluídos", icon: IconCheck },
  { href: "/dashboard", label: "Dashboard", icon: IconChart },
  { href: "/lembretes", label: "Lembretes", icon: IconBell },
  { href: "/configuracoes", label: "Configurações", icon: IconGear },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="group fixed inset-y-0 left-0 z-40 flex w-14 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-out hover:w-60 hover:shadow-xl">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
        <span className="whitespace-nowrap text-sm font-semibold leading-tight text-slate-900 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Protocolos Societários
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-2 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <IconExit className="h-4 w-4 shrink-0" />
          <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}

type IconProps = { className?: string };

function IconTable({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6h13M6 6v7.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 13.5V6M8 13.5V2.5M14 13.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 2.5c-2 0-3.4 1.6-3.4 3.6v2.1L3.5 10.6h9L11.4 8.2V6.1c0-2-1.4-3.6-3.4-3.6Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.6 12.5a1.4 1.4 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.3 8.2 7.2 10l3.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGear({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.8v1.4M8 12.8v1.4M14.2 8h-1.4M3.2 8H1.8M12.2 3.8l-1 1M4.8 11.2l-1 1M12.2 12.2l-1-1M4.8 4.8l-1-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconExit({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M6.5 13.5H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h3.5M10.5 11l3-3-3-3M13 8H5.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
