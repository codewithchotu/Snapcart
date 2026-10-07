'use client'
import { getSocket } from '@/lib/socket'
import React, { useEffect } from 'react'

function GeoUpdater({ userId }: { userId: string }) {
    useEffect(() => {
        if (!userId) return
        const socket = getSocket()

        const sendIdentity = () => {
            if (userId) {
                socket.emit("identity", userId)
            }
        }

        sendIdentity()
        socket.on("connect", sendIdentity)

        if (!navigator.geolocation) return
        const watcher = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            socket.emit("update-location", {
                userId,
                latitude: lat,
                longitude: lon
            })
        }, (err) => {
            console.log(err)
        }, { enableHighAccuracy: true })

        return () => {
            socket.off("connect", sendIdentity)
            navigator.geolocation.clearWatch(watcher)
        }
    }, [userId])

    return null
}

export default GeoUpdater
