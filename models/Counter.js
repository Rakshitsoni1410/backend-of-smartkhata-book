import mongoose from "mongoose";

// MongoDB has no native auto-increment, so this collection holds a single
// running number per "sequence name" (here just "invoice"). Each increment
// is atomic via findOneAndUpdate + $inc, so two bills fetched at the same
// instant can never collide on the same invoice number.
const counterSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
});

const Counter = mongoose.models.counter || mongoose.model("counter", counterSchema);

export default Counter; 