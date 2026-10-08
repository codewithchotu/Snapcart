import { auth } from "@/auth";
import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: any) {
    try {
        await connectDb()
        const { id } = await context.params
        const session = await auth()
        const deliveryBoyId = session?.user?.id
        if (!deliveryBoyId) {
            return NextResponse.json({ message: "Unauthorized. Please log in as a delivery partner." }, { status: 401 })
        }

        const assignment = await DeliveryAssignment.findById(id)
        if (!assignment) {
            return NextResponse.json({ message: "Delivery assignment not found" }, { status: 404 })
        }

        // If this assignment is already assigned to THIS delivery boy, return success immediately
        if (assignment.status === "assigned" && String(assignment.assignedTo) === String(deliveryBoyId)) {
            await assignment.populate({ path: "order", populate: { path: "address" } })
            console.log(`[ACCEPT] deliveryBoyId: ${deliveryBoyId}`)
            console.log(`[ACCEPT] assignmentId: ${id}`)
            console.log(`[ACCEPT] existingActiveAssignment: ${id}`)
            console.log(`[ACCEPT] final assignment status: ${assignment.status}`)
            console.log(`[ACCEPT] final order status: ${(assignment.order as any)?.status}`)

            return NextResponse.json({
                success: true,
                message: "Order already accepted by you",
                assignment
            }, { status: 200 })
        }

        if (assignment.status !== "brodcasted") {
            return NextResponse.json({ message: "This delivery assignment is no longer available or already taken." }, { status: 400 })
        }

        // Check if delivery boy is already assigned to a DIFFERENT active in-progress order
        const assignedRecords = await DeliveryAssignment.find({
            _id: { $ne: id },
            assignedTo: deliveryBoyId,
            status: "assigned"
        }).populate("order")

        let existingActiveAssignment: any = null

        for (const record of assignedRecords) {
            const orderObj = record.order as any
            if (!orderObj || orderObj.status === "delivered" || orderObj.status === "completed" || orderObj.status === "cancelled" || orderObj.deliveryOtpVerification === true) {
                // Auto-cleanup stale assignment record
                console.log(`[ACCEPT] Auto-cleaning stale assignment ${record._id} for order status: ${orderObj?.status || 'missing'}`)
                record.status = "completed"
                record.assignedTo = null
                await record.save()
            } else {
                existingActiveAssignment = record
            }
        }

        if (existingActiveAssignment) {
            console.log(`[ACCEPT] deliveryBoyId: ${deliveryBoyId}`)
            console.log(`[ACCEPT] assignmentId: ${id}`)
            console.log(`[ACCEPT] existingActiveAssignment: ${existingActiveAssignment._id}`)
            return NextResponse.json({ message: "You are already assigned to another active delivery order." }, { status: 400 })
        }

        assignment.assignedTo = deliveryBoyId
        assignment.status = "assigned"
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return NextResponse.json({ message: "Order associated with this assignment was not found." }, { status: 404 })
        }
        order.assignedDeliveryBoy = deliveryBoyId
        order.status = "out of delivery"
        await order.save()

        await order.populate("assignedDeliveryBoy")

        await emitEventHandler("order-assigned", { orderId: order._id, assignedDeliveryBoy: order.assignedDeliveryBoy })

        // Remove this delivery boy from broadcast lists of other broadcasted assignments
        await DeliveryAssignment.updateMany(
            {
                _id: { $ne: assignment._id },
                brodcastedTo: deliveryBoyId,
                status: "brodcasted"
            },
            {
                $pull: { brodcastedTo: deliveryBoyId }
            }
        )

        await assignment.populate({ path: "order", populate: { path: "address" } })

        console.log(`[ACCEPT] deliveryBoyId: ${deliveryBoyId}`)
        console.log(`[ACCEPT] assignmentId: ${id}`)
        console.log(`[ACCEPT] existingActiveAssignment: null`)
        console.log(`[ACCEPT] final assignment status: ${assignment.status}`)
        console.log(`[ACCEPT] final order status: ${order.status}`)

        return NextResponse.json({
            success: true,
            message: "Order accepted successfully",
            assignment
        }, { status: 200 })

    } catch (error: any) {
        console.error("Accept assignment error:", error)
        return NextResponse.json({ message: `Accept assignment error: ${error?.message || error}` }, { status: 500 })
    }
}

export async function POST(req: NextRequest, context: any) {
    return GET(req, context)
}