
// // Function to check Availability of car for a given Date 

// import Booking from "../models/Booking.js"
// import Car from "../models/Car.js";
// import imagekit from "../configs/imageKit.js";
// import fs from "fs";
// import crypto from "crypto";

// // For SMTP setup email.
// import User from "../models/User.js";
// import { sendEmail } from "../utils/emailService.js";

// const checkAvailability = async (car, pickupDate, returnDate) => {
//     const bookings = await Booking.find({
//         car,
//         pickupDate: { $lte: returnDate },
//         returnDate: { $gte: pickupDate }
//     })
//     return bookings.length === 0;
// }

// // API TO CHECK AVAILABILITY OF CARS FOR GIVEN DATE 
// export const checkAvailabilityOfCar = async (req, res) => {
//     try {
//         const { location, pickupDate, returnDate } = req.body


//         // Fetch all available cars for given location 
//         const cars = await Car.find({ location, isAvailable: true })

//         // Check car availability for given date range using PROMISE
//         const availableCarsPromises = cars.map(async (car) => {
//             const isAvailable = await checkAvailability(car._id, pickupDate, returnDate)
//             return { ...car._doc, isAvailable: isAvailable }
//         })

//         let availableCars = await Promise.all(availableCarsPromises);
//         availableCars = availableCars.filter(car => car.isAvailable === true)

//         res.json({ success: true, availableCars })

//     } catch (error) {
//         console.log(error);
//         res.json({ success: false, message: error.message })

//     }
// }

// // API to List User Bookings
// export const getUserBookings = async (req, res) => {
//     try {
//         const { _id } = req.user;
//         const bookings = await Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 })
//         res.json({ success: true, bookings })
//     } catch (error) {
//         console.log(error.message);
//         res.json({ success: false, message: error.message })
//     }
// }

// // API to get owner bookings 
// export const getOwnerBookings = async (req, res) => {
//     try {
//         if (req.user.role !== 'owner') {
//             return res.json({ success: false, message: "Not Authorized" })
//         }
//         // const bookings =await Booking.find({owner: req.user._id}).populate('car user').select("user","-password").sort({createdAt: -1})

//         const bookings = await Booking.find({ owner: req.user._id })
//             .populate('car')
//             .populate('user', '-password') // exclude password
//             .sort({ createdAt: -1 });

//         res.json({ success: true, bookings })
//     } catch (error) {
//         console.log(error.message);
//         res.json({ success: false, message: error.message })
//     }
// }

// // ===========================NEW API's with Email Setup.========================================
// // ====================== CREATE BOOKING ======================
// export const createBooking = async (req, res) => {
//   try {
//     // Entry point
//     console.log("createBooking: called");

//     // Log incoming auth & payload (avoid logging full secrets)
//     console.log("createBooking: req.user (safe):", {
//       id: req.user?._id,
//       role: req.user?.role,
//       email: req.user?.email || "(no email in req.user)",
//     });
//     console.log("createBooking: req.body:", req.body);

//     const { _id } = req.user;
//     const { car, pickupDate, returnDate } = req.body;

//     console.log("createBooking: variables extracted ->", { car, pickupDate, returnDate, userId: _id });

//     // 1) Check availability for the selected date range
//     console.log("createBooking: checking availability for car:", car);
//     const isAvailable = await checkAvailability(car, pickupDate, returnDate);
//     console.log("createBooking: checkAvailability result ->", isAvailable);

//     if (!isAvailable) {
//       console.log("createBooking: car is NOT available -> returning");
//       return res.json({ success: false, message: "Car is not available" });
//     }
//     console.log("createBooking: car is available -> continuing");

//     // 2) Fetch car data and populate owner (we need owner email & name)
//     console.log("createBooking: fetching carData from DB with owner populated (email, name)");
//     const carData = await Car.findById(car).populate("owner", "email name");
//     console.log("createBooking: carData fetched ->", {
//       id: carData?._id,
//       brand: carData?.brand,
//       model: carData?.model,
//       owner: carData?.owner ? { id: carData.owner._id, name: carData.owner.name, email: carData.owner.email } : null,
//     });

