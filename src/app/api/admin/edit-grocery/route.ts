import { auth } from "@/auth";
import uploadOnCloudinary from "@/lib/cloudinary";
import connectDb from "@/lib/db";
import Grocery from "@/models/grocery.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (session?.user?.role !== "admin") {
            return NextResponse.json(
                { message: "You are not authorized as admin" },
                { status: 403 }
            )
        }
        const formData = await req.formData()
        const name = formData.get("name") as string
        const groceryId = formData.get("groceryId") as string
        const category = formData.get("category") as string
        const unit = formData.get("unit") as string
        const price = formData.get("price") as string
        const file = formData.get("image") as Blob | null

        if (!groceryId) {
            return NextResponse.json(
                { message: "Grocery ID is required" },
                { status: 400 }
            )
        }

        const updateData: any = {}
        if (name) updateData.name = name
        if (category) updateData.category = category
        if (unit) updateData.unit = unit
        if (price) updateData.price = price

        if (file && file instanceof Blob && file.size > 0) {
            try {
                const imageUrl = await uploadOnCloudinary(file)
                if (imageUrl) {
                    updateData.image = imageUrl
                }
            } catch (uploadError: any) {
                console.error("Cloudinary upload error in edit-grocery route:", uploadError?.message || uploadError)
                return NextResponse.json(
                    { message: `Image upload failed: ${uploadError?.message || "Cloudinary upload error"}` },
                    { status: 400 }
                )
            }
        }

        const grocery = await Grocery.findByIdAndUpdate(
            groceryId,
            updateData,
            { new: true }
        )

        if (!grocery) {
            return NextResponse.json(
                { message: "Grocery not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            grocery,
            { status: 200 }
        )
    } catch (error: any) {
        console.error("Edit grocery error:", error?.message || error)
        return NextResponse.json(
            { message: `Edit grocery error: ${error?.message || "Internal server error"}` },
            { status: 500 }
        )
    }
}