import { auth } from "@/auth";
import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: any) {
    const startTime = Date.now();
    try {
        await connectDb()
        const session = await auth()
        if (!session || session?.user?.role !== "admin") {
          console.warn("[ADMIN-ORDER] Unauthorized update-order-status attempt")
          return NextResponse.json(
            { message: "You are not authorized as admin" },
            { status: 403 }
          )
        }
        const { orderId } = await context.params
        const { status } = await req.json()

        console.log(`[ADMIN-ORDER] Updating status for orderId: ${orderId} to '${status}'`)

        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return NextResponse.json(
                { message: "Order not found" },
                { status: 404 }
            )
        }

        order.status = status
        let deliveryBoysPayload: any[] = []

        if (status === "delivered" || status === "cancelled") {
            await DeliveryAssignment.updateMany(
                { order: order._id },
                { $set: { status: "completed", assignedTo: null } }
            )
        }

        if (status === "out of delivery") {
            console.log(`[ADMIN-ORDER] Dispatching delivery assignment for orderId: ${orderId}`)
            const { latitude, longitude } = order.address || {}
            
            // Query all registered delivery boys across all role string variations
            const allBoys = await User.find({
                role: { $in: ["deliveryBoy", "delivery_boy", "delivery"] }
            }).lean()
            const allIds = allBoys.map(b => b._id)
            
            // Find busy delivery boys (currently assigned to active non-completed orders)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: allIds },
                status: { $nin: ["brodcasted", "completed"] }
            }).distinct("assignedTo")
            const busyIdSet = new Set(busyIds.map(b => String(b)))
            
            let availableDeliveryBoys = allBoys.filter(b => !busyIdSet.has(String(b._id)))

            // Fallback: If all delivery boys are currently marked busy, include all registered delivery boys
            if (availableDeliveryBoys.length === 0 && allBoys.length > 0) {
                console.log("[ADMIN-ORDER] All delivery boys marked busy, falling back to all registered delivery boys.")
                availableDeliveryBoys = allBoys
            }

            // If coordinates exist, sort nearby delivery boys first
            if (latitude && longitude && availableDeliveryBoys.length > 0) {
                const targetLat = Number(latitude)
                const targetLon = Number(longitude)
                availableDeliveryBoys.sort((a, b) => {
                    const aCoords = a.location?.coordinates || [0, 0]
                    const bCoords = b.location?.coordinates || [0, 0]
                    const distA = Math.hypot(aCoords[0] - targetLon, aCoords[1] - targetLat)
                    const distB = Math.hypot(bCoords[0] - targetLon, bCoords[1] - targetLat)
                    return distA - distB
                })
            }

            let candidates = availableDeliveryBoys.map(b => b._id)
            if (candidates.length === 0 && allIds.length > 0) {
                candidates = allIds
            }

            let deliveryAssignment: any = null
            if (order.assignment) {
                deliveryAssignment = await DeliveryAssignment.findById(order.assignment)
            }

            if (!deliveryAssignment) {
                deliveryAssignment = await DeliveryAssignment.create({
                    order: order._id,
                    brodcastedTo: candidates,
                    status: "brodcasted"
                })
                order.assignment = deliveryAssignment._id
            } else {
                deliveryAssignment.brodcastedTo = candidates
                deliveryAssignment.status = "brodcasted"
                deliveryAssignment.assignedTo = null
                await deliveryAssignment.save()
            }

            await order.save()
            await deliveryAssignment.populate("order")
            
            console.log(`[ADMIN-ORDER] Emitting 'new-assignment' for Assignment ID: ${deliveryAssignment._id}`)

            // Always broadcast new-assignment event globally to all connected delivery boys
            await emitEventHandler("new-assignment", deliveryAssignment)

            // Also target individual delivery boys by socketId / userId if available
            if (availableDeliveryBoys.length > 0) {
                await Promise.all(
                    availableDeliveryBoys.map(async (boy) => {
                        return emitEventHandler("new-assignment", deliveryAssignment, boy.socketId || undefined, String(boy._id))
                    })
                )

                deliveryBoysPayload = availableDeliveryBoys.map(b => ({
                    id: b._id,
                    name: b.name,
                    mobile: b.mobile,
                    latitude: b.location?.coordinates?.[1] || 0,
                    longitude: b.location?.coordinates?.[0] || 0
                }))
            }
        }

        await order.save()
        await order.populate("user")

        // Emit real-time status update event to all subscribers
        await emitEventHandler("order-status-update", { orderId: String(order._id), status: order.status })

        console.log(`[PERF-LOG] update-order-status completed in ${Date.now() - startTime}ms`)

        return NextResponse.json({
            success: true,
            orderId: order._id,
            status: order.status,
            assignment: order.assignment,
            availableBoys: deliveryBoysPayload
        }, { status: 200 })

    } catch (error: any) {
        console.error("[ADMIN-ORDER] Error updating order status:", error?.message || error)
        return NextResponse.json({
            message: `Update status error: ${error?.message || error}`
        }, { status: 500 })
    }
}