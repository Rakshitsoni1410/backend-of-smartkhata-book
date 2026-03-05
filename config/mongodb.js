import mongoose from 'mongoose'

// connecting to the database
const connection = async ()=>{
    mongoose.connection.on('connected' , ()=> console.log("Database Connected"))
    // await mongoose.connect(`${process.env.MONGODB_URI}/khatabook`)
    await mongoose.connect(`mongodb://localhost:27017/prescripto`)

}

export default connection;