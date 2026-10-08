import { auth } from "@/auth";
import connectDb from "@/lib/db";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import { NextResponse } from "next/server";

export async function GET() {
    try {
       await connectDb()
       const session = await auth()
       if (!session?.user?.id) {
           return NextResponse.json([], { status: 200 })
       }

       const deliveryBoyId = session.user.id

       // Fetch all broadcasted assignments not rejected by this delivery boy
       const assignments = await DeliveryAssignment.find({
           status: "brodcasted",
           rejectedBy: { $ne: deliveryBoyId }
       }).populate("order").sort({ createdAt: -1 })
       
       const validAssignments = Array.isArray(assignments) 
           ? assignments.filter((a: any) => a && a.order)
           : []

       return NextResponse.json(
           validAssignments,
           { status: 200 }
       )
    } catch (error) {
        console.error("get-assignments error:", error)
        return NextResponse.json([], { status: 500 })
    }
}