"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function SalidasPage() {

  const hoy = new Date().toISOString().substring(0, 10);

  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [skuFiltro, setSkuFiltro] = useState("");

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargar();
  }, [fechaInicio, fechaFin, skuFiltro]);

  const cargar = async () => {
    setLoading(true);

    try {

      let query = supabase
        .from("reporte_cubetaje")
        .select("*")
        .gte("fecha", fechaInicio)   // 🔥 filtro real
        .lte("fecha", fechaFin)
        .order("fecha", { ascending: false });

      // 🔹 FILTRO SKU
      if (skuFiltro) {
        query = query.ilike("sku", `%${skuFiltro}%`);
      }

      const { data: result, error } = await query;

      if (error) {
        console.error("Error vista:", error);
        setLoading(false);
        return;
      }

      setData(result || []);

    } catch (err) {
      console.error("Error general:", err);
    }

    setLoading(false);
  };

  // 🔥 RESUMEN REAL DE CANASTAS
  const resumen = {
    grande: 0,
    mediana: 0,
    pequena: 0
  };

  data.forEach((d) => {

    const extra = d.sobrante > 0 ? 1 : 0;
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
        "Canastas Reales": (d.cubetas || 0) + (d.sobrante > 0 ? 1 : 0),
        Fecha: d.fecha
      }))
    );

    XLSX.utils.book_append_sheet(wb, hoja, "Cubetaje");

    const buffer = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    });

    saveAs(
      new Blob([buffer]),
      `cubetaje_${fechaInicio}_${fechaFin}.xlsx`
    );
  };

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        🟨 Reporte De Cubetas
      </h1>

      {/* 🔹 FILTROS */}
      <div className="flex gap-4 flex-wrap mb-6">

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

        <input
          type="text"
          placeholder="Buscar SKU..."
          value={skuFiltro}
          onChange={(e) => setSkuFiltro(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          📄 Excel
        </button>

      </div>

      {/* 🔥 RESUMEN CANASTAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Canastas Grandes</p>
          <h2 className="text-xl font-bold text-blue-700">
            {resumen.grande}
          </h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Canastas Medianas</p>
          <h2 className="text-xl font-bold text-green-700">
            {resumen.mediana}
          </h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500">Canastas Pequeñas</p>
          <h2 className="text-xl font-bold text-orange-700">
            {resumen.pequena}
          </h2>
        </div>

      </div>

      {/* 🔹 TABLA */}
      {loading ? (
        <p>Cargando...</p>
      ) : data.length === 0 ? (
        <p>No hay datos</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Producto</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-center">Embalaje</th>
                <th className="p-2 text-center">Und x Emb</th>
                <th className="p-2 text-center">Cubetas</th>
                <th className="p-2 text-center">Sobrante</th>
                <th className="p-2 text-center">Canastas</th>
              </tr>
            </thead>

            <tbody>
              {data.map((d, i) => {
                const canastas = (d.cubetas || 0) + (d.sobrante > 0 ? 1 : 0);

                return (
                  <tr
                    key={i}
                    className={`border-t hover:bg-gray-50 ${
                      !d.embalaje ? "bg-red-100" : ""
                    }`}
                  >
                    <td className="p-2">{d.sku}</td>
                    <td className="p-2">{d.producto}</td>
                    <td className="p-2 text-center font-semibold">{d.cantidad}</td>
                    <td className="p-2 text-center">{d.embalaje}</td>
                    <td className="p-2 text-center">{d.unidades_x_embalaje}</td>
                    <td className="p-2 text-center">{d.cubetas}</td>
                    <td className="p-2 text-center">{d.sobrante}</td>
                    <td className="p-2 text-center font-bold">{canastas}</td>
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