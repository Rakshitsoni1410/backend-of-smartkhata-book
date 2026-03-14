import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true,
        unique: true
    },
     email:{
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["Retailer", "Wholesaler", "Customer"],
        default: "Retailer"
    },

    shopName: {
        type: String
    },

    address: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

})

const userModel = mongoose.models.user || mongoose.model("user", userSchema)

export default userModel