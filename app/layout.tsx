"use client";

import "./globals.css";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();
  const router = useRouter();

  // 🔥 RUTAS SIN SIDEBAR
  const rutasSinSidebar = ["/login"];
  const ocultarSidebar = rutasSinSidebar.includes(pathname);

  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden bg-slate-100 text-slate-900">
        {/* SIDEBAR */}
        {!ocultarSidebar && (
          <aside
            className={`${
              collapsed ? "w-20" : "w-64"
            } h-screen border-r border-white/10 bg-gradient-to-b from-[#0B2F5B] via-[#0C3B75] to-[#0A2E5C] text-white shadow-2xl transition-all duration-300 flex flex-col`}
          >
            <div className="flex h-full flex-col p-4">
              {/* BOTÓN */}
              <button
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
                className="mb-4 ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm backdrop-blur-sm transition hover:scale-105 hover:bg-white/20"
              >
                {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>

              {/* LOGO */}
              {collapsed ? (
                <div className="mb-8 flex justify-center">
                  <img
                    src="/icon.png"
                    className="h-10 w-10 rounded-md object-cover shadow-md"
                    alt="Logo"
                  />
                </div>
              ) : (
                <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                  <img src="/icon.png" className="h-10 w-10 rounded-md object-cover" alt="Logo" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-tight">Provisión 360°</p>
                    <p className="text-xs text-blue-100/80">Sistema Logístico</p>
                  </div>
                </div>
              )}

              {/* MENÚ */}
              <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                <MenuItem href="/" label="Dashboard" icon={<LayoutDashboard size={18} />} collapsed={collapsed} />
                <MenuItem href="/recepciones" label="Canastas" icon={<ShoppingCart size={18} />} collapsed={collapsed} />
                <MenuItem href="/salidas" label="Inventario" icon={<Boxes size={18} />} collapsed={collapsed} />
                <MenuItem href="/reportes" label="Embalaje" icon={<Package size={18} />} collapsed={collapsed} />
                <MenuItem href="/planillas" label="Planillas" icon={<FileText size={18} />} collapsed={collapsed} />
              </nav>

              <button
                onClick={logout}
                className="mt-4 flex items-center gap-3 rounded-xl border border-rose-300/30 bg-rose-500/20 px-3 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
              >
                <LogOut size={18} />
                {!collapsed && <span>Cerrar sesión</span>}
              </button>
            </div>
          </aside>
        )}

        {/* CONTENIDO */}
        <main
          className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 ${
            !ocultarSidebar ? "" : "w-full"
          }`}
        >
          <div className="min-h-full rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm sm:p-4">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

function MenuItem({
  href,
  label,
  icon,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
}) {

  const pathname = usePathname();
  const activo = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        activo
          ? "bg-white/20 text-white shadow-md ring-1 ring-white/20"
          : "text-blue-50/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="text-base opacity-95">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}