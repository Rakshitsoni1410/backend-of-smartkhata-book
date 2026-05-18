import express from "express";

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addPayment,
  addAttendance, searchEmployees,
} from "../controllers/employeeController.js";

const router = express.Router();

router.get("/", getEmployees);

router.post("/add", addEmployee);

router.put("/update/:id", updateEmployee);

router.delete("/delete/:id", deleteEmployee);

router.post("/payment/:id", addPayment);

router.post("/attendance/:id", addAttendance);
router.get("/search", searchEmployees);
export default router;