import React, { useState } from 'react'
import Title from '../../components/owner/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'
const AddCar = () => {

const {axios, currency} = useAppContext() 

const [image, setImage] = useState(null)
const [car, setCar] = useState({
  brand: "",
  model: '',
  year: '',
  pricePerDay: '',
  category: '',
  transmission : '',
  fuel_type : '',
  seating_capacity: 0,
  location: '',
  description: '',
   features: [],
});

// Available Features list 

const availableFeatures = [
  "Bluetooth Connectivity",
  "GPS Smart Navigation",
  "Sunroof",
  "Power Steering",
  "Rearview Camera",
  "Air Conditioning",
  "Leather Seats",
  "Sound System",
  "Parking Sensors",
  "4WD",
];

// Handle checkbox change
const handleFeatureChange = (feature) => {
  setCar(prev => {
    if (prev.features.includes(feature)) {
      return { ...prev, features: prev.features.filter(f => f !== feature) };
    } else {
      return { ...prev, features: [...prev.features, feature] };
    }
  });
};

const [isLoading, setIsLoading] = useState(false)

const onSubmitHnadler = async (e)=> {
  e.preventDefault();
  if (isLoading) return null

  setIsLoading(true)
  try {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('carData', JSON.stringify(car))

    const {data} = await axios.post('/api/owner/add-car', formData)
    if(data.success){
      toast.success(data.message)
      setImage(null)
      setCar({
        brand: "",
        model: '',
        year: '',
        pricePerDay: '',
        category: '',
        transmission : '',
        fuel_type : '',
        seating_capacity: 0,
        location: '',
        description: '',
        features: [],
      })
    } else{
      toast.error(data.message)
    }
  } catch (error) {
     toast.error(error.message)
  } finally{
    setIsLoading(false)
  }
}

  return (
    <div className='px-4 py-10 md:px-10 flex-1'>
      <Title title="Add New Car" subTitle= "Fill details to list a new car for booking, availability and car specification" />

      <form onSubmit={onSubmitHnadler} className='flex flex-col gap-5 text-gray-500 text-sm mt-6 max-w-xl'>

        {/* CAR IMAGE  */}
        <div className='flex items-center gap-2 w-full'>
          <label htmlFor="car-image">
            <img src={image ? URL.createObjectURL(image) : assets.upload_icon} alt="" className='h-14 
            rounded cursor-pointer' />
              <input type="file" id="car-image" accept="image/*" hidden onChange= {e => setImage(e.target.files[0])} />
          </label>
            <p className='text-sm text-gray-500'>Upload Picture of your Car</p>
        </div>

        
        {/* CAR BRAND & MODEL  */}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'> 

          <div className='flex flex-col w-full'>
            <label>Brand</label>
            <input type="text" placeholder='e.g. Mercedes' required className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none' value={car.brand} onChange={e => setCar({...car, brand:
            e.target.value })}/>
          </div>
          

          <div className='flex flex-col w-full'>
            <label>Model</label>
            <input type="text" placeholder='e.g. S-class' required className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none' value={car.model} onChange={e => setCar({...car, model:
            e.target.value })}/>
          </div>

        </div>

        {/* CAR: YEAR, PRICE, CATEGORY */}

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
          
        <div className='flex flex-col w-full'>
            <label>Year</label>
            <input type='text' placeholder='e.g. 2025' required className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none' value={car.year} onChange={e => setCar({...car, year: e.target.value })}/>
          </div>


          <div className='flex flex-col w-full'>
            <label>Price({currency})</label>
            <input type="text" placeholder='e.g. 1000' required className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none' value={car.pricePerDay} onChange={e => setCar({...car, pricePerDay: e.target.value })}/>
          </div>


          <div className='flex flex-col w-full'>
            <label>Category</label>
            <select onChange={e=> setCar({...car, category: e.target.value})} value={car.category} 
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'  >
              <option value="">Select Category</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Van">Van</option>  
              <option value="Sports">Sports</option>             
            </select>
          </div>
        </div>

        
        {/* Car: Transmission, Fuel Type, Seating Capacity  */}

        <div className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>

          <div className='flex flex-col w-full'>
            <label>Transmission</label>
            <select onChange={e=> setCar({...car, transmission: e.target.value})} value={car.transmission} 
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'  >
              <option value="">Select Transmission</option>
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
              <option value="Semi-Automatic">Semi-Automatic</option>              
            </select>
          </div>


          <div className='flex flex-col w-full'>
            <label>Fuel Type</label>
            <select onChange={e=> setCar({...car, fuel_type: e.target.value})} value={car.fuel_type} 
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'  >
              <option value="">Select Fuel Type</option>
              <option value="Gas">Gas</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>              
            </select>
          </div>


          <div className='flex flex-col w-full'>
            <label>Seating Capacity</label>
            <input type="number" placeholder='e.g. 4' required className='px-3 py-2 mt-1 border-borderColor rounded-md outline-none' value={car.seating_capacity} onChange={e => setCar({...car, seating_capacity:
            e.target.value })}/>
          </div>

      </div>

        {/* CAR LOCATION  */}

        <div className='flex flex-col w-full'>
            
          <label>Location</label>
          <select onChange={e=> setCar({...car, location: e.target.value})} value={car.location} 
            className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none'  >
              <option value="">Select Location</option>
              <option value="New York">New York</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Houston">Houston</option>
              <option value="Chicago">Chicago</option>           
          </select>
        </div>


        {/* Car Description  */}

        <div className='flex flex-col w-full'>
            <label>DESCRIPTION</label>
            <textarea rows={6} placeholder=' e.g. A Luxurious SUV with spacious interior and a powerful engine...' required className='px-3 py-2 mt-1 border border-borderColor rounded-md outline-none' value={car.description} onChange={e => setCar({...car, description: e.target.value })}>
            </textarea>
        </div>
        
        {/* FEATURES CHECKBOXES */}
        <div className='flex flex-col w-full'>
          <label>Features</label>
          <div className='grid grid-cols-2 gap-2 mt-2'>
            {availableFeatures.map((feature) => (
            <label key={feature} className='flex items-center gap-2'>
            <input type="checkbox" checked={car.features.includes(feature)} 
            onChange={() => handleFeatureChange(feature)} />
            {feature}
            </label>
           ))}
          </div>
        </div>

        <button className='flex items-center gap-2 px-4 py-2.5 mt-4 bg-primary text-white rounded-md font-medium w-max cursor-pointer'>
          <img src={assets.tick_icon} alt="" />
          {isLoading ? 'Listing...' : 'List Your Car'}
        </button>

      </form>      
    </div>
  )
}

export default AddCar