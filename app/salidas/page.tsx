"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function SalidasPage() {

  const [fechaInicio, setFechaInicio] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );
  const [fechaFin, setFechaFin] = useState(() =>
    new Date().toISOString().substring(0, 10)
  );

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargar();
  }, [fechaInicio, fechaFin]);

  const cargar = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventario_devoluciones")
      .select("*")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    // 🔥 CONSOLIDADO POR SKU
    const mapa: any = {};

    (data || []).forEach((d: any) => {

      const sku = d.sku;
      const nombre = d.producto;
      const precio = Number(d.precio || 0);
      const cantidad = Number(d.cantidad_total || 0);

      if (!mapa[sku]) {
        mapa[sku] = {
          sku,
          nombre,
          cantidad: 0,
          precio: precio,
          total: 0,
        };
      }

      mapa[sku].cantidad += cantidad;

      // 🔥 SIEMPRE calcula (evita ceros raros)
      mapa[sku].total += cantidad * precio;
    });

    setData(Object.values(mapa));
    setLoading(false);
  };

  const formatoCOP = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(v || 0);

  const exportarExcel = () => {

    if (data.length === 0) return;

    const wb = XLSX.utils.book_new();

    const hoja = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        SKU: d.sku,
        Producto: d.nombre,
        Cantidad: d.cantidad,
        Precio: d.precio,
        Total: d.total,
      }))
    );

    XLSX.utils.book_append_sheet(wb, hoja, "Inventario");

    const buffer = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    });

    saveAs(
      new Blob([buffer]),
      `inventario_${fechaInicio}_${fechaFin}.xlsx`
    );
  };

  const totalGeneral = data.reduce((a, b) => a + b.total, 0);

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        📦 Inventario de devoluciones
      </h1>

      {/* FILTROS */}
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

        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          📄 Excel
        </button>

      </div>

      {/* TOTAL */}
      <div className="bg-white p-4 rounded-xl shadow mb-4">
        <p className="text-gray-500">Total valorizado</p>
        <h2 className="text-xl font-bold text-blue-700">
          {formatoCOP(totalGeneral)}
        </h2>
      </div>

      {/* TABLA */}
      {loading ? (
        <p>Cargando...</p>
      ) : data.length === 0 ? (
        <p>No hay datos en este rango de fechas</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="w-full">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Producto</th>
                <th className="p-2 text-center">Cantidad</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-2">{d.sku}</td>
                  <td className="p-2">{d.nombre}</td>
                  <td className="p-2 text-center font-semibold">{d.cantidad}</td>
                  <td className="p-2 text-right">{formatoCOP(d.precio)}</td>
                  <td className="p-2 text-right font-bold text-blue-700">
                    {formatoCOP(d.total)}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

    </div>
  );
}