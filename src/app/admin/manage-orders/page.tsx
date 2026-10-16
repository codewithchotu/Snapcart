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
    const [orders, setOrders] = useState<IOrder[]>()
    const [stores, setStores] = useState<{ _id: string; name: string; storeCode: string }[]>([])
    const [selectedStoreId, setSelectedStoreId] = useState<string>("")
    const router = useRouter()

    useEffect(() => {
      const getStores = async () => {
        try {
          const res = await axios.get("/api/admin/stores")
          if (Array.isArray(res.data)) {
            setStores(res.data)
          }
        } catch (e) {
          console.error("Failed to fetch stores", e)
        }
      }
      getStores()
    }, [])

    useEffect(() => {
      const getOrders = async () => {
        try {
            const url = selectedStoreId ? `/api/admin/get-orders?storeId=${selectedStoreId}` : "/api/admin/get-orders"
            const result = await axios.get(url)
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
    }, [selectedStoreId])


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
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3.5'>
          <div className='flex items-center gap-4'>
            <button className='p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition' onClick={()=>router.push("/")}>
              <ArrowLeft size={22} className="text-green-700 dark:text-green-400"/>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Orders</h1>
          </div>
          {stores.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline">Store:</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All My Stores ({stores.length})</option>
                {stores.map(s => (
                  <option key={s._id} value={s._id}>
                    🏪 {s.name} ({s.storeCode})
                  </option>
                ))}
              </select>
            </div>
          )}
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
