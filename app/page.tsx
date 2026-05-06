'use client'

import { ReactNode, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, CalendarDays, Search, Package, TrendingUp, AlertTriangle, X } from 'lucide-react'

type Recepcion = {
  id: number
  created_at?: string
  planilla?: string | number
  placa?: string
  usuario?: string
  total?: number
  total_devolucion_buena?: number
  total_averias?: number
}

type Usuario = {
  id: number
  correo: string
  nombre: string
}

type Detalle = {
  recepcion_id: number
  nombre?: string
  cantidad?: number
  precio?: number
  tipo?: string
}

type Faltante = {
  nombre?: string
  vehiculo?: string
  cantidad_faltante?: number
  fecha?: string
  codigo_producto?: string
}

type VentaPlanilla = {
  valor_venta?: number
  fecha?: string
}

type ResumenRuta = {
  fecha?: string
  ruta?: string
  placa?: string
  planilla?: string | number
  valor_planilla?: number
  devolucion_buena?: number
  averias?: number
  valor_devolucion?: number
}

type DiaData = {
  dia: string
  total: number
  devolucion_buena: number
  averias: number
}

export default function Home() {

  const [data, setData] = useState<Recepcion[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [detalle, setDetalle] = useState<Detalle[]>([])
  const [recepcionActiva, setRecepcionActiva] = useState<number | null>(null)
  const [faltantes, setFaltantes] = useState<Faltante[]>([])
  const [ventasPlanilla, setVentasPlanilla] = useState<VentaPlanilla[]>([])

  const [fechaInicio, setFechaInicio] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [fechaFin, setFechaFin] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [planillaFiltro, setPlanillaFiltro] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')

  const cargar = async () => {
    const { data } = await supabase
      .from('recepciones')
      .select('*')
      .order('id', { ascending: false })
      .limit(10000)

    setData((data as Recepcion[]) || [])
  }

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)

    setUsuarios((data as Usuario[]) || [])
  }

  const cargarFaltantes = async () => {
    const { data } = await supabase
      .from('faltantes_con_nombres')
      .select('*')

    setFaltantes((data as Faltante[]) || [])
  }

  const verDetalle = async (id: number) => {
    const { data } = await supabase
      .from('recepcion_detalle')
      .select('*')
      .eq('recepcion_id', id)

    setDetalle((data as Detalle[]) || [])
    setRecepcionActiva(id)
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = '/login'
        return
      }

      await Promise.all([cargar(), cargarUsuarios(), cargarFaltantes()])
    }

    init()

    const canal = supabase
      .channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recepciones' }, () => cargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  useEffect(() => {
    const cargarVentasPlanilla = async () => {
      const { data: ventas } = await supabase
        .from('ventas_planilla')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)

      setVentasPlanilla((ventas as VentaPlanilla[]) || [])
    }

    cargarVentasPlanilla()
  }, [fechaInicio, fechaFin])

  const formatoCOP = (valor: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor || 0)

  const formatoNumero = (valor: number) => new Intl.NumberFormat('es-CO').format(valor || 0)
  const formatoMillones = (valor: number) => (!valor ? '0' : `${(valor / 1000000).toFixed(1)}M`)


  const dataFiltrada = data.filter((r) => {
    const fechaStr = r.created_at?.substring(0, 10)
    return (
      (!fechaInicio || (fechaStr && fechaStr >= fechaInicio)) &&
      (!fechaFin || (fechaStr && fechaStr <= fechaFin)) &&
      (!planillaFiltro || r.planilla?.toString().includes(planillaFiltro)) &&
      (!usuarioFiltro || r.usuario === usuarioFiltro)
    )
  })

  const totalGeneral = dataFiltrada.reduce((a, r) => a + (r.total || 0), 0)
  const totalDevolucionBuena = dataFiltrada.reduce((a, r) => a + (r.total_devolucion_buena || 0), 0)
  const totalAverias = dataFiltrada.reduce((a, r) => a + (r.total_averias || 0), 0)
  const totalDevoluciones = totalDevolucionBuena + totalAverias

  const totalVentasPlanilla = ventasPlanilla.reduce((acc, v) => acc + (v.valor_venta || 0), 0)
  const porcentajeDevolucionPlanilla = totalVentasPlanilla > 0
    ? (totalDevolucionBuena / totalVentasPlanilla) * 100
    : 0

  const porcentajeColor = porcentajeDevolucionPlanilla > 5 ? 'text-red-600' : 'text-green-600'
  const totalFaltantes = faltantes.reduce((a, f) => a + (f.cantidad_faltante || 0), 0)

  const porDia: DiaData[] = Object.values(
    dataFiltrada.reduce((acc: Record<string, DiaData>, r) => {
      const dia = r.created_at?.substring(0, 10) || 'SIN_FECHA'
      if (!acc[dia]) {
        acc[dia] = { dia, total: 0, devolucion_buena: 0, averias: 0 }
      }
      acc[dia].total += r.total || 0
      acc[dia].devolucion_buena += r.total_devolucion_buena || 0
      acc[dia].averias += r.total_averias || 0
      return acc
    }, {})
  ).sort((a, b) => a.dia.localeCompare(b.dia))

  const faltantesPorVehiculo = faltantes.reduce((acc: Record<string, { total: number }>, f) => {
    const key = f.vehiculo || 'SIN_VEHICULO'
    if (!acc[key]) acc[key] = { total: 0 }
    acc[key].total += f.cantidad_faltante || 0
    return acc
  }, {})

  const pieData = [
    { name: 'Devolución buena', value: totalDevolucionBuena },
    { name: 'Averías', value: totalAverias }
  ]

  const totalPie = pieData.reduce((acc, item) => acc + (item.value || 0), 0)

  const formatDiaLabel = (dia: string) => {
    if (!dia || dia === 'SIN_FECHA') return dia
    const [y, m, d] = dia.split('-')
    if (!y || !m || !d) return dia
    return `${d}/${m}`
  }

  const formatDiaCompleto = (dia: string) => {
    if (!dia || dia === 'SIN_FECHA') return dia
    const [y, m, d] = dia.split('-')
    if (!y || !m || !d) return dia
    return `${d}/${m}/${y}`
  }

  const exportarExcel = async () => {
    try {
      const recepcionesFiltradas = data.filter((r) => {
        const fechaStr = r.created_at?.substring(0, 10)
        return (
          (!fechaInicio || (fechaStr && fechaStr >= fechaInicio)) &&
          (!fechaFin || (fechaStr && fechaStr <= fechaFin)) &&
          (!planillaFiltro || r.planilla?.toString().includes(planillaFiltro)) &&
          (!usuarioFiltro || r.usuario === usuarioFiltro)
        )
      })

      const recepcionIds = recepcionesFiltradas.map(r => r.id)
      let detalleData: Detalle[] = []

      if (recepcionIds.length > 0) {
        const pageSize = 1000
        for (let i = 0; i < recepcionIds.length; i += pageSize) {
          const chunk = recepcionIds.slice(i, i + pageSize)
          const { data: detalleChunk } = await supabase
            .from('recepcion_detalle')
            .select('*')
            .in('recepcion_id', chunk)
            .limit(10000)
          detalleData = detalleData.concat((detalleChunk as Detalle[]) || [])
        }
      }

      const detalleCompleto = detalleData.map((d) => {
        const r = recepcionesFiltradas.find(x => x.id === d.recepcion_id)
        const cantidad = d.cantidad || 0
        const precio = d.precio || 0
        return {
          Planilla: r?.planilla,
          Placa: r?.placa,
          Usuario: r?.usuario,
          Producto: d.nombre || 'SIN NOMBRE',
          Cantidad: cantidad,
          Precio: precio,
          Valor_Total: cantidad * precio,
          Tipo: d.tipo,
          Fecha: r?.created_at
        }
      })

      const consolidado = Object.values(
        detalleCompleto.reduce((acc: Record<string, {
          Producto: string
          Cantidad_Total: number
          Valor_Total: number
          Valor_Devolucion_Buena: number
          Valor_Averias: number
        }>, d) => {
          if (!acc[d.Producto]) {
            acc[d.Producto] = {
              Producto: d.Producto,
              Cantidad_Total: 0,
              Valor_Total: 0,
              Valor_Devolucion_Buena: 0,
              Valor_Averias: 0
            }
          }

          acc[d.Producto].Cantidad_Total += d.Cantidad
          acc[d.Producto].Valor_Total += d.Valor_Total
          if (d.Tipo === 'devolucion buena') acc[d.Producto].Valor_Devolucion_Buena += d.Valor_Total
          if (d.Tipo === 'averia') acc[d.Producto].Valor_Averias += d.Valor_Total
          return acc
        }, {})
      )

      let faltantesData: Faltante[] = []
      const vehiculosFiltrados = recepcionesFiltradas
        .map(r => r.placa)
        .filter((v): v is string => Boolean(v))

      if (vehiculosFiltrados.length > 0) {
        const { data: faltantesRaw } = await supabase
          .from('faltantes_con_nombres')
          .select('*')
          .in('vehiculo', vehiculosFiltrados)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .limit(10000)

        faltantesData = (faltantesRaw as Faltante[]) || []
      }

      const faltantesDetalle = faltantesData.map((f) => ({
        Producto: f.nombre,
        Vehiculo: f.vehiculo,
        Cantidad_Faltante: f.cantidad_faltante,
        Fecha: f.fecha
      }))

      const faltantesConsolidado = Object.values(
        faltantesData.reduce((acc: Record<string, { Producto: string, Cantidad_Total: number }>, f) => {
          const key = f.nombre || f.codigo_producto || 'SIN_CODIGO'
          if (!acc[key]) acc[key] = { Producto: key, Cantidad_Total: 0 }
          acc[key].Cantidad_Total += f.cantidad_faltante || 0
          return acc
        }, {})
      )

      // Obtener resumen de rutas sin límite de 1000 filas (paginado por rango)
      let resumenRutas: ResumenRuta[] = []
      const pageSize = 1000
      let from = 0
      while (true) {
        const to = from + pageSize - 1
        const { data: resumenChunk } = await supabase
          .from('resumen_rutas')
          .select('*')
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .range(from, to)

        const chunk = (resumenChunk as ResumenRuta[]) || []
        if (chunk.length === 0) break
        resumenRutas = resumenRutas.concat(chunk)
        if (chunk.length < pageSize) break
        from += pageSize
      }

      const resumenRutasExport = resumenRutas.map((r) => ({
        Fecha: r.fecha,
        Ruta: r.ruta || 'SIN RUTA',
        Placa: r.placa || 'SIN PLACA',
        Planilla: r.planilla || 'SIN PLANILLA',
        Valor_Planilla: r.valor_planilla || 0,
        Devolucion_Buena: r.devolucion_buena || 0,
        Averias: r.averias || 0,
        Valor_Devolucion: r.valor_devolucion || 0
      }))

      const wb = XLSX.utils.book_new()

      // Hoja de metadatos del filtro aplicado
      const filtrosAplicados = [
        { Campo: 'Fecha Inicio', Valor: fechaInicio || 'N/A' },
        { Campo: 'Fecha Fin', Valor: fechaFin || 'N/A' },
        { Campo: 'Planilla filtro', Valor: planillaFiltro || 'Todos' },
        { Campo: 'Usuario filtro', Valor: usuarioFiltro || 'Todos' },
        { Campo: 'Total registros resumen_rutas', Valor: resumenRutasExport.length }
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtrosAplicados), 'Filtros_Aplicados')

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consolidado), 'Consolidado')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalleCompleto), 'Detalle')
      if (faltantesDetalle.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(faltantesDetalle), 'Faltantes_Detalle')
      if (faltantesConsolidado.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(faltantesConsolidado), 'Faltantes_Consolidado')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRutasExport), 'Resumen_Rutas')

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      saveAs(new Blob([buffer]), 'reporte_logistico.xlsx')
    } catch (err) {
      console.error('Error al exportar Excel', err)
    }
  }

  const recepcionActivaPlaca = data.find(x => x.id === recepcionActiva)?.placa || ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <img src="/icon.png" alt="logo" className="h-14 w-14 md:h-16 md:w-16 object-contain drop-shadow-sm" />
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">Provisión 360°</h1>
                <p className="text-sm md:text-base text-slate-500">Panel de control logístico</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={exportarExcel} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 transition">
                <Download size={16} />
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Filtrar por planilla" value={planillaFiltro} onChange={(e) => setPlanillaFiltro(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="lg:col-span-2">
              <select value={usuarioFiltro} onChange={(e) => setUsuarioFiltro(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.correo}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <MetricCard title="Planillas" value={formatoCOP(totalVentasPlanilla)} icon={<TrendingUp size={18} />} />
          <MetricCard title="Total devoluciones" value={formatoCOP(totalDevoluciones)} icon={<Package size={18} />} />
          <MetricCard title="Devolución buena" value={formatoCOP(totalDevolucionBuena)} color="text-emerald-600" icon={<TrendingUp size={18} />} />
          <MetricCard title="Averías" value={formatoCOP(totalAverias)} color="text-rose-600" icon={<AlertTriangle size={18} />} />
          <MetricCard title="Recepciones" value={dataFiltrada.length} icon={<Package size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ChartCard title="Ingresos por día">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={porDia} margin={{ top: 12, right: 14, left: 8, bottom: 6 }}>
                <XAxis
                  dataKey="dia"
                  tickFormatter={formatDiaLabel}
                  interval="preserveStartEnd"
                  minTickGap={20}
                  angle={0}
                  textAnchor="middle"
                  height={30}
                  tickMargin={10}
                />
                <YAxis tickFormatter={(v) => formatoMillones(Number(v))} width={46} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    return (
                      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                          {formatDiaCompleto(String(label || ''))}
                        </p>
                        <div className="space-y-1.5">
                          {payload.map((item, idx) => (
                            <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 text-slate-200">
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: item.color || '#94a3b8' }}
                                />
                                {item.name}
                              </span>
                              <span className="font-semibold text-white">
                                {formatoCOP(Number(item.value || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }}
                />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="devolucion_buena" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="averias" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución de devoluciones">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={index === 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const p = payload[0]
                    const nombre = String(p.name || '')
                    const valor = Number(p.value || 0)
                    const porcentaje = totalPie > 0 ? ((valor / totalPie) * 100).toFixed(1) : '0.0'

                    return (
                      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-md">
                        <p className="mb-1 font-semibold text-slate-100">{nombre}</p>
                        <p className="text-slate-300">{formatoCOP(valor)}</p>
                        <p className="mt-0.5 text-emerald-300">{porcentaje}%</p>
                      </div>
                    )
                  }}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-700 text-sm font-semibold"
                >
                  {totalPie > 0 ? `${(totalPie / 1000000).toFixed(1)}M` : '0'}
                </text>
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pieData.map((item, idx) => {
                const porcentaje = totalPie > 0 ? ((item.value / totalPie) * 100).toFixed(1) : '0.0'
                const color = idx === 0 ? 'bg-emerald-500' : 'bg-rose-500'
                return (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{porcentaje}%</p>
                      <p className="text-xs text-slate-500">{formatoCOP(item.value)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartCard>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            Cierre del Día:
            <span className="ml-2 font-bold text-emerald-700"> Dev Buena {formatoCOP(totalDevolucionBuena)}</span>
            <span className={`ml-3 font-bold ${porcentajeColor}`}>({porcentajeDevolucionPlanilla.toFixed(2)}%)</span>
            <span className="ml-3 font-semibold text-amber-600">Faltantes {formatoNumero(totalFaltantes)}</span>
            <span className="ml-3 font-semibold text-slate-700">Total general {formatoCOP(totalGeneral)}</span>
          </p>
        </div>

        <div className="space-y-3">
          {dataFiltrada.map((r) => {
            const faltanteCarro = r.placa ? faltantesPorVehiculo[r.placa] : undefined

            return (
              <motion.div
                key={r.id}
                onClick={() => verDetalle(r.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-800">Planilla: {r.planilla}</p>
                    <p className="text-sm text-slate-500">Vehículo: {r.placa}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Usuario: {usuarios.find((u) => u.correo === r.usuario)?.nombre || r.usuario}
                    </p>

                    {faltanteCarro ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        <AlertTriangle size={13} /> Faltantes: {formatoNumero(faltanteCarro.total)}
                      </p>
                    ) : (
                      <p className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                        Sin faltantes
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatoCOP(r.total || 0)}</p>
                    <p className="text-sm text-emerald-600">D: {formatoCOP(r.total_devolucion_buena || 0)}</p>
                    <p className="text-sm text-rose-600">A: {formatoCOP(r.total_averias || 0)}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </main>

      <AnimatePresence>
        {recepcionActiva && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl bg-white p-5 shadow-2xl"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Resumen de recepción</h2>
                <button onClick={() => setRecepcionActiva(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <X size={18} />
                </button>
              </div>

              <h3 className="mb-2 font-semibold text-emerald-600">Devolución buena</h3>
              <table className="mb-4 w-full text-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle
                    .filter((d) => d.tipo === 'devolucion buena')
                    .sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0))
                    .map((d, i) => (
                      <tr key={`db-${i}`} className="border-t border-slate-200">
                        <td className="px-2 py-1">{d.nombre}</td>
                        <td className="px-2 py-1 text-right">{formatoNumero(d.cantidad || 0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <h3 className="mb-2 font-semibold text-rose-600">Averías</h3>
              <table className="mb-4 w-full text-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle
                    .filter((d) => d.tipo === 'averia')
                    .sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0))
                    .map((d, i) => (
                      <tr key={`av-${i}`} className="border-t border-slate-200">
                        <td className="px-2 py-1">{d.nombre}</td>
                        <td className="px-2 py-1 text-right">{formatoNumero(d.cantidad || 0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <h3 className="mb-2 font-semibold text-amber-600">Faltantes</h3>
              <table className="w-full text-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Producto</th>
                    <th className="px-2 py-1 text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {faltantes
                    .filter((f) => f.vehiculo === recepcionActivaPlaca)
                    .sort((a, b) => (b.cantidad_faltante || 0) - (a.cantidad_faltante || 0))
                    .map((f, i) => (
                      <tr key={`fa-${i}`} className="border-t border-slate-200">
                        <td className="px-2 py-1">{f.nombre}</td>
                        <td className="px-2 py-1 text-right">{formatoNumero(f.cantidad_faltante || 0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MetricCard({
  title,
  value,
  color = '',
  icon
}: {
  title: string
  value: string | number
  color?: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className="text-slate-500">{icon}</span>
      </div>
      <h2 className={`text-2xl font-bold text-slate-800 ${color}`}>{value}</h2>
    </div>
  )
}

function ChartCard({ title, children }: { title: string, children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  )
}
