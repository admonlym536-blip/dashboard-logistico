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

    router.replace('/')
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter') login()
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#F2F5FA] overflow-hidden">

      {/* 🔵 SHAPES CORPORATIVOS */}

      <div className="absolute top-10 right-10 w-48 h-48 bg-gradient-to-br from-[#0C3B75] to-blue-400 rounded-[40%] blur-xl opacity-80"></div>

      <div className="absolute right-20 top-1/2 w-40 h-40 bg-gradient-to-br from-blue-400 to-[#0C3B75] rounded-[35%] blur-xl opacity-70"></div>

      <div className="absolute bottom-10 left-10 w-56 h-56 bg-gradient-to-br from-blue-300 to-[#0C3B75] rounded-[45%] blur-xl opacity-80"></div>

      <div className="absolute bottom-20 left-32 w-32 h-32 bg-blue-200 rounded-[30%] blur-lg opacity-60"></div>

      {/* 🔥 CARD */}

      <div className="bg-white w-[440px] p-8 rounded-xl shadow-md relative z-10">

        <h1 className="text-3xl font-semibold text-center mb-6 text-[#0C3B75]">
          Inicia sesión
        </h1>

        {/* GOOGLE */}
        <button className="w-full border rounded-lg py-3 mb-4 flex items-center justify-center gap-2 hover:bg-gray-50 transition">
          🔵 Continue with Google
        </button>

        {/* EMAIL */}
        <div className="mb-4">
          <label className="text-xs text-gray-500">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0C3B75]"
          />
        </div>

        {/* PASSWORD */}
        <div className="mb-2 relative">
          <label className="text-xs text-gray-500">PASSWORD</label>
          <input
            type={verPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-[#0C3B75]"
          />

          <button
            onClick={() => setVerPassword(!verPassword)}
            className="absolute right-3 top-9 text-gray-500"
          >
            👁
          </button>
        </div>

        {/* FORGOT */}
        <div className="text-right text-sm text-gray-500 mb-4 cursor-pointer hover:underline">
          Forgot Password
        </div>

        {/* MENSAJE */}
        {mensaje && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4 text-center">
            {mensaje}
          </div>
        )}

        {/* BOTONES */}
        <div className="flex gap-2">
          <button
            onClick={login}
            disabled={cargando}
            className={`flex-1 py-3 rounded-lg text-white font-semibold ${
              cargando
                ? 'bg-gray-400'
                : 'bg-[#0C3B75] hover:bg-[#092c57]'
            }`}
          >
            {cargando ? 'Cargando...' : 'Log in'}
          </button>

          <button
            onClick={login}
            className="px-4 bg-[#0C3B75] text-white rounded-lg"
          >
            →
          </button>
        </div>

        {/* FOOTER */}
        <p className="text-xs text-center text-gray-400 mt-6">
          By signing up, you agree to Terms of Use & Privacy Policy
        </p>

        <p className="text-sm text-center text-gray-500 mt-3">
          New user? <span className="underline cursor-pointer">Sign up</span>
        </p>

      </div>
    </div>
  )
}