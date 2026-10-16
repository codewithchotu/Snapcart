import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Store from "@/models/store.model"
import User from "@/models/user.model"
import { redirect } from "next/navigation"
import KiranaDashboard from "./KiranaDashboard"
import Nav from "@/components/Nav"
import Grocery from "@/models/grocery.model"

export default async function KiranaAdminPage() {
  await connectDb()
  const session = await auth()

  // Must be logged in
  if (!session?.user?.id) redirect("/login")

  const dbUser = await User.findById(session.user.id).lean() as any

  // Must exist in DB
  if (!dbUser) redirect("/login")

  // Super admins are NOT kirana admins — redirect them to their dashboard
  if (dbUser.role === "superAdmin" || session.user.email === "mo0322975@gmail.com") {
    redirect("/admin/stores")
  }

  // Only users with role "admin" AND having managedStores can access
  if (dbUser.role !== "admin") {
    redirect("/unauthorized")
  }

  // Fetch approved stores this kirana admin manages
  const stores = await Store.find({
    $or: [
      { owner: dbUser._id },
      { assignedAdmins: dbUser._id }
    ],
    status: "approved"
  }).lean() as any[]

  if (stores.length === 0) {
    redirect("/unauthorized")
  }

  // For each store, attach its groceries
  const storesWithGroceries = await Promise.all(
    stores.map(async (store) => {
      const groceries = await Grocery.find({ store: store._id })
        .sort({ createdAt: -1 })
        .lean()
      return { ...store, groceries }
    })
  )

  return (
    <>
      <Nav user={JSON.parse(JSON.stringify(dbUser))} />
      <KiranaDashboard
        stores={JSON.parse(JSON.stringify(storesWithGroceries))}
        adminName={dbUser.name}
        adminEmail={dbUser.email}
      />
    </>
  )
}
