import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import Store from "@/models/store.model";
import { isSuperAdmin } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
        }

        // Super Admin is for store onboarding and admin authentication, not grocery stock entry
        if (isSuperAdmin(session.user)) {
            return NextResponse.json(
                { message: "Super Admin does not add groceries. Groceries must be added by the assigned Kirana Store Admin." },
                { status: 403 }
            )
        }

        if (session.user.role !== "admin") {
            return NextResponse.json(
                { message: "You are not authorized as a Kirana Store Admin" },
                { status: 403 }
            )
        }

        const formData = await req.formData()
        const name = formData.get("name") as string
        const category = formData.get("category") as string
        const unit = formData.get("unit") as string
        const price = formData.get("price") as string
        const storeId = formData.get("storeId") as string
        const file = formData.get("image") as Blob | null

        if (!name || !category || !unit || !price) {
            return NextResponse.json(
                { message: "Please provide all required fields: name, category, price, and unit" },
                { status: 400 }
            )
        }

        if (!storeId) {
            return NextResponse.json(
                { message: "Please select a Kirana store to add this grocery to." },
                { status: 400 }
            )
        }

        // Verify that this user is the owner or in assignedAdmins of this store
        const store = await Store.findOne({
            _id: storeId,
            $or: [
                { owner: session.user.id },
                { assignedAdmins: session.user.id }
            ]
        })

        if (!store) {
            return NextResponse.json(
                { message: "You are not authorized to manage groceries for this Kirana store." },
                { status: 403 }
            )
        }

        let imageUrl = ""
        if (file && file instanceof Blob && file.size > 0) {
            try {
                const uploadedUrl = await uploadOnCloudinary(file)
                if (uploadedUrl) {
                    imageUrl = uploadedUrl
                }
            } catch (uploadError: any) {
                console.error("Cloudinary upload error in add-grocery route:", uploadError?.message || uploadError)
                return NextResponse.json(
                    { message: `Image upload failed: ${uploadError?.message || "Cloudinary upload error"}` },
                    { status: 400 }
                )
            }
        }

        const grocery = await Grocery.create({
            name: name.trim(),
            price: price.trim(),
            category,
            unit,
            image: imageUrl,
            store: storeId,
        })

        return NextResponse.json(
            grocery,
            { status: 201 }
        )
    } catch (error: any) {
        console.error("Add grocery error:", error?.message || error)
        return NextResponse.json(
            { message: `Add grocery error: ${error?.message || "Internal server error"}` },
            { status: 500 }
        )
    }
}