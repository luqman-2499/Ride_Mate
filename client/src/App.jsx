import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Login from './components/Login'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import CarDetails from './pages/CarDetails'
import Cars from './pages/Cars'
import MyBookings from './pages/MyBookings'
import Footer from './components/Footer'
import Layout from './pages/owner/Layout'
import Dashboard from './pages/owner/Dashboard'
import AddCar from './pages/owner/AddCar'
import ManageCars from './pages/owner/ManageCars'
import ManageBookings from './pages/owner/ManageBookings'
import {Toaster} from "react-hot-toast"
import { useAppContext } from './context/AppContext'
import AboutUs from './pages/AboutUs'
import ContactUs from './pages/ContactUs'

const App = () => {
  const { showLogin } = useAppContext()
  const location = useLocation()
  const [isRouterReady, setIsRouterReady] = useState(false)

  console.log("🟢 App component rendered");
  console.log("📍 Current pathname:", location.pathname);
  console.log("🔄 Router ready:", isRouterReady);

  useEffect(() => {
    console.log("🎯 useEffect triggered - Location changed:", location.pathname);
    setIsRouterReady(true);
  }, [location])

  const isOwnerPath = location.pathname.startsWith('/owner')
  console.log("👑 Is owner path:", isOwnerPath);

  if (!isRouterReady) {
    console.log("⏳ Showing loading screen...");
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  console.log("🚀 Rendering main app content");
  
  return (
    <>
      <Toaster/>
      { showLogin &&  <Login/> }
      {!isOwnerPath && <Navbar />}

      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/car-details/:id' element={<CarDetails/>}/>
        <Route path='/cars' element={<Cars/>}/>
        <Route path='/my-bookings' element={<MyBookings/>}/>
        <Route path='/about-us' element={<AboutUs/>}/>
        <Route path='/contact-us' element={<ContactUs/>}/>

        <Route path='/owner' element={<Layout/>}>
          <Route index element={<Dashboard/>} />
          <Route path="add-car" element={<AddCar/>} />
          <Route path="manage-cars" element={<ManageCars/>} />
          <Route path="manage-bookings" element={<ManageBookings/>} />
        </Route>
      </Routes> 

      {!isOwnerPath && <Footer/>}
    </>
  )
}

export default App