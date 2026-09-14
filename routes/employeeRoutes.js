import express from "express";

import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  addPayment,
  addAttendance, searchEmployees,
} from "../controllers/employeeController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/", authUser, getEmployees);

router.post("/add", authUser, addEmployee);

router.put("/update/:id", authUser, updateEmployee);

router.delete("/delete/:id", authUser, deleteEmployee);

router.post("/payment/:id", authUser, addPayment);

router.post("/attendance/:id", authUser, addAttendance);
router.get("/search", authUser, searchEmployees);
export default router;