import mongoose from "mongoose";

// =====================================================
// PAYMENT SCHEMA
// =====================================================

const paymentSchema =
  new mongoose.Schema(
    {
      amount: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      method: {
        type:
          String,

        default:
          "Cash",

        trim:
          true,
      },

      note: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      date: {
        type:
          Date,

        default:
          Date.now,
      },
    },

    {
      _id:
        false,
    }
  );

// =====================================================
// ATTENDANCE SCHEMA
// =====================================================

const attendanceSchema =
  new mongoose.Schema(
    {
      /*
        Timestamp when attendance was saved.
      */

      date: {
        type:
          Date,

        default:
          Date.now,

        required:
          true,
      },

      /*
        Calendar/business day.

        Example:

        2026-09-24

        Backend uses this field to make sure
        an employee has only ONE attendance
        record for that date.
      */

      dayKey: {
        type:
          String,

        trim:
          true,

        match:
          /^\d{4}-\d{2}-\d{2}$/,
      },

      status: {
        type:
          String,

        enum: [
          "Present",
          "Absent",
          "Leave",
        ],

        default:
          "Present",

        required:
          true,
      },

      note: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },
    },

    {
      _id:
        false,
    }
  );

// =====================================================
// EMPLOYEE SCHEMA
// =====================================================

const employeeSchema =
  new mongoose.Schema(
    {
      // ==========================================
      // OWNER
      // ==========================================

      ownerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "user",

        required:
          true,

        index:
          true,
      },

      // ==========================================
      // EMPLOYEE DETAILS
      // ==========================================

      name: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      phone: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      category: {
        type:
          String,

        enum: [
          "Salesman",
          "Cashier",
          "Manager",
          "Delivery Boy",
          "Accountant",
          "Helper",
          "Other",
        ],

        default:
          "Other",
      },

      // ==========================================
      // SALARY
      // ==========================================

      salary: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      paid: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      salaryDate: {
        type:
          Number,

        default:
          1,

        min:
          1,

        max:
          31,
      },

      // ==========================================
      // OTHER DETAILS
      // ==========================================

      notes: {
        type:
          String,

        default:
          "",

        trim:
          true,
      },

      status: {
        type:
          String,

        enum: [
          "Active",
          "Inactive",
        ],

        default:
          "Active",
      },

      // ==========================================
      // PAYMENTS
      // ==========================================

      payments: {
        type: [
          paymentSchema,
        ],

        default:
          [],
      },

      // ==========================================
      // ATTENDANCE
      // ==========================================

      attendance: {
        type: [
          attendanceSchema,
        ],

        default:
          [],
      },
    },

    {
      timestamps:
        true,
    }
  );

// =====================================================
// INDEXES
// =====================================================

employeeSchema.index({
  ownerId:
    1,

  createdAt:
    -1,
});

employeeSchema.index({
  ownerId:
    1,

  name:
    1,
});

// =====================================================
// IMPORTANT
// =====================================================

/*
  We do NOT create this:

  unique index on attendance.dayKey

  because attendance is an embedded array.

  MongoDB unique multikey indexes are not the correct
  mechanism for guaranteeing uniqueness between
  elements inside the same document.

  Instead, employeeController.js performs an atomic
  update which ensures:

  Employee + Day = ONE attendance record.
*/

// =====================================================
// MODEL
// =====================================================

const Employee =
  mongoose.models.Employee ||
  mongoose.model(
    "Employee",
    employeeSchema
  );

export default Employee;