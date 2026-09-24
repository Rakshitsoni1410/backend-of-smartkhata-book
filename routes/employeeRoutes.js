import express from "express";

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addPayment,
  addAttendance,
  cleanupAttendanceDuplicates,
  searchEmployees,
} from "../controllers/employeeController.js";

import authUser from "../middlewares/authUser.js";

const router =
  express.Router();

// =====================================================
// GET EMPLOYEES
// =====================================================

router.get(
  "/",
  authUser,
  getEmployees
);

// =====================================================
// SEARCH
// =====================================================

router.get(
  "/search",
  authUser,
  searchEmployees
);

// =====================================================
// ADD EMPLOYEE
// =====================================================

router.post(
  "/add",
  authUser,
  addEmployee
);

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

router.put(
  "/update/:id",
  authUser,
  updateEmployee
);

// =====================================================
// DELETE EMPLOYEE
// =====================================================

router.delete(
  "/delete/:id",
  authUser,
  deleteEmployee
);

// =====================================================
// SALARY PAYMENT
// =====================================================

router.post(
  "/payment/:id",
  authUser,
  addPayment
);

// =====================================================
// CLEAN OLD DUPLICATE ATTENDANCE
//
// IMPORTANT:
//
// This route MUST remain before:
//
// /attendance/:id
//
// Otherwise Express may interpret:
//
// "cleanup"
//
// as an employee ID.
// =====================================================

router.post(
  "/attendance/cleanup",
  authUser,
  cleanupAttendanceDuplicates
);

// =====================================================
// SAVE TODAY'S ATTENDANCE
// =====================================================

router.post(
  "/attendance/:id",
  authUser,
  addAttendance
);

export default router;