import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Store from "@/models/store.model"
import { redirect } from "next/navigation"
import AdminStoresDashboard from "./AdminStoresDashboard"
import Nav from "@/components/Nav"
import User from "@/models/user.model"

export default async function AdminStoresPage() {
  await connectDb()
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const dbUser = await User.findById(session.user.id).lean() as any
  const isSuperAdmin = dbUser?.role === "superAdmin" || session.user.email === "mo0322975@gmail.com"

  if (!dbUser || (!isSuperAdmin && dbUser.role !== "admin")) redirect("/unauthorized")

  // Find stores: all stores for Super Admin, or owned/assigned for Kirana Admin
  const query = isSuperAdmin
    ? {}
    : { $or: [{ owner: session.user.id }, { assignedAdmins: session.user.id }] }

  const stores = await Store.find(query)
    .populate("owner assignedAdmins", "name email role")
    .lean()

  return (
    <>
      <Nav user={JSON.parse(JSON.stringify(dbUser))} />
      <AdminStoresDashboard
        stores={JSON.parse(JSON.stringify(stores))}
        isSuperAdmin={isSuperAdmin}
        currentUserId={session.user.id}
      />
    </>
  )
}
