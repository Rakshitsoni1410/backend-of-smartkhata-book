import Employee from "../models/employeeModel.js";


// ==========================
// GET ALL EMPLOYEES
// ==========================
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ ownerId: req.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==========================
// ADD EMPLOYEE
// ==========================
export const addEmployee = async (req, res) => {
  try {
    const {
      name,
      phone,
      category,
      salary,
    } = req.body;

    if (!name || !phone || !salary) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (req.user.role !== "Retailer" && req.user.role !== "Wholesaler") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const employee = await Employee.create({
      ownerId: req.userId,
      name,
      phone,
      category,
      salary,
    });

    res.status(201).json({
      success: true,
      message: "Employee Added Successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==========================
// UPDATE EMPLOYEE
// ==========================
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const editableFields = ["name", "phone", "category", "salary", "salaryDate", "notes", "status"];
    const updates = Object.fromEntries(
      editableFields
        .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
        .map((field) => [field, req.body[field]]),
    );
    const updatedEmployee =
      await Employee.findOneAndUpdate(
        { _id: id, ownerId: req.userId },
        updates,
        {
          new: true,
          runValidators: true,
        }
      );

    res.status(200).json({
      success: true,
      message: "Employee Updated Successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==========================
// DELETE EMPLOYEE
// ==========================
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await Employee.findOneAndDelete({ _id: id, ownerId: req.userId });

    res.status(200).json({
      success: true,
      message: "Employee Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==========================
// ADD PAYMENT
// ==========================
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      amount,
      method,
      note,
    } = req.body;

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount",
      });
    }

    const paymentData = {
      amount: paymentAmount,
      method: method || "Cash",
      note: note || "",
      date: new Date(),
    };

    employee.payments.push(paymentData);

    employee.paid += paymentAmount;

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Payment Added Successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ==========================
// ADD ATTENDANCE
// ==========================
export const addAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      note,
    } = req.body;

    const employee = await Employee.findOne({ _id: id, ownerId: req.userId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const attendanceData = {
      status: status || "Present",
      note: note || "",
      date: new Date(),
    };

    employee.attendance.push(attendanceData);

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Attendance Added Successfully",
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// SEARCH EMPLOYEE
export const searchEmployees = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    if (!keyword) {
      return res.status(400).json({ success: false, message: "Search keyword is required" });
    }

    const employees = await Employee.find({
      ownerId: req.userId,
      $or: [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    });

    res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};