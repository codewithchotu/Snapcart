import axios from 'axios'

async function emitEventHandler(event: string, data: any, socketId?: string, userId?: string) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER || process.env.SOCKET_SERVER || "https://snapcart-socket-server-28r1.onrender.com"
    const socketServerUrl = rawUrl.replace(/\/+$/, '')
    const assignmentId = data?._id || data?.assignment?._id || "N/A"
    console.log(`[EMIT-NOTIFICATION] Event: '${event}', DeliveryBoy ID: ${userId || 'N/A'}, Socket ID: ${socketId || 'N/A'}, Assignment ID: ${assignmentId}`)
    
    await axios.post(
      `${socketServerUrl}/notify`,
      { socketId, userId, event, data },
      { timeout: 4000 }
    )
  } catch (error: any) {
    console.error("[EMIT-NOTIFICATION] emitEventHandler error:", error?.response?.data || error?.message || error)
  }
}

export default emitEventHandler
