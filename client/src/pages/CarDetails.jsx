import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loader from "../components/Loader";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion } from "motion/react";

const CarDetails = () => {
  const { id } = useParams();

  const {
    cars,
    axios,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
    user,
    setShowLogin,
  } = useAppContext();

  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const currency = import.meta.env.VITE_CURRENCY;
  const [licenseFile, setLicenseFile] = useState(null);
  const [idCardFile, setIdCardFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 Image compression function
  const compressImage = (file) => {
    return new Promise((resolve) => {
      console.log("📦 Original file size:", (file.size / 1024 / 1024).toFixed(2), "MB");
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set maximum dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let { width, height } = img;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            console.log("📦 Compressed file size:", (blob.size / 1024 / 1024).toFixed(2), "MB");
            resolve(blob);
          }, 'image/jpeg', 0.7); // 70% quality
        };
      };
    });
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   console.log("🟢 handleSubmit triggered");

  //   if (isSubmitting) {
  //     console.log("⚠️ Already submitting, returning early");
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   console.log("⏳ Set isSubmitting = true");

  //   const loadingId = toast.loading("Creating booking...");
  //   console.log("📢 Toast shown: Creating booking...");

  //   // 🔹 Auth check
  //   if (!user) {
  //     console.log("❌ No user found, showing login modal");
  //     toast.error("Login to Book a Car", { id: loadingId });
  //     setShowLogin(true);
  //     setIsSubmitting(false);
  //     return;
  //   }
  //   console.log("✅ User found:", user);

  //   // 🔹 Prevent owner booking
  //   const localUser = JSON.parse(localStorage.getItem("user"));
  //   console.log("📦 localStorage user:", localUser);
  //   console.log("📦 Car owner:", car?.owner);

  //   if (car?.owner === localUser?._id) {
  //     console.log("❌ Owner tried to book own car. Stopping here.");
  //     toast.error("Owner cannot book their own car!", { id: loadingId });
  //     setIsSubmitting(false);
  //     return;
  //   }

  //   // 🟢 FILE SIZE VALIDATION
  //   const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max

  //   if (licenseFile && licenseFile.size > MAX_FILE_SIZE) {
  //     console.log("❌ License file too large:", (licenseFile.size / 1024 / 1024).toFixed(2), "MB");
  //     toast.error("License file too large (max 2MB)", { id: loadingId });
  //     setIsSubmitting(false);
  //     return;
  //   }

  //   if (idCardFile && idCardFile.size > MAX_FILE_SIZE) {
  //     console.log("❌ ID card file too large:", (idCardFile.size / 1024 / 1024).toFixed(2), "MB");
  //     toast.error("ID card file too large (max 2MB)", { id: loadingId });
  //     setIsSubmitting(false);
  //     return;
  //   }

  //   try {
  //     console.log("🛠 Preparing FormData...");
  //     const formData = new FormData();
  //     formData.append("car", id);
  //     formData.append("pickupDate", pickupDate);
  //     formData.append("returnDate", returnDate);

  //     // 🟢 COMPRESS AND APPEND FILES
  //     if (licenseFile) {
  //       console.log("📎 Compressing license file...");
  //       const compressedLicense = await compressImage(licenseFile);
  //       formData.append("drivingLicense", compressedLicense, "license.jpg");
  //     }
  //     if (idCardFile) {
  //       console.log("📎 Compressing ID card file...");
  //       const compressedIdCard = await compressImage(idCardFile);
  //       formData.append("identityCard", compressedIdCard, "idcard.jpg");
  //     }

  //     console.log("🚀 Sending POST request to /api/bookings/create...");
  //     const startTime = Date.now();
  //     const { data } = await axios.post("/api/bookings/create", formData, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     });
  //     const endTime = Date.now();
  //     console.log(`⏱️ API response time: ${endTime - startTime}ms`);

  //     console.log("📩 Response from backend:", data);

  //     if (data.success) {
  //       console.log("✅ Booking successful. Navigating to /my-bookings");
  //       toast.success(data.message || "Booking Created", { id: loadingId });
  //       navigate("/my-bookings");
  //     } else {
  //       console.log("❌ Booking failed:", data.message);
  //       toast.error(data.message || "Failed to create booking", {
  //         id: loadingId,
  //       });
  //     }
  //   } catch (error) {
  //     console.log("🔥 API error:", error);
  //     toast.error(error.message, { id: loadingId });
  //   } finally {
  //     setIsSubmitting(false);
  //     console.log("🔄 Reset isSubmitting = false (finally block)");
  //   }
  // };


  const handleSubmit = async (e) => {
  e.preventDefault();
  console.log("🟢 handleSubmit triggered");

  if (isSubmitting) {
    console.log("⚠️ Already submitting, returning early");
    return;
  }

  setIsSubmitting(true);
  console.log("⏳ Set isSubmitting = true");

  const loadingId = toast.loading("Creating booking...");
  console.log("📢 Toast shown: Creating booking...");

  // 🔹 Auth check
  if (!user) {
    console.log("❌ No user found, showing login modal");
    toast.error("Login to Book a Car", { id: loadingId });
    setShowLogin(true);
    setIsSubmitting(false);
    return;
  }
  console.log("✅ User found:", user);

  // 🔹 Prevent owner booking
  const localUser = JSON.parse(localStorage.getItem("user"));
  console.log("📦 localStorage user:", localUser);
  console.log("📦 Car owner:", car?.owner);

  if (car?.owner === localUser?._id) {
    console.log("❌ Owner tried to book own car. Stopping here.");
    toast.error("Owner cannot book their own car!", { id: loadingId });
    setIsSubmitting(false);
    return;
  }

  // 🟢 FILE SIZE VALIDATION
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max

  if (licenseFile && licenseFile.size > MAX_FILE_SIZE) {
    console.log("❌ License file too large:", (licenseFile.size / 1024 / 1024).toFixed(2), "MB");
    toast.error("License file too large (max 2MB)", { id: loadingId });
    setIsSubmitting(false);
    return;
  }

  if (idCardFile && idCardFile.size > MAX_FILE_SIZE) {
    console.log("❌ ID card file too large:", (idCardFile.size / 1024 / 1024).toFixed(2), "MB");
    toast.error("ID card file too large (max 2MB)", { id: loadingId });
    setIsSubmitting(false);
    return;
  }

try {
  console.log("🛠 Preparing FormData...");
  const formData = new FormData();
  formData.append("car", id);
  formData.append("pickupDate", pickupDate);
  formData.append("returnDate", returnDate);

  // 🟢 COMPRESS AND APPEND FILES
  if (licenseFile) {
    console.log("📎 Compressing license file...");
    const compressedLicense = await compressImage(licenseFile);
    formData.append("drivingLicense", compressedLicense, "license.jpg");
  }
  if (idCardFile) {
    console.log("📎 Compressing ID card file...");
    const compressedIdCard = await compressImage(idCardFile);
    formData.append("identityCard", compressedIdCard, "idcard.jpg");
  }

  console.log("🚀 Sending POST request to /api/bookings/create...");
  const startTime = Date.now();
  
  // 🟢 ADD TIMEOUT FOR DEPLOYED ENVIRONMENT
  const { data } = await axios.post("/api/bookings/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 5000, // 5 seconds timeout
  });
  
  const endTime = Date.now();
  console.log(`⏱️ API response time: ${endTime - startTime}ms`);

  console.log("📩 Response from backend:", data);

  if (data.success) {
    console.log("✅ Booking successful. Navigating to /my-bookings");
    toast.success(data.message || "Booking Created", { id: loadingId });
    
    // 🟢 FIX: Reset state BEFORE navigation
    setIsSubmitting(false);
    console.log("🔄 Reset isSubmitting = false BEFORE navigation");
    
    navigate("/my-bookings");
  } else {
    console.log("❌ Booking failed:", data.message);
    toast.error(data.message || "Failed to create booking", {
      id: loadingId,
    });
  }
} catch (error) {
  console.log("🔥 API error:", error);
  
  // 🟢 SPECIFIC ERROR HANDLING
  if (error.code === 'ECONNABORTED') {
    toast.error("Request timeout - please try again", { id: loadingId });
  } else {
    toast.error(error.message, { id: loadingId });
  }
} finally {
  // 🟢 Only reset if not already reset (for success case)
  if (isSubmitting) {
    setIsSubmitting(false);
    console.log("🔄 Reset isSubmitting = false (finally block)");
  }
}

  useEffect(() => {
    const selectedCar = cars.find((car) => car._id === id);
    setCar(selectedCar);
  }, [cars, id]);

  return car ? (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 mt-16">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mt-6 text-gray-500 cursor-pointer"
      >
        <img src={assets.arrow_icon} alt="" className="rotate-180 opacity-65" />
        Back to all Cars{" "}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Left: Car Image and Details */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2"
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            src={car.image}
            alt=""
            className="w-full h-auto md:max-h-100 object-cover rounded-xl shadow-md"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-3xl font-bold">
                {car.brand} {car.model}{" "}
              </h1>
              <p className="text-gray-500 text-lg">
                {car.category} - {car.year}
              </p>
            </div>
            <hr className="border-borderColor my-6" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: assets.users_icon,
                  text: `${car.seating_capacity} Seats`,
                },
                { icon: assets.fuel_icon, text: car.fuel_type },
                { icon: assets.car_icon, text: car.transmission },
                { icon: assets.location_icon, text: car.location },
              ].map(({ icon, text }) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  key={text}
                  className="flex flex-col items-center bg-light p-4 rounded-lg"
                >
                  <img src={icon} alt="" className="h-5 mb-2" />
                  {text}
                </motion.div>
              ))}
            </div>

            {/* DESCRIPTION */}
            <div>
              <h1 className="text-xl font-medium mb-3">DESCRIPTION</h1>
              <p className="text-gray-500">{car.description}</p>
            </div>

            {/* FEATURES */}
            <div>
              <h1 className="text-xl font-medium mb-3">FEATURES</h1>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {car.features && car.features.length > 0 ? (
                  car.features.map((item) => (
                    <li key={item} className="flex items-center text-gray-500">
                      <img
                        src={assets.check_icon}
                        className="h-4 mr-2"
                        alt=""
                      />{" "}
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">No features listed</li>
                )}
              </ul>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Booking Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          onSubmit={handleSubmit}
          className="shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500"
        >
          <p className="flex items-center justify-between text-2xl text-gray-800 font-semibold">
            {currency}
            {car.pricePerDay}{" "}
            <span className="text-base text-gray-400 font-normal">Per Day</span>
          </p>

          <hr className="border-borderColor my-6" />

          <div className="flex flex-col gap-2">
            <label htmlFor="pickup-date">Pickup Date</label>
            <input
              value={pickupDate || ""}
              onChange={(e) => setPickupDate(e.target.value)}
              type="date"
              className="border border-borderColor px-3 py-2 rounded-lg"
              required
              id="pickup-date"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="return-date">Return Date</label>
            <input
              value={returnDate || ""}
              onChange={(e) => setReturnDate(e.target.value)}
              type="date"
              className="border   border-borderColor px-3 py-2 rounded-lg"
              required
              id="return-date"
              min={pickupDate || new Date().toISOString().split("T")[0]}
            />
          </div>

          {user && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="driving-license">Driving License</label>
                <input
                  id="driving-license"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  className="border border-borderColor px-3 py-2 rounded-lg"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="identity-card">Identity Card</label>
                <input
                  id="identity-card"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                  className="border border-borderColor px-3 py-2 rounded-lg"
                  required
                />
              </div>
            </>
          )}

          <button
            disabled={isSubmitting}
            className={`w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium 
        text-white rounded-xl cursor-pointer ${
          isSubmitting ? "opacity-70 cursor-not-allowed" : ""
        }`}
          >
            {isSubmitting ? "Booking..." : "BOOK NOW"}
          </button>

          <p className="text-center text-sm">
            No credit card required to reserve
          </p>
        </motion.form>
      </div>
    </div>
  ) : (
    <Loader />
  );
};

export default CarDetails;
