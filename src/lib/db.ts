import mongoose from "mongoose";

// Strip surrounding quotes that Vercel may include literally if the env var
// value was pasted with surrounding "..." from a .env file.
// (Next.js/dotenv strips them locally, but Vercel stores the value verbatim.)
function stripEnvQuotes(val: string | undefined): string | undefined {
  if (!val) return val
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1)
  }
  return val
}

const mongodbUrl = stripEnvQuotes(process.env.MONGODB_URL)

if (!mongodbUrl) {
  throw new Error("db error: MONGODB_URL is not set")
}

let cached: any = (global as any).mongoose
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongodbUrl).then((conn) => conn.connection)
    }
    try {
        const conn = await cached.promise
        return conn
    } catch (error) {
        console.error('MongoDB connection error:', error)
        throw error
    }
}

export default connectDb