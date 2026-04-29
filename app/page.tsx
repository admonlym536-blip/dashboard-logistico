
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export default function Home() {

  const router = useRouter()

  const [data, setData] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [detalle, setDetalle] = useState<any[]>([])
  const [recepcionActiva, setRecepcionActiva] = useState<any>(null)
  const [faltantes, setFaltantes] = useState<any[]>([])

  // Lista de ventas por planilla para el día seleccionado
  const [ventasPlanilla, setVentasPlanilla] = useState<any[]>([])

  // Establecer las fechas de inicio y fin por defecto al día actual en formato YYYY-MM-DD
  const [fechaInicio, setFechaInicio] = useState(() => {
    return new Date().toLocaleDateString('en-CA')
  })
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toLocaleDateString('en-CA')
  })
  const [planillaFiltro, setPlanillaFiltro] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')

  useEffect(() => {

    const init = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push('/login')
      } else {
        cargar()
        cargarUsuarios()
        cargarFaltantes()
      }
    }

    init()

    const canal = supabase
      .channel('realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recepciones' },
        () => cargar()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }

  }, [])

  // Cargar ventas por planilla para el rango seleccionado
  useEffect(() => {
    const cargarVentasPlanilla = async () => {
      const { data: ventas } = await supabase
        .from('ventas_planilla')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
      setVentasPlanilla(ventas || [])
    }
    cargarVentasPlanilla()
  }, [fechaInicio, fechaFin])

  const cargar = async () => {
    const { data } = await supabase
      .from('recepciones')
      .select('*')
      .order('id', { ascending: false })

    setData(data || [])
  }

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)

    setUsuarios(data || [])
  }

  // Cargar faltantes desde la vista calculada que ya incluye el nombre del producto
  const cargarFaltantes = async () => {
    const { data } = await supabase
      // Reemplaza 'faltantes_con_nombres' con el nombre de tu tabla/vista calculada
      .from('faltantes_con_nombres')
      .select('*')

    setFaltantes(data || [])
  }

  const verDetalle = async (id:any) => {
    const { data } = await supabase
      .from('recepcion_detalle')
      .select('*')
      .eq('recepcion_id', id)

    setDetalle(data || [])
    setRecepcionActiva(id)
  }

  const formatoCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor || 0)
  }

  const formatoNumero = (valor: number) => {
    return new Intl.NumberFormat('es-CO').format(valor || 0)
  }

  const formatoMillones = (valor: number) => {
    if (!valor) return '0'
    return (valor / 1000000).toFixed(1) + 'M'
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const dataFiltrada = data.filter(r => {
    const fechaStr = r.created_at?.substring(0, 10)
    return (
      (!fechaInicio || (fechaStr && fechaStr >= fechaInicio)) &&
      (!fechaFin || (fechaStr && fechaStr <= fechaFin)) &&
      (!planillaFiltro || r.planilla?.toString().includes(planillaFiltro)) &&
      (!usuarioFiltro || r.usuario === usuarioFiltro)
    )
  })

  const totalGeneral = dataFiltrada.reduce((a, r) => a + (r.total || 0), 0)

  const totalDevolucionBuena = dataFiltrada.reduce(
    (a, r) => a + (r.total_devolucion_buena || 0), 0
  )

  const totalAverias = dataFiltrada.reduce(
    (a, r) => a + (r.total_averias || 0), 0
  )

  // Suma total de devoluciones (buena + averías)
  const totalDevoluciones = totalDevolucionBuena + totalAverias


  // Cálculo del porcentaje de devolución basado en las ventas planilla
  const totalVentasPlanilla = ventasPlanilla.reduce(
    (acc: number, v: any) => acc + (v.valor_venta || 0),
    0
  )
  const porcentajeDevolucionPlanilla = totalVentasPlanilla > 0
    ? (totalDevolucionBuena / totalVentasPlanilla) * 100
    : 0

  // Color del porcentaje según meta (5%): rojo si se supera la meta, verde si se cumple
  const porcentajeColor = porcentajeDevolucionPlanilla > 5 ? 'text-red-600' : 'text-green-600'

  const totalFaltantes = faltantes.reduce(
    (a, f) => a + (f.cantidad_faltante || 0), 0
  )

  const porDia = Object.values(
    dataFiltrada.reduce((acc: any, r) => {
      const dia = r.created_at?.substring(0, 10)

      if (!acc[dia]) {
        acc[dia] = {
          dia,
          total: 0,
          devolucion_buena: 0,
          averias: 0
        }
      }

      acc[dia].total += r.total || 0
      acc[dia].devolucion_buena += r.total_devolucion_buena || 0
      acc[dia].averias += r.total_averias || 0

      return acc
    }, {})
  )

  const faltantesPorVehiculo = faltantes.reduce((acc: any, f) => {

    if (!acc[f.vehiculo]) {
      acc[f.vehiculo] = {
        total: 0,
        productos: []
      }
    }

    acc[f.vehiculo].total += f.cantidad_faltante || 0

    acc[f.vehiculo].productos.push({
      // Utilizamos el nombre proveniente de la vista calculada
      nombre: f.nombre,
      cantidad: f.cantidad_faltante
    })

    return acc

  }, {})

  const pieData = [
    { name: 'Devolución buena', value: totalDevolucionBuena },
    { name: 'Averías', value: totalAverias }
  ]

  const exportarExcel = async () => {

    const { data: detalle } = await supabase
      .from('recepcion_detalle')
      .select('*')

    const { data: faltantesData } = await supabase
      // Consultamos la misma vista de faltantes con nombres
      .from('faltantes_con_nombres')
      .select('*')

    if (!detalle) return

    const detalleCompleto = detalle.map(d => {
      const r = data.find(x => x.id === d.recepcion_id)

      const producto = d.nombre || 'SIN NOMBRE'
      const cantidad = d.cantidad || 0
      const precio = d.precio || 0
      const valorTotal = cantidad * precio

      return {
        Planilla: r?.planilla,
        Placa: r?.placa,
        Usuario: r?.usuario,
        Producto: producto,
        Cantidad: cantidad,
        Precio: precio,
        Valor_Total: valorTotal,
        Tipo: d.tipo,
        Fecha: r?.created_at
      }
    })


    // Detalle de faltantes con nombre del producto para el informe
    const faltantesDetalle = (faltantesData || []).map(f => ({
      Producto: f.nombre,
      Vehiculo: f.vehiculo,
      Cantidad_Faltante: f.cantidad_faltante,
      Fecha: f.fecha
    }))

    // Consolidado de faltantes por producto (suma de cantidades)
    const faltantesConsolidado = Object.values(
      (faltantesData || []).reduce((acc: any, f: any) => {
        const key = f.nombre || f.codigo_producto
        if (!acc[key]) {
          acc[key] = {
            Producto: key,
            Cantidad_Total: 0
          }
        }
        acc[key].Cantidad_Total += f.cantidad_faltante || 0
        return acc
      }, {})
    )

    const consolidado = Object.values(
      detalleCompleto.reduce((acc: any, d: any) => {

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

        if (d.Tipo === 'devolucion buena')
          acc[d.Producto].Valor_Devolucion_Buena += d.Valor_Total

        if (d.Tipo === 'averia')
          acc[d.Producto].Valor_Averias += d.Valor_Total

        return acc

      }, {})
    )

    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consolidado), 'Consolidado')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalleCompleto), 'Detalle')

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(faltantesDetalle),
      'Faltantes_Detalle'
    )

    // Añadimos una hoja con el consolidado de faltantes para la nota de crédito
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(faltantesConsolidado),
      'Faltantes_Consolidado'
    )

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer]), 'reporte_logistico.xlsx')
  }

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center flex-wrap gap-4">
        {/* Encabezado con logo y nombre de la aplicación */}
        <div className="flex items-center gap-3">
          <img 
            src="/icon.png" 
            alt="logo" 
            className="w-10 h-10 object-contain" 
          />
          <h1 className="text-2xl font-bold text-gray-700">
            Provisión 360°
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Rango de fechas */}
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)} 
            className="px-3 py-2 rounded-md border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <span>-</span>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)} 
            className="px-3 py-2 rounded-md border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />
          <input 
            type="text"
            placeholder="Planilla" 
            value={planillaFiltro} 
            onChange={(e) => setPlanillaFiltro(e.target.value)} 
            className="px-3 py-2 rounded-md border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
          />

          <select 
            value={usuarioFiltro} 
            onChange={(e) => setUsuarioFiltro(e.target.value)} 
            className="px-3 py-2 rounded-md border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Usuarios</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.correo}>
                {u.nombre}
              </option>
            ))}
          </select>

          <button 
            onClick={exportarExcel} 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow focus:outline-none transition-colors"
          >
            📄 Excel
          </button>

          <button 
            onClick={logout} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow focus:outline-none transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 p-6">
        {/* Valor total de ventas de planilla en el rango */}
        <Card title="💸 Planillas" value={formatoCOP(totalVentasPlanilla)} />
        {/* Total de devoluciones (buena + averías) */}
        <Card title="💰 Total devoluciones" value={formatoCOP(totalDevoluciones)} />
        {/* Dev Buena */}
        <Card title="🔄 Dev Buena" value={formatoCOP(totalDevolucionBuena)} color="text-green-600"/>
        {/* Averías */}
        <Card title="⚠️ Averías" value={formatoCOP(totalAverias)} color="text-red-600"/>
        {/* Recepciones */}
        <Card title="📦 Recepciones" value={dataFiltrada.length} />
      </div>

      <div className="grid grid-cols-2 gap-6 px-6">

        <ChartCard title="📈 Ingresos por día">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={porDia}>
              <XAxis dataKey="dia"/>
              <YAxis tickFormatter={formatoMillones}/>
              <Tooltip formatter={(v:any)=>formatoCOP(v)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3}/>
              <Line type="monotone" dataKey="devolucion_buena" stroke="#22c55e" strokeWidth={2}/>
              <Line type="monotone" dataKey="averias" stroke="#ef4444" strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🥧 Distribución">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={60} 
                outerRadius={90} 
                label={({ value }) => formatoCOP(value)}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={index === 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Pie>
              <Tooltip formatter={(v:any)=>formatoCOP(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Resumen del período: devolución buena y porcentaje de devolución */}
      <div className="px-6">
        <div className="bg-gray-200 p-4 rounded-lg text-center my-4">
          <span className="font-semibold text-gray-700"> Cierre del Dia :</span>
          <span className="mx-3 text-green-700 font-bold">
            Dev Buena: {formatoCOP(totalDevolucionBuena)}
          </span>
          <span className={`mx-3 font-bold ${porcentajeColor}`}>
            (%) : {porcentajeDevolucionPlanilla.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="p-6 grid gap-3">
        {dataFiltrada.map(r => {

          const faltanteCarro = faltantesPorVehiculo[r.placa]

          return (
            <div 
              key={r.id} 
              onClick={()=>verDetalle(r.id)}
              className="bg-white p-4 rounded-xl shadow flex justify-between hover:shadow-lg transition cursor-pointer"
            >
              <div>
                <p className="font-bold text-lg">📄 Planilla: {r.planilla}</p>
                <p className="text-sm text-gray-500">🚚 {r.placa}</p>
                <p className="text-xs text-blue-600">
                  👤 {usuarios.find((u: any) => u.correo === r.usuario)?.nombre || r.usuario}
                </p>

                {faltanteCarro ? (
                  <div className="mt-2 text-orange-600 text-sm">
                    ⚠️ Faltantes: {formatoNumero(faltanteCarro.total)}
                  </div>
                ) : (
                  <p className="text-green-600 text-sm mt-2">✔ Sin faltantes</p>
                )}
              </div>

              <div className="text-right">
                <p className="font-bold">{formatoCOP(r.total)}</p>
                <p className="text-green-600 text-sm">D: {formatoCOP(r.total_devolucion_buena)}</p>
                <p className="text-red-600 text-sm">A: {formatoCOP(r.total_averias)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {recepcionActiva && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[500px] max-h-[70vh] overflow-auto">

            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">📦 Resumen</h2>
              {/* Botón de cierre en forma de X */}
              <button
                onClick={() => setRecepcionActiva(null)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✖
              </button>
            </div>

            {/* DEVOLUCION BUENA */}
            <h3 className="text-green-600 font-semibold mb-2">Devolución buena</h3>
            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Producto</th>
                  <th className="text-right px-2 py-1">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {detalle
                  .filter(d => d.tipo === 'devolucion buena')
                  .sort((a,b)=>b.cantidad - a.cantidad)
                  .map((d,i)=>(
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{d.nombre}</td>
                      <td className="text-right px-2 py-1">{formatoNumero(d.cantidad)}</td>
                    </tr>
                ))}
              </tbody>
            </table>

            {/* AVERIAS */}
            <h3 className="text-red-600 font-semibold mb-2">Averías</h3>
            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Producto</th>
                  <th className="text-right px-2 py-1">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {detalle
                  .filter(d => d.tipo === 'averia')
                  .sort((a,b)=>b.cantidad - a.cantidad)
                  .map((d,i)=>(
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{d.nombre}</td>
                      <td className="text-right px-2 py-1">{formatoNumero(d.cantidad)}</td>
                    </tr>
                ))}
              </tbody>
            </table>

            {/* FALTANTES */}
            <h3 className="text-orange-600 font-semibold mb-2">Faltantes</h3>
            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-2 py-1">Código</th>
                  <th className="text-right px-2 py-1">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {faltantes
                  .filter(f => f.vehiculo === data.find(x => x.id === recepcionActiva)?.placa)
                  .sort((a, b) => b.cantidad_faltante - a.cantidad_faltante)
                  .map((f, i) => (
                    <tr key={i} className="border-t">
                      {/* Mostramos el nombre directamente desde la vista */}
                      <td className="px-2 py-1">{f.nombre}</td>
                      <td className="text-right px-2 py-1">{formatoNumero(f.cantidad_faltante)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>


          </div>
        </div>
      )}

    </div>
  )
}

function Card({ title, value, color='' }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className={`text-2xl font-bold ${color}`}>{value}</h2>
    </div>
  )
}

function ChartCard({ title, children }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="mb-2 font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}