import express from "express"
import http from "http"
import dotenv from "dotenv"
import { Server } from "socket.io"
import axios from "axios"

dotenv.config()

const app = express()
app.use(express.json())

// Express CORS middleware
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    if (req.method === "OPTIONS") {
        return res.sendStatus(200)
    }
    next()
})

const server = http.createServer(app)
const port = process.env.PORT || 5000
const NEXT_BASE_URL = (process.env.NEXT_BASE_URL || "https://snapcart-two-gamma.vercel.app").replace(/\/+$/, "")

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            callback(null, true)
        },
        credentials: true,
        methods: ["GET", "POST"]
    }
})

// In-memory mapping of userId -> Set of socketIds, and socketId -> userId
const userSockets = new Map() // userId (string) -> Set<string>
const socketUser = new Map()  // socketId (string) -> userId (string)

io.on("connection", (socket) => {
    console.log("[SOCKET-SERVER] New socket connected with id:", socket.id)

    socket.on("identity", (data) => {
        try {
            const userId = typeof data === 'object' && data !== null ? data.userId : data
            const role = typeof data === 'object' && data !== null ? data.role : null
            if (!userId) return

            const uid = String(userId)
            console.log("[SOCKET-SERVER] Identity registered for userId:", uid, "role:", role || "N/A", "socket.id:", socket.id)

            if (!userSockets.has(uid)) {
                userSockets.set(uid, new Set())
            }
            userSockets.get(uid).add(socket.id)
            socketUser.set(socket.id, uid)
            
            // Join user-specific room
            socket.join(uid)

            // Join delivery-boys room for instant broadcasts
            if (role === "deliveryBoy" || role === "delivery_boy" || role === "delivery") {
                socket.join("delivery-boys")
                console.log(`[SOCKET-SERVER] Socket ${socket.id} joined 'delivery-boys' room`)
            }

            // Asynchronous DB sync (non-blocking for 0ms latency)
            axios.post(
                `${NEXT_BASE_URL}/api/socket/connect`,
                { userId: uid, socketId: socket.id },
                { timeout: 5000 }
            ).then((res) => {
                console.log("[SOCKET-SERVER] Async DB connect sync completed for userId:", uid)
            }).catch((error) => {
                console.error("[SOCKET-SERVER] Async DB connect sync warning:", error?.message || error)
            })

        } catch (error) {
            console.error("[SOCKET-SERVER] Identity handling error:", error?.message)
        }
    })

    socket.on("update-location", (payload) => {
        try {
            const { userId, latitude, longitude } = payload || {}
            if (!userId || latitude === undefined || longitude === undefined) return

            const location = {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            }
            
            // Immediately broadcast location update
            io.emit("update-deliveryBoy-location", { userId, location })

            // Asynchronous DB update (non-blocking)
            axios.post(
                `${NEXT_BASE_URL}/api/socket/update-location`,
                { userId, location },
                { timeout: 5000 }
            ).catch((err) => {
                console.error("[SOCKET-SERVER] update-location DB sync warning:", err?.message)
            })

        } catch (error) {
            console.error("[SOCKET-SERVER] update-location error:", error?.message)
        }
    })

    socket.on("join-room", (roomId) => {
        if (!roomId) return
        console.log("[SOCKET-SERVER] Socket", socket.id, "joined room:", roomId)
        socket.join(String(roomId))
    })

    socket.on("send-message", (message) => {
        try {
            if (!message?.roomId) return
            console.log("[SOCKET-SERVER] Chat message for room:", message.roomId)
            io.to(message.roomId).emit("send-message", message)

            axios.post(`${NEXT_BASE_URL}/api/chat/save`, message, { timeout: 5000 })
                .catch((err) => console.error("[SOCKET-SERVER] Save chat error:", err?.message))
        } catch (error) {
            console.error("[SOCKET-SERVER] send-message error:", error?.message)
        }
    })

    socket.on("disconnect", (reason) => {
        console.log("[SOCKET-SERVER] Socket disconnected:", socket.id, "reason:", reason)
        const uid = socketUser.get(socket.id)
        if (uid && userSockets.has(uid)) {
            userSockets.get(uid).delete(socket.id)
            if (userSockets.get(uid).size === 0) {
                userSockets.delete(uid)
            }
        }
        socketUser.delete(socket.id)
    })
})

const handleNotify = (req, res) => {
    const { event, data, socketId, userId } = req.body
    const assignmentId = data?._id || data?.assignment?._id || "N/A"
    console.log(`[NOTIFY] Event: '${event}', Selected DeliveryBoy ID: ${userId || 'N/A'}, Socket ID: ${socketId || 'N/A'}, Assignment ID: ${assignmentId}`)

    let emittedCount = 0

    // 1. Emit directly to specific socket if provided
    if (socketId) {
        io.to(socketId).emit(event, data)
        emittedCount++
    }

    // 2. Emit to user room (userId) and mapped socket IDs
    if (userId) {
        const uid = String(userId)
        io.to(uid).emit(event, data)
        const mappedSockets = userSockets.get(uid)
        if (mappedSockets && mappedSockets.size > 0) {
            mappedSockets.forEach((sid) => io.to(sid).emit(event, data))
        }
        emittedCount++
    }

    // 3. For new assignments / new orders, broadcast to delivery-boys room and all sockets
    if (event === "new-assignment" || event === "new-order" || event === "order-assigned") {
        io.to("delivery-boys").emit(event, data)
        io.emit(event, data) // Fallback global broadcast so no delivery boy ever misses an assignment
        emittedCount++
    }

    // 4. Fallback if not handled
    if (emittedCount === 0) {
        io.emit(event, data)
    }

    return res.status(200).json({ success: true, emitted: true })
}

app.post("/notify", handleNotify)
app.post("//notify", handleNotify)

app.get(["/", "/health"], (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        connectedSockets: io.engine.clientsCount,
        activeUsersCount: userSockets.size,
        nextBaseUrl: NEXT_BASE_URL
    })
})

server.listen(port, () => {
    console.log("[SOCKET-SERVER] Server started on port", port)
})