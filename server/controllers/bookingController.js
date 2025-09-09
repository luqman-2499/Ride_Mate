
// Function to check Availability of car for a given Date 

import Booking from "../models/Booking.js"
import Car from "../models/Car.js";

const checkAvailability = async (car, pickupDate, returnDate) => {
    const bookings = await Booking.find({
        car,
        pickupDate : {$lte: returnDate},
        returnDate: {$gte: pickupDate}
    })
    return bookings.length  === 0;
}






// API TO CHECK AVAILABILITY OF CARS FOR GIVEN DATE 

export const checkAvailabilityOfCar = async (req, res) => {
    try {
        const {location, pickupDate, returnDate} = req.body

        
        // Fetch all available cars for given location 
        const cars = await Car.find({location, isAvaliable:true})
        
        // Check car availability for given date range using PROMISE
        const availableCarsPromises = cars.map(async (car)=>{
        const isAvaliable = await checkAvailability(car._id, pickupDate, returnDate)
        return {...car._doc, isAvailable: isAvaliable}
        })

        let availableCars = await Promise.all (availableCarsPromises);
        availableCars = availableCars.filter(car=>car.isAvailable === true)

        res.json({success: true, availableCars})
    
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
        
    }
}



// API to Create Booking

export const createBooking = async (req, res) => {
    try {
        const {_id} = req.user;
        const {car, pickupDate, returnDate} = req.body;

        const isAvailable = await checkAvailability(car, pickupDate, returnDate)
        if(!isAvailable){
            return res.json({success:false, message: "Car is not available"})
        }

        const carData = await Car.findById(car)

        // Calculate price based on pickup and return date 
        const picked = new Date(pickupDate);
        const returend = new Date(returnDate);
        const noOfDays = Math.ceil ((returend - picked) / (1000*60*60*24))
        const price = carData.pricePerDay * noOfDays;

        await Booking.create({car, owner: carData.owner, user:_id, pickupDate, returnDate, price})
        res.json({success: true, message:"Booking Created"})

    } catch (error) {
        console.log(error.message);
        res.json({success:false, message: error.message})
        
    }
}






// API to List User Bookings

export const getUserBookings = async (req, res) => {
    try {
        const {_id} = req.user;
        const bookings = await Booking.find({user:_id}).populate("car").sort({createdAt: -1})
        res.json({success: true, bookings})
    } catch (error) {
          console.log(error.message);
        res.json({success:false, message: error.message})
    }
}





// API to get owner bookings 


export const getOwnerBookings = async (req, res) => {
    try {
        if(req.user.role !== 'owner'){
            return res.json({success:false, message:"not Authorized"})
        }
        // const bookings =await Booking.find({owner: req.user._id}).populate('car user').select("user","-password").sort({createdAt: -1})

        const bookings = await Booking.find({ owner: req.user._id })
            .populate('car')
            .populate('user', '-password') // exclude password
            .sort({ createdAt: -1 });
            
        res.json({success: true, bookings})
    } catch (error) {
          console.log(error.message);
        res.json({success:false, message: error.message})
    }
}





// API to change booking status 

export const changeBookingStatus = async (req, res) => {
    try {
        const {_id} = req.user;
        const {bookingId, status} = req.body

        const booking = await Booking.findById(bookingId)

        if(booking.owner.toString() !== _id.toString()){
            return res.json({success:false, message:"Unauthorized"})
        }

        booking.status = status;
        await booking.save();

        res.json({success: true, message:"status updated"})

    } catch (error) {
          console.log(error.message);
        res.json({success:false, message: error.message})
    }
}


