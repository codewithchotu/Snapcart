import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    try {
        await connectDb()
        const session=await auth()
        if (!session?.user?.id) {
            return NextResponse.json([], { status: 200 })
        }
        const orders=await Order.find({user:session.user.id}).populate("user assignedDeliveryBoy").sort({createdAt:-1})
        return NextResponse.json(Array.isArray(orders) ? orders : [], {status:200})
        
    } catch (error) {
        console.error("user my-orders error:", error)
        return NextResponse.json([], {status:500})
    }
}