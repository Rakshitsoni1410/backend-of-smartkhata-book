import mongoose from "mongoose";

const connection = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database Connected");
    });

    mongoose.connection.on("error", (err) => {
      console.log("MongoDB error:", err.message);
    });

    await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
    console.log("Connection error:", error.message);
  }
};

export default connection;