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
            // Allow all requests to ensure socket connectivity across environments
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

    socket.on("identity", async (userId) => {
        try {
            console.log("[SOCKET-SERVER] Identity received for userId:", userId, "with socket.id:", socket.id)

            const uid = String(userId)
            if (!userSockets.has(uid)) {
                userSockets.set(uid, new Set())
            }
            userSockets.get(uid).add(socket.id)
            socketUser.set(socket.id, uid)
            socket.join(uid)

            const response = await axios.post(
                `${NEXT_BASE_URL}/api/socket/connect`,
                {
                    userId,
                    socketId: socket.id
                },
                { timeout: 8000 }
            )

            console.log("[SOCKET-SERVER] Connect API response for userId:", userId, response.data)
        } catch (error) {
            console.error("[SOCKET-SERVER] Connect API failed for userId:", userId, error?.response?.data || error?.message)
        }
    })

    socket.on("update-location", async ({ userId, latitude, longitude }) => {
        try {
            const location = {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            }
            await axios.post(
                `${NEXT_BASE_URL}/api/socket/update-location`,
                { userId, location },
                { timeout: 8000 }
            )
            io.emit("update-deliveryBoy-location", { userId, location })
        } catch (error) {
            console.error("[SOCKET-SERVER] update-location failed:", error?.message)
        }
    })

    socket.on("join-room", (roomId) => {
        console.log("[SOCKET-SERVER] Socket", socket.id, "joined room:", roomId)
        socket.join(roomId)
    })

    socket.on("send-message", async (message) => {
        try {
            console.log("[SOCKET-SERVER] Chat message:", message?.roomId)
            await axios.post(`${NEXT_BASE_URL}/api/chat/save`, message, { timeout: 8000 })
            io.to(message.roomId).emit("send-message", message)
        } catch (error) {
            console.error("[SOCKET-SERVER] send-message failed:", error?.message)
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
    console.log("[NOTIFY] Received notify request:", {
        event,
        targetSocketId: socketId || "N/A",
        targetUserId: userId || "N/A"
    })

    let emitted = false

    // 1. If socketId provided, emit to specific socket
    if (socketId) {
        io.to(socketId).emit(event, data)
        console.log(`[NOTIFY] Emitted event '${event}' directly to socketId: ${socketId}`)
        emitted = true
    }

    // 2. If userId provided, emit to user's room and any mapped sockets
    if (userId) {
        const uid = String(userId)
        io.to(uid).emit(event, data)
        const mappedSockets = userSockets.get(uid)
        if (mappedSockets && mappedSockets.size > 0) {
            mappedSockets.forEach((sid) => io.to(sid).emit(event, data))
            console.log(`[NOTIFY] Emitted event '${event}' to ${mappedSockets.size} active socket(s) for userId: ${uid}`)
        } else {
            console.log(`[NOTIFY] Emitted event '${event}' to room for userId: ${uid}`)
        }
        emitted = true
    }

    // 3. Fallback: broadcast to all sockets
    if (!emitted) {
        io.emit(event, data)
        console.log(`[NOTIFY] Broadcasted event '${event}' to all sockets`)
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