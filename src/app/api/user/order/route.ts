import connectDb from "@/lib/db";
import emitEventHandler from "@/lib/emitEventHandler";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { userId, items, paymentMethod, totalAmount, address } = await req.json()
        if (!items || !userId || !paymentMethod || !totalAmount || !address) {
            return NextResponse.json(
                { message: "please send all credentials" },
                { status: 400 }
            )
        }
        const user = await User.findById(userId)
        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 400 }
            )
        }

        const groceryIds = items.map((i: any) => i.grocery)
        const dbGroceries = await (await import("@/models/grocery.model")).default.find({ _id: { $in: groceryIds } }).select("_id store")
        const groceryStoreMap = new Map(dbGroceries.map(g => [g._id.toString(), g.store]))

        const enrichedItems = items.map((i: any) => ({
            ...i,
            store: i.store || groceryStoreMap.get(i.grocery?.toString())
        }))

        // Order primary store (from first item or explicitly passed)
        const primaryStore = enrichedItems.find((i: any) => i.store)?.store || null

        const newOrder = await Order.create({
            user: userId,
            store: primaryStore,
            items: enrichedItems,
            paymentMethod,
            totalAmount,
            address
        })

        await emitEventHandler("new-order", newOrder)

        return NextResponse.json(
            newOrder,
            { status: 201 }
        )

    } catch (error) {
 return NextResponse.json(
                {message:`place order error ${error}`},
                {status:500}
            )
    }
}