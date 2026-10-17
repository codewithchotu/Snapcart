import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Store from "@/models/store.model";
import { isSuperAdmin } from "@/lib/roles";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ storeId: string }> }) {
  await connectDb();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { storeId } = await params;

  const isSuper = isSuperAdmin(session.user);
  const query = isSuper
    ? { _id: storeId }
    : {
        _id: storeId,
        $or: [{ owner: session.user.id }, { assignedAdmins: session.user.id }]
      };

  const store = await Store.findOne(query);
  if (!store) return NextResponse.json({ message: "Store not found or unauthorized" }, { status: 404 });

  return NextResponse.json(store, { status: 200 });
}