//     // 3) Prevent owner from booking own car
//     const ownerIdStr = carData?.owner?._id?.toString() || carData?.owner?.toString();
//     console.log("createBooking: comparing ownerId and requesterId ->", { ownerIdStr, requesterId: _id.toString() });
//     if (ownerIdStr === _id.toString()) {
//       console.log("createBooking: owner attempted to book own car -> returning");
//       return res.json({ success: false, message: "Owners cannot book their own cars" });
//     }
//     console.log("createBooking: owner check passed (not booking own car)");

//     // 4) Price calculation based on days
//     console.log("createBooking: calculating price");
//     const picked = new Date(pickupDate);
//     const returned = new Date(returnDate);
//     console.log("createBooking: parsed dates ->", { picked: picked.toISOString(), returned: returned.toISOString() });

//     const timeDiffMs = returned - picked;
//     const noOfDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
//     const price = (carData?.pricePerDay || 0) * noOfDays;
//     console.log("createBooking: pricing ->", { noOfDays, price, pricePerDay: carData?.pricePerDay });

//     // 5) Handle uploaded files (driving license, identity card)
//     console.log("createBooking: checking uploaded files (if any)");
//     let drivingLicenseUrl, identityCardUrl;
//     const dlFile = req.files?.drivingLicense?.[0];
//     const idFile = req.files?.identityCard?.[0];
//     console.log("createBooking: dlFile present?", !!dlFile, "idFile present?", !!idFile);
//     if (dlFile) console.log("createBooking: dlFile meta ->", { originalname: dlFile.originalname, path: dlFile.path, mimetype: dlFile.mimetype, size: dlFile.size });
//     if (idFile) console.log("createBooking: idFile meta ->", { originalname: idFile.originalname, path: idFile.path, mimetype: idFile.mimetype, size: idFile.size });

//     // Helper: upload a file to ImageKit (with logs)
//     const uploadToImageKit = async (file) => {
//       if (!file) {
//         console.log("uploadToImageKit: no file provided -> returning undefined");
//         return undefined;
//       }

//       console.log("uploadToImageKit: reading file from disk ->", file.path);
//       const fileBuffer = fs.readFileSync(file.path);
//       console.log("uploadToImageKit: file read successfully (buffer length):", fileBuffer.length);

//       // Create a hash to identify duplicate uploads
//       const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
//       console.log("uploadToImageKit: generated fileHash ->", fileHash);

//       let response;
//       try {
//         console.log("uploadToImageKit: checking existing files with same hash");
//         const existing = await imagekit.listFiles({
//           searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'bookings/'`,
//           limit: 1,
//         });

//         console.log("uploadToImageKit: imagekit.listFiles result length ->", Array.isArray(existing) ? existing.length : "(not an array)");
//         if (Array.isArray(existing) && existing.length > 0) {
//           response = { url: existing[0].url };
//           console.log("uploadToImageKit: found existing file ->", existing[0].url);
//         }
//       } catch (listErr) {
//         console.log("uploadToImageKit: imagekit.listFiles threw an error ->", listErr?.message || listErr);
//       }

//       if (!response) {
//         try {
//           console.log("uploadToImageKit: uploading new file to ImageKit:", file.originalname);
//           response = await imagekit.upload({
//             file: fileBuffer,
//             fileName: file.originalname,
//             folder: "/bookings",
//             tags: [`hash:${fileHash}`],
//           });
//           console.log("uploadToImageKit: upload successful ->", response?.url);
//         } catch (uploadErr) {
//           console.log("uploadToImageKit: imagekit.upload failed ->", uploadErr?.message || uploadErr);
//           throw uploadErr; // bubble up -> will be caught in outer try/catch
//         }
//       }

//       return response?.url;
//     };

