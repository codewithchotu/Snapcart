import connectDb from "@/lib/db";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req:NextRequest) {
    try {
      await connectDb()
      const {name,email,password}=await req.json()
    const existUser=await User.findOne({email})
    if(existUser){
        return NextResponse.json(
            {message:"email already exist!"},
            {status:400}
        )
    }
   if(password.length<6){
    return NextResponse.json(
            {message:"password must be at least 6 characters"},
            {status:400}
        )
   }

   const hashedPassword = await bcrypt.hash(password, 10)
   const normalizedEmail = email.toLowerCase().trim()

   // Check if Super Admin invited this email to manage any Kirana store
   const Store = (await import("@/models/store.model")).default
   const matchingStores = await Store.find({ pendingAdminEmails: normalizedEmail })

   const isAssignedKiranaAdmin = matchingStores.length > 0
   const role = isAssignedKiranaAdmin ? "admin" : "user"

   const user = await User.create({
     name,
     email: normalizedEmail,
     password: hashedPassword,
     role,
     managedStores: matchingStores.map(s => s._id)
   })

   // Link new user to matching stores and remove from pendingAdminEmails
   if (isAssignedKiranaAdmin) {
     for (const st of matchingStores) {
       st.assignedAdmins = st.assignedAdmins || []
       st.assignedAdmins.push(user._id)
       st.pendingAdminEmails = (st.pendingAdminEmails || []).filter((e: string) => e !== normalizedEmail)
       await st.save()
     }
   }

   return NextResponse.json(
     user,
     { status: 200 }
   )
        
    } catch (error) {
         return NextResponse.json(
            {message:`register error ${error}`},
            {status:500}
        )
    }
}
// connect db
// name,email,password frontend
// email check
// password 6 character
//password hash
// user create
