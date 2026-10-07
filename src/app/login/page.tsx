'use client'
import { ArrowLeft, EyeIcon, EyeOff, Key, Leaf, Loader2, Lock, LogIn, Mail, User } from 'lucide-react'
import React, { FormEvent, useState } from 'react'
import {motion} from "motion/react"
import Image from 'next/image'
import googleImage from "@/assets/google.png"
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

function Login() {
   
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [showPassword,setShowPassword]=useState(false)
    const [loading,setLoading]=useState(false)
    const router=useRouter()
    const session=useSession()
    console.log(session)
    const handleLogin=async (e:FormEvent)=>{
        e.preventDefault()
        setLoading(true)
try {
   await signIn("credentials",{
    email,password
   }) 
  
   setLoading(false)
} catch (error) {
    console.log(error)
    setLoading(false)
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

        <p className='text-gray-600 dark:text-gray-400 mb-8 flex items-center gap-1.5 text-base sm:text-lg'>
          Login To Snapcart <Leaf className='w-5 h-5 text-green-600 dark:text-green-400 inline'/>
        </p>

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

          <div className='flex items-center gap-3 text-gray-400 dark:text-gray-600 text-xs font-semibold uppercase tracking-wider my-1'>
            <span className='flex-1 h-px bg-gray-200 dark:bg-gray-800'></span>
            OR
            <span className='flex-1 h-px bg-gray-200 dark:bg-gray-800'></span>
          </div>

          <div
            className='w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 py-3.5 rounded-2xl text-gray-700 dark:text-gray-200 font-medium transition-all duration-200 cursor-pointer shadow-sm'
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <Image src={googleImage} width={22} height={22} alt='google'/>
            <span>Continue with Google</span>
          </div>
        </motion.form>

        <p
          className='cursor-pointer text-gray-600 dark:text-gray-400 mt-6 text-sm sm:text-base flex items-center gap-1.5 hover:text-green-600 transition-colors'
          onClick={() => router.push("/register")}
        >
          Want to create an account? <LogIn className='w-4 h-4'/> <span className='text-green-600 dark:text-green-400 font-semibold'>Sign Up</span>
        </p>
      </div>
    </div>
  )
}

export default Login