//     // Attempt uploads (if files exist)
//     try {
//       drivingLicenseUrl = await uploadToImageKit(dlFile);
//       console.log("createBooking: drivingLicenseUrl ->", drivingLicenseUrl);
//     } catch (errDL) {
//       console.log("createBooking: error uploading driving license ->", errDL?.message || errDL);
//     }

//     try {
//       identityCardUrl = await uploadToImageKit(idFile);
//       console.log("createBooking: identityCardUrl ->", identityCardUrl);
//     } catch (errID) {
//       console.log("createBooking: error uploading identity card ->", errID?.message || errID);
//     }

//     // 6) Prevent duplicate booking attempts for same user/car/dates
//     console.log("createBooking: checking for existing booking with same car, user, pickupDate and returnDate");
//     const existing = await Booking.findOne({ car, user: _id, pickupDate, returnDate });
//     console.log("createBooking: existing booking found ->", !!existing);
//     if (existing) {
//       console.log("createBooking: duplicate booking attempt detected -> returning success (no-op)");
//       return res.json({ success: true, message: "Booking Created" });
//     }

//     // 7) Create booking in DB
//     console.log("createBooking: creating booking in DB");
//     const booking = await Booking.create({
//       car,
//       owner: carData.owner._id,
//       user: _id,
//       pickupDate,
//       returnDate,
//       price,
//       status: "pending",
//       documents: {
//         drivingLicenseUrl,
//         identityCardUrl,
//       },
//     });
//     console.log("createBooking: booking created ->", { bookingId: booking._id, status: booking.status });

//     // 8) Get user details (to email the booker)
//     console.log("createBooking: fetching user details for email");
//     const userData = await User.findById(_id);
//     console.log("createBooking: userData ->", { id: userData._id, name: userData.name, email: userData.email });

//     // debug console prints (sanity)
//     console.log("createBooking: car owner email (from carData):", carData.owner?.email);
//     console.log("createBooking: booker email (from userData):", userData?.email);

//     // ================= EMAILS =================
//     // Email to User (booker)
//     try {
//       console.log("createBooking: sending email to user:", userData?.email);
//       const userEmailResult = await sendEmail({
//         to: userData.email,
//         subject: "Car Booking Created on Ridemate.",
//         text: `Your car booking has been created on Ridemate.`,
//         html: `
//           <img src="imagekit URL here" alt="logo" width="120" style="margin-bottom: 16px;" />
//           <h3>Car Booking Created</h3>
//           <p>Your booking has been created. We will update you once the car owner confirms your booking.</p>
//           <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
//           <p><b>Owner:</b> ${carData.owner.name} (${carData.owner.email})</p>
//           <p><b>Price:</b> ${price}</p>
//           <p><b>Pickup:</b> ${pickupDate}</p>
//           <p><b>Return:</b> ${returnDate}</p>
//           <p><b>Status:</b> ${booking.status}</p>
//         `,
//       });
//       console.log("createBooking: user email send result ->", userEmailResult);
//     } catch (emailErrUser) {
//       console.log("createBooking: failed to send email to user ->", emailErrUser?.message || emailErrUser);
//     }

//     // Email to Owner
//     try {
//       console.log("createBooking: sending email to owner:", carData.owner?.email);
//       const ownerEmailResult = await sendEmail({
//         to: carData.owner.email,
//         subject: "New Booking Received on Ridemate.",
//         text: `Your car has been booked. on Ridemate.`,
//         html: `
//           <h3>New Booking Received</h3>
//           <p>Your car <b>${carData.brand} ${carData.model}</b> has been booked by ${userData.name} (${userData.email}).</p>
//           <p>Please update the booking status.</p>
//           <p><b>Car:</b> ${carData.brand} ${carData.model}</p>
//           <p><b>Price:</b> ${price}</p>
//           <p><b>Pickup:</b> ${pickupDate}</p>
//           <p><b>Return:</b> ${returnDate}</p>
//           <p><b>Status:</b> ${booking.status}</p>
//         `,
//       });
//       console.log("createBooking: owner email send result ->", ownerEmailResult);
//     } catch (emailErrOwner) {
//       console.log("createBooking: failed to send email to owner ->", emailErrOwner?.message || emailErrOwner);
//     }

