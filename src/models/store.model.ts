import mongoose from "mongoose";

export interface IStore {
    _id?: mongoose.Types.ObjectId;
    name: string;
    address: string;
    locality?: string;
    contactInfo?: string;
    logo?: string;
    storeCode: string; // unique short code e.g. SNAP-A3B7
    owner: mongoose.Types.ObjectId; // reference to User who owns/supervises
    assignedAdmins?: mongoose.Types.ObjectId[]; // Kirana admins allowed to manage this store
    pendingAdminEmails?: string[]; // Emails invited before registration
    status: "pending" | "approved" | "rejected";
    createdAt?: Date;
    updatedAt?: Date;
}

/** Generates a short code like SNAP-A3B7 */
function generateStoreCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = "SNAP-"
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
}

const storeSchema = new mongoose.Schema<IStore>({
    name: { type: String, required: true },
    address: { type: String, required: true },
    locality: { type: String },
    contactInfo: { type: String },
    logo: { type: String, default: "" },
    storeCode: {
        type: String,
        unique: true,
        default: generateStoreCode,
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingAdminEmails: [{ type: String, lowercase: true, trim: true }],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
}, { timestamps: true });

storeSchema.index({ owner: 1 });
storeSchema.index({ assignedAdmins: 1 });

const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);
export default Store;
