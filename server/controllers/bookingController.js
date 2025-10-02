
// Function to check Availability of car for a given Date 

import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import imagekit from "../configs/imageKit.js";
import fs from "fs";
import crypto from "crypto";

// For SMTP setup email.
import User from "../models/User.js";
import { sendEmail } from "../utils/emailService.js";

const checkAvailability = async (car, pickupDate, returnDate) => {
    const bookings = await Booking.find({
        car,
        pickupDate: { $lte: returnDate },
        returnDate: { $gte: pickupDate }
    })
    return bookings.length === 0;
}

// API TO CHECK AVAILABILITY OF CARS FOR GIVEN DATE 
export const checkAvailabilityOfCar = async (req, res) => {
    try {
        const { location, pickupDate, returnDate } = req.body


        // Fetch all available cars for given location 
        const cars = await Car.find({ location, isAvailable: true })

        // Check car availability for given date range using PROMISE
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
        const bookings = await Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 })
        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API to get owner bookings 
export const getOwnerBookings = async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.json({ success: false, message: "Not Authorized" })
        }
        // const bookings =await Booking.find({owner: req.user._id}).populate('car user').select("user","-password").sort({createdAt: -1})

        const bookings = await Booking.find({ owner: req.user._id })
            .populate('car')
            .populate('user', '-password') // exclude password
            .sort({ createdAt: -1 });

        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// ===========================OLD API's without Email Setup.========================================
// // API to change booking status 
// export const changeBookingStatus = async (req, res) => {
//     try {
//         const { _id } = req.user;
//         const { bookingId, status } = req.body

//         const booking = await Booking.findById(bookingId)

//         if (booking.owner.toString() !== _id.toString()) {
//             return res.json({ success: false, message: "Unauthorized" })
//         }

//         booking.status = status;
//         await booking.save();

//         res.json({ success: true, message: "Status updated" })

//     } catch (error) {
//         console.log(error.message);
//         res.json({ success: false, message: error.message })
//     }
// }
// // API to Create Booking
// export const createBooking = async (req, res) => {
//     try {
//         const { _id } = req.user;
//         const { car, pickupDate, returnDate } = req.body;

//         const isAvailable = await checkAvailability(car, pickupDate, returnDate)
//         if (!isAvailable) {
//             return res.json({ success: false, message: "Car is not available" })
//         }

//         const carData = await Car.findById(car)

//         // Calculate price based on pickup and return date 
//         const picked = new Date(pickupDate);
//         const returned = new Date(returnDate);
//         const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24))
//         const price = carData.pricePerDay * noOfDays;

//         if (carData.owner.toString() === _id.toString()) {
//             return res.json({ success: false, message: "Owners cannot book their own cars" });
//         }
//         let drivingLicenseUrl, identityCardUrl;
//         const dlFile = req.files?.drivingLicense?.[0];
//         const idFile = req.files?.identityCard?.[0];

//         const uploadToImageKit = async (file) => {
//             if (!file) return undefined;
//             const fileBuffer = fs.readFileSync(file.path);
//             const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
//             let response;
//             try {
//                 const existing = await imagekit.listFiles({
//                     searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'bookings/'`,
//                     limit: 1
//                 });
//                 if (Array.isArray(existing) && existing.length > 0) {
//                     response = { url: existing[0].url };
//                 }
//             } catch (e) { }
//             if (!response) {
//                 response = await imagekit.upload({
//                     file: fileBuffer,
//                     fileName: file.originalname,
//                     folder: '/bookings',
//                     tags: [`hash:${fileHash}`]
//                 });
//             }
//             return response.url;
//         };

//         drivingLicenseUrl = await uploadToImageKit(dlFile);
//         identityCardUrl = await uploadToImageKit(idFile);

//         // Prevent duplicate booking attempts within same date range by same user
//         const existing = await Booking.findOne({ car, user: _id, pickupDate, returnDate })
//         if (existing) {
//             return res.json({ success: true, message: "Booking Created" })
//         }

