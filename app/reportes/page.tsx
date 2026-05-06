"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, Search, Package2 } from "lucide-react";

type ReporteCubetajeRow = {
  sku: string | null;
  producto: string | null;
  cantidad: number | null;
  embalaje: string | null;
  unidades_x_embalaje: number | null;
  cubetas: number | null;
  sobrante: number | null;
  fecha: string | null;
};

// Función robusta para obtener fecha actual en Colombia (YYYY-MM-DD).
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
  const [skuFiltro, setSkuFiltro] = useState("");

  const [data, setData] = useState<ReporteCubetajeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("reporte_cubetaje")
        .select("*")
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)
        .order("fecha", { ascending: false });

      if (skuFiltro) {
        query = query.ilike("sku", `%${skuFiltro}%`);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error("Error vista:", error);
        setLoading(false);
        return;
      }

      setData((result as ReporteCubetajeRow[]) || []);
    } catch (err) {
      console.error("Error general:", err);
    }

    setLoading(false);
  }, [fechaInicio, fechaFin, skuFiltro]);

  const resumen = {
    grande: 0,
    mediana: 0,
    pequena: 0,
  };

  data.forEach((d) => {
    const extra = (d.sobrante || 0) > 0 ? 1 : 0;
    const totalCanastas = (d.cubetas || 0) + extra;

    if (!d.embalaje) return;

    const emb = d.embalaje.toLowerCase();

    if (emb.includes("grande")) {
      resumen.grande += totalCanastas;
    } else if (emb.includes("mediana")) {
      resumen.mediana += totalCanastas;
    } else if (emb.includes("peque")) {
      resumen.pequena += totalCanastas;
    }
  });

  const exportarExcel = () => {
    if (data.length === 0) return;

    const wb = XLSX.utils.book_new();

    const hoja = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        SKU: d.sku,
        Producto: d.producto,
        Cantidad: d.cantidad,
        Embalaje: d.embalaje,
        "Unidades x Embalaje": d.unidades_x_embalaje,
        Cubetas: d.cubetas,
        Sobrante: d.sobrante,
        "Canastas Reales": (d.cubetas || 0) + ((d.sobrante || 0) > 0 ? 1 : 0),
        Fecha: d.fecha,
      }))
    );

    XLSX.utils.book_append_sheet(wb, hoja, "Cubetaje");

    const buffer = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    });

    saveAs(new Blob([buffer]), `cubetaje_${fechaInicio}_${fechaFin}.xlsx`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Package2 className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-800">Reporte de Cubetas</h1>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <input
            type="text"
            placeholder="Buscar SKU..."
            value={skuFiltro}
            onChange={(e) => setSkuFiltro(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:col-span-1"
          />

          <button
            onClick={cargar}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            Consultar
          </button>

          <button
            onClick={exportarExcel}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Canastas Grandes</p>
          <h2 className="text-2xl font-bold text-blue-700">{resumen.grande}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Canastas Medianas</p>
          <h2 className="text-2xl font-bold text-green-700">{resumen.mediana}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Canastas Pequeñas</p>
          <h2 className="text-2xl font-bold text-orange-700">{resumen.pequena}</h2>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Cargando...
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          No hay datos
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-slate-700">SKU</th>
                <th className="p-3 text-left text-sm font-semibold text-slate-700">Producto</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Cantidad</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Embalaje</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Und x Emb</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Cubetas</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Sobrante</th>
                <th className="p-3 text-center text-sm font-semibold text-slate-700">Canastas</th>
              </tr>
            </thead>

            <tbody>
              {data.map((d, i) => {
                const canastas = (d.cubetas || 0) + ((d.sobrante || 0) > 0 ? 1 : 0);

                return (
                  <tr
                    key={`${d.sku ?? "sin-sku"}-${i}`}
                    className={`border-t border-slate-100 transition hover:bg-slate-50 ${!d.embalaje ? "bg-red-50" : ""}`}
                  >
                    <td className="p-3 text-sm text-slate-700">{d.sku}</td>
                    <td className="p-3 text-sm text-slate-700">{d.producto}</td>
                    <td className="p-3 text-center text-sm font-semibold text-slate-700">{d.cantidad}</td>
                    <td className="p-3 text-center text-sm text-slate-700">{d.embalaje}</td>
                    <td className="p-3 text-center text-sm text-slate-700">{d.unidades_x_embalaje}</td>
                    <td className="p-3 text-center text-sm text-slate-700">{d.cubetas}</td>
                    <td className="p-3 text-center text-sm text-slate-700">{d.sobrante}</td>
                    <td className="p-3 text-center text-sm font-bold text-slate-800">{canastas}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
