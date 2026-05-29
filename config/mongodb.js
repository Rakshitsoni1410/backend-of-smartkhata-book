import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connection = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Connecting to MongoDB...");
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
    }).then((mongoose) => {
      console.log("✅ Database Connected");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }

  return cached.conn;
};

export default connection;