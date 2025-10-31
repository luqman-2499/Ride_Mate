import React, { useEffect, useState } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'

const MyBookings = () => {

  const { axios, user, currency } = useAppContext()

  const [bookings, setBookings] = useState([])

  const fetchMyBookings = async () => {
    try {
      const { data } = await axios.get('/api/bookings/user')
      if (data.success) {
        setBookings(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }


const deleteBooking = async (bookingId) => {
  console.log("🆔 Booking ID to delete:", bookingId);

  const confirmed = window.confirm("Are you sure you want to delete the booking?");
  if (!confirmed) return;

  // 🟢 OPTIMISTIC UPDATE - Remove immediately from UI
  console.log("⚡ Optimistic UI update - removing booking immediately");
  setBookings(prevBookings => {
    const updatedBookings = prevBookings.filter(b => b._id !== bookingId);
    console.log("🔄 UI updated instantly");
    return updatedBookings;
  });

  try {
    console.log("📡 Sending DELETE request...");
    const { data } = await axios.delete(`/api/bookings/user/${bookingId}`);
    console.log("📥 Response from server:", data);

    if (!data.success) {
      // 🟢 If API fails, revert the optimistic update
      console.log("❌ API failed - reverting UI");
      toast.error("Failed to delete booking");
      // You might want to refetch bookings here
      user && fetchMyBookings();
    } else {
      console.log("✅ Server confirmed deletion");
      toast.success("Your Booking has been Deleted");
    }

  } catch (error) {
    console.error("🔥 Error while deleting booking:", error);
    toast.error("Failed to delete booking");
    // 🟢 Revert on error too
    user && fetchMyBookings();
  }
};


  useEffect(() => {
    user && fetchMyBookings()
  }, [user])

  if (!user) return null
  return (

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className='px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl'>

      <Title title='My Bookings' subTitle='View and manage your bookings' align='left' />
      <div>
        {
          bookings.filter(b => b && b.car).map((booking, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              key={booking._id} className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor 
              rounded-lg mt-5 first:mt-12 ">


              {/* Car Image _ Info  */}

              <div className='md:col-span-1'>
                <div className='rounded-md overflow-hidden mb-3'>
                  <img src={booking.car?.image || ''} alt="" className='w-full h-auto aspect-video object-cover' />
                </div>
                <p className='text-lg font-medium mt-2'>{booking.car?.brand || ''} {booking.car?.model || ''}</p>
                <p className='text-gray-500'>{booking.car?.year || ''} - {booking.car?.category || ''} - {booking.car?.location || ''}
                </p>
              </div>


              <div className='md:col-span-2'>
                <div className='flex items-center gap-2'>
                  <p className='px-3 py-1 bg-light rounded'>Booking #{index + 1} </p>
                  <p className={`px-3 py-1 text-xs rounded-full ${booking.status === 'confirmed' ?
                    'bg-green-400/15 text-green-600' : 'bg-red-400/15 text-red-600'}`}>{booking.status}</p>
                </div>


                <div className='flex items-start gap-2 mt-3'>
                  <img src={assets.calendar_icon_colored} alt="" className='w-4 h-4 mt-1' />
                  <div className='text-gray-500'>
                    <p>Rental Period</p>
                    <p>{booking.pickupDate.split('T')[0]} To {booking.returnDate.split('T')[0]} </p>
                    
                  </div>
                </div>


                <div className='flex items-start gap-2 mt-3'>
                  <img src={assets.location_icon_colored} alt="" className='w-4 h-4 mt-1' />
                  <div className='text-gray-500'>
                    <p>Pick-up Location</p>
                    <p> {booking.car?.location || ''} </p>
                  </div>
                </div>
              </div>


              {/* Price */}

              <div className='md:col-span-1 flex flex-col justify-start gap-6'>
                <div className=' text-sm text-gray-500 text-right'>
                  <p> Total Price</p>
                  <h1 className='text-2xl font-semibold text-primary'>
                    {currency} {booking.price}</h1>
                  <p> Booked on {booking.createdAt.split('T')[0]}</p>
                  <p className='flex items-center  justify-end mt-2'> 
                  <img onClick={() => deleteBooking(booking._id)} src={assets.delete_icon} alt="Delete Booking" className='cursor-pointer hover:text-red-500' />
                  </p>
                </div>
              </div>


            </motion.div>

          ))}
      </div>

    </motion.div>
  )
}

export default MyBookings