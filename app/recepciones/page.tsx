
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Función para obtener la fecha actual en zona horaria local (Colombia) evitando desfaces con UTC.
const getFechaHoy = () => {
  const hoy = new Date();
  return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
    .toISOString()
    .substring(0, 10);
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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Carga el consolidado cada vez que cambien las fechas.
  useEffect(() => {
    cargar();
  }, [fechaInicio, fechaFin]);

  /**
   * Consulta las canastillas del periodo y consolida por vehículo.
   */
  async function cargar() {
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
    const mapa: Record<string, any> = {};
    (registros || []).forEach((reg: any) => {
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

    const resultado = Object.values(mapa).map((v: any) => ({
      ...v,
      dif_grandes: v.entrada_grandes - v.salida_grandes,
      dif_medianas: v.entrada_medianas - v.salida_medianas,
      dif_pequenas: v.entrada_pequenas - v.salida_pequenas,
    }));

    setData(resultado);
    setLoading(false);
  }

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Control de Canastillas</h1>

      {/* Filtros de fecha */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          📄 Excel
        </button>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Diferencias</p>
          <h2 className="text-xl font-bold text-red-600">{totalDiferencias}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Vehículos con error</p>
          <h2 className="text-xl font-bold text-orange-600">{vehiculosConError}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Vehículos OK</p>
          <h2 className="text-xl font-bold text-green-600">{vehiculosOK}</h2>
        </div>
      </div>

      {/* Tabla con numeración y diferencias */}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
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
                    <tr key={d.vehiculo} className="border-t text-center hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-500">{i + 1}</td>
                      <td className="p-2 font-semibold text-left">{d.vehiculo}</td>
                      <td>{d.salida_grandes}</td>
                      <td>{d.entrada_grandes}</td>
                      <td className={d.dif_grandes === 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{d.dif_grandes}</td>
                      <td>{d.salida_medianas}</td>
                      <td>{d.entrada_medianas}</td>
                      <td className={d.dif_medianas === 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{d.dif_medianas}</td>
                      <td>{d.salida_pequenas}</td>
                      <td>{d.entrada_pequenas}</td>
                      <td className={d.dif_pequenas === 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{d.dif_pequenas}</td>
                      <td className={
                        totalDif === 0
                          ? "text-green-700 font-bold"
                          : "text-red-700 font-bold bg-red-50"
                      }>{totalDif}</td>
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