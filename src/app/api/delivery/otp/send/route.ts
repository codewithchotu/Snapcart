import connectDb from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { orderId } = await req.json()

        if (!orderId) {
            return NextResponse.json(
                { message: "Order ID is required" },
                { status: 400 }
            )
        }

        // Ensure User model is loaded before populate
        if (!User) {
            console.error("User model not initialized")
        }

        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return NextResponse.json(
                { message: "Order not found" },
                { status: 404 }
            )
        }

        const userEmail = order.user?.email
        if (!userEmail) {
            return NextResponse.json(
                { message: "Customer email not found for this order" },
                { status: 400 }
            )
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString()

        // Use findByIdAndUpdate to reliably persist the OTP in MongoDB
        // (avoids Mongoose .save() caching issues)
        await Order.findByIdAndUpdate(orderId, {
            $set: { deliveryOtp: otp }
        })

        // Diagnostic: re-read and confirm the OTP was saved correctly
        const savedOrder = await Order.findById(orderId).select('deliveryOtp')
        const savedOtp = savedOrder?.deliveryOtp?.toString().trim()
        console.log(`[OTP-SEND] Generated len=${otp.length}, Saved len=${savedOtp?.length ?? 'null'}, Match=${savedOtp === otp}`)

        const orderShortId = order._id.toString().slice(-6)
        const userName = order.user?.name || "Valued Customer"

        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e5e7eb; rounded: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #16a34a; margin: 0; font-size: 28px;">Snapcart</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Grocery Delivery Confirmation</p>
            </div>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #374151; font-size: 15px; margin: 0 0 12px;">Hello <strong>${userName}</strong>,</p>
                <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Your delivery partner is arriving for Order <strong>#${orderShortId}</strong>. Please share this OTP to complete delivery:</p>
                <div style="background-color: #ffffff; border: 2px dashed #16a34a; border-radius: 8px; display: inline-block; padding: 12px 32px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #15803d; margin: 8px 0;">
                    ${otp}
                </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                If you did not request this delivery, please contact Snapcart support immediately.
            </p>
        </div>
        `

        await sendMail(
            userEmail,
            `Your Snapcart Delivery OTP for Order #${orderShortId}`,
            emailHtml
        )

        return NextResponse.json(
            { message: "OTP sent successfully to registered customer email" },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Send OTP error:", error?.message || error)
        return NextResponse.json(
            { message: `Send OTP error: ${error?.message || "Internal server error"}` },
            { status: 500 }
        )
    }
}