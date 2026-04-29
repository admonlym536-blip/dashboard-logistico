'use client';

import './globals.css';
import Link from 'next/link';
import { useState } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Estado para controlar si el sidebar está colapsado o no
  const [collapsed, setCollapsed] = useState(false);

  // Función que alterna el estado
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <html lang="es">
      <body className="flex bg-gray-100">
        {/* SIDEBAR */}
        <aside
          className={`${
            collapsed ? 'w-20' : 'w-64'
          } bg-[#0C3B75] text-white min-h-screen p-5 shadow-lg transition-all duration-300`}
        >
          {/* BOTÓN DE COLAPSO */}
          <button
            onClick={toggleSidebar}
            className="mb-4 flex items-center justify-end w-full text-white focus:outline-none"
          >
            {collapsed ? '➡️' : '⬅️'}
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

          {/* MENU */}
          <nav className="flex flex-col gap-2">
            <MenuItem href="/" label="Dashboard" icon="📊" collapsed={collapsed} />
            <MenuItem href="/recepciones" label="Recepciones" icon="📦" collapsed={collapsed} />
            <MenuItem href="/salidas" label="Salidas" icon="🚚" collapsed={collapsed} />
            <MenuItem href="/reportes" label="Reportes" icon="📈" collapsed={collapsed} />
          </nav>
        </aside>

        {/* CONTENIDO */}
        <main className="flex-1 p-6">{children}</main>
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
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-700 transition"
    >
      <span>{icon}</span>
      {/* Oculta el texto cuando el sidebar está colapsado */}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}