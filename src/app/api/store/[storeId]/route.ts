import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import Grocery from "@/models/grocery.model";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ storeId: string }> }) {
  await connectDb();
  const { storeId } = await params
  // Public endpoint – no auth, but only approved stores are visible
  const store = await Store.findOne({ _id: storeId, status: "approved" });
  if (!store) return NextResponse.json({ message: "Store not found" }, { status: 404 });

  const groceries = await Grocery.find({ store: storeId });
  return NextResponse.json({ store, products: groceries }, { status: 200 });
}
