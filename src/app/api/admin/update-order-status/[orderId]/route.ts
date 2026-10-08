import { auth } from "@/auth";
import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string; }>; }) {
    const startTime = Date.now();
    try {
        await connectDb()
        const session = await auth()
        if (!session || session?.user?.role !== "admin") {
          return NextResponse.json(
            { message: "You are not authorized as admin" },
            { status: 403 }
          )
        }
        const { orderId } = await context.params
        const { status } = await req.json()
        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return NextResponse.json(
                { message: "order not found" },
                { status: 400 }
            )
        }
        order.status = status
        let deliveryBoysPayload: any[] = []
        if (status === "out of delivery" && !order.assignment) {
            console.log(`[ADMIN-ORDER] Admin marking order out of delivery for orderId: ${orderId}`)
            const { latitude, longitude } = order.address || {}
            let nearByDeliveryBoys: any[] = []

            if (latitude && longitude) {
                try {
                    nearByDeliveryBoys = await User.find({
                        role: "deliveryBoy",
                        location: {
                            $near: {
                                $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                                $maxDistance: 10000
                            }
                        }
                    }).lean()
                } catch (geoErr) {
                    console.warn("[ADMIN-ORDER] Geo query error, falling back to all delivery boys:", geoErr)
                }
            }

            const nearByIds = nearByDeliveryBoys.map((b) => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }
            }).distinct("assignedTo")
            const busyIdSet = new Set(busyIds.map(b => String(b)))
            let availableDeliveryBoys = nearByDeliveryBoys.filter(
                b => !busyIdSet.has(String(b._id))
            )

            // Fallback: If no delivery boys found in 10km radius (e.g. testing coordinates [0,0] or outside radius)
            if (availableDeliveryBoys.length === 0) {
                console.log("[ADMIN-ORDER] No nearby non-busy delivery boys found within 10km. Searching all registered delivery boys...")
                const allBoys = await User.find({ role: "deliveryBoy" }).lean()
                const allIds = allBoys.map(b => b._id)
                const allBusyIds = await DeliveryAssignment.find({
                    assignedTo: { $in: allIds },
                    status: { $nin: ["brodcasted", "completed"] }
                }).distinct("assignedTo")
                const allBusySet = new Set(allBusyIds.map(b => String(b)))
                availableDeliveryBoys = allBoys.filter(b => !allBusySet.has(String(b._id)))

                // If STILL none available because of stale test assignments, include all registered delivery boys
                if (availableDeliveryBoys.length === 0 && allBoys.length > 0) {
                    console.log("[ADMIN-ORDER] All delivery boys are marked busy. Falling back to all registered delivery boys for dispatch.")
                    availableDeliveryBoys = allBoys
                }
            }

            const candidates = availableDeliveryBoys.map(b => b._id)

            if (candidates.length === 0) {
                await order.save()

                await emitEventHandler("order-status-update", { orderId: order._id, status: order.status })

                return NextResponse.json(
                    { message: "there is no available Delivery boys" },
                    { status: 200 }
                )
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order._id,
                brodcastedTo: candidates,
                status: "brodcasted"
            })

            await deliveryAssignment.populate("order");
            console.log(`[PERF-LOG] Created assignment ${deliveryAssignment._id} in ${Date.now() - startTime}ms. Emitting to ${availableDeliveryBoys.length} boys.`)

            // Parallelize socket emissions targeting both socketId and userId
            await Promise.all(
                availableDeliveryBoys.map(async (boy) => {
                    console.log(`[ADMIN-ORDER] Target delivery boy userId: ${boy._id}`)
                    console.log(`[ADMIN-ORDER] Target socket.id: ${boy.socketId || "N/A"}`)
                    return emitEventHandler("new-assignment", deliveryAssignment, boy.socketId || undefined, String(boy._id))
                })
            )

            order.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableDeliveryBoys.map(b => ({
                id: b._id,
                name: b.name,
                mobile: b.mobile,
                latitude: b.location?.coordinates?.[1] || 0,
                longitude: b.location?.coordinates?.[0] || 0
            }))
        }

        await order.save()
        await order.populate("user")
        await emitEventHandler("order-status-update", { orderId: order._id, status: order.status })

        console.log(`[PERF-LOG] update-order-status total duration: ${Date.now() - startTime}ms`)

        return NextResponse.json({
            assignment: order.assignment?._id,
            availableBoys: deliveryBoysPayload
        }, { status: 200 })

    } catch (error) {
        return NextResponse.json({
            message: `update status error ${error}`
        }, { status: 500 })
    }
}