'use client'
import { getSocket } from '@/lib/socket'
import { IDeliveryAssigment } from '@/models/deliveryAssignment.model'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import LiveMap from './LiveMap'
import DeliveryChat from './DeliveryChat'
import { Loader, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ILocation {
  latitude: number,
  longitude: number
}

function DeliveryBoyDashboard({ earning }: { earning: number }) {
  const [assignments, setAssignments] = useState<any[]>([])
  const { userData } = useSelector((state: RootState) => state.user)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [sendOtpLoading, setSendOtpLoading] = useState(false)
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false)
  const [otp, setOtp] = useState("")
  const [userLocation, setUserLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0
  })
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0
  })

  const [dismissedOrderIds, setDismissedOrderIds] = useState<string[]>([])

  const fetchAssignments = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/get-assignments")
      setAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }, [])

  const fetchCurrentOrder = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/current-order")
      if (result.data.active && result.data.assignment?.order) {
        const orderId = String(result.data.assignment.order._id)
        if (dismissedOrderIds.includes(orderId)) {
          setActiveOrder(null)
          return
        }
        setActiveOrder(result.data.assignment)
        if (result.data.assignment.order.address) {
          setUserLocation({
            latitude: result.data.assignment.order.address.latitude,
            longitude: result.data.assignment.order.address.longitude
          })
        }
      } else {
        setActiveOrder(null)
      }
    } catch (error) {
      console.log(error)
    }
  }, [dismissedOrderIds])

  // Socket identity and connection management
  useEffect(() => {
    if (!userData?._id) return
    const socket = getSocket()

    const sendIdentity = () => {
      if (userData?._id) {
        console.log("[SOCKET] Emitting identity event with userId:", userData._id, "socket.id:", socket.id)
        socket.emit("identity", userData._id)
      }
    }

    sendIdentity()
    socket.on("connect", sendIdentity)

    return () => {
      socket.off("connect", sendIdentity)
    }
  }, [userData?._id])

  // Geolocation updates
  useEffect(() => {
    const socket = getSocket()
    if (!userData?._id) return
    if (!navigator.geolocation) return

    const handlePos = (pos: GeolocationPosition) => {
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
    }

    navigator.geolocation.getCurrentPosition(
      handlePos,
      (err) => console.log("[GEO] getCurrentPosition:", err.message),
      { enableHighAccuracy: true }
    )

    const watcher = navigator.geolocation.watchPosition(
      handlePos,
      (err) => console.log("[GEO] watchPosition:", err.message),
      { enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watcher)
  }, [userData?._id])

  // Listen for new assignment notifications with deduplication and timing logs
  useEffect(() => {
    const socket = getSocket()

    const handleNewAssignment = (deliveryAssignment: any) => {
      console.log("[DELIVERY-BOY] Notification event 'new-assignment' received by delivery boy:", deliveryAssignment?._id)
      setAssignments((prev) => {
        if (prev.some((a) => String(a._id) === String(deliveryAssignment?._id))) {
          return prev
        }
        return [deliveryAssignment, ...prev]
      })
    }

    socket.on("new-assignment", handleNewAssignment)
    return () => {
      socket.off("new-assignment", handleNewAssignment)
    }
  }, [])

  // Listen for delivery boy location updates
  useEffect(() => {
    const socket = getSocket()

    const handleLocationUpdate = ({ userId, location }: any) => {
      if (userData?._id && String(userId) === String(userData._id)) {
        setDeliveryBoyLocation({
          latitude: location.coordinates[1],
          longitude: location.coordinates[0]
        })
      }
    }

    socket.on("update-deliveryBoy-location", handleLocationUpdate)
    return () => {
      socket.off("update-deliveryBoy-location", handleLocationUpdate)
    }
  }, [userData?._id])

  useEffect(() => {
    if (userData?._id) {
      fetchCurrentOrder()
      fetchAssignments()
    }
  }, [userData?._id, fetchCurrentOrder, fetchAssignments])

  const handleAccept = async (id: string) => {
    try {
      await axios.get(`/api/delivery/assignment/${id}/accept-assignment`)
      setAssignments((prev) => prev.filter((a) => String(a._id) !== String(id)))
      await fetchCurrentOrder()
    } catch (error) {
      console.log(error)
    }
  }

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
      // Update active order state to completed without page reload
      setActiveOrder((prev: any) => prev ? {
        ...prev,
        order: {
          ...prev.order,
          deliveryOtpVerification: true,
          status: "delivered"
        }
      } : null)
      setShowOtpBox(false)
    } catch (error: any) {
      console.error("Verify OTP error:", error)
      setOtpError(error.response?.data?.message || "OTP Verification Error. Please check the code.")
    } finally {
      setVerifyOtpLoading(false)
    }
  }

  const handleBackToDashboard = async () => {
    if (activeOrder?.order?._id) {
      const orderId = String(activeOrder.order._id)
      setDismissedOrderIds((prev) => [...prev, orderId])
    }
    setActiveOrder(null)
    setShowOtpBox(false)
    setOtp("")
    setOtpError("")
    setOtpSuccessMessage("")
    await fetchAssignments()
  }

  if (!activeOrder && assignments.length === 0) {
    const todayEarning = [
      {
        name: "Today",
        earnings: earning,
        deliveries: earning / 40
      }
    ]
    return (
      <div className='flex items-center justify-center min-h-screen bg-linear-to-br from-white to-green-50 p-6 pt-[100px]'>
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
                <Bar dataKey="earnings" name="Earnings (₹)" fill="#16a34a" />
                <Bar dataKey="deliveries" name="Deliveries" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>

            <p className='mt-4 text-lg font-bold text-green-700'>₹{earning || 0} Earned today</p>
            <button
              className='mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition'
              onClick={() => {
                fetchAssignments()
                fetchCurrentOrder()
              }}
            >
              Refresh Earnings & Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (activeOrder && userLocation) {
    const isCompleted = activeOrder?.order?.deliveryOtpVerification || activeOrder?.order?.status === "delivered"

    return (
      <div className='p-4 pt-[100px] pb-16 min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto'>
          {/* Consistent Top Navigation Header */}
          <div className='flex items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs'>
            <div>
              <h1 className='text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400'>
                {isCompleted ? "Delivery Completed" : "Active Delivery"}
              </h1>
              <p className='text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5'>Order #{activeOrder.order._id.slice(-6)}</p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className='px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 border border-gray-200 dark:border-gray-600'
            >
              <ArrowLeft size={16} />
              <span>Back to Orders</span>
            </button>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
            <div className='lg:col-span-7 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden h-[350px] sm:h-[450px] lg:h-[550px]'>
              <LiveMap userLocation={userLocation} deliveryBoyLocation={deliveryBoyLocation} />
            </div>

            <div className='lg:col-span-5 flex flex-col gap-6'>
              {!isCompleted && (
                <DeliveryChat orderId={activeOrder.order._id} deliveryBoyId={userData?._id?.toString()!} />
              )}

              <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-md p-6'>
                {!isCompleted && !showOtpBox && (
                  <>
                    <button
                      onClick={sendOtp}
                      disabled={sendOtpLoading}
                      className='w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-center text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-base shadow-xs'
                    >
                      {sendOtpLoading ? (
                        <>
                          <Loader size={18} className='animate-spin text-white' />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        "Mark as Delivered"
                      )}
                    </button>
                    {otpError && <div className='text-red-600 mt-2 text-sm text-center font-medium'>{otpError}</div>}
                  </>
                )}

                {!isCompleted && showOtpBox && (
                  <div className='space-y-3'>
                    {otpSuccessMessage && (
                      <div className='p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg text-center'>
                        {otpSuccessMessage}
                      </div>
                    )}
                    <input
                      type="text"
                      className='w-full py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-bold tracking-widest text-lg outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100'
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
                )}

                {isCompleted && (
                  <div className='text-center space-y-4 py-4'>
                    <div className='w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold'>
                      <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className='text-green-800 dark:text-green-300 font-bold text-xl'>Delivery Completed!</div>
                    <p className='text-gray-600 dark:text-gray-400 text-sm max-w-sm mx-auto'>
                      Order #{activeOrder.order._id.slice(-6)} has been successfully verified and completed.
                    </p>
                    <div className='pt-2 flex flex-col gap-2'>
                      <button
                        onClick={handleBackToDashboard}
                        className='w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow flex items-center justify-center gap-2'
                      >
                        <span>Back to Orders / Go to Dashboard</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pt-[100px] pb-16'>
      <div className="max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto">
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100'>Delivery Assignments</h2>
          <button
            onClick={() => {
              fetchAssignments()
              fetchCurrentOrder()
            }}
            className='px-3.5 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition'
          >
            Refresh List
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {assignments.map((a, index) => (
            <div key={a._id || index} className='p-5 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 hover:shadow-md transition flex flex-col justify-between'>
              <div>
                <p className='dark:text-gray-200'><b>Order Id </b> #{a?.order?._id?.slice(-6)}</p>
                <p className='text-gray-600 dark:text-gray-400 mt-2 text-sm'>{a?.order?.address?.fullAddress}</p>
              </div>

              <div className='flex gap-3 mt-6'>
                <button
                  className='flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold transition text-sm'
                  onClick={() => handleAccept(a._id)}
                >
                  Accept
                </button>
                <button
                  className='flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition text-sm'
                  onClick={() => setAssignments(prev => prev.filter(item => item._id !== a._id))}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DeliveryBoyDashboard
