'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

export default function Home() {

  const router = useRouter()

  const [data, setData] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [fecha, setFecha] = useState('')
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

  const formatoCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(valor || 0)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const dataFiltrada = data.filter(r => {
    return (
      (!fecha || r.created_at?.startsWith(fecha)) &&
      (!planillaFiltro || r.planilla?.toString().includes(planillaFiltro)) &&
      (!usuarioFiltro || r.usuario === usuarioFiltro)
    )
  })

  const totalGeneral = dataFiltrada.reduce((a, r) => a + (r.total || 0), 0)
  const totalCambios = dataFiltrada.reduce((a, r) => a + (r.total_cambios || 0), 0)
  const totalAverias = dataFiltrada.reduce((a, r) => a + (r.total_averias || 0), 0)

  const porDia = Object.values(
    dataFiltrada.reduce((acc: any, r) => {
      const dia = r.created_at?.substring(0, 10)
      if (!acc[dia]) acc[dia] = { dia, total: 0 }
      acc[dia].total += r.total || 0
      return acc
    }, {})
  )

  const porPlaca = Object.values(
    dataFiltrada.reduce((acc: any, r) => {

      if (!acc[r.placa]) {
        acc[r.placa] = { placa: r.placa, cambios: 0, averias: 0 }
      }

      acc[r.placa].cambios += r.total_cambios || 0
      acc[r.placa].averias += r.total_averias || 0

      return acc

    }, {})
  ).slice(0, 10)

  const pieData = [
    { name: 'Cambios', value: totalCambios },
    { name: 'Averías', value: totalAverias }
  ]

  // 🔥 EXCEL
  const exportarExcel = async () => {

    const { data: detalle } = await supabase
      .from('recepcion_detalle')
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

    const consolidado = Object.values(
      detalleCompleto.reduce((acc: any, d: any) => {

        if (!acc[d.Producto]) {
          acc[d.Producto] = {
            Producto: d.Producto,
            Cantidad_Total: 0,
            Valor_Total: 0,
            Valor_Cambios: 0,
            Valor_Averias: 0
          }
        }

        acc[d.Producto].Cantidad_Total += d.Cantidad
        acc[d.Producto].Valor_Total += d.Valor_Total

        if (d.Tipo === 'cambio') acc[d.Producto].Valor_Cambios += d.Valor_Total
        if (d.Tipo === 'averia') acc[d.Producto].Valor_Averias += d.Valor_Total

        return acc

      }, {})
    )

    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consolidado), 'Consolidado')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalleCompleto), 'Detalle')

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buffer]), 'reporte_logistico.xlsx')
  }

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-700">
          📊 Informe Logístico
        </h1>

        <div className="flex gap-2">
          <input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} className="input"/>
          <input placeholder="Planilla" value={planillaFiltro} onChange={(e)=>setPlanillaFiltro(e.target.value)} className="input"/>

          <select value={usuarioFiltro} onChange={(e)=>setUsuarioFiltro(e.target.value)} className="input">
            <option value="">Usuarios</option>
            {usuarios.map(u => <option key={u.id}>{u.nombre}</option>)}
          </select>

          <button 
            onClick={exportarExcel} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Excel
          </button>

          <button onClick={logout} className="btn-red">Salir</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-6">
        <Card title="💰 Total" value={formatoCOP(totalGeneral)} />
        <Card title="🔄 Cambios" value={formatoCOP(totalCambios)} color="text-green-600"/>
        <Card title="⚠️ Averías" value={formatoCOP(totalAverias)} color="text-red-600"/>
        <Card title="📦 Recepciones" value={dataFiltrada.length} />
      </div>

      <div className="grid grid-cols-2 gap-6 px-6">

        <ChartCard title="📈 Ingresos por día">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={porDia}>
              <XAxis dataKey="dia"/>
              <YAxis/>
              <Tooltip formatter={(v:any)=>formatoCOP(v)} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🥧 Distribución">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={60}
               label={({ percent = 0 }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''
        }
              >
                <Cell fill="#22c55e"/>
                <Cell fill="#ef4444"/>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      <div className="px-6 mt-6">
        <ChartCard title="🚚 Top vehículos">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={porPlaca}>
              <XAxis dataKey="placa"/>
              <YAxis/>
              <Tooltip formatter={(v:any)=>formatoCOP(v)} />
              <Bar dataKey="cambios" fill="#22c55e"/>
              <Bar dataKey="averias" fill="#ef4444"/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="p-6 grid gap-3">
        {dataFiltrada.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-xl shadow flex justify-between hover:shadow-lg transition">

            <div>
              <p className="font-bold text-lg">📄 {r.planilla}</p>
              <p className="text-sm text-gray-500">🚚 {r.placa}</p>
              <p className="text-xs text-blue-600">👤 {r.usuario || 'Sin registro'}</p>
            </div>

            <div className="text-right">
              <p className="font-bold">{formatoCOP(r.total)}</p>
              <p className="text-green-600 text-sm">C: {formatoCOP(r.total_cambios)}</p>
              <p className="text-red-600 text-sm">A: {formatoCOP(r.total_averias)}</p>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}

function Card({ title, value, color='' }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition">
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