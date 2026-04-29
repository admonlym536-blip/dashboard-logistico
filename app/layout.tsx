"use client";

import "./globals.css";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();

  // 🔥 RUTAS SIN SIDEBAR
  const rutasSinSidebar = ["/login"];
  const ocultarSidebar = rutasSinSidebar.includes(pathname);

  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <html lang="es">
      <body className="flex h-screen bg-gray-100 overflow-hidden">

        {/* 🔥 SIDEBAR FIJO */}
        {!ocultarSidebar && (
          <aside
            className={`${
              collapsed ? "w-20" : "w-64"
            } bg-[#0C3B75] text-white h-screen p-5 shadow-lg transition-all duration-300 flex flex-col`}
          >
            {/* BOTÓN */}
            <button
              onClick={toggleSidebar}
              className="mb-4 flex items-center justify-end w-full text-white"
            >
              {collapsed ? "➡️" : "⬅️"}
            </button>

            {/* LOGO */}
            <div className="flex items-center gap-2 mb-8">
              <img src="/icon.png" className="h-10" alt="Logo" />
              {!collapsed && (
                <div>
                  <p className="font-bold text-lg">Provisión 360°</p>
                  <p className="text-xs text-gray-300">Sistema Logístico</p>
                </div>
              )}
            </div>

            {/* MENÚ */}
            <nav className="flex flex-col gap-2 overflow-y-auto">

              <MenuItem
                href="/"
                label="Dashboard"
                icon="📊"
                collapsed={collapsed}
              />

              <MenuItem
                href="/recepciones"
                label="Canastas"
                icon="🛒"
                collapsed={collapsed}
              />

              <MenuItem
                href="/salidas"
                label="Inventario"
                icon="📦"
                collapsed={collapsed}
              />

              <MenuItem
                href="/reportes"
                label="Embalaje"
                icon="🟨"
                collapsed={collapsed}
              />

              <MenuItem
                href="/planillas"
                label="Planillas"
                icon="📄"
                collapsed={collapsed}
              />

            </nav>
          </aside>
        )}

        {/* 🔥 CONTENIDO CON SCROLL */}
        <main
          className={`flex-1 p-6 overflow-y-auto ${
            !ocultarSidebar ? "" : "w-full"
          }`}
        >
          {children}
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
  icon: string;
  collapsed: boolean;
}) {

  const pathname = usePathname();
  const activo = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-lg transition ${
        activo
          ? "bg-blue-800"
          : "hover:bg-blue-700"
      }`}
    >
      <span>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}