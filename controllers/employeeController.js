import mongoose from "mongoose";

import Employee from "../models/employeeModel.js";

// =====================================================
// SETTINGS
// =====================================================

/*
  Business timezone used for attendance.

  Vercel/server environments may use UTC,
  so we explicitly use the business timezone.

  Optional .env:
  ATTENDANCE_TIMEZONE=Asia/Kolkata
*/

const ATTENDANCE_TIMEZONE = process.env.ATTENDANCE_TIMEZONE || "Asia/Kolkata";

const VALID_ATTENDANCE_STATUSES = ["Present", "Absent", "Leave"];

// =====================================================
// HELPERS
// =====================================================

// Returns business date like:
//
// 2026-09-24
//
const getAttendanceDayKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATTENDANCE_TIMEZONE,

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

// =====================================================
// ESCAPE REGEX
// =====================================================

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// =====================================================
// NORMALIZE ATTENDANCE PIPELINE
//
// Fixes old duplicate attendance.
//
// Example:
//
// 24 Sep Present
// 24 Sep Absent
// 24 Sep Present
//
// becomes:
//
// 24 Sep Present
//
// Latest array record wins.
//
// It also adds dayKey to old records.
// =====================================================

const buildAttendanceNormalizePipeline = () => [
  {
    $set: {
      attendance: {
        $reduce: {
          input: {
            $ifNull: ["$attendance", []],
          },

          initialValue: [],

          in: {
            $let: {
              vars: {
                currentDayKey: {
                  $ifNull: [
                    "$$this.dayKey",

                    {
                      $dateToString: {
                        format: "%Y-%m-%d",

                        date: {
                          $ifNull: ["$$this.date", "$$NOW"],
                        },

                        timezone: ATTENDANCE_TIMEZONE,
                      },
                    },
                  ],
                },
              },

              in: {
                /*
                    Remove an older record
                    for the same day and then
                    append the current record.

                    Therefore latest array
                    record wins.
                  */

                $concatArrays: [
                  {
                    $filter: {
                      input: "$$value",

                      as: "existing",

                      cond: {
                        $ne: [
                          {
                            $ifNull: [
                              "$$existing.dayKey",

                              {
                                $dateToString: {
                                  format: "%Y-%m-%d",

                                  date: {
                                    $ifNull: ["$$existing.date", "$$NOW"],
                                  },

                                  timezone: ATTENDANCE_TIMEZONE,
                                },
                              },
                            ],
                          },

                          "$$currentDayKey",
                        ],
                      },
                    },
                  },

                  [
                    {
                      $mergeObjects: [
                        "$$this",

                        {
                          dayKey: "$$currentDayKey",
                        },
                      ],
                    },
                  ],
                ],
              },
            },
          },
        },
      },
    },
  },
];

// =====================================================
// BUILD SAVE-TODAY ATTENDANCE PIPELINE
//
// IMPORTANT:
//
// This entire update happens atomically
// inside ONE MongoDB Employee document.
//
// Even if two requests happen very fast,
// MongoDB will not leave two today's rows.
// =====================================================

const buildAttendanceSavePipeline = ({ todayKey, status, note, now }) => [
  // ==========================================
  // STEP 1
  // NORMALIZE OLD HISTORY
  // ==========================================

  ...buildAttendanceNormalizePipeline(),

  // ==========================================
  // STEP 2
  //
  // Remove existing attendance for TODAY
  // and append exactly ONE today's record.
  //
  // Therefore:
  //
  // same employee + same day
  // = maximum one attendance record
  // ==========================================

  {
    $set: {
      attendance: {
        $concatArrays: [
          {
            $filter: {
              input: {
                $ifNull: ["$attendance", []],
              },

              as: "attendanceItem",

              cond: {
                $ne: ["$$attendanceItem.dayKey", todayKey],
              },
            },
          },

          [
            {
              date: now,

              dayKey: todayKey,

              status,

              note,
            },
          ],
        ],
      },
    },
  },
];

// =====================================================
// GET ALL EMPLOYEES
// =====================================================

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      ownerId: req.userId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,

      count: employees.length,

      employees,
    });
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Unable to load employees",
    });
  }
};

// =====================================================
// ADD EMPLOYEE
// =====================================================

