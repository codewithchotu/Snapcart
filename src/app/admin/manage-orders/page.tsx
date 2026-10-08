'use client'
import AdminOrderCard from '@/components/AdminOrderCard'
import { getSocket } from '@/lib/socket'

import { IUser } from '@/models/user.model'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
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
function ManageOrders() {
    const [orders,setOrders]=useState<IOrder[]>()
    const router=useRouter()
    useEffect(()=>{
      const getOrders=async ()=>{
        try {
            const result=await axios.get("/api/admin/get-orders")
            if (Array.isArray(result.data)) {
                setOrders(result.data)
            } else {
                setOrders([])
            }
        } catch (error) {
           console.log(error) 
           setOrders([])
        }
      }
      getOrders()
    },[])


    useEffect(()=>{
     const socket=getSocket()
     socket?.on("new-order",(newOrder)=>{
      if (newOrder && typeof newOrder === 'object') {
        setOrders((prev)=> Array.isArray(prev) ? [newOrder, ...prev] : [newOrder])
      }
     })
     socket.on("order-assigned",({orderId,assignedDeliveryBoy})=>{
      setOrders((prev)=> {
        if (!Array.isArray(prev)) return []
        return prev.map((o)=>(
          o._id==orderId?{...o,assignedDeliveryBoy}:o
        ))
      })
     })
     return ()=>{
      socket.off("new-order")
      socket.off("order-assigned")

     }
    },[])
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 w-full pt-20 pb-16'>
      <div className='fixed top-0 left-0 w-full backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 shadow-xs border-b border-gray-200 dark:border-gray-800 z-50'>
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto flex items-center gap-4 px-4 sm:px-6 lg:px-8 py-3.5'>
          <button className='p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition' onClick={()=>router.push("/")}>
            <ArrowLeft size={22} className="text-green-700 dark:text-green-400"/>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Orders</h1>
        </div>
      </div>
      <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 pt-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {orders?.map((order, index) => (
            <AdminOrderCard key={order._id || index} order={order} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ManageOrders
