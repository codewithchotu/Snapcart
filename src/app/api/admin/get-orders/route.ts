import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Order from "@/models/order.model";
import Store from "@/models/store.model";
import User from "@/models/user.model";
import { isSuperAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user) {
          return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
          )
        }

        const isSuper = isSuperAdmin(session.user)
        if (!isSuper && session.user.role !== "admin") {
          return NextResponse.json(
            { message: "Forbidden" },
            { status: 403 }
          )
        }

        const { searchParams } = new URL(req.url)
        const storeId = searchParams.get("storeId")

        const query: any = {}
        if (isSuper) {
          if (storeId) {
            query.$or = [{ store: storeId }, { "items.store": storeId }]
          }
        } else {
          // Find all stores owned by or assigned to this Kirana admin
          const adminStores = await Store.find({
            $or: [
              { owner: session.user.id },
              { assignedAdmins: session.user.id }
            ]
          }).select("_id")
          const storeIds = adminStores.map(s => s._id)

          if (storeId) {
            const isAuthorized = storeIds.some(id => id.toString() === storeId)
            if (!isAuthorized) {
              return NextResponse.json([], { status: 403 })
            }
            query.$or = [{ store: storeId }, { "items.store": storeId }]
          } else {
            // All orders belonging to any of this admin's stores
            query.$or = [
              { store: { $in: storeIds } },
              { "items.store": { $in: storeIds } },
              { store: { $exists: false } },
              { store: null }
            ]
          }
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