'use client'
import { getSocket } from '@/lib/socket'
import { IDeliveryAssigment } from '@/models/deliveryAssignment.model'
import { RootState } from '@/redux/store'
import axios from 'axios'
import { resolveSoa } from 'dns'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import LiveMap from './LiveMap'
import DeliveryChat from './DeliveryChat'
import { div } from 'motion/react-client'
import { Loader } from 'lucide-react'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ILocation {
  latitude: number,
  longitude: number
}
function DeliveryBoyDashboard({earning}:{earning:number}) {
  const [assignments, setAssignments] = useState<any[]>([])
  const { userData } = useSelector((state: RootState) => state.user)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [showOtpBox,setShowOtpBox]=useState(false)
  const [otpError,setOtpError]=useState("")
  const [sendOtpLoading,setSendOtpLoading]=useState(false)
  const [verifyOtpLoading,setVerifyOtpLoading]=useState(false)
  const [otp,setOtp]=useState("")
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
  const fetchAssignments = async () => {
    try {
      const result = await axios.get("/api/delivery/get-assignments")
      setAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    const socket = getSocket()
    if (!userData?._id) return
    if (!navigator.geolocation) return
    const watcher = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      setDeliveryBoyLocation({
        latitude: lat,
        longitude: lon
      })
      socket.emit("update-location", {
        userId: userData?._id,
        latitude: lat,
        longitude: lon
      })
    }, (err) => {
      console.log(err)
    }, { enableHighAccuracy: true })
    return () => navigator.geolocation.clearWatch(watcher)
  }, [userData?._id])

  useEffect((): any => {
    const socket = getSocket()

    socket.on("new-assignment", (deliveryAssignment) => {
      setAssignments((prev) => [...prev, deliveryAssignment])
    })
    return () => socket.off("new-assignment")
  }, [])

  const handleAccept = async (id: string) => {
    try {
      const result = await axios.get(`/api/delivery/assignment/${id}/accept-assignment`)
      fetchCurrentOrder()
    } catch (error) {
    console.log(error)
    }
  }


  const fetchCurrentOrder = async () => {
    try {
      const result = await axios.get("/api/delivery/current-order")
      if (result.data.active) {
        setActiveOrder(result.data.assignment)
        setUserLocation({
          latitude: result.data.assignment.order.address.latitude,
          longitude: result.data.assignment.order.address.longitude
        })
      }

    } catch (error) {
      console.log(error)
    }
  }


  useEffect(():any=>{
const socket=getSocket()
socket.on("update-deliveryBoy-location",({userId,location})=>{
  setDeliveryBoyLocation({
    latitude:location.coordinates[1],
    longitude:location.coordinates[0]
  })
})
return ()=>socket.off("update-deliveryBoy-location")
  },[])




  useEffect(() => {
    fetchCurrentOrder()
    fetchAssignments()
  }, [userData])


  const [otpSuccessMessage, setOtpSuccessMessage] = useState("")

  const sendOtp = async () => {
    setSendOtpLoading(true)
    setOtpError("")
    setOtpSuccessMessage("")
    try {
      const result = await axios.post("/api/delivery/otp/send", { orderId: activeOrder.order._id })
      console.log(result.data)
      setOtpSuccessMessage(result.data?.message || "OTP sent successfully to customer's email")
      setShowOtpBox(true)
    } catch (error: any) {
      console.error("Send OTP error:", error)
      setOtpError(error.response?.data?.message || "Failed to send OTP email. Please try again.")
    } finally {
      setSendOtpLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setOtpError("Please enter the 4-digit OTP.")
      return
    }
    setVerifyOtpLoading(true)
    setOtpError("")
    try {
      const result = await axios.post("/api/delivery/otp/verify", { orderId: activeOrder.order._id, otp: otp.trim() })
      console.log(result.data)
      setActiveOrder(null)
      await fetchCurrentOrder()
      window.location.reload()
    } catch (error: any) {
      console.error("Verify OTP error:", error)
      setOtpError(error.response?.data?.message || "OTP Verification Error. Please check the code.")
    } finally {
      setVerifyOtpLoading(false)
    }
  }


