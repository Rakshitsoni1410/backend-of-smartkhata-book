import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connection from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import userRouter from './routes/userRoute.js'
import productRouter from "./routes/productRoute.js";
import orderRoutes from "./routes/orderRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
// app config
const app = express()
const port = process.env.PORT || 4000
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/user', userRouter)// localhost:4000/api/user/
app.use("/api/product", productRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRouter);
// testing api
app.get('/api', (req, res) => {
    res.send("API Working")
})

// listening to the port
app.listen(port, (error) => {
    if (error) return console.log("Connection Error \n", error);
    console.log(`Your Server is running on http://localhost:${port}`)
    connection()
})