//     // 9) Final response
//     console.log("createBooking: finished successfully -> returning success response");
//     res.json({ success: true, message: "Booking Created" });
//   } catch (error) {
//     // Catch any unexpected error and print stack for debugging
//     console.error("createBooking: caught error ->", error?.message || error);
//     console.error(error?.stack);
//     res.json({ success: false, message: error.message });
//   }
// };

// // ====================== CHANGE STATUS ======================
// export const changeBookingStatus = async (req, res) => {
//   try {
//     const { _id } = req.user;
//     const { bookingId, status } = req.body;

//     const booking = await Booking.findById(bookingId).populate("car user owner");

//     if (booking.owner._id.toString() !== _id.toString()) {
//       return res.json({ success: false, message: "Unauthorized" });
//     }

//     booking.status = status;
//     await booking.save();

//     // Send email to User
//     let subject, message;
//     if (status === "confirmed") {
//       subject = "Your Booking Confirmed";
//       message = "Your booking has been confirmed.";
//     } else if (status === "cancelled") {
//       subject = "Your Booking Cancelled";
//       message = "Your booking has been cancelled.";
//     } else {
//       subject = "Booking Status Updated";
//       message = `Your booking status changed to ${status}.`;
//     }

//     await sendEmail({
//       to: booking.user.email,
//       subject,
//       html: `
//         <h3>${subject}</h3>
//         <p>${message}</p>
//         <p><b>Car:</b> ${booking.car.brand} ${booking.car.model}</p>
//         <p><b>Owner:</b> ${booking.owner.name} (${booking.owner.email})</p>
//         <p><b>Price:</b> ${booking.price}</p>
//         <p><b>Pickup:</b> ${booking.pickupDate}</p>
//         <p><b>Return:</b> ${booking.returnDate}</p>
//         <p><b>Status:</b> ${booking.status}</p>
//       `,
//     });

//     res.json({ success: true, message: "Status updated" });
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };

// // ====================== DELETE BOOKING without EMAIL======================
// // export const deleteBooking = async (req, res) => {
// //   try {
// //     // 🔹 Logged-in user
// //     const { _id } = req.user;

// //     // 🔹 Booking ID from route param
// //     const bookingId = req.params.id;
// //     console.log("🆔 Booking ID to delete:", bookingId);
// //     console.log("👤 Logged-in user ID:", _id);

// //     // 🔹 Find the booking
// //     const booking = await Booking.findById(bookingId);
// //     console.log("📦 Booking found:", booking);

// //     if (!booking) {
// //       console.warn("⚠️ Booking not found");
// //       return res.json({ success: false, message: "Booking not found" });
// //     }

// //     // 🔹 Check if user is authorized to delete
// //     if (
// //       booking.user.toString() !== _id.toString() &&
// //       booking.owner.toString() !== _id.toString()
// //     ) {
// //       console.warn("❌ Unauthorized delete attempt");
// //       return res.json({ success: false, message: "Unauthorized" });
// //     }

// //     // 🔹 Delete the booking
// //     await Booking.findByIdAndDelete(bookingId);
// //     console.log("✅ Booking deleted successfully");

// //     // 🔹 Send success response
// //     return res.json({ success: true, message: "Booking deleted successfully" });

// //   } catch (error) {
// //     console.error("🔥 Error deleting booking:", error);
// //     return res.json({ success: false, message: error.message });
// //   }
// // };



// // ====================== DELETE BOOKING with EMAIL ======================
// export const deleteBooking = async (req, res) => {
//   try {
//     // 🔹 Logged-in user
//     const { _id, role } = req.user;

