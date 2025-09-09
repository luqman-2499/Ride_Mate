import multer from "multer";


const upload = multer({storage: multer.diskStorage({})})

export default upload




// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });

// export default upload;
