import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import Store from "@/models/store.model";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

// GET /api/kirana/my-stores
// Returns the kirana admin's stores along with their groceries
export async function GET() {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await User.findById(session.user.id).lean() as any;

    // Only kirana admins (role === "admin") can access this
    if (!dbUser || dbUser.role !== "admin") {
      return NextResponse.json(
        { message: "Access denied. Only authenticated Kirana Store Admins can access this." },
        { status: 403 }
      );
    }

    // Find stores assigned to this kirana admin
    const stores = await Store.find({
      $or: [
        { owner: session.user.id },
        { assignedAdmins: session.user.id }
      ],
      status: "approved"
    }).lean() as any[];

    // For each store, fetch its groceries
    const storesWithGroceries = await Promise.all(
      stores.map(async (store: any) => {
        const groceries = await Grocery.find({ store: store._id })
          .sort({ createdAt: -1 })
          .lean();
        return { ...store, groceries };
      })
    );

    return NextResponse.json(storesWithGroceries, { status: 200 });
  } catch (error: any) {
    console.error("Kirana my-stores error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to fetch stores" },
      { status: 500 }
    );
  }
}
