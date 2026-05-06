"use client";

import { ChangeEvent, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type PlanillaRow = {
  vehiculo?: string;
  ruta?: string;
  numero_planilla?: string | number;
  valor_venta?: string | number;
  fecha?: string | number;
  [key: string]: string | number | null | undefined;
};

export default function PlanillasPage() {

  const [preview, setPreview] = useState<PlanillaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [archivoCargado, setArchivoCargado] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState("");

  // 🔥 FORMATO COP
  const formatoCOP = (valor: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor || 0);

  // 🔥 CONVERTIR FECHA
  const convertirFecha = (valor: unknown): string => {
    if (!valor) return "";

    if (typeof valor === "number" && !isNaN(valor)) {
      const fecha = new Date((valor - 25569) * 86400 * 1000);
      return fecha.toISOString().split("T")[0];
    }

    return String(valor);
  };

  // 🔥 LEER ARCHIVO
  const manejarArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);

    const reader = new FileReader();

    reader.onload = (evt: globalThis.ProgressEvent<FileReader>) => {
      const result = evt.target?.result;
      if (!result) return;

      const data = new Uint8Array(result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<PlanillaRow>(hoja);

      setPreview(json);
      setArchivoCargado(true);
      setMensaje("");
    };

    reader.readAsArrayBuffer(file);
  };

  // 🔥 CANCELAR
  const cancelar = () => {
    setPreview([]);
    setArchivoCargado(false);
    setNombreArchivo("");
    setMensaje("");
  };

  // 🔥 SUBIR
  const cargarDatos = async () => {

    if (preview.length === 0) return;

    setLoading(true);
    setMensaje("");

    try {

      const registros = preview.map((r) => ({
        vehiculo: r.vehiculo,
        ruta: r.ruta,
        numero_planilla: r.numero_planilla,
        valor_venta: Number(r.valor_venta),
        fecha: convertirFecha(r.fecha)
      }));

      const { error } = await supabase
        .from("ventas_planilla")
        .insert(registros);

      if (error) {
        console.error(error);
        setMensaje("❌ Error al cargar datos");
      } else {
        setMensaje("✅ Planillas cargadas correctamente");
        cancelar();
      }

    } catch (err) {
      console.error(err);
      setMensaje("❌ Error procesando archivo");
    }

    setLoading(false);
  };

  // 🔥 TOTALES
  const totalPlanillas = preview.length;

  const totalValor = preview.reduce(
    (acc, r) => acc + Number(r.valor_venta || 0),
    0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        📄 Carge Planillas
      </h1>

      <div className="bg-white rounded-2xl shadow p-6">

        {/* 🔥 ZONA CARGA */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition">

          <p className="text-gray-600 mb-2 text-sm">
            Arrastra o selecciona tu archivo Excel
          </p>

          <p className="text-xs text-gray-400 mb-4">
            Formatos permitidos: .xlsx, .xls, .csv
          </p>

          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Seleccionar archivo
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={manejarArchivo}
              className="hidden"
            />
          </label>

          {nombreArchivo && (
            <p className="mt-4 text-sm text-gray-700">
              📂 {nombreArchivo}
            </p>
          )}
        </div>

        {/* 🔥 RESUMEN */}
        {preview.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Total Planillas</p>
              <h2 className="text-xl font-bold">
                {totalPlanillas}
              </h2>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-500 text-sm">Total Valor</p>
              <h2 className="text-xl font-bold text-green-700">
                {formatoCOP(totalValor)}
              </h2>
            </div>

          </div>
        )}

        {/* 🔥 BOTONES */}
        {archivoCargado && (
          <div className="mt-6 flex justify-between">

            <button
              onClick={cancelar}
              className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
            >
              ❌ Cancelar
            </button>

            <button
              onClick={cargarDatos}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              ⬆️ Cargar al sistema
            </button>

          </div>
        )}

        {loading && (
          <p className="text-blue-600 mt-4">Subiendo archivo...</p>
        )}

        {mensaje && (
          <p className="mt-4 font-semibold">{mensaje}</p>
        )}

        {/* 🔥 PREVIEW */}
        {preview.length > 0 && (
          <div className="mt-8">

            <h2 className="font-semibold mb-3 text-gray-700">
              Vista previa
            </h2>

            <div className="overflow-auto border rounded-xl">

              <table className="w-full text-sm">

                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(preview[0]).map((key, i) => (
                      <th key={i} className="p-3 text-left">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {preview.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      {Object.entries(row).map(([key, val], j) => (
                        <td key={j} className="p-3">
                          {key === "fecha"
                            ? convertirFecha(val)
                            : String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

            <p className="text-xs text-gray-400 mt-2">
              Mostrando primeros 20 registros
            </p>

          </div>
        )}

      </div>

    </div>
  );
}