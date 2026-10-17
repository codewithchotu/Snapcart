import mongoose from "mongoose";
import User, { IUser } from "@/models/user.model";
import { isSuperAdmin } from "./roles";

export { isSuperAdmin };

/**
 * Safely resolves a user from MongoDB using either session user id (validating ObjectId first)
 * or falling back to normalized email.
 * This prevents CastError and false nulls when OAuth provider IDs (e.g. Google sub) are present in session.user.id.
 */
export async function findUserFromSession(sessionUser?: {
  id?: string | null;
  email?: string | null;
  role?: string | null;
} | null): Promise<IUser | null> {
  if (!sessionUser) return null;

  let dbUser = null;

  // 1. Try finding by ObjectId if id is a valid 24-hex ObjectId
  if (sessionUser.id && mongoose.Types.ObjectId.isValid(sessionUser.id)) {
    try {
      dbUser = await User.findById(sessionUser.id).lean();
    } catch {
      dbUser = null;
    }
  }

  // 2. Fall back to finding by email if findById didn't resolve
  if (!dbUser && sessionUser.email) {
    const normalizedEmail = sessionUser.email.toLowerCase().trim();
    const safeRegex = new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");
    
    // If a specific role is given, attempt to find matching role first
    if (sessionUser.role) {
      dbUser = await User.findOne({ email: safeRegex, role: sessionUser.role }).lean();
    }
    if (!dbUser) {
      dbUser = await User.findOne({ email: safeRegex }).lean();
    }
  }

  return dbUser as IUser | null;
}
