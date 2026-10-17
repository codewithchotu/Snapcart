import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    try {
        await connectDb()
        const session=await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }
        const orders=await Order.find({user:session.user.id}).populate("user assignedDeliveryBoy").sort({createdAt:-1})
        return NextResponse.json(Array.isArray(orders) ? orders : [], {status:200})
        
    } catch (error) {
        console.error("user my-orders error:", error)
        return NextResponse.json({ message: "Failed to fetch orders" }, {status:500})
    }
}