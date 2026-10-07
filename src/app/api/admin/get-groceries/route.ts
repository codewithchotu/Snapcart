import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextResponse } from "next/server";

export async function GET() {
   try {
    await connectDb()
    const session = await auth()
    if (!session || session?.user?.role !== "admin") {
      return NextResponse.json(
        { message: "You are not authorized as admin" },
        { status: 403 }
      )
    }
    const groceries=await Grocery.find({})
    return NextResponse.json(groceries,{status:200})
   } catch (error) {
     return NextResponse.json({message:`get groceries error ${error}`},{status:500})
   } 
}