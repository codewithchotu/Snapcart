'use client'
import React from 'react'
import {motion} from "motion/react"
import Image from 'next/image'
import { Minus, Package, Plus, PlusCircle, ShoppingCart } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { AppDispatch, RootState } from '@/redux/store'
import { addToCart, decreaseQuantity, increaseQuantity } from '@/redux/cartSlice'
import { useSelector } from 'react-redux'
interface IGrocery {
    _id: string,
    name: string,
    category: string,
    price: string,
    unit: string,
    image?: string,
    createdAt?: Date,
    updatedAt?: Date
}
function GroceryItemCard({item}:{item:IGrocery}) {
  const dispatch=useDispatch<AppDispatch>()
  const {cartData}=useSelector((state:RootState)=>state.cart)
  const cartItem=cartData.find(i=>i._id.toString()==item._id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true, amount: 0.2 }}
      className='bg-white dark:bg-gray-800 rounded-2xl shadow-xs hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full'
    >
      <div className='relative w-full aspect-4/3 bg-gray-50 dark:bg-gray-900 overflow-hidden group flex items-center justify-center p-2 sm:p-4'>
        {item.image ? (
          <Image
            src={item.image}
            fill
            alt={item.name}
            sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
            className='object-contain p-2 sm:p-3 transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='flex flex-col items-center justify-center text-gray-400'>
            <Package size={36} className='text-green-600/50' />
            <span className='text-[10px] sm:text-xs text-gray-400 mt-1 font-medium'>No image</span>
          </div>
        )}
        <div className='absolute inset-0 bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300' />
      </div>

      <div className='p-3 sm:p-4 flex flex-col flex-1 justify-between'>
        <div>
          <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 truncate'>{item.category}</p>
          <h3 className='dark:text-gray-100 text-xs sm:text-sm font-semibold line-clamp-2 leading-snug text-gray-800'>{item.name}</h3>
        </div>

        <div className='mt-3'>
          <div className='flex items-center justify-between gap-1 mb-3'>
            <span className='text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full truncate max-w-[60%]'>{item.unit}</span>
            <span className='text-green-700 dark:text-green-400 font-bold text-sm sm:text-base'>₹{item.price}</span>
          </div>

          {!cartItem ? (
            <motion.button
              className='w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-full py-2 text-xs sm:text-sm font-medium transition-all shadow-xs'
              whileTap={{ scale: 0.96 }}
              onClick={() => dispatch(addToCart({ ...item, quantity: 1 }))}
            >
              <ShoppingCart size={15} /> <span>Add to Cart</span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className='flex items-center justify-between bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full py-1.5 px-2.5 sm:px-3'
            >
              <button
                className='w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-all'
                onClick={() => dispatch(decreaseQuantity(item._id))}
              >
                <Minus size={14} className='text-green-700 dark:text-green-300' />
              </button>
              <span className='text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100'>{cartItem.quantity}</span>
              <button
                className='w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-all'
                onClick={() => dispatch(increaseQuantity(item._id))}
              >
                <Plus size={14} className='text-green-700 dark:text-green-300' />
              </button>
            </motion.div>
          )}
        </div>
      </div>
        
       



      
    </motion.div>
  )
}

export default GroceryItemCard
