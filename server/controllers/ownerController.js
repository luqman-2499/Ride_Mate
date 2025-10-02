import imagekit from "../configs/imageKit.js";
import Booking from "../models/Booking.js"
import User from "../models/User.js";
import Car from "../models/Car.js";
import fs from "fs";
import crypto from "crypto";


// API to change Role of User 

export const changeRoleToOwner = async (req, res) => {
    try {
        const { _id } = req.user;
        await User.findByIdAndUpdate(_id, { role: "owner" })
        res.json({ success: true, message: "Now you can list cars" })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })

    }
}


// API to list Cars 

export const addCar = async (req, res) => {
    try {
        const { _id } = req.user;
        let car = JSON.parse(req.body.carData);
        const imageFile = req.file;



        // Upload to imagekit 

        const fileBuffer = fs.readFileSync(imageFile.path)
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

        let response
        try {
            const existing = await imagekit.listFiles({
                searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'cars/'`,
                limit: 1
            })
            if (Array.isArray(existing) && existing.length > 0) {
                response = { url: existing[0].url }
            }
        } catch (e) { }
        if (!response) {
            response = await imagekit.upload({
                file: fileBuffer,
                fileName: imageFile.originalname,
                folder: '/cars',
                tags: [`hash:${fileHash}`]
            })
        }


        // Optimization through imagekit url transformation 

        // var optimizedImageUrl = imagekit.url({
        //     path : response.filePath,
        //     transformation : [
        //         {width: '1280'},
        //         {quality: 'auto'},   
        //         {format: 'webp'}
        //     ]
        //  });

        // const image = optimizedImageUrl;

        const image = response.url;

        await Car.create({ ...car, owner: _id, image })

        res.json({ success: true, message: "Car Added" })


    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

// API TO LIST OWNER CARS 

export const getOwnerCars = async (req, res) => {
    try {
        const { _id } = req.user;
        const cars = await Car.find({ owner: _id })
        res.json({ success: true, cars })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}


// API to Toggle Car Availability 

export const toggleCarAvailability = async (req, res) => {
    try {
        const { _id } = req.user;
        const { id } = req.body
        const car = await Car.findById(id)

        //  Checking if car belongs to user 

        if (car.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        car.isAvailable = !car.isAvailable;
        await car.save()

        res.json({ success: true, message: "Availability Toggled" })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}



// API to Delete Car 

export const deleteCar = async (req, res) => {
    try {
        const { _id } = req.user;
        const { id } = req.body
        const car = await Car.findOne({ _id: id, owner: _id })

        //  Checking if car exists and belongs to user 

        if (!car) {
            return res.json({ success: false, message: "Car not found or unauthorized" });
        }

        await Car.deleteOne({ _id: id })

        res.json({ success: true, message: "Car Deleted" })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}



// API to get Dashbaord Data

export const getDashboardData = async (req, res) => {
    try {
        const { _id, role } = req.user;

        if (role !== 'owner') {
            return res.json({ success: true, message: "Unauthorized" });
        }
        const cars = await Car.find({ owner: _id })

        const bookings = await Booking.find({ owner: _id }).populate('car').sort({ createdAt: -1 });

        const pendingBookings = await Booking.find({ owner: _id, status: "pending" })
        const completedBookings = await Booking.find({ owner: _id, status: "confirmed" })

        // Calculate monthly revenue from bookings where status is confirmed 
        const monthlyRevenue = bookings.slice().filter(booking => booking.status === 'confirmed').reduce((acc, booking) => acc + booking.price, 0)

        const dashboardData = {
            totalCars: cars.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: bookings.slice(0, 3),
            monthlyRevenue
        }

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}


//API to update profile image 

export const updateUserImage = async (req, res) => {
    try {
        const { _id } = req.user;

        const imageFile = req.file;

        const fileBuffer = fs.readFileSync(imageFile.path)
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

        let response
        try {
            const existing = await imagekit.listFiles({
                searchQuery: `tags IN ['hash:${fileHash}'] AND path LIKE 'users/'`,
                limit: 1
            })
            if (Array.isArray(existing) && existing.length > 0) {
                response = { url: existing[0].url }
            }
        } catch (e) { }
        if (!response) {
            response = await imagekit.upload({
                file: fileBuffer,
                fileName: imageFile.originalname,
                folder: '/users',
                tags: [`hash:${fileHash}`]
            })
        }
        const image = response.url;
        await User.findByIdAndUpdate(_id, { image })
        res.json({ success: true, message: "Image Updated" })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}
