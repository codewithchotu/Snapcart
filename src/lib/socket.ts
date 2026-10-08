import { io, Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = (): Socket => {
    if (!socket) {
        const rawUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER || "https://snapcart-socket-server-28r1.onrender.com"
        const socketUrl = rawUrl.replace(/\/+$/, '')
        socket = io(socketUrl, {
            transports: ["polling", "websocket"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        })

        socket.on("connect", () => {
            console.log("[SOCKET] Connected successfully with socket.id:", socket?.id)
        })

        socket.on("disconnect", (reason) => {
            console.log("[SOCKET] Disconnected, reason:", reason)
            if (reason === "io server disconnect" || reason === "transport close") {
                socket?.connect()
            }
        })

        socket.on("connect_error", (error) => {
            console.error("[SOCKET] Connection error:", error.message)
        })
    }
    if (!socket.connected) {
        socket.connect()
    }
    return socket
}