if(!activeOrder && assignments.length===0){
 
  const todayEarning=[
    {name:"Today",
     earning,
     deliveries:earning/40
    }
  ]
  return (
    <div className='flex items-center justify-center min-h-screen bg-linear-to-br from-white to-green-50 p-6'>
      <div className='max-w-md w-full text-center'>
      <h2 className='text-2xl font-bold text-gray-800'>No Active Deliveries 🚛</h2>
      <p className='text-gray-500 mb-5'>Stay online to receive new orders</p>

      <div className='bg-white border rounded-xl shadow-xl p-6'>
        <h2 className='font-medium text-green-700 mb-2'>Today's Performance</h2>
         <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={todayEarning}>
         <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="earnings" name="Earnings (₹)" />
                <Bar dataKey="deliveries" name="Deliveries" />

                    </BarChart>
                </ResponsiveContainer>

         <p className='mt-4 text-lg font-bold text-green-700'>{earning || 0} Earned today</p>
         <button className='mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg' onClick={()=>window.location.reload()}>Refresh Earning</button>

      </div>
      </div>
     
    </div>
  )
}

  if (activeOrder && userLocation) {
    return (
      <div className='p-4 pt-[120px] min-h-screen bg-gray-50'>
        <div className='max-w-3xl mx-auto'>
          <h1 className='text-2xl font-bold text-green-700 mb-2'>Active Delivery</h1>
          <p className='text-gray-600 text-sm mb-4'>order#{activeOrder.order._id.slice(-6)}</p>

          <div className='rounded-xl border shadow-lg overflow-hidden mb-6'>
            <LiveMap userLocation={userLocation} deliveryBoyLocation={deliveryBoyLocation} />
          </div>
          <DeliveryChat orderId={activeOrder.order._id} deliveryBoyId={userData?._id?.toString()!}/>
          <div className='mt-6 bg-white rounded-xl border shadow p-6'>
            {!activeOrder.order.deliveryOtpVerification && !showOtpBox && (
              <>
                <button
                  onClick={sendOtp}
                  disabled={sendOtpLoading}
                  className='w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-center text-white font-semibold rounded-lg transition flex items-center justify-center gap-2'
                >
                  {sendOtpLoading ? (
                    <>
                      <Loader size={16} className='animate-spin text-white' />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    "Mark as Delivered"
                  )}
                </button>
                {otpError && <div className='text-red-600 mt-2 text-sm text-center font-medium'>{otpError}</div>}
              </>
            )}
            {
              showOtpBox &&
              <div className='mt-4 space-y-3'>
                {otpSuccessMessage && (
                  <div className='p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg text-center'>
                    {otpSuccessMessage}
                  </div>
                )}
                <input
                  type="text"
                  className='w-full py-3 border border-gray-300 rounded-lg text-center font-bold tracking-widest text-lg outline-none focus:ring-2 focus:ring-blue-400'
                  placeholder='Enter 4-digit OTP'
                  maxLength={4}
                  onChange={(e) => setOtp(e.target.value)}
                  value={otp}
                />
                <button
                  className='w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 text-center rounded-lg font-semibold transition flex items-center justify-center gap-2'
                  disabled={verifyOtpLoading}
                  onClick={verifyOtp}
                >
                  {verifyOtpLoading ? (
                    <>
                      <Loader size={16} className='animate-spin text-white' />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>
                {otpError && <div className='text-red-600 text-sm text-center font-medium'>{otpError}</div>}
                <button
                  type='button'
                  onClick={sendOtp}
                  disabled={sendOtpLoading}
                  className='w-full text-xs text-blue-600 hover:underline text-center mt-1'
                >
                  {sendOtpLoading ? "Resending OTP..." : "Resend OTP"}
                </button>
              </div>
            }
            {activeOrder.order.deliveryOtpVerification && <div className='text-green-700 text-center font-bold'>Delivery completed!</div>}


             
          </div>


        </div>


      </div>
    )
  }


  return (
    <div className='w-full min-h-screen bg-gray-50 p-4'>
      <div className="max-w-3xl mx-auto">
        <h2 className='text-2xl font-bold mt-[120px] mb-[30px]'>Delivery Assigments</h2>

        {assignments.map((a,index) => (
          <div key={index} className='p-5 bg-white rounded-xl shadow mb-4  border'>
            <p ><b>Order Id </b> #{a?.order._id.slice(-6)}</p>
            <p className='text-gray-600'>{a.order.address.fullAddress}</p>

            <div className='flex gap-3 mt-4'>
              <button className='flex-1 bg-green-600 text-white py-2 rounded-lg'
                onClick={() => handleAccept(a._id)}
              >Accept</button>
              <button className='flex-1 bg-red-600 text-white py-2 rounded-lg'>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DeliveryBoyDashboard
