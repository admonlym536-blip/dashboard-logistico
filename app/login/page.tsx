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

  const login = async () => {
    setCargando(true)
    setMensaje('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (error) {
      setMensaje(`❌ ${error.message}`)
      setCargando(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C3B75]">
      <div className="bg-white p-8 rounded-xl shadow-lg w-[350px]">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" className="h-24 object-contain" />
        </div>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded mb-4"
        />

        {/* PASSWORD */}
        <div className="relative mb-4">
          <input
            type={verPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-3 rounded"
          />

          <button
            onClick={() => setVerPassword(!verPassword)}
            className="absolute right-3 top-3 text-sm text-gray-500"
          >
            {verPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {mensaje}
          </p>
        )}

        {/* BOTÓN */}
        <button
          onClick={login}
          disabled={cargando}
          className="w-full bg-[#0C3B75] text-white py-3 rounded"
        >
          {cargando ? 'Cargando...' : 'Ingresar'}
        </button>

      </div>
    </div>
  )
}