import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/store/assign-admin
// Body: { storeId, email }
export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "superAdmin" && session.user.email !== "mo0322975@gmail.com")) {
      return NextResponse.json({ message: "Only Super Admin can assign Kirana store admins." }, { status: 403 });
    }

    const { storeId, email } = await req.json();
    if (!storeId || !email) {
      return NextResponse.json({ message: "storeId and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    if (user) {
      // User is ALREADY registered: upgrade role immediately
      user.role = "admin";
      if (!user.managedStores) user.managedStores = [];
      if (!user.managedStores.includes(storeId)) {
        user.managedStores.push(storeId);
      }
      await user.save();

      if (!store.assignedAdmins) store.assignedAdmins = [];
      if (!store.assignedAdmins.includes(user._id)) {
        store.assignedAdmins.push(user._id);
      }
      if (store.owner?.toString() === session.user.id) {
        store.owner = user._id;
      }
      // Remove from pending if previously pending
      if (store.pendingAdminEmails) {
        store.pendingAdminEmails = store.pendingAdminEmails.filter((e: string) => e !== normalizedEmail);
      }
      await store.save();

      return NextResponse.json({
        message: `User ${user.name} (${user.email}) is authenticated as Kirana Admin for "${store.name}".`,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        store
      }, { status: 200 });
    } else {
      // User is NOT YET registered: save email to pendingAdminEmails
      if (!store.pendingAdminEmails) store.pendingAdminEmails = [];
      if (!store.pendingAdminEmails.includes(normalizedEmail)) {
        store.pendingAdminEmails.push(normalizedEmail);
      }
      await store.save();

      return NextResponse.json({
        message: `Admin access reserved for ${normalizedEmail}. When they register with this email, they will automatically become Kirana Admin for "${store.name}".`,
        pending: true,
        email: normalizedEmail,
        store
      }, { status: 200 });
    }

    return NextResponse.json({
      message: `User ${user.name} (${user.email}) is now authenticated as Kirana Admin for "${store.name}".`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      store
    }, { status: 200 });

  } catch (error: any) {
    console.error("Assign admin error:", error);
    return NextResponse.json({ message: error?.message || "Failed to assign admin" }, { status: 500 });
  }
}
