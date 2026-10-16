import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

// POST /api/user/join-store  { storeCode: "SNAP-A3B7" }
export async function POST(req: NextRequest) {
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { storeCode } = await req.json();
  if (!storeCode || typeof storeCode !== "string") {
    return NextResponse.json({ message: "Store code is required" }, { status: 400 });
  }

  const normalizedCode = storeCode.trim().toUpperCase();

  const store = await Store.findOne({ storeCode: normalizedCode, status: "approved" });
  if (!store) {
    return NextResponse.json({ message: "Invalid code or store not approved yet" }, { status: 404 });
  }

  // Add to savedStores (avoid duplicates with $addToSet)
  await User.findByIdAndUpdate(session.user.id, {
    $addToSet: { savedStores: store._id },
  });

  return NextResponse.json(
    { message: "Store joined successfully", store: JSON.parse(JSON.stringify(store)) },
    { status: 200 }
  );
}
