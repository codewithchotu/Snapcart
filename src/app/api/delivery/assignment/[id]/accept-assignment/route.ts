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
        if (assignment.status !== "brodcasted") {
            return NextResponse.json({ message: "This delivery assignment is no longer available or already taken." }, { status: 400 })
        }

        // Check if delivery boy is already assigned to a DIFFERENT active non-completed order
        const alreadyAssigned = await DeliveryAssignment.findOne({
            _id: { $ne: id },
            assignedTo: deliveryBoyId,
            status: { $nin: ["brodcasted", "completed"] }
        }).populate("order")

        if (alreadyAssigned) {
            const orderStatus = (alreadyAssigned.order as any)?.status
            if (orderStatus === "delivered" || orderStatus === "completed" || orderStatus === "cancelled") {
                // Auto-cleanup stale assignment
                alreadyAssigned.status = "completed"
                alreadyAssigned.assignedTo = null
                await alreadyAssigned.save()
            } else {
                return NextResponse.json({ message: "You are already assigned to another active delivery order." }, { status: 400 })
            }
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

        console.log(`[ACCEPT-ASSIGNMENT] Successfully assigned assignment ${id} to DeliveryBoy ${deliveryBoyId}`)

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