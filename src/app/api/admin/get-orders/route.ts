import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || session?.user?.role !== "admin") {
          return NextResponse.json(
            [],
            { status: 403 }
          )
        }
        const orders=await Order.find({}).populate("user assignedDeliveryBoy").sort({createdAt:-1})
        return NextResponse.json(
            Array.isArray(orders) ? orders : [],
            {status:200}
        )
    } catch (error) {
         console.error("admin get-orders error:", error)
         return NextResponse.json(
            [],
            {status:500}
        )
    }
}