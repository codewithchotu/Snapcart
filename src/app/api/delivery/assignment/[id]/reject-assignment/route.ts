import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: any) {
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

        // Persist rejection on database: add deliveryBoyId to rejectedBy, pull from brodcastedTo
        await DeliveryAssignment.findByIdAndUpdate(id, {
            $addToSet: { rejectedBy: deliveryBoyId },
            $pull: { brodcastedTo: deliveryBoyId }
        })

        console.log(`[DELIVERY-REJECT] Assignment ${id} rejected by DeliveryBoy ${deliveryBoyId}`)

        return NextResponse.json({ success: true, message: "Assignment rejected successfully" }, { status: 200 })
    } catch (error: any) {
        console.error("[DELIVERY-REJECT] Error rejecting assignment:", error?.message || error)
        return NextResponse.json({ message: `Reject assignment error: ${error?.message || error}` }, { status: 500 })
    }
}

export async function GET(req: NextRequest, context: any) {
    return POST(req, context)
}
