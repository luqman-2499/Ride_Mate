import express from "express";
import { changeBookingStatus, checkAvailabilityOfCar, createBooking, getOwnerBookings, getUserBookings, deleteBooking } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', checkAvailabilityOfCar)

bookingRouter.post('/create', protect, upload.fields([
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'identityCard', maxCount: 1 }
]), createBooking)

bookingRouter.get('/user', protect, getUserBookings)
bookingRouter.get('/owner', protect, getOwnerBookings)
bookingRouter.post('/change-status', protect, changeBookingStatus)
bookingRouter.delete('/user/:id', protect, deleteBooking);



export default bookingRouter;