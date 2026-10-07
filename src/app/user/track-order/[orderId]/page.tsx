'use client'
import LiveMap from '@/components/LiveMap'
import { getSocket } from '@/lib/socket'
import { IUser } from '@/models/user.model'
import { RootState } from '@/redux/store'
import axios from 'axios'
import { ArrowLeft, Loader, Send, Sparkle } from 'lucide-react'

import { useParams, useRouter } from 'next/navigation'
import {AnimatePresence, motion} from "motion/react"
import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { IMessage } from '@/models/message.model'
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
interface ILocation {
  latitude: number,
  longitude: number
}
function TrackOrder({params}:{params:{orderId:string}}) {
const {userData}=useSelector((state:RootState)=>state.user)
const {orderId}=useParams()
const [order,setOrder]=useState<IOrder>()
const router=useRouter()
const [newMessage,setNewMessage]=useState("")
const [messages,setMessages]=useState<IMessage[]>()
const chatBoxRef=useRef<HTMLDivElement>(null)
  const [loading,setLoading]=useState(false)
   const [suggestions, setSuggestions] = useState([])
const [userLocation, setUserLocation] = useState<ILocation>(
    {
      latitude: 0,
      longitude: 0
    }
  )
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0
  })

useEffect(()=>{
const getOrder=async ()=>{
  try {
    const result=await axios.get(`/api/user/get-order/${orderId}`)
    setOrder(result.data)
    setUserLocation({
      latitude:result.data.address.latitude,
      longitude:result.data.address.longitude
    })
    setDeliveryBoyLocation({
      latitude:result.data.assignedDeliveryBoy.location.coordinates[1],
      longitude:result.data.assignedDeliveryBoy.location.coordinates[0]
    })
  } catch (error) {
    console.log(error)
  }
}
getOrder()
},[userData?._id])

useEffect(():any=>{
const socket=getSocket()
socket.on("update-deliveryBoy-location",(data)=>{
  console.log(location)
 setDeliveryBoyLocation({
  latitude: data.location.coordinates?.[1] ?? data.location.latitude,
        longitude: data.location.coordinates?.[0] ?? data.location.longitude,

 })
  }
)
return ()=>socket.off("update-deliveryBoy-location")
},[order])

 useEffect(() => {
    const socket = getSocket()
    socket.emit("join-room", orderId)
     socket.on("send-message",(message)=>{
      if(message.roomId===orderId){
 setMessages((prev)=>[...prev!,message])
      }
    })

    return ()=>{
      socket.off("send-message")
    }
    
    
  }, [])

  const sendMsg = () => {
    const socket = getSocket()

    const message = {
      roomId: orderId,
      text: newMessage,
      senderId: userData?._id,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }
    socket.emit("send-message", message)
   
    setNewMessage("")
  }
   useEffect(() => {
      const getAllMessages = async () => {
        try {
          const result = await axios.post("/api/chat/messages", { roomId: orderId })
          setMessages(result.data)
        } catch (error) {
          console.log(error)
        }
      }
      getAllMessages()
    }, [])

useEffect(()=>{
    chatBoxRef.current?.scrollTo({
      top:chatBoxRef.current.scrollHeight,
      behavior:"smooth"
    })
  },[messages])

  const getSuggestion=async ()=>{
    setLoading(true)
    try {
  
      const lastMessage=messages?.filter(m=>m.senderId.toString()!==userData?._id)?.at(-1)
      const result=await axios.post("/api/chat/ai-suggestions",{message:lastMessage?.text,role:"user"})
    setSuggestions(result.data)
    setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }
  
  return (
    <div className='w-full min-h-screen bg-linear-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 pt-20 pb-16'>
      <div className='sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 border-b border-gray-200 dark:border-gray-800 shadow-xs z-50'>
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto flex gap-3 items-center px-4 sm:px-6 lg:px-8'>
          <button className='p-2 bg-green-100 dark:bg-gray-800 rounded-full hover:bg-green-200 transition' onClick={() => router.back()}>
            <ArrowLeft className="text-green-700 dark:text-green-400" size={20} />
          </button>
          <div>
            <h2 className='text-xl font-bold text-gray-800 dark:text-gray-100'>Track Order</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Order #{order?._id?.toString().slice(-6)} <span className='text-green-700 dark:text-green-400 font-semibold capitalize'>({order?.status})</span></p>
          </div>
        </div>
      </div>

      <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 mt-6'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
          <div className='lg:col-span-7 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg h-[350px] sm:h-[450px] lg:h-[550px]'>
            <LiveMap userLocation={userLocation} deliveryBoyLocation={deliveryBoyLocation} />
          </div>

          <div className='lg:col-span-5 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 h-[500px] lg:h-[550px] flex flex-col'>
            <div className='flex justify-between items-center mb-3'>
              <span className='font-semibold text-gray-700 dark:text-gray-200 text-sm'>Quick Replies</span>
              <motion.button
                disabled={loading}
                whileTap={{ scale: 0.9 }}
                className="px-3 py-1 text-xs flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full shadow-xs border border-purple-200 dark:border-purple-800 cursor-pointer"
                onClick={getSuggestion}
              >
                <Sparkle size={14} />{loading ? <Loader className="w-4 h-4 animate-spin" /> : "AI suggest"}
              </motion.button>
            </div>

            <div className='flex gap-2 flex-wrap mb-3 max-h-24 overflow-y-auto scrollbar-hide'>
              {suggestions.map((s) => (
                <motion.div
                  key={s}
                  whileTap={{ scale: 0.92 }}
                  className="px-3 py-1 text-xs bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 cursor-pointer text-green-700 dark:text-green-300 rounded-full"
                  onClick={() => setNewMessage(s)}
                >
                  {s}
                </motion.div>
              ))}
            </div>

            <div className='flex-1 overflow-y-auto p-2 space-y-3 border border-gray-100 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/40' ref={chatBoxRef}>
              <AnimatePresence>
                {messages?.map((msg) => (
                  <motion.div
                    key={msg._id?.toString() || Math.random().toString()}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.senderId.toString() == userData?._id ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`px-4 py-2 max-w-[80%] rounded-2xl shadow-xs text-sm 
                        ${
                          msg.senderId.toString() === userData?._id
                            ? "bg-green-600 text-white rounded-br-none"
                            : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-none"
                        }`}>
                      <p>{msg.text}</p>
                      <p className='text-[10px] opacity-70 mt-1 text-right'>{msg.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className='flex gap-2 mt-3 border-t border-gray-100 dark:border-gray-700 pt-3'>
              <input
                type="text"
                placeholder='Type a Message...'
                className='flex-1 bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm dark:text-gray-100'
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              />
              <button className='bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-xl text-white font-medium transition' onClick={sendMsg}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackOrder
