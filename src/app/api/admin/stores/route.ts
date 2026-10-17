import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import { isSuperAdmin as checkIsSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = checkIsSuperAdmin(session.user);

    if (!isSuperAdmin && session.user.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let stores;
    if (isSuperAdmin) {
      // Super Admin sees ALL stores, with owner and assigned admins populated
      stores = await Store.find({})
        .populate("owner assignedAdmins", "name email role")
        .sort({ createdAt: -1 });
    } else {
      // Kirana Admin sees ONLY their owned or assigned stores
      stores = await Store.find({
        $or: [
          { owner: session.user.id },
          { assignedAdmins: session.user.id }
        ]
      })
      .populate("owner assignedAdmins", "name email role")
      .sort({ createdAt: -1 });
    }

    return NextResponse.json(stores, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Failed to fetch stores" }, { status: 500 });
  }
}
