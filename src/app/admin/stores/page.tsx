import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Store from "@/models/store.model"
import { redirect } from "next/navigation"
import AdminStoresDashboard from "./AdminStoresDashboard"
import Nav from "@/components/Nav"
import { findUserFromSession, isSuperAdmin as checkIsSuperAdmin } from "@/lib/auth-helpers"

export default async function AdminStoresPage() {
  await connectDb()
  const session = await auth()
  if (!session?.user) redirect("/login")

  const dbUser = await findUserFromSession(session.user) as any
  const isSuperAdmin = checkIsSuperAdmin(dbUser) || checkIsSuperAdmin(session.user)

  // Super Admin is always authorized. Normal users must be Kirana Admins ("admin").
  if (!isSuperAdmin && dbUser?.role !== "admin") {
    redirect("/unauthorized")
  }

  // Find stores: all stores for Super Admin, or owned/assigned for Kirana Admin
  const activeUserId = dbUser?._id ? dbUser._id.toString() : session.user.id
  const query = isSuperAdmin
    ? {}
    : { $or: [{ owner: activeUserId }, { assignedAdmins: activeUserId }] }

  const stores = await Store.find(query)
    .populate("owner assignedAdmins", "name email role")
    .lean()

  const navUser = dbUser
    ? JSON.parse(JSON.stringify(dbUser))
    : {
        _id: activeUserId,
        name: session.user.name || "Super Admin",
        email: session.user.email || "",
        role: isSuperAdmin ? "superAdmin" : "admin"
      }

  return (
    <>
      <Nav user={navUser} />
      <AdminStoresDashboard
        stores={JSON.parse(JSON.stringify(stores))}
        isSuperAdmin={isSuperAdmin}
        currentUserId={activeUserId}
      />
    </>
  )
}