export const addEmployee = async (req, res) => {
  try {
    const { name, phone, category, salary } = req.body || {};

    const cleanName = String(name || "").trim();

    const cleanPhone = String(phone || "").trim();

    const cleanCategory = String(category || "Other").trim();

    const numericSalary = Number(salary);

    // ==========================================
    // REQUIRED FIELDS
    // ==========================================

    if (
      !cleanName ||
      !cleanPhone ||
      salary === undefined ||
      salary === null ||
      salary === ""
    ) {
      return res.status(400).json({
        success: false,

        message: "Please fill all required fields",
      });
    }

    // ==========================================
    // ROLE
    // ==========================================

    const role = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    if (role !== "retailer" && role !== "wholesaler") {
      return res.status(403).json({
        success: false,

        message: "Access denied",
      });
    }

    // ==========================================
    // SALARY
    // ==========================================

    if (!Number.isFinite(numericSalary) || numericSalary <= 0) {
      return res.status(400).json({
        success: false,

        message: "Please enter a valid salary",
      });
    }

    // ==========================================
    // CREATE
    // ==========================================

    const employee = await Employee.create({
      ownerId: req.userId,

      name: cleanName,

      phone: cleanPhone,

      category: cleanCategory,

      salary: numericSalary,

      paid: 0,

      payments: [],

      attendance: [],

      status: "Active",
    });

    return res.status(201).json({
      success: true,

      message: "Employee Added Successfully",

      employee,
    });
  } catch (error) {
    console.error("ADD EMPLOYEE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to add employee",
    });
  }
};

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // ==========================================
    // ID CHECK
    // ==========================================

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid employee ID",
      });
    }

    // ==========================================
    // EMPLOYEE OWNERSHIP
    // ==========================================

    const employee = await Employee.findOne({
      _id: id,

      ownerId: req.userId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,

        message: "Employee not found",
      });
    }

    // ==========================================
    // ALLOWED FIELDS ONLY
    // ==========================================

    const editableFields = [
      "name",
      "phone",
      "category",
      "salary",
      "salaryDate",
      "notes",
      "status",
    ];

    const updates = {};

    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    // ==========================================
    // CLEAN NAME
    // ==========================================

    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      updates.name = String(updates.name || "").trim();

      if (!updates.name) {
        return res.status(400).json({
          success: false,

          message: "Employee name is required",
        });
      }
    }

    // ==========================================
    // CLEAN PHONE
    // ==========================================

    if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
      updates.phone = String(updates.phone || "").trim();

      if (!updates.phone) {
        return res.status(400).json({
          success: false,

          message: "Phone number is required",
        });
      }
    }

    // ==========================================
    // SALARY
    // ==========================================

    if (Object.prototype.hasOwnProperty.call(updates, "salary")) {
      const numericSalary = Number(updates.salary);

      if (!Number.isFinite(numericSalary) || numericSalary <= 0) {
        return res.status(400).json({
          success: false,

          message: "Invalid salary amount",
        });
      }

      updates.salary = numericSalary;
    }

    // ==========================================
    // SALARY DATE
    // ==========================================

    if (Object.prototype.hasOwnProperty.call(updates, "salaryDate")) {
      const salaryDate = Number(updates.salaryDate);

      if (!Number.isInteger(salaryDate) || salaryDate < 1 || salaryDate > 31) {
        return res.status(400).json({
          success: false,

          message: "Salary date must be between 1 and 31",
        });
      }

      updates.salaryDate = salaryDate;
    }

    // ==========================================
    // UPDATE
    // ==========================================

    const updatedEmployee = await Employee.findOneAndUpdate(
      {
        _id: id,

        ownerId: req.userId,
      },

      {
        $set: updates,
      },

      {
        new: true,

        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,

      message: "Employee Updated Successfully",

      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("UPDATE EMPLOYEE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to update employee",
    });
  }
};

// =====================================================
// DELETE EMPLOYEE
// =====================================================

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findOneAndDelete({
      _id: id,

      ownerId: req.userId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,

        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,

      message: "Employee Deleted Successfully",
    });
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to delete employee",
    });
  }
};

// =====================================================
// ADD PAYMENT
// =====================================================

export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const { amount, method, note } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid employee ID",
      });
    }

    // ==========================================
    // AMOUNT
    // ==========================================

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,

        message: "Invalid payment amount",
      });
    }

    // ==========================================
    // EMPLOYEE
    // ==========================================

    const employee = await Employee.findOne({
      _id: id,

      ownerId: req.userId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,

        message: "Employee not found",
      });
    }

    // ==========================================
    // PAYMENT RECORD
    // ==========================================

    const paymentData = {
      amount: paymentAmount,

      method: String(method || "Cash").trim(),

      note: String(note || "").trim(),

      date: new Date(),
    };

    employee.payments.push(paymentData);

    employee.paid = Number(employee.paid || 0) + paymentAmount;

    await employee.save();

    return res.status(200).json({
      success: true,

      message: "Payment Added Successfully",

      employee,
    });
  } catch (error) {
    console.error("ADD PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Salary payment failed",
    });
  }
};

