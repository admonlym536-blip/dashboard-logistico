'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {

  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const validar = () => {
    if (!email.trim()) return 'Ingresa el correo'
    if (!password.trim()) return 'Ingresa la contraseña'

    // validación básica email
    if (!email.includes('@')) return 'Correo inválido'

    return ''
  }

  const login = async () => {

    const errorValidacion = validar()
    if (errorValidacion) {
      setMensaje(`⚠️ ${errorValidacion}`)
      return
    }

    setCargando(true)
    setMensaje('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (error) {
      setMensaje('❌ Usuario o contraseña incorrectos')
      setCargando(false)
      return
    }

    // 🔥 Redirección segura
    router.replace('/')
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') login()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C3B75]">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-[360px]">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" className="h-24 object-contain" />
        </div>

        <h2 className="text-center font-bold text-lg mb-4">
          Iniciar sesión
        </h2>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border p-3 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* PASSWORD */}
        <div className="relative mb-4">
          <input
            type={verPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={() => setVerPassword(!verPassword)}
            className="absolute right-3 top-3 text-sm text-gray-500 hover:text-gray-700"
          >
            {verPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4 text-center">
            {mensaje}
          </div>
        )}

        {/* BOTÓN */}
        <button
          onClick={login}
          disabled={cargando}
          className={`w-full py-3 rounded text-white font-semibold transition ${
            cargando
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#0C3B75] hover:bg-blue-900'
          }`}
        >
          {cargando ? 'Validando...' : 'Ingresar'}
        </button>

      </div>
    </div>
  )
}