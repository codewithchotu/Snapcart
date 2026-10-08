import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");
    const users = await User.find({ email: safeRegex }).select("role name email _id");

    const roles = Array.from(new Set(users.map((u) => u.role)));

    return NextResponse.json({
      exists: users.length > 0,
      count: users.length,
      roles,
      hasMultipleRoles: roles.length > 1,
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    }, { status: 200 });
  } catch (error: any) {
    console.error("[CHECK-ROLES] Error:", error);
    return NextResponse.json({ message: `Error checking roles: ${error.message}` }, { status: 500 });
  }
}
