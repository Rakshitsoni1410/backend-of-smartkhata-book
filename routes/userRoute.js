import express from "express";
import { registerUser, loginUser, getProfile, updateProfile, sendResetPasswordEmail, verifyOTP, resetPassword, changePassword } from "../controllers/userController.js";
import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

// user router
const userRouter = express.Router();

// registering a user route
userRouter.post("/register", registerUser);

// login a user route
userRouter.post("/login", loginUser);

// get user profile route
userRouter.get("/getProfile", authUser, getProfile);

// update user profile route
userRouter.post("/updateProfile", upload.single("image"), authUser, updateProfile);

// send reset password email route
userRouter.post("/sendResetPasswordEmail", sendResetPasswordEmail);

// verify OTP route
userRouter.post("/verifyOTP", verifyOTP);

// reset password route
userRouter.post("/resetPassword", resetPassword);

// change password route
userRouter.post("/changePassword", authUser, changePassword);

export default userRouter;
