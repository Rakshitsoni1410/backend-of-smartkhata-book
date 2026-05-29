import mongoose from "mongoose";

// Cache the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connection = async () => {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Reuse pending connection promise
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,      // ← This prevents the buffering timeout error
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).then((mongoose) => {
      console.log("Database Connected");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;        // Reset so next call retries
    console.log("Connection error:", error.message);
    throw error;                  // Let the route handler return a proper 500
  }

  return cached.conn;
};

export default connection;