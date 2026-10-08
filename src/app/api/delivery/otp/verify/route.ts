import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { orderId, otp } = await req.json()

        if (!orderId || otp == null || otp === "") {
            return NextResponse.json(
                { message: "Order ID and OTP are required" },
                { status: 400 }
            )
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return NextResponse.json(
                { message: "Order not found" },
                { status: 404 }
            )
        }

        // Guard: prevent re-verification of already delivered orders
        if (order.deliveryOtpVerification === true || order.status === "delivered") {
            return NextResponse.json(
                { message: "This order has already been delivered and verified." },
                { status: 400 }
            )
        }

        const submittedOtp = otp.toString().trim()
        const expectedOtp = order.deliveryOtp?.toString().trim()

        // Diagnostic: log lengths and char codes (no actual OTP values exposed)
        console.log(`[OTP-VERIFY] orderId=${orderId}`)
        console.log(`[OTP-VERIFY] submitted len=${submittedOtp.length}, expected len=${expectedOtp?.length ?? 'null'}`)
        console.log(`[OTP-VERIFY] submitted codes=[${[...submittedOtp].map(c => c.charCodeAt(0)).join(',')}]`)
        console.log(`[OTP-VERIFY] expected codes=[${expectedOtp ? [...expectedOtp].map(c => c.charCodeAt(0)).join(',') : 'null'}]`)
        console.log(`[OTP-VERIFY] strict equal: ${submittedOtp === expectedOtp}`)

        if (!expectedOtp || submittedOtp !== expectedOtp) {
            return NextResponse.json(
                { message: "Incorrect or expired OTP. Please try again." },
                { status: 400 }
            )
        }

        // Use findByIdAndUpdate with $unset to reliably clear deliveryOtp in MongoDB
        // (Mongoose .save() with null doesn't always unset a String field in the DB)
        await Order.findByIdAndUpdate(orderId, {
            $set: {
                status: "delivered",
                deliveryOtpVerification: true,
                deliveredAt: new Date()
            },
            $unset: { deliveryOtp: "" }
        })

        await emitEventHandler("order-status-update", { orderId: order._id, status: "delivered" })
        await DeliveryAssignment.updateMany(
            { order: orderId },
            { $set: { assignedTo: null, status: "completed" } }
        )

        return NextResponse.json(
            { message: "Delivery successfully completed and verified" },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Verify OTP error:", error?.message || error)
        return NextResponse.json(
            { message: `Verify OTP error: ${error?.message || "Internal server error"}` },
            { status: 500 }
        )
    }
}