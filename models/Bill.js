import mongoose from "mongoose";

const billItemSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true },
});

const billSchema = new mongoose.Schema(
  {
    retailerId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    customerId:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    retailerName: { type: String },
    customerName: { type: String },
    billNumber:   { type: String, unique: true },
    items:        [billItemSchema],
    subtotal:     { type: Number },
    tax:          { type: Number, default: 0 },
    taxRate:      { type: Number, default: 0 },
    discount:     { type: Number, default: 0 },
    totalAmount:  { type: Number, required: true },
    amountPaid:   { type: Number, default: 0 },
    amountDue:    { type: Number },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    dueDate: { type: Date },
    note:    { type: String },
  },
  { timestamps: true }
);

billSchema.pre("save", function (next) {
  this.amountDue = this.totalAmount - (this.amountPaid || 0);
  if (this.amountDue <= 0)      this.paymentStatus = "paid";
  else if (this.amountPaid > 0) this.paymentStatus = "partial";
  else                          this.paymentStatus = "unpaid";
  next();
});

billSchema.pre("save", async function (next) {
  if (!this.billNumber) {
    const count = await mongoose.model("bill").countDocuments();
    this.billNumber = `BILL-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

const Bill = mongoose.models.bill || mongoose.model("bill", billSchema);

export default Bill;