"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CalendarDays, Download, Boxes, PackageCheck, Wallet } from "lucide-react";

type InventarioRow = {
  sku: string | null;
  producto: string | null;
  precio: number | null;
  dev_buena: number | null;
  averias: number | null;
  cantidad_total: number | null;
  fecha: string | null;
};

type InventarioConsolidado = {
  sku: string;
  nombre: string;
  cantidad: number;
  devBuena: number;
  averias: number;
  precio: number;
  total: number;
};

const getFechaHoy = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find((p) => p.type === "year")?.value ?? "";
  const month = partes.find((p) => p.type === "month")?.value ?? "";
  const day = partes.find((p) => p.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
};

export default function SalidasPage() {
  const [fechaInicio, setFechaInicio] = useState(getFechaHoy);
  const [fechaFin, setFechaFin] = useState(getFechaHoy);

  const [rawData, setRawData] = useState<InventarioRow[]>([]);
  const [data, setData] = useState<InventarioConsolidado[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);

    try {
      const { data: result, error } = await supabase
        .from("inventario_devoluciones")
        .select("*")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin);

      if (error) {
        console.error("Error cargando datos:", error);
        setLoading(false);
        return;
      }

      const rows = (result as InventarioRow[]) || [];
      setRawData(rows);

      const mapa: Record<string, InventarioConsolidado> = {};

      rows.forEach((d) => {
        const sku = (d.sku || "SIN_SKU").trim();
        const nombre = d.producto || "SIN NOMBRE";
        const precio = Number(d.precio || 0);
        const cantidad = Number(d.cantidad_total || 0);
        const devBuena = Number(d.dev_buena || 0);
        const averias = Number(d.averias || 0);

        if (!mapa[sku]) {
          mapa[sku] = {
            sku,
            nombre,
            cantidad: 0,
            devBuena: 0,
            averias: 0,
            precio,
            total: 0,
          };
        }

        mapa[sku].cantidad += cantidad;
        mapa[sku].devBuena += devBuena;
        mapa[sku].averias += averias;
        mapa[sku].total += cantidad * precio;
      });

      setData(
        Object.values(mapa).sort((a, b) => b.total - a.total)
      );
    } catch (err) {
      console.error("Error general:", err);
    }

    setLoading(false);
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const formatoCOP = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(v || 0);

  const formatoNumero = (v: number) =>
    new Intl.NumberFormat("es-CO").format(v || 0);

  const exportarExcel = () => {
    if (data.length === 0 && rawData.length === 0) return;

    const wb = XLSX.utils.book_new();

    const hojaResumen = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        SKU: d.sku,
        Producto: d.nombre,
        Devolucion_Buena: d.devBuena,
        Averias: d.averias,
        Cantidad_Total: d.cantidad,
        Precio: d.precio,
        Total: d.total,
      }))
    );

    const hojaDetalle = XLSX.utils.json_to_sheet(
      rawData.map((d) => ({
        Fecha: d.fecha || "",
        SKU: d.sku || "SIN_SKU",
        Producto: d.producto || "SIN NOMBRE",
        Precio: Number(d.precio || 0),
        Devolucion_Buena: Number(d.dev_buena || 0),
        Averias: Number(d.averias || 0),
        Cantidad_Total: Number(d.cantidad_total || 0),
        Total: Number(d.cantidad_total || 0) * Number(d.precio || 0),
      }))
    );

    const totalGeneral = data.reduce((acc, item) => acc + item.total, 0);
    const totalUnidades = data.reduce((acc, item) => acc + item.cantidad, 0);

    const hojaFiltros = XLSX.utils.json_to_sheet([
      { Campo: "Fecha inicio", Valor: fechaInicio },
      { Campo: "Fecha fin", Valor: fechaFin },
      { Campo: "Registros detalle", Valor: rawData.length },
      { Campo: "Productos consolidados", Valor: data.length },
      { Campo: "Unidades totales", Valor: totalUnidades },
      { Campo: "Total valorizado", Valor: totalGeneral },
    ]);

    XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen_SKU");
    XLSX.utils.book_append_sheet(wb, hojaDetalle, "Detalle_Por_Fecha");
    XLSX.utils.book_append_sheet(wb, hojaFiltros, "Filtros");

    const buffer = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    });

    saveAs(new Blob([buffer]), `inventario_${fechaInicio}_${fechaFin}.xlsx`);
  };

  const totalGeneral = data.reduce((a, b) => a + b.total, 0);
  const totalUnidades = data.reduce((a, b) => a + b.cantidad, 0);
  const totalSku = data.length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Inventario de devoluciones
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Consolidado por SKU dentro del rango de fechas seleccionado
            </p>
          </div>

          <button
            onClick={exportarExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || (data.length === 0 && rawData.length === 0)}
          >
            <Download size={16} />
            Exportar Excel
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3 top-3 text-slate-400" />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-2 text-slate-500">
              <Wallet size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Total valorizado</span>
            </div>
            <p className="text-lg font-bold text-blue-700">{formatoCOP(totalGeneral)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-2 text-slate-500">
              <PackageCheck size={16} />
              <span className="text-xs font-medium uppercase tracking-wide">Unidades / SKU</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {formatoNumero(totalUnidades)} / {formatoNumero(totalSku)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Cargando inventario...</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No hay datos en este rango de fechas.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">SKU</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Producto</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">Dev. buena</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">Averías</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide">Cantidad</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Precio</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={`${d.sku}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-sm font-medium text-slate-700">{d.sku}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{d.nombre}</td>
                    <td className="px-3 py-2 text-center text-sm font-medium text-emerald-700">
                      {formatoNumero(d.devBuena)}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-medium text-rose-700">
                      {formatoNumero(d.averias)}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-slate-800">
                      {formatoNumero(d.cantidad)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-700">
                      {formatoCOP(d.precio)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-blue-700">
                      {formatoCOP(d.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
        <Boxes size={14} />
        Datos provenientes de la vista <span className="font-semibold text-slate-700">inventario_devoluciones</span>
      </div>
    </div>
  );
}