//     // 🔹 Booking ID from route param
//     const bookingId = req.params.id;
//     console.log("🆔 Booking ID to delete:", bookingId);
//     console.log("👤 Logged-in user ID:", _id);
//     console.log("🎭 User role:", role);

//     // 🔹 Find the booking with populated data for email notifications
//     const booking = await Booking.findById(bookingId)
//       .populate("car")
//       .populate("user", "name email")
//       .populate("owner", "name email");
    
//     console.log("📦 Booking found:", booking ? {
//       id: booking._id,
//       car: booking.car?.brand + " " + booking.car?.model,
//       user: booking.user?.name,
//       owner: booking.owner?.name,
//       status: booking.status
//     } : "Not found");

//     if (!booking) {
//       console.warn("⚠️ Booking not found");
//       return res.json({ success: false, message: "Booking not found" });
//     }

//     // 🔹 Check if user is authorized to delete
//     const isUser = booking.user?._id?.toString() === _id.toString();
//     const isOwner = booking.owner?._id?.toString() === _id.toString();
//     const isAdmin = role === 'admin';

//     console.log("🔐 Authorization check:", { isUser, isOwner, isAdmin });

//     if (!isUser && !isOwner && !isAdmin) {
//       console.warn("❌ Unauthorized delete attempt");
//       return res.json({ success: false, message: "Unauthorized" });
//     }

//     // 🔹 Store booking details for email before deletion
//     const bookingDetails = {
//       car: `${booking.car?.brand} ${booking.car?.model}`,
//       price: booking.price,
//       pickupDate: booking.pickupDate,
//       returnDate: booking.returnDate,
//       status: booking.status,
//       userName: booking.user?.name,
//       userEmail: booking.user?.email,
//       ownerName: booking.owner?.name,
//       ownerEmail: booking.owner?.email,
//       deletedBy: req.user.name || req.user.email,
//       deletedByRole: role
//     };

//     console.log("📝 Stored booking details for email:", bookingDetails);

//     // 🔹 Delete the booking
//     await Booking.findByIdAndDelete(bookingId);
//     console.log("✅ Booking deleted successfully");

//     // 🔹 Send email notifications
//     try {
//       // Determine who initiated the deletion and send appropriate emails
//       if (isOwner || isAdmin) {
//         // Owner/Admin deleted the booking - notify user
//         console.log("📧 Sending deletion email to user:", bookingDetails.userEmail);
        
//         await sendEmail({
//           to: bookingDetails.userEmail,
//           subject: "Your Booking Has Been Cancelled - Ridemate",
//           html: `
//             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//               <div style="text-align: center; margin-bottom: 20px;">
//                 <img src="https://your-imagekit-url/ridemate-logo.png" alt="Ridemate Logo" width="120" style="margin-bottom: 16px;" />
//               </div>
//               <h3 style="color: #e74c3c;">Booking Cancelled</h3>
//               <p>Your booking has been cancelled by ${bookingDetails.deletedBy} (${bookingDetails.deletedByRole}).</p>
              
//               <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
//                 <h4 style="margin-top: 0; color: #2c3e50;">Booking Details:</h4>
//                 <p><strong>Car:</strong> ${bookingDetails.car}</p>
//                 <p><strong>Price:</strong> $${bookingDetails.price}</p>
//                 <p><strong>Pickup Date:</strong> ${new Date(bookingDetails.pickupDate).toLocaleDateString()}</p>
//                 <p><strong>Return Date:</strong> ${new Date(bookingDetails.returnDate).toLocaleDateString()}</p>
//                 <p><strong>Cancelled By:</strong> ${bookingDetails.deletedBy} (${bookingDetails.deletedByRole})</p>
//               </div>
              
//               <p>If you have any questions, please contact our support team.</p>
//               <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
//                 Best regards,<br>The Ridemate Team
//               </p>
//             </div>
//           `,
//         });
//         console.log("✅ Deletion email sent to user");

