'use client'
import { getSocket } from '@/lib/socket'
import React, { useEffect } from 'react'

function GeoUpdater({ userId }: { userId: string }) {
    useEffect(() => {
        if (!userId) return
        const socket = getSocket()

        const sendIdentity = () => {
            if (userId) {
                console.log("[SOCKET] Emitting identity event with userId:", userId, "socket.id:", socket.id)
                socket.emit("identity", userId)
            }
        }

        sendIdentity()
        socket.on("connect", sendIdentity)

        if (!navigator.geolocation) return

        const handlePos = (pos: GeolocationPosition) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            socket.emit("update-location", {
                userId,
                latitude: lat,
                longitude: lon
            })
        }

        navigator.geolocation.getCurrentPosition(
            handlePos,
            (err) => console.log("[GEO] GeoUpdater getCurrentPosition:", err.message),
            { enableHighAccuracy: true }
        )

        const watcher = navigator.geolocation.watchPosition(
            handlePos,
            (err) => console.log("[GEO] GeoUpdater watchPosition:", err.message),
            { enableHighAccuracy: true }
        )

        return () => {
            socket.off("connect", sendIdentity)
            navigator.geolocation.clearWatch(watcher)
        }
    }, [userId])

    return null
}

export default GeoUpdater
