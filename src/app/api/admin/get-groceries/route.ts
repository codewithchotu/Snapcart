import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import Store from "@/models/store.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
   try {
    await connectDb()
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "You are not authorized as admin" },
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
      // Check if store belongs to this admin
      const isAuthorized = storeIds.some(id => id.toString() === storeId)
      if (!isAuthorized) {
        return NextResponse.json({ message: "Store not found or unauthorized" }, { status: 403 })
      }
      query.store = storeId
    } else {
      query.store = { $in: storeIds }
    }

    const groceries = await Grocery.find(query).populate("store", "name storeCode").sort({ createdAt: -1 })
    return NextResponse.json(groceries, { status: 200 })
   } catch (error) {
     return NextResponse.json({ message: `get groceries error ${error}` }, { status: 500 })
   } 
}