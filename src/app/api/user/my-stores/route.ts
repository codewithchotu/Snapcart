import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

// GET /api/user/my-stores  — returns list of user's saved kirana stores
export async function GET() {
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const user = await User.findById(session.user.id)
    .populate({
      path: "savedStores",
      match: { status: "approved" }, // only show approved stores
      select: "name address locality contactInfo logo storeCode",
    })
    .lean() as any;

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ stores: user.savedStores ?? [] }, { status: 200 });
}

// DELETE /api/user/my-stores  { storeId } — remove a saved store
export async function DELETE(req: Request) {
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { storeId } = await req.json();
  if (!storeId) {
    return NextResponse.json({ message: "storeId is required" }, { status: 400 });
  }

  await User.findByIdAndUpdate(session.user.id, {
    $pull: { savedStores: storeId },
  });

  return NextResponse.json({ message: "Store removed from your list" }, { status: 200 });
}
