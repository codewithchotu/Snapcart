import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || !session.user) {
            return NextResponse.json(
                { message: "user is not authenticated" },
                { status: 400 }
            )
        }

        let user = null
        if (session.user.id) {
            user = await User.findById(session.user.id).select("-password")
        }
        if (!user && session.user.email) {
            const normalizedEmail = session.user.email.toLowerCase().trim()
            const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
            if (session.user.role) {
                user = await User.findOne({ email: safeRegex, role: session.user.role }).select("-password")
            }
            if (!user) {
                user = await User.findOne({ email: safeRegex }).select("-password")
            }
        }

        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 400 }
            )
        }

        const normalizedEmail = user.email.toLowerCase().trim()
        const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")
        const allAccounts = await User.find({ email: safeRegex }).select("role _id name")
        const availableRoles = Array.from(new Set(allAccounts.map(a => a.role)))

        const userObj = user.toObject()
        userObj.availableRoles = availableRoles

        return NextResponse.json(
            userObj,
            { status: 200 }
        )

    } catch (error) {
        return NextResponse.json(
            { message: `get me error : ${error}` },
            { status: 500 }
        )
    }
}