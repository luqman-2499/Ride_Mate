// Function to check Availability of car for a given Date 
import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import imagekit from "../configs/imageKit.js";
import fs from "fs";
import crypto from "crypto";

// For SMTP setup email.
import User from "../models/User.js";
import { sendEmail } from "../utils/emailService.js";

// 🟢 EMAIL MODE SETTING - Change this for local/deployment
const EMAIL_ENABLED = process.env.NODE_ENV === 'development'; // true for local, false for deployed

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
    console.log("📧 Email Mode:", EMAIL_ENABLED ? "ENABLED (Local)" : "DISABLED (Deployed)");

    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    // 🟢 ADD BACK ALL THIS MISSING LOGIC:
    console.log("createBooking: checking availability for car:", car);
    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    if (!isAvailable) {
      return res.json({ success: false, message: "Car is not available" });
    }

    // 🟢 THIS IS CRITICAL - FETCH carData
    console.log("createBooking: fetching carData from DB");
    const carData = await Car.findById(car).populate("owner", "email name");

    // 🟢 OWNER CHECK
    const ownerIdStr = carData?.owner?._id?.toString();
    if (ownerIdStr === _id.toString()) {
      return res.json({ success: false, message: "Owners cannot book their own cars" });
    }

    // 🟢 PRICE CALCULATION
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const timeDiffMs = returned - picked;
    const noOfDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    const price = (carData?.pricePerDay || 0) * noOfDays;

    // 🟢 FILE UPLOADS - ADD THIS BACK
    let drivingLicenseUrl, identityCardUrl;
    const dlFile = req.files?.drivingLicense?.[0];
    const idFile = req.files?.identityCard?.[0];

    // 🟢 ADD BACK FILE UPLOAD LOGIC
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

    // THEN CONTINUE WITH YOUR EXISTING CODE...
    console.log("createBooking: creating booking in DB");
    console.log("🟢 CAR OWNER DEBUG:");
    console.log("🟢 Car owner ID:", carData.owner._id);
    console.log("🟢 Car owner name:", carData.owner.name);
    console.log("🟢 Car owner email:", carData.owner.email);
    const booking = await Booking.create({
      car,
      owner: carData.owner._id, // 🟢 NOW carData EXISTS!
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

    // 🟢 DUAL MODE EMAIL HANDLING
    if (EMAIL_ENABLED) {
      console.log("createBooking: SENDING EMAILS (Local Mode)");
      
      // Get user details for email
      const userData = await User.findById(_id);

      // Email to User (booker)
      try {
        console.log("createBooking: sending email to user:", userData?.email);
        await sendEmail({
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
        });
        console.log("createBooking: user email sent successfully");
      } catch (emailErrUser) {
        console.log("createBooking: failed to send email to user ->", emailErrUser?.message);
      }

      // Email to Owner
      try {
        console.log("createBooking: sending email to owner:", carData.owner?.email);
        await sendEmail({
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
        });
        console.log("createBooking: owner email sent successfully");
      } catch (emailErrOwner) {
        console.log("createBooking: failed to send email to owner ->", emailErrOwner?.message);
      }
    } else {
      console.log("createBooking: EMAILS DISABLED (Deployed Mode)");
    }

    // Final response
    res.json({ success: true, message: "Booking Created" });
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

    // 🟢 DUAL MODE EMAIL HANDLING
    if (EMAIL_ENABLED) {
      console.log("changeBookingStatus: SENDING STATUS EMAIL (Local Mode)");
      
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

      try {
        await sendEmail({
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
        });
        console.log("changeBookingStatus: status email sent successfully");
      } catch (emailError) {
        console.log("changeBookingStatus: failed to send status email ->", emailError?.message);
      }
    } else {
      console.log("changeBookingStatus: EMAILS DISABLED (Deployed Mode)");
    }

    res.json({ success: true, message: "Status updated", booking });
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

    // 🟢 DUAL MODE EMAIL HANDLING
    if (EMAIL_ENABLED) {
      console.log("deleteBooking: SENDING DELETION EMAILS (Local Mode)");

      try {
        if (isOwner || isAdmin) {
          await sendEmail({
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
          });
        } else if (isUser) {
          await sendEmail({
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
          });
        }
        console.log("deleteBooking: deletion emails sent successfully");
      } catch (emailError) {
        console.error("deleteBooking: failed to send deletion emails:", emailError.message);
      }
    } else {
      console.log("deleteBooking: EMAILS DISABLED (Deployed Mode)");
    }

    return res.json({ 
      success: true, 
      message: "Booking deleted successfully"
    });

  } catch (error) {
    console.error("🔥 Error deleting booking:", error);
    return res.json({ success: false, message: error.message });
  }
};