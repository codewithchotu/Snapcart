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

        console.log("1. Request received")
        const formData = await req.formData()
        console.log("2. FormData received")

        const name = formData.get("name") as string
        const category = formData.get("category") as string
        const unit = formData.get("unit") as string
        const price = formData.get("price") as string
        const file = formData.get("image") as Blob | null

        if (!name || !category || !unit || !price) {
            return NextResponse.json(
                { message: "Please provide all required fields: name, category, price, and unit" },
                { status: 400 }
            )
        }

        let imageUrl = ""
        if (file && file instanceof Blob && file.size > 0) {
            console.log("3. Starting Cloudinary upload")
            try {
                const uploadedUrl = await uploadOnCloudinary(file)
                if (uploadedUrl) {
                    imageUrl = uploadedUrl
                }
                console.log("4. Cloudinary upload finished:", imageUrl)
            } catch (uploadError: any) {
                console.error("Cloudinary upload error in add-grocery route:", uploadError?.message || uploadError)
                return NextResponse.json(
                    { message: `Image upload failed: ${uploadError?.message || "Cloudinary upload error"}` },
                    { status: 400 }
                )
            }
        }

        console.log("5. Creating grocery in MongoDB")
        const grocery = await Grocery.create({
            name,
            price,
            category,
            unit,
            image: imageUrl
        })

        console.log("6. Grocery created:", grocery._id)
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