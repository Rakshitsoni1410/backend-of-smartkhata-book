# Smart Khata Backend 🚀

Backend API for the **Smart Khata Digital Ledger Application** built using **Node.js**, **Express.js**, and **MongoDB**.

This backend handles authentication, customer management, employee management, and transaction-related APIs for the Smart Khata ecosystem.

---

# 🔗 Project Repositories

## 📱 Flutter Frontend Repository
https://github.com/Rakshitsoni1410/smartkhatabook

## 🌐 Web Frontend Repository
https://github.com/Rakshitsoni1410/web-smartkhatabook

## ⚙️ Backend Repository
https://github.com/Rakshitsoni1410/backend-of-smartkhata-book

---

# ✨ Backend Features

## 🔐 Authentication APIs

- User Registration
- User Login
- Role-Based Authentication
- JWT Token Authentication
- Password Validation
- Secure API Access

---

# 👨‍💼 Shopkeeper APIs

- Add Customers
- Get Customer List
- Update Customer Details
- Delete Customers
- Add Transactions
- Credit/Debit Entry APIs
- Employee Management APIs
- Salary Management APIs

---

# 👤 Customer APIs

- View Ledger Details
- View Transaction History
- Access Customer Dashboard Data

---

# 💳 Transaction Management

- Credit Transactions
- Debit Transactions
- Transaction History
- Balance Calculation
- Payment Tracking

---

# 👨‍💻 Employee Management APIs

- Add Employee
- Edit Employee
- Delete Employee
- Salary Tracking
- Pending Salary Calculation
- Employee Payment History

---

# 🛠️ Tech Stack

| Technology | Usage |
|------------|--------|
| Node.js | Runtime Environment |
| Express.js | Backend Framework |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| JWT | Authentication |
| bcrypt.js | Password Hashing |
| dotenv | Environment Variables |
| CORS | Cross-Origin Requests |

---

# 📂 Backend Project Structure

```bash
backend/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   ├── customerController.js
│   ├── employeeController.js
│   └── transactionController.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── errorMiddleware.js
│
├── models/
│   ├── User.js
│   ├── Customer.js
│   ├── Employee.js
│   └── Transaction.js
│
├── routes/
│   ├── authRoutes.js
│   ├── customerRoutes.js
│   ├── employeeRoutes.js
│   └── transactionRoutes.js
│
├── .env
├── server.js
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Rakshitsoni1410/backend-of-smartkhata-book.git
```

---

## 2️⃣ Open Project Folder

```bash
cd backend-of-smartkhata-book
```

---

## 3️⃣ Install Dependencies

```bash
npm install
```

---

## 4️⃣ Setup Environment Variables

Create a `.env` file in the root folder and add:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

## 5️⃣ Start Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

# 🌐 API Base URL

```bash
http://localhost:5000/api
```

---

# 📦 Required Packages

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.5.1",
    "nodemon": "^3.1.4"
  }
}
```

---

# 🔐 Authentication Flow

- User Signup
- Password Hashing using bcrypt
- JWT Token Generation
- Protected Routes using Middleware
- Role-Based Access

---

# 📡 Example API Routes

## Authentication

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | /api/auth/register | Register User |
| POST | /api/auth/login | Login User |

---

## Customer APIs

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | /api/customers | Get All Customers |
| POST | /api/customers | Add Customer |
| PUT | /api/customers/:id | Update Customer |
| DELETE | /api/customers/:id | Delete Customer |

---

## Employee APIs

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | /api/employees | Get Employees |
| POST | /api/employees | Add Employee |
| PUT | /api/employees/:id | Update Employee |
| DELETE | /api/employees/:id | Delete Employee |

---

## Transaction APIs

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | /api/transactions | Add Transaction |
| GET | /api/transactions/:customerId | Get Transactions |

---

# 💾 Database

The backend uses **MongoDB** as the primary database.

## Collections

- Users
- Customers
- Employees
- Transactions

---

# 🔮 Future Enhancements

- Firebase Authentication
- Real-Time Notifications
- Cloud Deployment
- Payment Gateway Integration
- Analytics Dashboard APIs
- Multi-Shop Support
- Admin Panel APIs
- Report Generation APIs

---

# 🔗 Frontend Integration

## Flutter App
https://github.com/Rakshitsoni1410/smartkhatabook

## Web App
https://github.com/Rakshitsoni1410/web-smartkhatabook

---

# 🎓 Academic Information

| Detail | Information |
|--------|-------------|
| Course | MCA |
| Semester | 2 |
| Project Type | Group Mini Project |
| Backend Technology | Node.js + MongoDB |

---

# 👥 Team Contribution

This backend project was developed collaboratively with responsibilities divided for:

- API Development
- Database Design
- Authentication System
- Backend Logic
- Testing
- Documentation

---

# 📝 Project Objective

The Smart Khata Backend provides secure and scalable APIs for managing:

- Customer Records
- Transactions
- Employee Data
- Salary Information
- Authentication Systems

The backend ensures proper data management and communication between mobile/web applications and the database.

---

# ❤️ Developed With

- Node.js
- Express.js
- MongoDB
- JWT
- Mongoose

---

# 📄 License

This project is developed for educational and academic purposes only.

---

# ⭐ Support

If you like this project, give it a ⭐ on GitHub.

## Repository Link

https://github.com/Rakshitsoni1410/backend-of-smartkhata-book
