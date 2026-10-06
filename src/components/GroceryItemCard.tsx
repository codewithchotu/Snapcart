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
     initial={{opacity:0,y:50,scale:0.9}}
    whileInView={{opacity:1,y:0,scale:1}}
    transition={{duration:0.6}}
    viewport={{once:false,amount:0.3}}
    className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col'
    >
        <div className='relative w-full aspect-4/3 bg-gray-50 dark:bg-gray-900 overflow-hidden group flex items-center justify-center'>
            {item.image ? (
                <Image src={item.image} fill alt={item.name} sizes='(max-width: 768px) 100vw, 25vw' className='object-contain p-4 transition-transform duration-500 group-hover:scale-105'/>
            ) : (
                <div className='flex flex-col items-center justify-center text-gray-400'>
                    <Package size={44} className='text-green-600/50' />
                    <span className='text-xs text-gray-400 mt-1 font-medium'>No image</span>
                </div>
            )}
            <div className='absolute inset-0 bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300'/>
        </div>

 <div className='p-4 flex flex-col flex-1'>
<p className='text-xs text-gray-500 dark:text-gray-400 font-medium mb-1'>{item.category}</p>
<h3 className='dark:text-gray-100'>{item.name}</h3>
<div className='flex items-center justify-between mt-2'>
    <span className='text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full'>{item.unit}</span>
    <span className='text-green-700 dark:text-green-400 font-bold text-lg'>₹{item.price}</span>
</div>
{!cartItem ?<motion.button className='mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-full py-2 text-sm font-medium transition-all' 
whileTap={{scale:0.96}}
onClick={()=>dispatch(addToCart({...item,quantity:1}))}
>
<ShoppingCart/> Add to Cart
</motion.button>
:
<motion.div
initial={{opacity:0, y:10}}
animate={{opacity:1, y:0}}
transition={{duration:0.3}}
className='mt-4 flex items-center justify-center bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full py-2 px-4 gap-4'
>
  <button className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-all' onClick={()=>dispatch(decreaseQuantity(item._id))}><Minus size={16} className='text-green-700 dark:text-green-300'/></button>
  <span className='text-sm font-semibold text-gray-800 dark:text-gray-100'>{cartItem.quantity}</span>
  <button className='w-7 h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-all' onClick={()=>dispatch(increaseQuantity(item._id))}><Plus size={16} className='text-green-700 dark:text-green-300'/></button>

  
  </motion.div>}

 </div>
        
       



      
    </motion.div>
  )
}

export default GroceryItemCard
