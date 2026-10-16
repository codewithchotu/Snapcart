import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import Store from "@/models/store.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.id || session.user.role !== "admin") {
          return NextResponse.json(
            [],
            { status: 403 }
          )
        }

        const { searchParams } = new URL(req.url)
        const storeId = searchParams.get("storeId")

        // Find all stores owned by or assigned to this Kirana admin
        const adminStores = await Store.find({
          $or: [
            { owner: session.user.id },
            { assignedAdmins: session.user.id }
          ]
        }).select("_id")
        const storeIds = adminStores.map(s => s._id)

        const query: any = {}
        if (storeId) {
          const isAuthorized = storeIds.some(id => id.toString() === storeId)
          if (!isAuthorized) {
            return NextResponse.json([], { status: 403 })
          }
          query.$or = [{ store: storeId }, { "items.store": storeId }]
        } else {
          // All orders belonging to any of this admin's stores
          // Also include legacy orders that don't have a store attached if admin has stores
          query.$or = [
            { store: { $in: storeIds } },
            { "items.store": { $in: storeIds } },
            { store: { $exists: false } },
            { store: null }
          ]
        }

        const orders = await Order.find(query)
          .populate("user assignedDeliveryBoy store")
          .sort({ createdAt: -1 })

        return NextResponse.json(
            Array.isArray(orders) ? orders : [],
            { status: 200 }
        )
    } catch (error) {
         console.error("admin get-orders error:", error)
         return NextResponse.json(
            [],
            { status: 500 }
        )
    }
}