'use client'
import { ArrowLeft, Bike, EyeIcon, EyeOff, Key, Leaf, Loader2, Lock, LogIn, Mail, User, UserCog, ShieldCheck } from 'lucide-react'
import React, { FormEvent, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import googleImage from "@/assets/google.png"
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")
    
    // Multi-role selection prompt state
    const [availableRoles, setAvailableRoles] = useState<string[]>([])
    const [showRoleModal, setShowRoleModal] = useState(false)

    const router = useRouter()
    const session = useSession()

    const executeLogin = async (roleToUse?: string) => {
      setLoading(true)
      setErrorMsg("")
      try {
        const res = await signIn("credentials", {
          email,
          password,
          role: roleToUse,
          redirect: false
        })

        if (res?.error) {
          setErrorMsg(res.error.replace("Error: ", ""))
          setLoading(false)
          setShowRoleModal(false)
        } else {
          router.push("/")
          router.refresh()
        }
      } catch (error: any) {
        console.error("Login error:", error)
        setErrorMsg("Failed to sign in. Please try again.")
        setLoading(false)
        setShowRoleModal(false)
      }
    }

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg("")
        try {
          // Check if email has multiple roles in DB
          const checkRes = await axios.post("/api/auth/check-roles", { email })
          if (checkRes.data?.hasMultipleRoles && checkRes.data?.roles?.length > 1) {
            setAvailableRoles(checkRes.data.roles)
            setShowRoleModal(true)
            setLoading(false)
            return
          }

          // Single account or zero existing roles found: attempt standard login
          await executeLogin()
        } catch (error: any) {
          console.error("Check roles error:", error)
          // Fallback to standard login attempt
          await executeLogin()
        }
    }

    const handleRoleSelect = async (role: string) => {
      setShowRoleModal(false)
      await executeLogin(role)
    }

    const handleGoogleSignIn = async () => {
        if (googleLoading) return
        setGoogleLoading(true)
        try {
            await signIn("google", { callbackUrl: "/" })
        } catch (error) {
            console.log(error)
            setGoogleLoading(false)
        }
    }

    const getRoleLabel = (role: string) => {
      switch (role) {
        case 'admin': return 'Admin'
        case 'deliveryBoy': return 'Delivery Boy'
        case 'user': default: return 'User'
      }
    }

    const getRoleIcon = (role: string) => {
      switch (role) {
        case 'admin': return <UserCog className='w-6 h-6 text-purple-600 dark:text-purple-400' />
        case 'deliveryBoy': return <Bike className='w-6 h-6 text-orange-500 dark:text-orange-400' />
        case 'user': default: return <User className='w-6 h-6 text-green-600 dark:text-green-400' />
      }
    }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-12 bg-gradient-to-b from-green-50/60 via-white to-green-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative'>
      
      <div className='w-full max-w-md sm:max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col items-center'>
        <motion.h1
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='text-3xl sm:text-4xl font-extrabold text-green-700 dark:text-green-400 mb-2 text-center'
        >
          Welcome Back
        </motion.h1>

        <p className='text-gray-600 dark:text-gray-400 mb-6 flex items-center gap-1.5 text-base sm:text-lg'>
          Login To Snapcart <Leaf className='w-5 h-5 text-green-600 dark:text-green-400 inline'/>
        </p>

        {errorMsg && (
          <div className='w-full mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium text-center'>
            {errorMsg}
          </div>
        )}

        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='flex flex-col gap-5 w-full'
        >
          <div className='relative'>
            <Mail className='absolute left-3.5 top-4 w-5 h-5 text-gray-400 dark:text-gray-500'/>
            <input
              type="text"
              placeholder='Your Email'
              className='w-full border border-gray-300 dark:border-gray-700 rounded-2xl py-3.5 pl-11 pr-4 text-base text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/80 focus:ring-2 focus:ring-green-500 focus:outline-none dark:placeholder-gray-500 transition-all'
              onChange={(e) => setEmail(e.target.value)}
              value={email}
            />
          </div>

          <div className='relative'>
            <Lock className='absolute left-3.5 top-4 w-5 h-5 text-gray-400 dark:text-gray-500'/>
            <input
              type={showPassword ? "text" : "password"}
              placeholder='Your Password'
              className='w-full border border-gray-300 dark:border-gray-700 rounded-2xl py-3.5 pl-11 pr-11 text-base text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/80 focus:ring-2 focus:ring-green-500 focus:outline-none dark:placeholder-gray-500 transition-all'
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
            {showPassword ? (
              <EyeOff className='absolute right-3.5 top-4 w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300' onClick={() => setShowPassword(false)}/>
            ) : (
              <EyeIcon className='absolute right-3.5 top-4 w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300' onClick={() => setShowPassword(true)}/>
            )}
          </div>

          {(() => {
            const formValidation = email !== "" && password !== ""
            return (
              <button
                disabled={!formValidation || loading}
                className={`w-full font-semibold py-3.5 rounded-2xl transition-all duration-200 shadow-md text-base inline-flex items-center justify-center gap-2 ${
                  formValidation 
                    ? "bg-green-600 hover:bg-green-700 text-white active:scale-[0.99]"
                    : "bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                {loading ? <Loader2 className='w-5 h-5 animate-spin'/> : "Login"}
              </button>
            )
          })()}
        </motion.form>

        <div className='flex flex-col gap-5 w-full mt-5'>
          <div className='flex items-center gap-3 text-gray-400 dark:text-gray-600 text-xs font-semibold uppercase tracking-wider my-1'>
            <span className='flex-1 h-px bg-gray-200 dark:bg-gray-800'></span>
            OR
            <span className='flex-1 h-px bg-gray-200 dark:bg-gray-800'></span>
          </div>

          <div
            className='w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 py-3.5 rounded-2xl text-gray-700 dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer shadow-sm'
            onClick={handleGoogleSignIn}
          >
            {googleLoading ? <Loader2 className='w-5 h-5 animate-spin'/> : <Image src={googleImage} width={22} height={22} alt='google'/>}
            <span>Continue with Google</span>
          </div>
        </div>

        <p
          className='cursor-pointer text-gray-600 dark:text-gray-400 mt-6 text-sm sm:text-base flex items-center gap-1.5 hover:text-green-600 transition-colors'
          onClick={() => router.push("/register")}
        >
          Want to create an account? <LogIn className='w-4 h-4'/> <span className='text-green-600 dark:text-green-400 font-semibold'>Sign Up</span>
        </p>
      </div>

      {/* Multiple Roles Selection Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className='w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center'
            >
              <div className='w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/60 flex items-center justify-center mb-4 text-green-600 dark:text-green-400'>
                <ShieldCheck className='w-8 h-8' />
              </div>

              <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2'>
                Multiple Roles Found
              </h2>
              <p className='text-sm text-gray-600 dark:text-gray-400 text-center mb-6'>
                We found multiple account roles for <span className='font-semibold text-green-600 dark:text-green-400'>{email}</span>. Please select which role account you want to sign in to:
              </p>

              <div className='flex flex-col gap-3 w-full mb-6'>
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className='w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:bg-green-50 dark:hover:bg-gray-700/80 hover:border-green-500 transition-all group cursor-pointer shadow-xs'
                  >
                    <div className='flex items-center gap-3.5'>
                      <div className='p-2.5 rounded-xl bg-white dark:bg-gray-900 shadow-xs border border-gray-100 dark:border-gray-700'>
                        {getRoleIcon(role)}
                      </div>
                      <div className='text-left'>
                        <div className='font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors'>
                          {getRoleLabel(role)}
                        </div>
                        <div className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
                          Sign in as {role}
                        </div>
                      </div>
                    </div>
                    <div className='text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 group-hover:bg-green-600 group-hover:text-white transition-all'>
                      Select
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowRoleModal(false)}
                className='text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors'
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Login
