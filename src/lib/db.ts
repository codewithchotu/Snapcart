import mongoose from "mongoose"

// Strip surrounding quotes that Vercel may include literally if the env var
// value was pasted with surrounding "..." from a .env file.
// (Next.js/dotenv strips them locally, but Vercel stores the value verbatim.)
function stripEnvQuotes(val: string | undefined): string | undefined {
  if (!val) return val
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1)
  }
  return val
}

const mongodbUrl = stripEnvQuotes(process.env.MONGODB_URL)

if (!mongodbUrl) {
  throw new Error("db error: MONGODB_URL is not set")
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.__mongoose ?? { conn: null, promise: null }
if (!global.__mongoose) {
  global.__mongoose = cached
}

const connectDb = async (): Promise<typeof mongoose> => {
  // Return existing live connection immediately
  if (cached.conn) {
    return cached.conn
  }

  // Start a new connection promise if none is pending
  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUrl, {
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    // IMPORTANT: Reset the cached promise on failure so the next call retries.
    // Without this, a rejected promise stays cached forever and every subsequent
    // connectDb() call would immediately re-throw the same error, making
    // all authentication attempts fail after a transient MongoDB connection blip.
    cached.promise = null
    console.error("[DB] MongoDB connection error (safe log, no URI exposed):", (error as Error).message)
    throw error
  }
}

export default connectDb