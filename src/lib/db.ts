import mongoose from "mongoose";

const mongodbUrl=process.env.MONGODB_URL

if(!mongodbUrl){
 throw new Error("db error")
}



let cached: any = (global as any).mongoose
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

const connectDb=async ()=>{
    if(cached.conn){
       
        return cached.conn
    }

    if(!cached.promise){
      
        cached.promise=mongoose.connect(mongodbUrl).then((conn)=>conn.connection)
    }
    try {
        const conn = await cached.promise
        return conn
    } catch (error) {
        console.error('MongoDB connection error:', error)
        // Propagate the error so callers can handle it
        throw error
    }

}

export default connectDb