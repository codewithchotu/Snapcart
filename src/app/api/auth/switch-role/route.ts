import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { targetRole } = await req.json();
    if (!targetRole) {
      return NextResponse.json({ message: "Target role is required" }, { status: 400 });
    }

    const normalizedEmail = session.user.email.toLowerCase().trim();
    const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");

    const targetUser = await User.findOne({ email: safeRegex, role: targetRole }).select("-password");

    if (!targetUser) {
      return NextResponse.json({ message: `No account found with role: ${targetRole}` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        mobile: targetUser.mobile,
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error("[SWITCH-ROLE] Error:", error);
    return NextResponse.json({ message: `Error switching role: ${error.message}` }, { status: 500 });
  }
}
