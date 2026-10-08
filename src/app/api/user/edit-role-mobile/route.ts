import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest){
    try {
       await connectDb()
       const {role,mobile}=await req.json() 
       const session=await auth()
       if (!session?.user?.email) {
           return NextResponse.json({ message: "unauthorized" }, { status: 401 })
       }
       let user = null
       if (session?.user?.id) {
          user = await User.findByIdAndUpdate(
            session.user.id,
            { role, mobile },
            { new: true }
          )
       }
       if (!user && session?.user?.email) {
          const normalizedEmail = session.user.email.toLowerCase().trim()
          user = await User.findOneAndUpdate(
            { email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") } },
            { role, mobile },
            { new: true }
          )
       }
       if(!user){
        return NextResponse.json(
            {message:"user not found"},
            {status:400}
        )
       }
       return NextResponse.json(
            user,
            {status:200}
        )
    } catch (error) {
         return NextResponse.json(
             {message:`edit role and mobile error ${error}`},
            {status:500}
        )
    }
}