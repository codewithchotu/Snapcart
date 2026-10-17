import { auth } from "@/auth";

import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { isSuperAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
    try {
        await connectDb()
        const session=await auth()
        if (!session?.user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            )
        }
        if (session.user.role !== "admin" && !isSuperAdmin(session.user)) {
            return NextResponse.json(
                { message: "You are not authorized as admin" },
                { status: 403 }
            )
        }
    const {groceryId}=await req.json()
    const grocery=await Grocery.findByIdAndDelete(groceryId)
     return NextResponse.json(
                grocery,
                {status:200}
            )
    } catch (error) {
         return NextResponse.json(
                {message:`delete grocery error ${error}`},
                {status:500}
            )
    }
}


