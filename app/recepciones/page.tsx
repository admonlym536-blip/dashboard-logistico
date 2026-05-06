"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CalendarDays, Download, PackageCheck, ShieldAlert, ShieldCheck } from "lucide-react";

// Función robusta para obtener la fecha actual en Colombia (YYYY-MM-DD)
// evitando desfases por zona horaria del navegador.
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

type CanastillaRow = {
  vehiculo: string;
  salida_grandes: number | null;
  salida_medianas: number | null;
  salida_pequenas: number | null;
  entrada_grandes: number | null;
  entrada_medianas: number | null;
  entrada_pequenas: number | null;
};

type ConsolidadoVehiculo = {
  vehiculo: string;
  salida_grandes: number;
  salida_medianas: number;
  salida_pequenas: number;
  entrada_grandes: number;
  entrada_medianas: number;
  entrada_pequenas: number;
  dif_grandes: number;
  dif_medianas: number;
  dif_pequenas: number;
};

/**
 * Página de Control de Canastillas
 *
 * Muestra un resumen de todas las canastillas por vehículo en el rango de fechas seleccionado.
 * Calcula las salidas, entradas y diferencias para cada tipo de canastilla (grandes, medianas, pequeñas)
 * y ofrece un resumen KPI en la parte superior. Incluye un botón para exportar el consolidado a Excel.
 */
