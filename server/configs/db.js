import mongoose from "mongoose";

const connectDB = async ()=> {
    try {

        mongoose.connection.on('connected', ()=> console.log("✅ Database Connected") );
        mongoose.connection.on('error', (err) => console.error("❌ MongoDB connection error:", err));
        mongoose.connection.on('disconnected', () => console.log("⚠️ MongoDB disconnected"));

        await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`)

    } catch (error) {
        console.log("Failed to Connect", error.message);
    }
}

export default connectDB;