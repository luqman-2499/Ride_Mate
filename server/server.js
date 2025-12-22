import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/UserRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";


// Initialize express App 
const app = express()


// Connect database
await connectDB()


app.use(cors({
  origin: [
    'http://localhost:5173', // Local
    'https://ride-mate-sepia.vercel.app' // Your Vercel domain
  ],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res)=> res.send("Server is Running"))
app.use('/api/user', userRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/bookings', bookingRouter)


const PORT = process.env.PORT || 3000;
app.listen(PORT,()=> console.log(`Server running on port ${PORT}`))