//       } else if (isUser) {
//         // User deleted their own booking - notify owner
//         console.log("📧 Sending deletion email to owner:", bookingDetails.ownerEmail);
        
//         await sendEmail({
//           to: bookingDetails.ownerEmail,
//           subject: "Booking Cancelled by User - Ridemate",
//           html: `
//             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//               <div style="text-align: center; margin-bottom: 20px;">
//                 <img src="https://your-imagekit-url/ridemate-logo.png" alt="Ridemate Logo" width="120" style="margin-bottom: 16px;" />
//               </div>
//               <h3 style="color: #e74c3c;">Booking Cancelled</h3>
//               <p>A user has cancelled their booking for your car.</p>
              
//               <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
//                 <h4 style="margin-top: 0; color: #2c3e50;">Booking Details:</h4>
//                 <p><strong>Car:</strong> ${bookingDetails.car}</p>
//                 <p><strong>Price:</strong> $${bookingDetails.price}</p>
//                 <p><strong>Pickup Date:</strong> ${new Date(bookingDetails.pickupDate).toLocaleDateString()}</p>
//                 <p><strong>Return Date:</strong> ${new Date(bookingDetails.returnDate).toLocaleDateString()}</p>
//                 <p><strong>Cancelled By:</strong> ${bookingDetails.userName} (User)</p>
//               </div>
              
//               <p>Your car is now available for other bookings.</p>
//               <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
//                 Best regards,<br>The Ridemate Team
//               </p>
//             </div>
//           `,
//         });
//         console.log("✅ Deletion email sent to owner");
//       }

//       // Optional: Send notification to admin for record keeping
//       if (role !== 'admin') {
//         console.log("📧 Sending admin notification");
//         // You can add admin email here if needed
//         // await sendEmail({ to: 'admin@ridemate.com', ... });
//       }

//     } catch (emailError) {
//       console.error("❌ Failed to send deletion emails:", emailError.message);
//       // Don't fail the deletion if emails fail, just log the error
//     }

//     // 🔹 Send success response
//     return res.json({ 
//       success: true, 
//       message: "Booking deleted successfully",
//       notification: "All parties have been notified via email"
//     });

//   } catch (error) {
//     console.error("🔥 Error deleting booking:", error);
//     return res.json({ success: false, message: error.message });
//   }
// };






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

        const bookings = await Booking.find({ owner: req.user._id })
            .populate('car')
            .populate('user', '-password')
            .sort({ createdAt: -1 });

        res.json({ success: true, bookings })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// ===========================NEW API's with Email Setup.========================================
