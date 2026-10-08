'use client'

import axios from 'axios'
import { ArrowLeft, Package, PackageSearch } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {motion} from "motion/react"
import React, { useEffect, useState } from 'react'
import UserOrderCard from '@/components/UserOrderCard'
import { getSocket } from '@/lib/socket'

import { IUser } from '@/models/user.model'
interface IOrder {
    _id?: string
    user: string
    items: [
        {
            grocery: string,
            name: string,
            price: string,
            unit: string,
            image: string
            quantity: number
        }
    ]
    ,
    isPaid: boolean
    totalAmount: number,
    paymentMethod: "cod" | "online"
    address: {
        fullName: string,
        mobile: string,
        city: string,
        state: string,
        pincode: string,
        fullAddress: string,
        latitude: number,
        longitude: number
    }
    assignment?: string
    assignedDeliveryBoy?: IUser
    status: "pending" | "out of delivery" | "delivered",
    createdAt?: Date
    updatedAt?: Date
}
function MyOrder() {
  const router=useRouter()
  const [orders,setOrders]=useState<IOrder[]>()
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
const getMyOrders=async ()=>{
  try {
    const result=await axios.get("/api/user/my-orders")
    if (Array.isArray(result.data)) {
      setOrders(result.data)
    } else {
      setOrders([])
    }
    setLoading(false)
  } catch (error) {
    console.log(error)
    setOrders([])
    setLoading(false)
  }
}
getMyOrders()
  },[])


  useEffect(()=>{
const socket=getSocket()
socket.on("order-assigned",({orderId,assignedDeliveryBoy})=>{
setOrders((prev)=>{
  if (!Array.isArray(prev)) return []
  return prev.map((o)=>(
    o._id==orderId?{...o,assignedDeliveryBoy}:o
  ))
})
})

return ()=>{socket.off("order-assigned")}
  },[])



  if(loading){
    return <div className='flex items-center justify-center min-h-[50vh] text-gray-600'>Loading Your Orders...</div>
  }
  return (
    <div className='bg-linear-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen w-full pt-20 pb-16'>
      <div className='fixed top-0 left-0 w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 shadow-xs border-b border-gray-200 dark:border-gray-800 z-50'>
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto flex items-center gap-4 px-4 sm:px-6 lg:px-8 py-3.5'>
          <button className='p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition' onClick={()=>router.push("/")}>
            <ArrowLeft size={22} className="text-green-700 dark:text-green-400"/>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Orders</h1>
        </div>
      </div>

      <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative'>
        {orders?.length == 0 ? (
          <div className='pt-16 flex flex-col items-center text-center'>
            <PackageSearch size={70} className="text-green-600 dark:text-green-400 mb-4" />
            <h2 className='text-xl font-semibold text-gray-700 dark:text-gray-200'>No Orders Found</h2>
            <p className='text-gray-500 dark:text-gray-400 text-sm mt-1'>Start shopping to view your orders here.</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {orders?.map((order, index) => (
              <motion.div
                key={order._id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <UserOrderCard order={order} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyOrder
