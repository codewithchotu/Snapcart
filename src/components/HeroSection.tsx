'use client'
import { Leaf, ShoppingBasket, Smartphone, Truck } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import React, { useEffect, useState } from 'react'
import {motion} from "motion/react"
import Image from 'next/image'




function HeroSection() {
 
 
   const slides=[
      {
    id: 1,
    icon: <Leaf className="w-20 h-20 sm:w-28 sm:h-28 text-green-400 drop-shadow-lg" />,
    title: "Fresh Organic Groceries 🥦",
    subtitle: "Farm-fresh fruits, vegetables, and daily essentials delivered to you.",
    btnText: "Shop Now",
   bg:"https://plus.unsplash.com/premium_photo-1663012860167-220d9d9c8aca?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    id: 2,
    icon: <Truck className="w-20 h-20 sm:w-28 sm:h-28 text-yellow-400 drop-shadow-lg" />,
    title: "Fast & Reliable Delivery 🚚",
    subtitle: "We ensure your groceries reach your doorstep in no time.",
    btnText: "Order Now",
    bg:"https://images.unsplash.com/photo-1683553170878-049f180627b0?q=80&w=1450&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    id: 3,
    icon: <Smartphone className="w-20 h-20 sm:w-28 sm:h-28 text-blue-400 drop-shadow-lg" />,
    title: "Shop Anytime, Anywhere 📱",
    subtitle: "Easy and seamless online grocery shopping experience.",
    btnText: "Get Started",
   bg:"https://plus.unsplash.com/premium_photo-1663091378026-7bee6e1c7247?q=80&w=1742&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },

    ] 

    const [current,setCurrent]=useState(0)
useEffect(()=>{
const timer=setInterval(()=>{
setCurrent((prev)=>(prev+1)%(slides.length))
},4000)
return ()=>clearInterval(timer)
},[])

  return (
    <div className='w-full max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8 mt-20 sm:mt-28 lg:mt-32'>
      <div className='relative w-full min-h-[380px] sm:min-h-[440px] md:min-h-[500px] lg:min-h-[560px] xl:min-h-[600px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0'
          >
            <Image
              src={slides[current]?.bg}
              fill
              alt='slide'
              priority
              className='object-cover'
            />
            <div className='absolute inset-0 bg-black/55 backdrop-blur-[1px]' />
          </motion.div>
        </AnimatePresence>

        <div className='relative z-10 text-center text-white px-4 sm:px-8 py-10 max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 sm:gap-6'>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className='flex flex-col items-center justify-center gap-4 sm:gap-6'
          >
            <div className='bg-white/10 backdrop-blur-md p-3 sm:p-5 rounded-full shadow-lg'>
              {slides[current].icon}
            </div>
            <h1 className='text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg leading-tight'>
              {slides[current].title}
            </h1>
            <p className='text-sm sm:text-lg md:text-xl text-gray-200 max-w-2xl leading-relaxed'>
              {slides[current].subtitle}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className='mt-2 bg-white text-green-700 hover:bg-green-100 px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-bold shadow-lg transition-all duration-300 flex items-center gap-2 text-sm sm:text-base'
            >
              <ShoppingBasket className='w-5 h-5' />
              {slides[current].btnText}
            </motion.button>
          </motion.div>
        </div>

        <div className='absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-10'>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === current ? "bg-white w-6" : "bg-white/50 w-2.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroSection
