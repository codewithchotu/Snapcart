import { io, Socket } from "socket.io-client"

let socket: Socket | null = null
let hasLoggedConnectError: boolean = false

export const getSocket = (): Socket => {
    if (!socket) {
        const rawUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER || "https://snapcart-socket-server-28r1.onrender.com"
        const socketUrl = rawUrl.replace(/\/+$/, '')
        socket = io(socketUrl, {
            transports: ["polling", "websocket"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
        })

        socket.on("connect", () => {
            hasLoggedConnectError = false
            console.log("[SOCKET] Connected:", socket?.id)
        })

        socket.on("disconnect", (reason) => {
            if (reason === "io server disconnect") {
                socket?.connect()
            }
        })

        socket.on("connect_error", (error) => {
            if (!hasLoggedConnectError) {
                console.error("[SOCKET] Connection error:", error.message)
                hasLoggedConnectError = true
            }
        })
    }

    // Only call connect() if completely idle (not connected AND not already connecting)
    if (!socket.connected && !socket.active) {
        socket.connect()
    }

    return socket
}