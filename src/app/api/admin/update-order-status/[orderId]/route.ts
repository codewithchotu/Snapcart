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
            const { latitude, longitude } = order.address
            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 10000
                    }
                }
            }).lean()

            const nearByIds = nearByDeliveryBoys.map((b) => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }
            }).distinct("assignedTo")
            const busyIdSet = new Set(busyIds.map(b => String(b)))
            const availableDeliveryBoys = nearByDeliveryBoys.filter(
                b => !busyIdSet.has(String(b._id))
            )
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

            // Parallelize socket emissions without extra User.findById queries
            await Promise.all(
                availableDeliveryBoys.map(async (boy) => {
                    if (boy.socketId) {
                        return emitEventHandler("new-assignment", deliveryAssignment, boy.socketId)
                    }
                })
            )

            order.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableDeliveryBoys.map(b => ({
                id: b._id,
                name: b.name,
                mobile: b.mobile,
                latitude: b.location.coordinates[1],
                longitude: b.location.coordinates[0]
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