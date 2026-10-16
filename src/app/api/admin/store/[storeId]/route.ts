import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ storeId: string }> }) {
  await connectDb();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  const { storeId } = await params
  // Only the owner can fetch this endpoint
  const store = await Store.findOne({ _id: storeId, owner: session.user.id });
  if (!store) return NextResponse.json({ message: "Store not found or unauthorized" }, { status: 404 });

  return NextResponse.json(store, { status: 200 });
}
