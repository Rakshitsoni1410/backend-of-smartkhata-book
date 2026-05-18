import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    method: {
      type: String,
      default: "Cash",
    },

    note: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Leave"],
      default: "Present",
    },

    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);


const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: [
        "Salesman",
        "Cashier",
        "Manager",
        "Delivery Boy",
        "Accountant",
        "Helper",
        "Other",
      ],
      default: "Other",
    },
    salary: {
      type: Number,
      required: true,
    },

    paid: {
      type: Number,
      default: 0,
    },

    salaryDate: {
      type: Number,
      default: 1,
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    payments: [paymentSchema],

    attendance: [attendanceSchema],
  },
  {
    timestamps: true,
  }
);

const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

export default Employee;