// ====================== CREATE BOOKING ======================
export const createBooking = async (req, res) => {
  try {
    console.log("createBooking: called");

    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    console.log("createBooking: variables extracted ->", { car, pickupDate, returnDate, userId: _id });

    // 1) Check availability
    console.log("createBooking: checking availability for car:", car);
    const isAvailable = await checkAvailability(car, pickupDate, returnDate);
    console.log("createBooking: checkAvailability result ->", isAvailable);

    if (!isAvailable) {
      console.log("createBooking: car is NOT available -> returning");
      return res.json({ success: false, message: "Car is not available" });
    }
    console.log("createBooking: car is available -> continuing");

    // 2) Fetch car data
    console.log("createBooking: fetching carData from DB");
    const carData = await Car.findById(car).populate("owner", "email name");
    console.log("createBooking: carData fetched ->", {
      id: carData?._id,
      brand: carData?.brand,
      model: carData?.model,
    });

    // 3) Prevent owner from booking own car
    const ownerIdStr = carData?.owner?._id?.toString() || carData?.owner?.toString();
    console.log("createBooking: comparing ownerId and requesterId ->", { ownerIdStr, requesterId: _id.toString() });
    if (ownerIdStr === _id.toString()) {
      console.log("createBooking: owner attempted to book own car -> returning");
      return res.json({ success: false, message: "Owners cannot book their own cars" });
    }
    console.log("createBooking: owner check passed");

    // 4) Price calculation
    console.log("createBooking: calculating price");
    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    console.log("createBooking: parsed dates ->", { picked: picked.toISOString(), returned: returned.toISOString() });

    const timeDiffMs = returned - picked;
    const noOfDays = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    const price = (carData?.pricePerDay || 0) * noOfDays;
    console.log("createBooking: pricing ->", { noOfDays, price, pricePerDay: carData?.pricePerDay });

    // 5) Handle uploaded files
    console.log("createBooking: checking uploaded files");
    let drivingLicenseUrl, identityCardUrl;
    const dlFile = req.files?.drivingLicense?.[0];
    const idFile = req.files?.identityCard?.[0];
    console.log("createBooking: dlFile present?", !!dlFile, "idFile present?", !!idFile);

    const uploadToImageKit = async (file) => {
      if (!file) {
        console.log("uploadToImageKit: no file provided -> returning undefined");
        return undefined;
      }

      console.log("uploadToImageKit: reading file from disk ->", file.path);
      const fileBuffer = fs.readFileSync(file.path);
      console.log("uploadToImageKit: file read successfully (buffer length):", fileBuffer.length);

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
      console.log("createBooking: error uploading driving license ->", errDL?.message || errDL);
    }

    try {
      identityCardUrl = await uploadToImageKit(idFile);
      console.log("createBooking: identityCardUrl ->", identityCardUrl);
    } catch (errID) {
      console.log("createBooking: error uploading identity card ->", errID?.message || errID);
    }

    // 6) Prevent duplicate booking
    console.log("createBooking: checking for existing booking");
    const existing = await Booking.findOne({ car, user: _id, pickupDate, returnDate });
    console.log("createBooking: existing booking found ->", !!existing);
    if (existing) {
      console.log("createBooking: duplicate booking attempt detected -> returning success");
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

    // 🟢 DISABLED EMAILS FOR TESTING
    console.log("createBooking: EMAILS DISABLED FOR PERFORMANCE TESTING");

    // 8) Final response
    console.log("createBooking: finished successfully -> returning success response");
    res.json({ success: true, message: "Booking Created" });
  } catch (error) {
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

    // 🟢 DISABLED EMAILS FOR TESTING
    console.log("changeBookingStatus: EMAILS DISABLED FOR PERFORMANCE TESTING");

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
    console.log("🆔 Booking ID to delete:", bookingId);
    console.log("👤 Logged-in user ID:", _id);
    console.log("🎭 User role:", role);

    const booking = await Booking.findById(bookingId)
      .populate("car")
      .populate("user", "name email")
      .populate("owner", "name email");
    
    console.log("📦 Booking found:", booking ? {
      id: booking._id,
      car: booking.car?.brand + " " + booking.car?.model,
      user: booking.user?.name,
      owner: booking.owner?.name,
      status: booking.status
    } : "Not found");

    if (!booking) {
      console.warn("⚠️ Booking not found");
      return res.json({ success: false, message: "Booking not found" });
    }

    const isUser = booking.user?._id?.toString() === _id.toString();
    const isOwner = booking.owner?._id?.toString() === _id.toString();
    const isAdmin = role === 'admin';

    console.log("🔐 Authorization check:", { isUser, isOwner, isAdmin });

    if (!isUser && !isOwner && !isAdmin) {
      console.warn("❌ Unauthorized delete attempt");
      return res.json({ success: false, message: "Unauthorized" });
    }

    // 🔹 Delete the booking
    await Booking.findByIdAndDelete(bookingId);
    console.log("✅ Booking deleted successfully");

    // 🟢 DISABLED EMAILS FOR TESTING
    console.log("deleteBooking: EMAILS DISABLED FOR PERFORMANCE TESTING");

    return res.json({ 
      success: true, 
      message: "Booking deleted successfully"
    });

  } catch (error) {
    console.error("🔥 Error deleting booking:", error);
    return res.json({ success: false, message: error.message });
  }
};