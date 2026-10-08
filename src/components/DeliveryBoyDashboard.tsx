'use client'
import { getSocket } from '@/lib/socket'
import { IDeliveryAssigment } from '@/models/deliveryAssignment.model'
import { RootState } from '@/redux/store'
import axios from 'axios'
import React, { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import LiveMap from './LiveMap'
import DeliveryChat from './DeliveryChat'
import { Loader, ArrowLeft, CheckCircle2, Bell, Volume2 } from 'lucide-react'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ILocation {
  latitude: number,
  longitude: number
}

function DeliveryBoyDashboard({ earning }: { earning: number }) {
  const [assignments, setAssignments] = useState<any[]>([])
  const { userData } = useSelector((state: RootState) => state.user)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'assignments' | 'earnings'>('assignments')
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [sendOtpLoading, setSendOtpLoading] = useState(false)
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectedIds, setRejectedIds] = useState<string[]>([])
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
  const [notificationToast, setNotificationToast] = useState<{ show: boolean; message: string; assignmentId?: string } | null>(null)

  // Web Audio API chime sound generator
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      // Dual tone chime (D5 -> A5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
      gain1.gain.setValueAtTime(0.4, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start()
      osc1.stop(ctx.currentTime + 0.6)
    } catch (e) {
      console.log("[AUDIO] Play sound error:", e)
    }
  }, [])

  // Request native browser notifications permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  const mergeAssignments = useCallback((incoming: any) => {
    setAssignments((prev) => {
      const currentArr = Array.isArray(prev) ? prev : []
      const map = new Map<string, any>()

      // Preserve existing assignments
      currentArr.forEach((item) => {
        if (item && typeof item === 'object') {
          const id = String(item._id || item.id || '')
          const isRejectedByMe = Array.isArray(item.rejectedBy) && item.rejectedBy.some((r: any) => String(r) === String(userData?._id))
          if (id && !rejectedIds.includes(id) && !isRejectedByMe) {
            map.set(id, item)
          }
        }
      })

      // Normalize incoming payload into array
      let rawList: any[] = []
      if (Array.isArray(incoming)) {
        rawList = incoming
      } else if (incoming && typeof incoming === 'object') {
        if (Array.isArray(incoming.data)) {
          rawList = incoming.data
        } else if (Array.isArray(incoming.assignments)) {
          rawList = incoming.assignments
        } else {
          rawList = [incoming]
        }
      }

      rawList.forEach((item) => {
        const target = item?.assignment || item?.data || item
        if (target && typeof target === 'object') {
          const id = String(target._id || target.id || '')
          const isRejectedByMe = Array.isArray(target.rejectedBy) && target.rejectedBy.some((r: any) => String(r) === String(userData?._id))
          if (id && !rejectedIds.includes(id) && !isRejectedByMe) {
            const existingItem = map.get(id) || {}
            map.set(id, { ...existingItem, ...target })
          }
        }
      })

      return Array.from(map.values())
    })
  }, [rejectedIds, userData?._id])

  const fetchAssignments = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/get-assignments")
      const rawData = result?.data
      const serverList = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.data)
          ? rawData.data
          : Array.isArray(rawData?.assignments)
            ? rawData.assignments
            : null

      if (serverList !== null && Array.isArray(serverList)) {
        setAssignments((prev) => {
          const currentArr = Array.isArray(prev) ? prev : []
          const map = new Map<string, any>()

          // 1. Preserve existing assignments in local state (excluding rejected)
          currentArr.forEach((item) => {
            if (item && typeof item === 'object') {
              const id = String(item._id || item.id || '')
              const isRejectedByMe = Array.isArray(item.rejectedBy) && item.rejectedBy.some((r: any) => String(r) === String(userData?._id))
              if (id && !rejectedIds.includes(id) && !isRejectedByMe) {
                map.set(id, item)
              }
            }
          })

          // 2. Merge server assignments (excluding rejected)
          serverList.forEach((item: any) => {
            if (item && typeof item === 'object') {
              const id = String(item._id || item.id || '')
              const isRejectedByMe = Array.isArray(item.rejectedBy) && item.rejectedBy.some((r: any) => String(r) === String(userData?._id))
              if (id && !rejectedIds.includes(id) && !isRejectedByMe) {
                const existingItem = map.get(id) || {}
                map.set(id, { ...existingItem, ...item })
              }
            }
          })

          return Array.from(map.values())
        })
      }
    } catch (error) {
      console.error("[DELIVERY-DASHBOARD] fetchAssignments failed:", error)
      // Never wipe state on error
    }
  }, [rejectedIds, userData?._id])

  const fetchCurrentOrder = useCallback(async () => {
    try {
      const result = await axios.get("/api/delivery/current-order")
      if (result.data?.active && result.data?.assignment?.order) {
        const orderId = String(result.data.assignment.order._id)
        if (dismissedOrderIds.includes(orderId)) {
          setActiveOrder(null)
          return
        }
        setActiveOrder(result.data.assignment)
        if (result.data.assignment.order.address) {
          setUserLocation({
            latitude: Number(result.data.assignment.order.address.latitude || 0),
            longitude: Number(result.data.assignment.order.address.longitude || 0)
          })
        }
      } else {
        setActiveOrder(null)
      }
    } catch (error) {
      console.error("[DELIVERY-DASHBOARD] fetchCurrentOrder failed:", error)
    }
  }, [dismissedOrderIds])

  // ── Realtime Socket Lifecycle & Multi-Event Push Listeners ─────────────────────
  useEffect(() => {
    if (!userData?._id) return

    const socket = getSocket()

    const triggerAlert = (assignment: any, title = "New Order Assignment!") => {
      playNotificationSound()
      const orderSnippet = assignment?.order?._id ? `#${String(assignment.order._id).slice(-6)}` : ''
      setNotificationToast({
        show: true,
        message: `${title} ${orderSnippet}`,
        assignmentId: assignment?._id
      })

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("🔔 New Order Assignment! 🚚", {
            body: `You have received a new order delivery request ${orderSnippet}`,
            icon: "/favicon.ico"
          })
        } catch (e) {
          console.log("[NOTIFICATION-API] Error:", e)
        }
      }
    }

    const sendIdentity = () => {
      console.log(`[SOCKET] Registering identity for DeliveryBoy ID: ${userData._id}`)
      socket.emit("identity", { userId: userData._id, role: "deliveryBoy" })
      fetchAssignments()
      fetchCurrentOrder()
    }

    const handleNewAssignment = (assignment: any) => {
      console.log(`[SOCKET] Real-time new-assignment received for DeliveryBoy ID: ${userData._id}`, assignment)
      const target = assignment?.assignment || assignment?.data || assignment
      const targetId = String(target?._id || '')
      const isRejectedByMe = Array.isArray(target?.rejectedBy) && target.rejectedBy.some((r: any) => String(r) === String(userData._id))
      
      if (targetId && (rejectedIds.includes(targetId) || isRejectedByMe)) {
        console.log(`[SOCKET] Ignoring assignment ${targetId} because it was rejected by this delivery boy`)
        return
      }

      if (assignment) {
        mergeAssignments([assignment])
        triggerAlert(assignment, "New Delivery Assignment Available!")
        setCurrentView('assignments')
      }
      fetchAssignments()
      fetchCurrentOrder()
    }

    const handleNewOrder = (orderData: any) => {
      console.log("[SOCKET] Real-time new-order received")
      playNotificationSound()
      fetchAssignments()
    }

    const handleOrderAssigned = (data: any) => {
      console.log("[SOCKET] Real-time order-assigned received")
      fetchAssignments()
      fetchCurrentOrder()
    }

    const handleStatusUpdate = (data: any) => {
      console.log("[SOCKET] Real-time order-status-update received")
      fetchAssignments()
      fetchCurrentOrder()
    }

    if (socket.connected) {
      sendIdentity()
    }

    socket.on("connect", sendIdentity)
    socket.on("new-assignment", handleNewAssignment)
    socket.on("new-order", handleNewOrder)
    socket.on("order-assigned", handleOrderAssigned)
    socket.on("order-status-update", handleStatusUpdate)

    return () => {
      socket.off("connect", sendIdentity)
      socket.off("new-assignment", handleNewAssignment)
      socket.off("new-order", handleNewOrder)
      socket.off("order-assigned", handleOrderAssigned)
      socket.off("order-status-update", handleStatusUpdate)
    }
  }, [userData?._id, fetchAssignments, fetchCurrentOrder, playNotificationSound, mergeAssignments, rejectedIds])

  // 10-second background polling heartbeat (zero-miss fallback for mobile/Vercel)
  useEffect(() => {
    if (!userData?._id) return
    const interval = setInterval(() => {
      fetchAssignments()
      fetchCurrentOrder()
    }, 10000)
    return () => clearInterval(interval)
  }, [userData?._id, fetchAssignments, fetchCurrentOrder])

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

  // Initial DB fetch once userData is ready
  useEffect(() => {
    if (userData?._id) {
      fetchCurrentOrder()
      fetchAssignments()
    }
  }, [userData?._id, fetchCurrentOrder, fetchAssignments])

  // Re-fetch assignments when page becomes visible again (tab switch, browser back)
  useEffect(() => {
    if (!userData?._id) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAssignments()
        fetchCurrentOrder()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [userData?._id, fetchAssignments, fetchCurrentOrder])

  const handleAccept = async (id: string) => {
    try {
      setAcceptingId(id)
      console.log(`[DELIVERY-DASHBOARD] Accepting assignment ID: ${id}`)
      const res = await axios.get(`/api/delivery/assignment/${id}/accept-assignment`)
      console.log("[DELIVERY-DASHBOARD] Accept assignment response:", res.data)

      if (res.data?.success && res.data?.assignment) {
        const acceptedAssignment = res.data.assignment
        setActiveOrder(acceptedAssignment)
        if (acceptedAssignment.order?.address) {
          setUserLocation({
            latitude: Number(acceptedAssignment.order.address.latitude || 0),
            longitude: Number(acceptedAssignment.order.address.longitude || 0)
          })
        }
        setAssignments((prev) => (Array.isArray(prev) ? prev : []).filter((a) => String(a._id) !== String(id)))
        setCurrentView('assignments')
      }
      await fetchCurrentOrder()
    } catch (error: any) {
      console.error("[DELIVERY-DASHBOARD] Accept assignment error:", error?.response?.data || error?.message)
      alert(error?.response?.data?.message || "Failed to accept assignment. Please try again.")
    } finally {
      setAcceptingId(null)
    }
  }

  const handleReject = async (id: string) => {
    try {
      console.log(`[DELIVERY-DASHBOARD] Rejecting assignment ID: ${id}`)
      setRejectedIds((prev) => [...prev, String(id)])
      setAssignments((prev) => (Array.isArray(prev) ? prev : []).filter((item) => String(item._id) !== String(id)))
      await axios.post(`/api/delivery/assignment/${id}/reject-assignment`)
    } catch (error: any) {
      console.error("[DELIVERY-DASHBOARD] Reject assignment error:", error?.response?.data || error?.message)
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
      const isCompleted = activeOrder?.order?.deliveryOtpVerification || activeOrder?.order?.status === "delivered"
      if (isCompleted) {
        const orderId = String(activeOrder.order._id)
        setDismissedOrderIds((prev) => [...prev, orderId])
      }
    }
    setActiveOrder(null)
    setShowOtpBox(false)
    setOtp("")
    setOtpError("")
    setOtpSuccessMessage("")
    setCurrentView('assignments')
    await fetchAssignments()
  }

  if (activeOrder) {
    const isCompleted = activeOrder?.order?.deliveryOtpVerification || activeOrder?.order?.status === "delivered"
    const orderAddress = activeOrder?.order?.address

    return (
      <div className='p-4 pt-[100px] pb-16 min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto'>
          {/* Consistent Top Navigation Header */}
          <div className='flex items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs'>
            <div>
              <h1 className='text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400'>
                {isCompleted ? "Delivery Completed" : "Active Delivery"}
              </h1>
              <p className='text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5'>Order #{String(activeOrder.order._id).slice(-6)}</p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className='px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 text-gray-800 dark:text-gray-100 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 cursor-pointer'
            >
              <ArrowLeft size={16} />
              <span>Back to Orders</span>
            </button>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
            <div className='lg:col-span-7 flex flex-col gap-6'>
              <div className='rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden h-[350px] sm:h-[450px] lg:h-[500px]'>
                <LiveMap userLocation={userLocation} deliveryBoyLocation={deliveryBoyLocation} />
              </div>

              {/* Customer Details Card */}
              <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-md p-6 space-y-4'>
                <div className='flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3'>
                  <h2 className='text-lg font-bold text-gray-800 dark:text-gray-100'>Customer Details</h2>
                  {orderAddress?.mobile && (
                    <a
                      href={`tel:${orderAddress.mobile}`}
                      className='px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs'
                    >
                      <span>📞 Call Customer</span>
                    </a>
                  )}
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-500 dark:text-gray-400 block text-xs font-semibold uppercase'>Customer Name</span>
                    <span className='font-bold text-gray-800 dark:text-gray-200 text-base'>
                      {orderAddress?.fullName || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-500 dark:text-gray-400 block text-xs font-semibold uppercase'>Contact Number</span>
                    <span className='font-bold text-gray-800 dark:text-gray-200 text-base'>
                      {orderAddress?.mobile ? `+91 ${orderAddress.mobile}` : "N/A"}
                    </span>
                  </div>
                  <div className='sm:col-span-2'>
                    <span className='text-gray-500 dark:text-gray-400 block text-xs font-semibold uppercase'>Delivery Address</span>
                    <span className='font-medium text-gray-800 dark:text-gray-200 leading-relaxed block mt-0.5'>
                      {orderAddress?.fullAddress || "No address provided"}
                      {orderAddress?.city ? `, ${orderAddress.city}` : ""}
                      {orderAddress?.pincode ? ` - ${orderAddress.pincode}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Details Card */}
              <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-md p-6 space-y-4'>
                <div className='flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3'>
                  <h2 className='text-lg font-bold text-gray-800 dark:text-gray-100'>Order Details</h2>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                    activeOrder.order?.isPaid
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                  }`}>
                    {activeOrder.order?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'} ({activeOrder.order?.isPaid ? 'Paid' : 'Unpaid'})
                  </span>
                </div>

                {Array.isArray(activeOrder.order?.items) && activeOrder.order.items.length > 0 && (
                  <div className='divide-y divide-gray-100 dark:divide-gray-700 max-h-[200px] overflow-y-auto pr-1'>
                    {activeOrder.order.items.map((item: any, idx: number) => (
                      <div key={idx} className='py-2 flex items-center justify-between text-sm'>
                        <div className='flex items-center gap-3'>
                          {item.image ? (
                            <img src={item.image} alt={item.name} className='w-10 h-10 object-cover rounded-lg border border-gray-100 dark:border-gray-700' />
                          ) : (
                            <div className='w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg'>📦</div>
                          )}
                          <div>
                            <p className='font-semibold text-gray-800 dark:text-gray-200'>{item.name}</p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>{item.quantity} x {item.unit || 'unit'}</p>
                          </div>
                        </div>
                        <span className='font-bold text-gray-800 dark:text-gray-200'>₹{Number(item.price || 0) * (item.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className='flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 font-bold text-base text-gray-900 dark:text-gray-100'>
                  <span>Total Amount</span>
                  <span className='text-green-600 dark:text-green-400 text-lg'>₹{activeOrder.order?.totalAmount || 0}</span>
                </div>
              </div>
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
                      className='w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-center text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-base shadow-xs cursor-pointer'
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
                      className='w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 text-center rounded-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer'
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
                      className='w-full text-xs text-blue-600 hover:underline text-center mt-1 cursor-pointer'
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
                      Order #{String(activeOrder.order._id).slice(-6)} has been successfully verified and completed.
                    </p>
                    <div className='pt-2 flex flex-col gap-2'>
                      <button
                        onClick={handleBackToDashboard}
                        className='w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow flex items-center justify-center gap-2 cursor-pointer'
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

  const todayEarningData = [
    {
      name: "Today",
      earnings: earning || 0,
      deliveries: Math.max(0, Math.floor((earning || 0) / 40))
    }
  ]

  const safeAssignments = Array.isArray(assignments) ? assignments : []

  return (
    <div className='w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pt-[100px] pb-16 relative'>
      {notificationToast?.show && (
        <div className='fixed top-24 right-4 z-999 max-w-md w-full bg-linear-to-r from-green-600 to-green-700 text-white p-4 rounded-2xl shadow-2xl border border-green-400 flex items-center justify-between animate-bounce'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-white/20 rounded-xl'>
              <Bell className='w-6 h-6 text-white animate-pulse' />
            </div>
            <div>
              <div className='font-bold text-sm sm:text-base flex items-center gap-1.5'>
                <span>Realtime Order Alert</span>
                <Volume2 className='w-4 h-4' />
              </div>
              <div className='text-xs sm:text-sm text-green-100'>{notificationToast.message}</div>
            </div>
          </div>
          <button
            onClick={() => setNotificationToast(null)}
            className='text-xs bg-white text-green-800 font-bold px-3 py-1.5 rounded-xl hover:bg-green-100 transition shadow-xs cursor-pointer'
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl xl:max-w-[1550px] 2xl:max-w-[1750px] mx-auto">
        {/* Navigation Tabs Header */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setCurrentView('assignments')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                currentView === 'assignments'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>🚚 Delivery Assignments</span>
              {safeAssignments.length > 0 && (
                <span className='px-2 py-0.5 text-xs bg-white text-green-800 font-bold rounded-full'>
                  {safeAssignments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('earnings')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                currentView === 'earnings'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>📊 Earnings & Graph</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchAssignments()
              fetchCurrentOrder()
            }}
            className='px-3.5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition border border-gray-200 dark:border-gray-600 cursor-pointer'
          >
            Refresh List
          </button>
        </div>

        {currentView === 'earnings' ? (
          <div className='max-w-md mx-auto text-center py-6'>
            <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1'>Today's Performance 📈</h2>
            <p className='text-gray-500 dark:text-gray-400 mb-6 text-sm'>Track your daily earnings and completed deliveries</p>

            <div className='bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl p-6'>
              <h2 className='font-semibold text-green-700 dark:text-green-400 mb-4'>Earnings Breakdown</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={todayEarningData}>
                  <XAxis dataKey="name" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="earnings" name="Earnings (₹)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="deliveries" name="Deliveries" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <p className='mt-6 text-xl font-extrabold text-green-700 dark:text-green-400'>
                ₹{earning || 0} Earned today
              </p>

              <button
                className='mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-semibold transition cursor-pointer shadow-xs'
                onClick={() => {
                  fetchAssignments()
                  fetchCurrentOrder()
                }}
              >
                Refresh Earnings & Orders
              </button>
            </div>
          </div>
        ) : (
          <div>
            {safeAssignments.length === 0 ? (
              <div className='max-w-md mx-auto text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md p-8'>
                <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl mb-4'>
                  🚛
                </div>
                <h3 className='text-xl font-bold text-gray-800 dark:text-gray-100 mb-2'>No Active Deliveries</h3>
                <p className='text-gray-500 dark:text-gray-400 text-sm mb-6'>
                  Stay online to receive new order assignments in real time!
                </p>
                <div className='flex gap-3 justify-center'>
                  <button
                    onClick={() => {
                      fetchAssignments()
                      fetchCurrentOrder()
                    }}
                    className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer'
                  >
                    Check for New Orders
                  </button>
                  <button
                    onClick={() => setCurrentView('earnings')}
                    className='px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer'
                  >
                    View Earnings
                  </button>
                </div>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {safeAssignments.map((a, index) => {
                  const orderObj = a?.order && typeof a.order === 'object' ? a.order : null
                  const orderIdStr = orderObj?._id ? String(orderObj._id) : (a?._id ? String(a._id) : '')
                  const displayOrderId = orderIdStr ? orderIdStr.slice(-6) : 'N/A'
                  const fullAddress = orderObj?.address?.fullAddress || a?.address?.fullAddress || "Address details available upon accepting"
                  const isAccepting = acceptingId === String(a?._id)

                  return (
                    <div key={a?._id || index} className='p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition flex flex-col justify-between'>
                      <div>
                        <div className='flex items-center justify-between mb-3'>
                          <span className='px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-bold rounded-md'>
                            Order #{displayOrderId}
                          </span>
                          <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                            Out for delivery
                          </span>
                        </div>
                        <p className='text-gray-700 dark:text-gray-300 mt-2 text-sm leading-relaxed'>
                          <b>Delivery Address:</b> {fullAddress}
                        </p>
                      </div>

                      <div className='flex gap-3 mt-6'>
                        <button
                          disabled={isAccepting}
                          className='flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 active:scale-95 text-white py-2.5 rounded-xl font-bold transition text-sm shadow-xs cursor-pointer flex items-center justify-center gap-2'
                          onClick={() => a?._id && handleAccept(String(a._id))}
                        >
                          {isAccepting ? (
                            <>
                              <Loader size={16} className='animate-spin text-white' />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            "Accept Delivery"
                          )}
                        </button>
                        <button
                          disabled={isAccepting}
                          className='flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl font-semibold transition text-sm border border-gray-200 dark:border-gray-600 cursor-pointer disabled:opacity-50'
                          onClick={() => a?._id && handleReject(String(a._id))}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryBoyDashboard
