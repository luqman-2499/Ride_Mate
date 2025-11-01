// import React, { useEffect } from 'react'

// import Sidebar from '../../components/owner/Sidebar'
// import { Outlet } from 'react-router-dom'
// import NavbarOwner from '../../components/owner/NavbarOwner'
// import { useAppContext } from '../../context/AppContext'

// const Layout = () => {
//   const { isOwner, navigate } = useAppContext()

//   useEffect(() => {
//     if (isOwner === false) {
//       navigate('/')
//     }
//   }, [isOwner])


//   return (
//     <div className='flex flex-col'>
//       <NavbarOwner />
//       <div className='flex'>
//         <Sidebar />
//         <Outlet />
//       </div>
//     </div>
//   )
// }

// export default Layout




import React, { useEffect } from 'react'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import NavbarOwner from '../../components/owner/NavbarOwner'
import { useAppContext } from '../../context/AppContext'

const Layout = () => {
  const { isOwner, navigate, user } = useAppContext()

  useEffect(() => {
    console.log("🔐 Layout auth check - isOwner:", isOwner, "user:", user);
    
    // 🟢 Only redirect if we're SURE user is not owner
    if (isOwner === false && user) {
      console.log("❌ User is not owner, redirecting to home");
      navigate('/')
    }
  }, [isOwner, user, navigate])

  // 🟢 Show loading while checking auth
  if (isOwner === undefined) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Checking authentication...</div>
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      <NavbarOwner />
      <div className='flex'>
        <Sidebar />
        <Outlet />
      </div>
    </div>
  )
}

export default Layout