// =====================================================
// ADD ATTENDANCE
//
// ONE EMPLOYEE = ONE ATTENDANCE PER DAY
//
// First request:
// creates today's attendance.
//
// Another same-day request:
// replaces/updates today's record.
//
// It NEVER adds a second row for today.
//
// This operation is atomic inside MongoDB.
// =====================================================

export const addAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    // ==========================================
    // ID
    // ==========================================

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,

        message: "Invalid employee ID",
      });
    }

    // ==========================================
    // STATUS
    // ==========================================

    const cleanStatus = String(req.body?.status || "Present").trim();

    if (!VALID_ATTENDANCE_STATUSES.includes(cleanStatus)) {
      return res.status(400).json({
        success: false,

        message: "Attendance status must be Present, Absent or Leave",
      });
    }

    // ==========================================
    // NOTE
    // ==========================================

    const cleanNote = String(req.body?.note || "").trim();

    // ==========================================
    // SERVER CONTROLS DATE
    //
    // Do NOT trust a date sent by frontend.
    // ==========================================

    const now = new Date();

    const todayKey = getAttendanceDayKey(now);

    // ==========================================
    // ATOMIC SAVE
    //
    // This pipeline:
    //
    // 1. Cleans old duplicate days
    // 2. Removes today's old entry
    // 3. Adds exactly one today's entry
    //
    // Therefore even repeated requests cannot
    // leave multiple records for the same day.
    // ==========================================

    const employee = await Employee.findOneAndUpdate(
      {
        _id: id,

        ownerId: req.userId,
      },

      buildAttendanceSavePipeline({
        todayKey,

        status: cleanStatus,

        note: cleanNote,

        now,
      }),

      {
        new: true,
      },
    );

    if (!employee) {
      return res.status(404).json({
        success: false,

        message: "Employee not found",
      });
    }

    // ==========================================
    // FIND TODAY'S FINAL RECORD
    // ==========================================

    const todayAttendance = Array.isArray(employee.attendance)
      ? employee.attendance.find((item) => item.dayKey === todayKey)
      : null;

    return res.status(200).json({
      success: true,

      message: "Today's attendance saved successfully",

      dayKey: todayKey,

      attendance: todayAttendance || null,

      employee,
    });
  } catch (error) {
    console.error("ADD ATTENDANCE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Unable to save attendance",
    });
  }
};

// =====================================================
// CLEAN EXISTING ATTENDANCE DUPLICATES
//
// POST:
// /api/employees/attendance/cleanup
//
// Use once after deploying.
//
// Example:
//
// Before:
//
// 24 Sep Present
// 24 Sep Present
// 24 Sep Absent
// 25 Sep Present
//
// After:
//
// 24 Sep Absent
// 25 Sep Present
//
// Latest same-day record wins.
// =====================================================

export const cleanupAttendanceDuplicates = async (req, res) => {
  try {
    const result = await Employee.updateMany(
      {
        ownerId: req.userId,
      },

      buildAttendanceNormalizePipeline(),
    );

    return res.status(200).json({
      success: true,

      message: "Duplicate attendance records cleaned successfully",

      matchedEmployees: result.matchedCount ?? result.n ?? 0,

      modifiedEmployees: result.modifiedCount ?? result.nModified ?? 0,

      timezone: ATTENDANCE_TIMEZONE,
    });
  } catch (error) {
    console.error("ATTENDANCE CLEANUP ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Unable to clean attendance history",
    });
  }
};

// =====================================================
// SEARCH EMPLOYEE
// =====================================================

export const searchEmployees = async (req, res) => {
  try {
    const keyword = String(req.query?.keyword || "").trim();

    if (!keyword) {
      return res.status(400).json({
        success: false,

        message: "Search keyword is required",
      });
    }

    const escapedKeyword = escapeRegex(keyword);

    const employees = await Employee.find({
      ownerId: req.userId,

      $or: [
        {
          name: {
            $regex: escapedKeyword,

            $options: "i",
          },
        },

        {
          phone: {
            $regex: escapedKeyword,

            $options: "i",
          },
        },
      ],
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,

      count: employees.length,

      employees,
    });
  } catch (error) {
    console.error("SEARCH EMPLOYEE ERROR:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Unable to search employees",
    });
  }
};
