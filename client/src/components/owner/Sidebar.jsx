import React, { useState } from 'react'
import { assets, ownerMenuLinks } from '../../assets/assets'
import { NavLink, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const Sidebar = () => {
const {user, axios, fetchUser}= useAppContext()
const location = useLocation()
const [image, setImage] = useState('')

const updateImage = async ()=> {
   try {
    const formData = new FormData()
    formData.append('image', image)

    const {data} =  await axios.post('/api/owner/update-image', formData)

    if(data.success){
        fetchUser()
        toast.success(data.message)
        setImage('')
    } else{
        toast.error(data.message)
    }
   } catch (error) {
        toast.error(error.message)
   }
}

  return (
    <div className= "relative min-h-screen md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-borderColor text-sm" >
    
        <div className='group-relative'>
            <label htmlFor="image">
                <img src={image ? URL.createObjectURL(image) : user?.image || "https://www.bing.com/images/search?view=detailV2&ccid=jqPS3lMs&id=E70C5EA1BC4817EFF3E883B4E6A7E34D428B05D4&thid=OIP.jqPS3lMsYp4k2m3QYO9ajQAAAA&mediaurl=https%3A%2F%2Fd1lmq142maiv1z.cloudfront.net%2FMALE_71c926f778.jpg&exph=452&expw=446&q=user+imagefor+website&form=IRPRST&ck=B11EF6D6799E4F024492443A1AF1DA2D&selectedindex=0&itb=1&cw=1222&ch=585&ajaxhist=0&ajaxserp=0&pivotparams=insightsToken%3Dccid_rcmXeqCU*cp_5BED5A7D97B491CF31F0F72835D1E991*mid_9055928F621FFD98A561BCA55A8CF0829E6E62A4*thid_OIP.rcmXeqCUOiCg54dfU4v9tgHaHa&vt=0&sim=11&iss=VSI&ajaxhist=0&ajaxserp=0"} alt="" className='h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto' />

                <input type="file" id="image" accept="image/*" 
                hidden onChange= {e => setImage(e.target.files[0])} />

            <div className='absolute hidden top-0 right-0 left-0 bottom-0 bg-black/10 rounded-full group-hover:flex 
            items-center justify-center cursor-pointer'>
                <img src={assets.edit_icon} alt="" />
            </div>
        </label>
    </div>

    {image && (
        <button className='absolute top-0 right-0 flex p-2 gap-1 bg-primary/10 text-primary cursor-pointer' onClick={updateImage}> Save <img src={assets.check_icon} width={13} alt=""  />
        </button>
    )}
    <p className='mt-2 text-base max-md:hidden'> {user?.name} </p>

    <div className='w-full'>
        {ownerMenuLinks.map((link, index)=>(
            <NavLink key={index} to={link.path} className={`relative flex items-center gap-2 w-full py-3 pl-4 first:mt-6 
            ${link.path === location.pathname ? 'bg-primary/10 text-primary' : 'text-gray-500'}`}>
              <img src={link.path === location.pathname ? link.coloredIcon : link.icon} alt="car icon" />  
              <span className= 'max-md:hidden'>{link.name}</span>

             <div className={`${link.path === location.pathname ? 
             'bg-primary w-1.5 h-8 rounded-l right-0 absolute' : ''}`}> 
             </div>

             
            </NavLink>
        ))}
    </div>

</div>
  )
}

export default Sidebar