'use client'
import { EyeIcon, EyeOff, Loader2, Lock, Mail, ShieldCheck, Store, ArrowRight } from 'lucide-react'
import React, { FormEvent, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import googleImage from '@/assets/google.png'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function KiranaLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        role: 'admin',
        redirect: false,
      })

      if (res?.error) {
        // If role-specific login fails, try without role constraint
        const fallback = await signIn('credentials', {
          email: email.toLowerCase().trim(),
          password,
          redirect: false,
        })
        if (fallback?.error) {
          setErrorMsg('Invalid email or password. Make sure your account has been authorized by the Super Admin.')
        } else {
          router.push('/kirana-admin')
          router.refresh()
        }
      } else {
        router.push('/kirana-admin')
        router.refresh()
      }
    } catch (error: any) {
      setErrorMsg('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/kirana-admin' })
    } catch {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#0a0f1e] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-green-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/60">
          {/* Logo / Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Kirana Admin Portal</h1>
            <p className="text-white/40 text-sm mt-1 text-center">
              Sign in to manage your store inventory
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authorized Kirana Store Owners Only
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm text-center"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-white/30 pointer-events-none" />
              <input
                type="email"
                placeholder="Store owner email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-white/25 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4.5 h-4.5 text-white/30 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-11 text-white placeholder-white/25 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-4 top-3.5 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm mt-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In to Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-xs font-semibold uppercase tracking-wider">or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/8 py-3.5 rounded-2xl text-white/80 hover:text-white font-medium transition-all text-sm"
          >
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Image src={googleImage} width={18} height={18} alt="google" />
            }
            Continue with Google
          </button>

          {/* Info note */}
          <div className="mt-6 p-3 bg-white/3 border border-white/8 rounded-xl text-white/35 text-xs text-center leading-relaxed">
            Your store must be registered and approved by the{' '}
            <span className="text-emerald-400/70">Super Admin</span> using this email address to gain access.
          </div>
        </div>

        {/* Back to user login */}
        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-white/30">
          <Link href="/login" className="hover:text-white/60 transition-colors">
            ← Back to User Login
          </Link>
          <span>•</span>
          <Link href="/" className="hover:text-white/60 transition-colors">
            Go to Snapcart Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