export default function RecepcionesPage() {
  // Fechas de filtro inicializadas al día actual (zona local).
  const [fechaInicio, setFechaInicio] = useState(getFechaHoy);
  const [fechaFin, setFechaFin] = useState(getFechaHoy);

  // Datos consolidados por vehículo.
  const [data, setData] = useState<ConsolidadoVehiculo[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Consulta las canastillas del periodo y consolida por vehículo.
   */
  const cargar = useCallback(async () => {
    setLoading(true);

    const { data: registros, error } = await supabase
      .from("control_canastillas")
      .select("*")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) {
      console.error(error);
      setData([]);
      setLoading(false);
      return;
    }

    // Agrupar por vehículo y sumar entradas/salidas por tipo.
    const mapa: Record<string, Omit<ConsolidadoVehiculo, "dif_grandes" | "dif_medianas" | "dif_pequenas">> = {};
    ((registros as CanastillaRow[]) || []).forEach((reg) => {
      const vehiculo = reg.vehiculo;
      if (!mapa[vehiculo]) {
        mapa[vehiculo] = {
          vehiculo,
          salida_grandes: 0,
          salida_medianas: 0,
          salida_pequenas: 0,
          entrada_grandes: 0,
          entrada_medianas: 0,
          entrada_pequenas: 0,
        };
      }
      mapa[vehiculo].salida_grandes += reg.salida_grandes || 0;
      mapa[vehiculo].salida_medianas += reg.salida_medianas || 0;
      mapa[vehiculo].salida_pequenas += reg.salida_pequenas || 0;
      mapa[vehiculo].entrada_grandes += reg.entrada_grandes || 0;
      mapa[vehiculo].entrada_medianas += reg.entrada_medianas || 0;
      mapa[vehiculo].entrada_pequenas += reg.entrada_pequenas || 0;
    });

    const resultado: ConsolidadoVehiculo[] = Object.values(mapa).map((v) => ({
      ...v,
      dif_grandes: v.entrada_grandes - v.salida_grandes,
      dif_medianas: v.entrada_medianas - v.salida_medianas,
      dif_pequenas: v.entrada_pequenas - v.salida_pequenas,
    }));

    setData(resultado);
    setLoading(false);
  }, [fechaInicio, fechaFin]);

  // Carga el consolidado cada vez que cambien las fechas.
  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * Exporta el consolidado a Excel.
   */
  function exportarExcel() {
    if (data.length === 0) return;
    const wb = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        Vehiculo: d.vehiculo,
        Salida_Grandes: d.salida_grandes,
        Entrada_Grandes: d.entrada_grandes,
        Dif_Grandes: d.dif_grandes,
        Salida_Medianas: d.salida_medianas,
        Entrada_Medianas: d.entrada_medianas,
        Dif_Medianas: d.dif_medianas,
        Salida_Pequenas: d.salida_pequenas,
        Entrada_Pequenas: d.entrada_pequenas,
        Dif_Pequenas: d.dif_pequenas,
      }))
    );
    XLSX.utils.book_append_sheet(wb, hoja, "Canastillas");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `canastillas_${fechaInicio}_${fechaFin}.xlsx`
    );
  }

  // Calcular total de diferencias para los KPI.
  const totalDiferencias = data.reduce(
    (acc, d) => acc + d.dif_grandes + d.dif_medianas + d.dif_pequenas,
    0
  );
  const vehiculosConError = data.filter(
    (d) => d.dif_grandes !== 0 || d.dif_medianas !== 0 || d.dif_pequenas !== 0
  ).length;
  const vehiculosOK = data.filter(
    (d) => d.dif_grandes === 0 && d.dif_medianas === 0 && d.dif_pequenas === 0
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Control de Canastillas</h1>
            <p className="mt-1 text-sm text-slate-500">
              Consolidado por vehículo para el rango de fechas seleccionado
            </p>
          </div>

          <button
            onClick={exportarExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Download size={16} />
            Exportar Excel
          </button>
        </div>

        {/* Filtros de fecha */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
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
        </div>
      </section>

      {/* KPIs resumen */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-red-700">
            <PackageCheck size={16} />
            <p className="text-sm font-medium">Total Diferencias</p>
          </div>
          <h2 className="text-2xl font-bold text-red-700">{totalDiferencias}</h2>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-amber-700">
            <ShieldAlert size={16} />
            <p className="text-sm font-medium">Vehículos con error</p>
          </div>
          <h2 className="text-2xl font-bold text-amber-700">{vehiculosConError}</h2>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="mb-1 flex items-center gap-2 text-emerald-700">
            <ShieldCheck size={16} />
            <p className="text-sm font-medium">Vehículos OK</p>
          </div>
          <h2 className="text-2xl font-bold text-emerald-700">{vehiculosOK}</h2>
        </div>
      </section>

      {/* Tabla con numeración y diferencias */}
      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Cargando...</p>
      ) : (
        <section className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3 text-left">Vehículo</th>
                <th className="p-3">G Sal</th>
                <th className="p-3">G Ent</th>
                <th className="p-3">G Dif</th>
                <th className="p-3">M Sal</th>
                <th className="p-3">M Ent</th>
                <th className="p-3">M Dif</th>
                <th className="p-3">P Sal</th>
                <th className="p-3">P Ent</th>
                <th className="p-3">P Dif</th>
                <th className="p-3">Total Dif</th>
              </tr>
            </thead>
            <tbody>
              {[...data]
                .sort((a, b) => a.vehiculo.localeCompare(b.vehiculo))
                .map((d, i) => {
                  const totalDif = d.dif_grandes + d.dif_medianas + d.dif_pequenas;
                  return (
                    <tr key={d.vehiculo} className="border-t border-slate-100 text-center hover:bg-slate-50/70">
                      <td className="p-2 font-bold text-slate-500">{i + 1}</td>
                      <td className="p-2 text-left font-semibold text-slate-700">{d.vehiculo}</td>
                      <td>{d.salida_grandes}</td>
                      <td>{d.entrada_grandes}</td>
                      <td className={d.dif_grandes === 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
                        {d.dif_grandes}
                      </td>
                      <td>{d.salida_medianas}</td>
                      <td>{d.entrada_medianas}</td>
                      <td className={d.dif_medianas === 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
                        {d.dif_medianas}
                      </td>
                      <td>{d.salida_pequenas}</td>
                      <td>{d.entrada_pequenas}</td>
                      <td className={d.dif_pequenas === 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
                        {d.dif_pequenas}
                      </td>
                      <td
                        className={
                          totalDif === 0
                            ? "font-bold text-green-700"
                            : "bg-red-50 font-bold text-red-700"
                        }
                      >
                        {totalDif}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
