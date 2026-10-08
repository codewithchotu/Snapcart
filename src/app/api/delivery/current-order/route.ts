import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectDb()
        const session = await auth()
        const deliveryBoyId = session?.user?.id
        if (!deliveryBoyId) {
            return NextResponse.json({ active: false }, { status: 200 })
        }

        const assignedRecords = await DeliveryAssignment.find({
            assignedTo: deliveryBoyId,
            status: "assigned"
        }).populate({
            path: "order",
            populate: { path: "address" }
        })

        let activeAssignment: any = null

        for (const record of assignedRecords) {
            const orderObj = record.order as any
            if (!orderObj || orderObj.status === "delivered" || orderObj.status === "completed" || orderObj.status === "cancelled" || orderObj.deliveryOtpVerification === true) {
                // Auto-cleanup stale assignment
                console.log(`[CURRENT-ORDER] Auto-cleaning stale assignment ${record._id}`)
                record.status = "completed"
                record.assignedTo = null
                await record.save()
            } else if (!activeAssignment) {
                activeAssignment = record
            }
        }

        if (!activeAssignment) {
            return NextResponse.json(
                { active: false },
                { status: 200 }
            )
        }

        return NextResponse.json(
            { active: true, assignment: activeAssignment },
            { status: 200 }
        )

    } catch (error) {
        return NextResponse.json(
            { message: `current order error ${error}` },
            { status: 500 }
        )
    }
}