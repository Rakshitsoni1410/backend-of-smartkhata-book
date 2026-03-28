import express from "express"
import { registerUser, loginUser } from "../controllers/userController.js"
import { getWholesalersByBusiness } from "../controllers/userController.js";

const userRouter = express.Router()

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)
userRouter.get("/wholesalers/:businessType", getWholesalersByBusiness);
export default userRouter