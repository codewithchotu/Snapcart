import axios from 'axios'

async function emitEventHandler(event: string, data: any, socketId?: string, userId?: string) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER || process.env.SOCKET_SERVER || "https://snapcart-socket-server-28r1.onrender.com"
    const socketServerUrl = rawUrl.replace(/\/+$/, '')
    console.log(`[EMIT] Notification event emitted: '${event}' to target socketId: ${socketId || 'N/A'}, userId: ${userId || 'N/A'}`)
    await axios.post(
      `${socketServerUrl}/notify`,
      { socketId, userId, event, data },
      { timeout: 8000 }
    )
  } catch (error: any) {
    console.error("[EMIT] emitEventHandler error:", error?.response?.data || error?.message || error)
  }
}

export default emitEventHandler
