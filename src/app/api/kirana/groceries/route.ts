import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import Store from "@/models/store.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/kirana/groceries?groceryId=xxx
export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await User.findById(session.user.id).lean() as any;
    if (!dbUser || dbUser.role !== "admin") {
      return NextResponse.json({ message: "Only Kirana Admins can delete groceries." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const groceryId = searchParams.get("groceryId");

    if (!groceryId) {
      return NextResponse.json({ message: "groceryId is required" }, { status: 400 });
    }

    const grocery = await Grocery.findById(groceryId);
    if (!grocery) {
      return NextResponse.json({ message: "Grocery not found" }, { status: 404 });
    }

    // Confirm this admin manages the store this grocery belongs to
    const store = await Store.findOne({
      _id: grocery.store,
      $or: [
        { owner: session.user.id },
        { assignedAdmins: session.user.id }
      ]
    });

    if (!store) {
      return NextResponse.json(
        { message: "You are not authorized to delete groceries from this store." },
        { status: 403 }
      );
    }

    await Grocery.findByIdAndDelete(groceryId);

    return NextResponse.json({ message: "Grocery deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete grocery error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to delete grocery" },
      { status: 500 }
    );
  }
}
