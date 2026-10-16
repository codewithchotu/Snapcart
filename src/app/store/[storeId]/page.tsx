import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Grocery from "@/models/grocery.model"
import Store from "@/models/store.model"
import { redirect } from "next/navigation"
import StoreProductsClient from "./StoreProductsClient"
import Nav from "@/components/Nav"
import User from "@/models/user.model"
import mongoose from "mongoose"

interface Props {
  params: Promise<{ storeId: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function StorePage({ params, searchParams }: Props) {
  const { storeId } = await params
  const { q } = await searchParams

  await connectDb()
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const dbUser = await User.findById(session.user.id).lean()
  if (!dbUser) redirect("/login")

  const isObjectId = mongoose.Types.ObjectId.isValid(storeId) && String(new mongoose.Types.ObjectId(storeId)) === storeId

  const storeQuery = isObjectId
    ? { _id: storeId, status: "approved" }
    : { storeCode: storeId.toUpperCase().trim(), status: "approved" }

  const store = await Store.findOne(storeQuery).lean() as any
  if (!store) redirect("/")

  const realStoreId = store._id.toString()
  let query: Record<string, unknown> = { store: realStoreId }
  if (q) {
    query = {
      store: realStoreId,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ],
    }
  }

  const groceries = await Grocery.find(query).lean()
  const plainUser = JSON.parse(JSON.stringify(dbUser))
  const plainStore = JSON.parse(JSON.stringify(store))
  const plainGroceries = JSON.parse(JSON.stringify(groceries))

  return (
    <>
      <Nav user={plainUser} />
      <StoreProductsClient store={plainStore} groceries={plainGroceries} />
    </>
  )
}