//         await Booking.create({
//             car,
//             owner: carData.owner,
//             user: _id,
//             pickupDate,
//             returnDate,
//             price,
//             documents: {
//                 drivingLicenseUrl,
//                 identityCardUrl
//             }
//         })
//         res.json({ success: true, message: "Booking Created" })

//     } catch (error) {
//         console.log(error.message);
//         res.json({ success: false, message: error.message })

//     }
// }


// ===========================NEW API's with Email Setup.========================================
// ====================== CREATE BOOKING ======================
export const createBooking = async (req, res) => {
  try {
    // Entry point
    console.log("createBooking: called");

    // Log incoming auth & payload (avoid logging full secrets)
    console.log("createBooking: req.user (safe):", {
      id: req.user?._id,
      role: req.user?.role,
      email: req.user?.email || "(no email in req.user)",
    });
    console.log("createBooking: req.body:", req.body);

    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    console.log("createBooking: variables extracted ->", { car, pickupDate, returnDate, userId: _id });

    // 1) Check availability for the selected date range
    console.log("createBooking: checking availability for car:", car);
    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    console.log("createBooking: checkAvailability result ->", isAvailable);

    if (!isAvailable) {
      console.log("createBooking: car is NOT available -> returning");
      return res.json({ success: false, message: "Car is not available" });
    }
    console.log("createBooking: car is available -> continuing");

    // 2) Fetch car data and populate owner (we need owner email & name)
    console.log("createBooking: fetching carData from DB with owner populated (email, name)");
    const carData = await Car.findById(car).populate("owner", "email name");
    console.log("createBooking: carData fetched ->", {
      id: carData?._id,
      brand: carData?.brand,
      model: carData?.model,
      owner: carData?.owner ? { id: carData.owner._id, name: carData.owner.name, email: carData.owner.email } : null,
    });

    // 3) Prevent owner from booking own car
    const ownerIdStr = carData?.owner?._id?.toString() || carData?.owner?.toString();
    console.log("createBooking: comparing ownerId and requesterId ->", { ownerIdStr, requesterId: _id.toString() });
    if (ownerIdStr === _id.toString()) {
      console.log("createBooking: owner attempted to book own car -> returning");
      return res.json({ success: false, message: "Owners cannot book their own cars" });
    }
    console.log("createBooking: owner check passed (not booking own car)");

    // 4) Price calculation based on days
    console.log("createBooking: calculating price");
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    console.log("createBooking: parsed dates ->", { picked: picked.toISOString(), returned: returned.toISOString() });

    const timeDiffMs = returned - picked;
    const noOfDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    const price = (carData?.pricePerDay || 0) * noOfDays;
    console.log("createBooking: pricing ->", { noOfDays, price, pricePerDay: carData?.pricePerDay });

    // 5) Handle uploaded files (driving license, identity card)
    console.log("createBooking: checking uploaded files (if any)");
    let drivingLicenseUrl, identityCardUrl;
    const dlFile = req.files?.drivingLicense?.[0];
    const idFile = req.files?.identityCard?.[0];
    console.log("createBooking: dlFile present?", !!dlFile, "idFile present?", !!idFile);
    if (dlFile) console.log("createBooking: dlFile meta ->", { originalname: dlFile.originalname, path: dlFile.path, mimetype: dlFile.mimetype, size: dlFile.size });
    if (idFile) console.log("createBooking: idFile meta ->", { originalname: idFile.originalname, path: idFile.path, mimetype: idFile.mimetype, size: idFile.size });

    // Helper: upload a file to ImageKit (with logs)
    const uploadToImageKit = async (file) => {
      if (!file) {
        console.log("uploadToImageKit: no file provided -> returning undefined");
        return undefined;
      }

      console.log("uploadToImageKit: reading file from disk ->", file.path);
      const fileBuffer = fs.readFileSync(file.path);
      console.log("uploadToImageKit: file read successfully (buffer length):", fileBuffer.length);

      // Create a hash to identify duplicate uploads
      const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      console.log("uploadToImageKit: generated fileHash ->", fileHash);

      let response;
      try {
        console.log("uploadToImageKit: checking existing files with same hash");
        const existing = await imagekit.listFiles({
          searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'bookings/'`,
          limit: 1,
        });

        console.log("uploadToImageKit: imagekit.listFiles result length ->", Array.isArray(existing) ? existing.length : "(not an array)");
        if (Array.isArray(existing) && existing.length > 0) {
          response = { url: existing[0].url };
          console.log("uploadToImageKit: found existing file ->", existing[0].url);
        }
      } catch (listErr) {
        console.log("uploadToImageKit: imagekit.listFiles threw an error ->", listErr?.message || listErr);
      }

      if (!response) {
        try {
          console.log("uploadToImageKit: uploading new file to ImageKit:", file.originalname);
          response = await imagekit.upload({
            file: fileBuffer,
            fileName: file.originalname,
            folder: "/bookings",
            tags: [`hash:${fileHash}`],
          });
          console.log("uploadToImageKit: upload successful ->", response?.url);
        } catch (uploadErr) {
          console.log("uploadToImageKit: imagekit.upload failed ->", uploadErr?.message || uploadErr);
          throw uploadErr; // bubble up -> will be caught in outer try/catch
        }
      }

      return response?.url;
    };

    // Attempt uploads (if files exist)
    try {
      drivingLicenseUrl = await uploadToImageKit(dlFile);
      console.log("createBooking: drivingLicenseUrl ->", drivingLicenseUrl);
    } catch (errDL) {
      console.log("createBooking: error uploading driving license ->", errDL?.message || errDL);
    }

    try {
      identityCardUrl = await uploadToImageKit(idFile);
      console.log("createBooking: identityCardUrl ->", identityCardUrl);
    } catch (errID) {
      console.log("createBooking: error uploading identity card ->", errID?.message || errID);
    }

    // 6) Prevent duplicate booking attempts for same user/car/dates
    console.log("createBooking: checking for existing booking with same car, user, pickupDate and returnDate");
    const existing = await Booking.findOne({ car, user: _id, pickupDate, returnDate });
    console.log("createBooking: existing booking found ->", !!existing);
    if (existing) {
      console.log("createBooking: duplicate booking attempt detected -> returning success (no-op)");
      return res.json({ success: true, message: "Booking Created" });
    }

    // 7) Create booking in DB
    console.log("createBooking: creating booking in DB");
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
    console.log("createBooking: booking created ->", { bookingId: booking._id, status: booking.status });

    // 8) Get user details (to email the booker)
    console.log("createBooking: fetching user details for email");
    const userData = await User.findById(_id);
    console.log("createBooking: userData ->", { id: userData._id, name: userData.name, email: userData.email });

    // debug console prints (sanity)
    console.log("createBooking: car owner email (from carData):", carData.owner?.email);
    console.log("createBooking: booker email (from userData):", userData?.email);

    // ================= EMAILS =================
    // Email to User (booker)
    try {
      console.log("createBooking: sending email to user:", userData?.email);
      const userEmailResult = await sendEmail({
        to: userData.email,
        subject: "Car Booking Created on Ridemate.",
        text: `Your car booking has been created on Ridemate.`,
        html: `
          <img src="imagekit URL here" alt="logo" width="120" style="margin-bottom: 16px;" />
          <h3>Car Booking Created</h3>
          <p>Your booking has been created. We will update you once the car owner confirms your booking.</p>
          <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
          <p><b>Owner:</b> ${carData.owner.name} (${carData.owner.email})</p>
          <p><b>Price:</b> ${price}</p>
          <p><b>Pickup:</b> ${pickupDate}</p>
          <p><b>Return:</b> ${returnDate}</p>
          <p><b>Status:</b> ${booking.status}</p>
        `,
      });
      console.log("createBooking: user email send result ->", userEmailResult);
    } catch (emailErrUser) {
      console.log("createBooking: failed to send email to user ->", emailErrUser?.message || emailErrUser);
    }

    // Email to Owner
    try {
      console.log("createBooking: sending email to owner:", carData.owner?.email);
      const ownerEmailResult = await sendEmail({
        to: carData.owner.email,
        subject: "New Booking Received on Ridemate.",
        text: `Your car has been booked. on Ridemate.`,
        html: `
          <h3>New Booking Received</h3>
          <p>Your car <b>${carData.brand} ${carData.model}</b> has been booked by ${userData.name} (${userData.email}).</p>
          <p>Please update the booking status.</p>
          <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
          <p><b>Price:</b> ${price}</p>
          <p><b>Pickup:</b> ${pickupDate}</p>
          <p><b>Return:</b> ${returnDate}</p>
          <p><b>Status:</b> ${booking.status}</p>
        `,
      });
      console.log("createBooking: owner email send result ->", ownerEmailResult);
    } catch (emailErrOwner) {
      console.log("createBooking: failed to send email to owner ->", emailErrOwner?.message || emailErrOwner);
    }

    // 9) Final response
    console.log("createBooking: finished successfully -> returning success response");
    res.json({ success: true, message: "Booking Created" });
  } catch (error) {
    // Catch any unexpected error and print stack for debugging
    console.error("createBooking: caught error ->", error?.message || error);
    console.error(error?.stack);
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

    // Send email to User
    let subject, message;
    if (status === "confirmed") {
      subject = "Your Booking Confirmed";
      message = "Your booking has been confirmed.";
    } else if (status === "cancelled") {
      subject = "Your Booking Cancelled";
      message = "Your booking has been cancelled.";
    } else {
      subject = "Booking Status Updated";
      message = `Your booking status changed to ${status}.`;
    }

    await sendEmail({
      to: booking.user.email,
      subject,
      html: `
        <h3>${subject}</h3>
        <p>${message}</p>
        <p><b>Car:</b> ${booking.car.brand} ${booking.car.model}</p>
        <p><b>Owner:</b> ${booking.owner.name} (${booking.owner.email})</p>
        <p><b>Price:</b> ${booking.price}</p>
        <p><b>Pickup:</b> ${booking.pickupDate}</p>
        <p><b>Return:</b> ${booking.returnDate}</p>
        <p><b>Status:</b> ${booking.status}</p>
      `,
    });

    res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};



// // ====================== DELETE BOOKING ======================
// export const deleteBooking = async (req, res) => {
//   try {
//     const { _id } = req.user;                   // logged-in user
//     const { bookingId } = req.params.id;           // booking to delete

//     const booking = await Booking.findById(bookingId);
//     if (!booking) {
//       return res.json({ success: false, message: "Booking not found" });
//     }

//     // ✅ Only booking owner (user who created) OR car owner can delete
//     if (
//       booking.user.toString() !== _id.toString() &&
//       booking.owner.toString() !== _id.toString()
//     ) {
//       return res.json({ success: false, message: "Unauthorized" });
//     }

//     await Booking.findByIdAndDelete(bookingId);

//     return res.json({ success: true, message: "Booking deleted successfully" });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// ====================== DELETE BOOKING ======================
export const deleteBooking = async (req, res) => {
  try {
    // 🔹 Logged-in user
    const { _id } = req.user;

    // 🔹 Booking ID from route param
    const bookingId = req.params.id;
    console.log("🆔 Booking ID to delete:", bookingId);
    console.log("👤 Logged-in user ID:", _id);

    // 🔹 Find the booking
    const booking = await Booking.findById(bookingId);
    console.log("📦 Booking found:", booking);

    if (!booking) {
      console.warn("⚠️ Booking not found");
      return res.json({ success: false, message: "Booking not found" });
    }

    // 🔹 Check if user is authorized to delete
    if (
      booking.user.toString() !== _id.toString() &&
      booking.owner.toString() !== _id.toString()
    ) {
      console.warn("❌ Unauthorized delete attempt");
      return res.json({ success: false, message: "Unauthorized" });
    }

    // 🔹 Delete the booking
    await Booking.findByIdAndDelete(bookingId);
    console.log("✅ Booking deleted successfully");

    // 🔹 Send success response
    return res.json({ success: true, message: "Booking deleted successfully" });

  } catch (error) {
    console.error("🔥 Error deleting booking:", error);
    return res.json({ success: false, message: error.message });
  }
};

