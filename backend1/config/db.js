import { connect } from "mongoose";

//connect to mongodb using MONGODB_URI from env
export const connectDB = async () => {
  try {
    await connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.log("MongoDB connection error:", err.message);
    process.exit(1);
  }
};
