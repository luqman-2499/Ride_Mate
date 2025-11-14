import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import imagekit from "../configs/imageKit.js";
import fs from "fs";
import crypto from "crypto";

// For SMTP setup email.
import User from "../models/User.js";
import { sendEmail } from "../utils/emailService.js";


const EMAIL_ENABLED = process.env.EMAIL_ENABLED=true; // true for local, false for deployed

const checkAvailability = async (car, pickupDate, returnDate) => {
    const bookings = await Booking.find({
        car,
        pickupDate: { $lte: returnDate },
        returnDate: { $gte: pickupDate },
        status: { $ne: "cancelled" }
    })
    return bookings.length === 0;
}

// API TO CHECK AVAILABILITY OF CARS FOR GIVEN DATE 
export const checkAvailabilityOfCar = async (req, res) => {
    try {
        const { location, pickupDate, returnDate } = req.body

        const cars = await Car.find({ location, isAvailable: true })

        const availableCarsPromises = cars.map(async (car) => {
            const isAvailable = await checkAvailability(car._id, pickupDate, returnDate)
            return { ...car._doc, isAvailable: isAvailable }
        })

        let availableCars = await Promise.all(availableCarsPromises);
        availableCars = availableCars.filter(car => car.isAvailable === true)

        res.json({ success: true, availableCars })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// API to List User Bookings
export const getUserBookings = async (req, res) => {
    try {
        const { _id } = req.user;
        console.log("👤 USER BOOKINGS DEBUG:");
        console.log("👤 User ID:", _id);
        
        const bookings = await Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 })
        
        console.log("👤 Found bookings for user:", bookings.length);
        console.log("👤 Booking details:", bookings.map(b => ({
            id: b._id,
            car: b.car?.brand + " " + b.car?.model,
            owner: b.owner, // 🟢 CHECK THIS!
            status: b.status
        })));
        
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to get owner bookings 
export const getOwnerBookings = async (req, res) => {
    try {
        console.log("👑 OWNER BOOKINGS DEBUG:");
        console.log("👑 Logged-in owner ID:", req.user._id);
        console.log("👑 Logged-in owner name:", req.user.name);
        console.log("👑 Logged-in owner role:", req.user.role);

        if (req.user.role !== 'owner') {
            console.log("❌ User is not an owner!");
            return res.json({ success: false, message: "Not Authorized" })
        }

        const bookings = await Booking.find({ owner: req.user._id })
            .populate('car')
            .populate('user', '-password')
            .sort({ createdAt: -1 });

        console.log("👑 Found bookings for owner:", bookings.length);
        console.log("👑 All booking details:", bookings.map(b => ({
            id: b._id,
            car: b.car?.brand + " " + b.car?.model,
            owner: b.owner?.toString(), // 🟢 CHECK OWNER ID
            user: b.user?.name,
            status: b.status,
            createdAt: b.createdAt
        })));

        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// ====================== CREATE BOOKING ======================
export const createBooking = async (req, res) => {
  try {
    console.log("createBooking: called");
    console.log("📧 Email Mode:", EMAIL_ENABLED ? "ENABLED" : "DISABLED");

    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    // 🟢 Availability check
    console.log("createBooking: checking availability for car:", car);
    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Car is not available" });
    }

    // 🟢 Fetch carData
    console.log("createBooking: fetching carData from DB");
    const carData = await Car.findById(car).populate("owner", "email name");

    // 🟢 Owner check
    const ownerIdStr = carData?.owner?._id?.toString();
    if (ownerIdStr === _id.toString()) {
      return res.json({ success: false, message: "Owners cannot book their own cars" });
    }

    // 🟢 Price calculation
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const timeDiffMs = returned - picked;
    const noOfDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    const price = (carData?.pricePerDay || 0) * noOfDays;

    // 🟢 FILE UPLOADS
    let drivingLicenseUrl, identityCardUrl;
    const dlFile = req.files?.drivingLicense?.[0];
    const idFile = req.files?.identityCard?.[0];

    // 🟢 File upload logic
    const uploadToImageKit = async (file) => {
      if (!file) return undefined;
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      
      let response;
      try {
        const existing = await imagekit.listFiles({
          searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'bookings/'`,
          limit: 1,
        });
        if (Array.isArray(existing) && existing.length > 0) {
          response = { url: existing[0].url };
        }
      } catch (listErr) {
        console.log("uploadToImageKit error:", listErr?.message);
      }

      if (!response) {
        try {
          response = await imagekit.upload({
            file: fileBuffer,
            fileName: file.originalname,
            folder: "/bookings",
            tags: [`hash:${fileHash}`],
          });
        } catch (uploadErr) {
          console.log("uploadToImageKit upload error:", uploadErr?.message);
          throw uploadErr;
        }
      }
      return response?.url;
    };

    // Attempt uploads
    try {
      drivingLicenseUrl = await uploadToImageKit(dlFile);
      console.log("createBooking: drivingLicenseUrl ->", drivingLicenseUrl);
    } catch (errDL) {
      console.log("createBooking: error uploading driving license ->", errDL?.message);
    }

    try {
      identityCardUrl = await uploadToImageKit(idFile);
      console.log("createBooking: identityCardUrl ->", identityCardUrl);
    } catch (errID) {
      console.log("createBooking: error uploading identity card ->", errID?.message);
    }

    // 🟢 DUPLICATE CHECK
    const existing = await Booking.findOne({ car, user: _id, pickupDate, returnDate });
    if (existing) {
      return res.json({ success: true, message: "Booking Created" });
    }

    // Create booking
    console.log("createBooking: creating booking in DB");
    console.log("🟢 CAR OWNER DEBUG:");
    console.log("🟢 Car owner ID:", carData.owner._id);
    console.log("🟢 Car owner name:", carData.owner.name);
    console.log("🟢 Car owner email:", carData.owner.email);
    
    const booking = await Booking.create({
      car,
      owner: carData.owner._id,
      user: _id,
      pickupDate,
      returnDate,
      price,
      status: "pending",
      documents: {
        drivingLicenseUrl,
        identityCardUrl,
      },
    });
    console.log("🟢 Booking created with owner ID:", booking.owner);

    // 🟢 Send response FIRST to avoid timeout
    res.json({ success: true, message: "Booking Created" });

    // 🟢 Then handle emails in background (don't await)
    if (EMAIL_ENABLED) {
      console.log("createBooking: SENDING EMAILS IN BACKGROUND");
      
      // Get user details for email
      const userData = await User.findById(_id);

      // Email to User - fire and forget
      sendEmail({
        to: userData.email,
        subject: "Car Booking Created on Ridemate",
        html: `
          <h3>Car Booking Created</h3>
          <p>Your booking has been created. We will update you once the car owner confirms your booking.</p>
          <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
          <p><b>Owner:</b> ${carData.owner.name}</p>
          <p><b>Price:</b> $${price}</p>
          <p><b>Pickup:</b> ${new Date(pickupDate).toLocaleDateString()}</p>
          <p><b>Return:</b> ${new Date(returnDate).toLocaleDateString()}</p>
          <p><b>Status:</b> ${booking.status}</p>
        `,
      }).then(() => {
        console.log("createBooking: user email sent successfully");
      }).catch(err => {
        console.log("createBooking: failed to send email to user ->", err?.message);
      });

      // Email to Owner - fire and forget
      sendEmail({
        to: carData.owner.email,
        subject: "New Booking Received on Ridemate",
        html: `
          <h3>New Booking Received</h3>
          <p>Your car <b>${carData.brand} ${carData.model}</b> has been booked by ${userData.name}.</p>
          <p>Please update the booking status.</p>
          <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
          <p><b>Price:</b> $${price}</p>
          <p><b>Pickup:</b> ${new Date(pickupDate).toLocaleDateString()}</p>
          <p><b>Return:</b> ${new Date(returnDate).toLocaleDateString()}</p>
          <p><b>Status:</b> ${booking.status}</p>
        `,
      }).then(() => {
        console.log("createBooking: owner email sent successfully");
      }).catch(err => {
        console.log("createBooking: failed to send email to owner ->", err?.message);
      });
    }
  } catch (error) {
    console.error("createBooking: caught error ->", error?.message || error);
    res.json({ success: false, message: error.message });
  }
};
    
// ====================== CHANGE STATUS ======================
export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId).populate("car user owner");

    if (booking.owner._id.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    booking.status = status;
    await booking.save();

    // 🟢 Send response FIRST
    res.json({ success: true, message: "Status updated", booking });

    // 🟢 Handle email in background
    if (EMAIL_ENABLED) {
      console.log("changeBookingStatus: SENDING STATUS EMAIL IN BACKGROUND");
      
      let subject, message;
      if (status === "confirmed") {
        subject = "Your Booking Confirmed - Ridemate";
        message = "Your booking has been confirmed.";
      } else if (status === "cancelled") {
        subject = "Your Booking Cancelled - Ridemate";
        message = "Your booking has been cancelled.";
      } else {
        subject = "Booking Status Updated - Ridemate";
        message = `Your booking status changed to ${status}.`;
      }

      sendEmail({
        to: booking.user.email,
        subject,
        html: `
          <h3>${subject}</h3>
          <p>${message}</p>
          <p><b>Car:</b> ${booking.car.brand} ${booking.car.model}</p>
          <p><b>Owner:</b> ${booking.owner.name}</p>
          <p><b>Price:</b> $${booking.price}</p>
          <p><b>Pickup:</b> ${new Date(booking.pickupDate).toLocaleDateString()}</p>
          <p><b>Return:</b> ${new Date(booking.returnDate).toLocaleDateString()}</p>
          <p><b>Status:</b> ${booking.status}</p>
        `,
      }).then(() => {
        console.log("changeBookingStatus: status email sent successfully");
      }).catch(err => {
        console.log("changeBookingStatus: failed to send status email ->", err?.message);
      });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ====================== DELETE BOOKING ======================
export const deleteBooking = async (req, res) => {
  try {
    const { _id, role } = req.user;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate("car")
      .populate("user", "name email")
      .populate("owner", "name email");

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    const isUser = booking.user?._id?.toString() === _id.toString();
    const isOwner = booking.owner?._id?.toString() === _id.toString();
    const isAdmin = role === 'admin';

    if (!isUser && !isOwner && !isAdmin) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Store details for email before deletion
    const bookingDetails = {
      car: `${booking.car?.brand} ${booking.car?.model}`,
      price: booking.price,
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      userName: booking.user?.name,
      userEmail: booking.user?.email,
      ownerName: booking.owner?.name,
      ownerEmail: booking.owner?.email,
      deletedBy: req.user.name || req.user.email,
      deletedByRole: role
    };

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);
    console.log("✅ Booking deleted successfully");

    // 🟢 Send response FIRST
    res.json({ 
      success: true, 
      message: "Booking deleted successfully"
    });

    // 🟢 Handle emails in background
    if (EMAIL_ENABLED) {
      console.log("deleteBooking: SENDING DELETION EMAILS IN BACKGROUND");

      if (isOwner || isAdmin) {
        sendEmail({
          to: bookingDetails.userEmail,
          subject: "Your Booking Has Been Cancelled - Ridemate",
          html: `
            <h3>Booking Cancelled</h3>
            <p>Your booking has been cancelled by ${bookingDetails.deletedBy}.</p>
            <p><b>Car:</b> ${bookingDetails.car}</p>
            <p><b>Price:</b> $${bookingDetails.price}</p>
            <p><b>Pickup Date:</b> ${new Date(bookingDetails.pickupDate).toLocaleDateString()}</p>
            <p><b>Return Date:</b> ${new Date(bookingDetails.returnDate).toLocaleDateString()}</p>
          `,
        }).then(() => {
          console.log("deleteBooking: user notification email sent");
        }).catch(err => {
          console.log("deleteBooking: failed to send user email ->", err?.message);
        });
      } else if (isUser) {
        sendEmail({
          to: bookingDetails.ownerEmail,
          subject: "Booking Cancelled by User - Ridemate",
          html: `
            <h3>Booking Cancelled</h3>
            <p>User ${bookingDetails.userName} has cancelled their booking for your car.</p>
            <p><b>Car:</b> ${bookingDetails.car}</p>
            <p><b>Price:</b> $${bookingDetails.price}</p>
            <p><b>Pickup Date:</b> ${new Date(bookingDetails.pickupDate).toLocaleDateString()}</p>
            <p><b>Return Date:</b> ${new Date(bookingDetails.returnDate).toLocaleDateString()}</p>
          `,
        }).then(() => {
          console.log("deleteBooking: owner notification email sent");
        }).catch(err => {
          console.log("deleteBooking: failed to send owner email ->", err?.message);
        });
      }
    }
  } catch (error) {
    console.error("🔥 Error deleting booking:", error);
    return res.json({ success: false, message: error.message });
  }
};