import React, { useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ManageBookings = () => {
  const { axios, currency, user, isOwner } = useAppContext() 
  const [bookings, setBookings] = useState([])
  const [updatingId, setUpdatingId] = useState(null)

  const fetchOwnerBookings = async () => {
    try {
      console.log("📡 Fetching owner bookings...")
      const { data } = await axios.get('/api/bookings/owner')
      if (data.success) {
        console.log("✅ Bookings fetched:", data.bookings.length)
        setBookings(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log("🔥 Fetch error:", error)
      toast.error(error.message)
    }
  }

  // 🟢 ADD AUTH CHECK BEFORE FETCHING
  useEffect(() => {
    console.log("🔐 ManageBookings auth check - isOwner:", isOwner, "user:", user)
    
    if (isOwner === true && user) {
      console.log("🟢 Auth confirmed, fetching bookings...")
      fetchOwnerBookings()
    } else {
      console.log("⏳ Waiting for auth...")
    }
  }, [isOwner, user]) // 🟢 DEPEND ON AUTH STATE

  const changeBookingStatus = async (bookingId, status) => {
    if (updatingId) {
      console.log("⚠️ Already updating, please wait")
      return
    }
    
    console.log("🟢 Changing status for:", bookingId, "to:", status)
    setUpdatingId(bookingId)

    try {
      // 🟢 ADD TIMEOUT
      const { data } = await axios.post('/api/bookings/change-status', 
        { bookingId, status },
        { timeout: 5000 } // 5 seconds timeout
      )
      console.log("📩 API Response:", data)
      
      if (data.success) {
        toast.success(data.message)
        
        console.log("🔍 API returned booking:", data.booking)
        
        if (data.booking) {
          setBookings(prevBookings => {
            const updatedBookings = prevBookings.map(booking => 
              booking._id === bookingId ? { ...booking, ...data.booking } : booking
            )
            console.log("🔄 UI updated with API data")
            return updatedBookings
          })
        } else {
          setBookings(prevBookings => {
            const updatedBookings = prevBookings.map(booking => 
              booking._id === bookingId ? { ...booking, status } : booking
            )
            console.log("🔄 UI updated with optimistic data")
            return updatedBookings
          })
        }
        
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.log("🔥 API Error:", error)
      
      // 🟢 SPECIFIC ERROR MESSAGES
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timeout - please try again")
      } else {
        toast.error(error.message)
      }
      
      // Revert optimistic update on error
      fetchOwnerBookings()
    } finally {
      setUpdatingId(null)
    }
  }

  // 🟢 ADD LOADING STATE WHILE WAITING FOR AUTH
  if (isOwner === false || !user) {
    return (
      <div className='px-4 pt-10 md:px-10 w-full'>
        <Title title="Manage Bookings" subTitle=" Track all customer bookings, approve or cancel requests and manage status" />
        <div className="flex justify-center items-center h-40">
          <div className="text-xl">Checking authentication...</div>
        </div>
      </div>
    )
  }

  return (
    <div className='px-4 pt-10 md:px-10 w-full'>
      <Title title="Manage Bookings" subTitle=" Track all customer bookings, approve or cancel requests and manage status" />

      <div className='max-w-3xl w-full rounded-md overflow-hidden border border-borderColor mt-6'>

        <table className='w-full border-collapse text-left text-sm text-gray-600'>
          <thead className='text-gray-500'>
            <tr>
              <th className='p-3 font-medium'>Bookings</th>
              <th className='p-3 font-medium max-md:hidden'>Date Range</th>
              <th className='p-3 font-medium'>Total</th>
              <th className='p-3 font-medium max-md:hidden'>Payment</th>
              <th className='p-3 font-medium max-md:hidden'>Documents</th>
              <th className='p-3 font-medium'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.filter(b => b && b.car).map((booking, index) => (
              <tr key={index} className='border-t border-borderColor text-gray-500'>

                <td className='p-3 flex items-center gap-3'>
                  <img src={booking.car?.image || ''} alt="" className='h-30 w-30 aspect-square rounded-md object-cover' />
                  <p className='font-medium max-md:hidden'>{booking.car?.brand || ''} {booking.car?.model || ''}</p>
                </td>

                <td className='p-3 max-md:hidden'>
                  {booking.pickupDate.split('T')[0]} to {booking.returnDate.split('T')[0]}
                </td>

                <td className='p-3'> {currency} {booking.price}</td>

                <td className='p-3 max-md:hidden'>
                  <span className='bg-gray-100 px-3 py-1 rounded-full text-xs'>Offline</span>
                </td>

                <td className='p-3 max-md:hidden'>
                  <div className='flex flex-col gap-1 text-xs'>
                    {booking.documents?.drivingLicenseUrl ? (
                      <a href={booking.documents.drivingLicenseUrl} target='_blank' rel='noreferrer' className='text-primary underline'>Driving License</a>
                    ) : (
                      <span className='text-gray-400'>No License</span>
                    )}
                    {booking.documents?.identityCardUrl ? (
                      <a href={booking.documents.identityCardUrl} target='_blank' rel='noreferrer' className='text-primary underline'>Identity Card</a>
                    ) : (
                      <span className='text-gray-400'>No ID</span>
                    )}
                  </div>
                </td>

                <td className='p-3'>
                  {booking.status === 'pending' ? (
                    <select 
                      onChange={e => changeBookingStatus(booking._id, e.target.value)} 
                      value={booking.status} 
                      disabled={updatingId === booking._id}
                      className='px-2 py-1.5 mt-1 text-gray-500 border border-borderColor rounded-md outline-none disabled:opacity-50'
                    >
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                      {booking.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManageBookings
