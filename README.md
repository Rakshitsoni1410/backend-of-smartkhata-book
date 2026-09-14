# Smart Khata Backend 🚀

Backend API for **Smart Khata Book**, a MERN-based digital business management and ledger application built using **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

The backend powers the Smart Khata web/mobile ecosystem and handles authentication, retailers, wholesalers, customers, products, orders, inventory, billing, ledger management, employees, reviews, reports, dashboards, payment tracking, and customer portal functionality.

---

# 🔗 Project Links

## 🌐 Live Web Application

https://smartkhatabooks.netlify.app/

## ⚙️ Live Backend API

https://backend-of-smartkhata-book-vkcv.vercel.app

## 🌐 Web Frontend Repository

https://github.com/Rakshitsoni1410/web-smartkhatabook

## 📱 Flutter Frontend Repository

https://github.com/Rakshitsoni1410/smartkhatabook

## ⚙️ Backend Repository

https://github.com/Rakshitsoni1410/backend-of-smartkhata-book

---

# ✨ Main Backend Features

Smart Khata Backend currently supports:

- Secure User Registration and Login
- Retailer, Wholesaler, and Customer Roles
- JWT Authentication
- Single Active Login Session
- Automatic Old Session Invalidation
- Login Attempt Rate Limiting
- Temporary Login Blocking after Repeated Failed Attempts
- Password Reset through Email
- Product and Inventory Management
- Smart Wholesaler Selection
- Order Management
- Advance Payment Requests
- Final Payment Requests
- Demo Payment Gateway
- Payment Transaction History
- Billing and Invoice Generation
- Bill Sharing from Wholesaler to Retailer
- Ledger Management
- Employee Management
- Reviews
- Dashboard APIs
- Business Reports
- Customer Portal
- Cloud Deployment

---

# 🔐 Authentication & Security

Smart Khata includes multiple authentication and security layers.

## User Authentication

- User Registration
- User Login
- Phone / Email Based Login Support
- Password Hashing using bcrypt
- JWT Token Authentication
- Protected API Routes
- Role-Based Access
- Password Reset
- Reset Token Expiry

## Single Active Session

Only the most recent login for an account remains valid.

Example:

```text
Laptop Login
    ↓
Session Version = 1

Mobile Login with same account
    ↓
Session Version = 2

Laptop Token = Version 1 ❌
Mobile Token = Version 2 ✅
```

When the old device makes another protected API request, the backend returns:

```text
401 SESSION_EXPIRED
```

The frontend then automatically clears the old session and redirects the user to login.

---

# 🛡️ Login Attempt Protection

Smart Khata includes login brute-force protection.

Example flow:

```text
Wrong Login Attempt 1
Wrong Login Attempt 2
Wrong Login Attempt 3
Wrong Login Attempt 4
Wrong Login Attempt 5

        ↓

Login Temporarily Blocked

        ↓

HTTP 429 Too Many Requests
```

Failed login tracking can be stored using Redis so it works correctly with the Vercel serverless backend.

Protection can track:

- IP Address
- Phone Number / Email Account
- Failed Login Attempts
- Temporary Block Duration

---

# 👥 User Roles

The backend supports the following roles:

```text
Retailer
Wholesaler
Customer
```

Each role receives different application features and business workflows.

---

# 🛒 Order Management

Smart Khata includes a complete retailer-wholesaler order workflow.

Order lifecycle:

```text
Pending
   ↓
Approved
   ↓
Advance Pending
   ↓
Processing
   ↓
On The Way
   ↓
Delivered
   ↓
Completed
```

Supported order statuses:

```text
pending
approved
advancePending
processing
onTheWay
delivered
completed
rejected
```

Backend order functionality includes:

- Create Order
- Smart Wholesaler Selection
- Product Matching
- Stock Availability Check
- Automatic Stock Reduction
- Retailer Order History
- Wholesaler Order History
- Approve Order
- Reject Order
- Mark Order On The Way
- Mark Order Delivered
- Complete Order after Final Payment

---

# 🤖 Smart Wholesaler Selection

When a retailer places an order, the backend searches available wholesaler products and selects an appropriate wholesaler based on business data such as:

- Product Availability
- Required Quantity
- Selling Price
- Available Stock
- Rating
- Reviews

The selected wholesaler is automatically linked to the order.

---

# 📦 Inventory Management

Product and inventory functionality includes:

- Add Products
- Product Details
- Product Categories
- Selling Price
- Stock Quantity
- Stock Availability
- Wholesaler Product Ownership
- Automatic Stock Reduction after Order Placement
- Out-of-Stock Handling

---

# 💳 Payment Management

Smart Khata supports advance and final-payment workflows.

## Advance Payment Flow

```text
Wholesaler requests advance
        ↓
Retailer receives payment request
        ↓
Retailer opens Demo Payment Gateway
        ↓
Payment completed
        ↓
Advance marked as paid
        ↓
Order moves to Processing
```

## Final Payment Flow

```text
Order Delivered
        ↓
Wholesaler requests final payment
        ↓
Retailer opens Demo Payment Gateway
        ↓
Final payment completed
        ↓
Order marked Completed
```

---

# 🧪 Demo Payment Gateway

Smart Khata includes a **mock payment gateway for educational and project demonstration purposes**.

No real money is transferred.

Available demo payment methods:

- UPI
- Card
- Net Banking

The demo payment gateway generates transaction IDs similar to:

```text
SKPAY-M123ABC-XYZ12
```

The application clearly identifies the gateway as **TEST MODE / Demo Payment Gateway**.

Users should never enter real:

- UPI PINs
- CVVs
- Banking Passwords
- Real Payment Credentials

---

# 🧾 Payment History

Successful demo payments are stored permanently with the related order.

Example:

```json
{
  "transactionId": "SKPAY-ABC123",
  "paymentType": "advance",
  "paymentMethod": "upi",
  "amount": 2500,
  "status": "success",
  "isMockPayment": true,
  "paidAt": "2026-09-14T10:30:00.000Z"
}
```

Each order can contain multiple payment records.

Example:

```text
Payment History

├── Advance Payment
│   ├── Transaction ID
│   ├── UPI
│   └── ₹2,500
│
└── Final Payment
    ├── Transaction ID
    ├── Card
    └── ₹7,500
```

The backend also stores the latest payment details:

```text
lastPaymentTransactionId
lastPaymentMethod
lastPaymentType
lastPaymentAmount
lastPaymentAt
```

---

# 💰 Payment Status

Supported payment statuses:

```text
unpaid
advanceRequested
advancePaid
partial
paid
```

---

# 🧾 Billing & Invoice Management

Smart Khata includes a complete retailer-wholesaler billing workflow.

Flow:

```text
Order Delivered
        ↓
Wholesaler Generates Bill
        ↓
Wholesaler Confirms Send Bill
        ↓
Bill Sent to Retailer
        ↓
Retailer sees Bill in Billing Section
        ↓
Retailer can Download / Print Bill
```

The retailer only sees invoices that have been explicitly sent by the wholesaler.

Invoice information includes:

- Invoice Number
- Wholesaler Details
- Retailer Details
- Product
- Quantity
- Price Per Unit
- Total Amount
- Payment Status
- Order Status
- Invoice Date

Example invoice number:

```text
ARBROS-14-09-2026-0001
```

---

# 📒 Ledger Management

Smart Khata automatically records financial ledger entries during important business events.

Ledger records can include:

- Order Debit
- Order Credit
- Advance Payment
- Final Payment
- Retailer Transaction
- Wholesaler Transaction

Example:

```text
Retailer
Debit ₹2,500
Advance Payment

Wholesaler
Credit ₹2,500
Advance Payment Received
```

Transaction IDs can also be included in payment-related ledger notes.

---

# 👨‍💼 Employee Management

Employee-related APIs include:

- Add Employee
- View Employees
- Edit Employee
- Delete Employee
- Employee Management
- Salary Tracking
- Pending Salary Information
- Payment Records

---

# ⭐ Review Management

The backend includes review functionality for business interactions.

Supported operations include:

- Add Review
- Fetch Reviews
- Store Ratings
- Associate Reviews with relevant users/business records

Reviews can also contribute to Smart Khata's wholesaler/product selection logic.

---

# 📊 Dashboard APIs

Dashboard APIs provide summarized business information for application screens.

Dashboard data can include:

- Business Overview
- Order Information
- Inventory Information
- Employee Information
- Payment Information
- Activity Summary

---

# 📈 Reports

Smart Khata includes backend reporting APIs.

Reports can provide business-level information such as:

- Orders
- Payment Status
- Stock Information
- Reviews
- Ledger Activity
- Recent Orders
- Business Performance Information

Report routes are available through:

```text
/api/reports
```

---

# 👤 Customer Portal

The Customer Portal provides customer-facing business information.

Customer portal functionality can include:

- Ledger Information
- Transaction History
- Business Data
- Customer Account Information

---

# 🛠️ Tech Stack

| Technology      | Usage                   |
| --------------- | ----------------------- |
| Node.js         | Runtime Environment     |
| Express.js      | Backend Framework       |
| MongoDB         | Database                |
| Mongoose        | MongoDB ODM             |
| JWT             | Authentication          |
| bcrypt          | Password Hashing        |
| Redis / Upstash | Login Attempt Tracking  |
| dotenv          | Environment Variables   |
| CORS            | Cross-Origin Requests   |
| Cloudinary      | Cloud Media Integration |
| Vercel          | Backend Deployment      |

---

# 📂 Backend Project Structure

```text
backend-of-smartkhata-book/
│
├── config/
│   ├── mongodb.js
│   └── cloudinary.js
│
├── controllers/
│   ├── userController.js
│   ├── orderController.js
│   ├── dashboardController.js
│   ├── reportController.js
│   └── ...
│
├── middleware/
│   ├── authUser.js
│   ├── loginRateLimiter.js
│   └── ...
│
├── models/
│   ├── userModel.js
│   ├── orderModel.js
│   ├── productModel.js
│   ├── ledgerModel.js
│   ├── Counter.js
│   └── ...
│
├── routes/
│   ├── userRoute.js
│   ├── productRoute.js
│   ├── orderRoutes.js
│   ├── reviewRoutes.js
│   ├── dashboardRoutes.js
│   ├── employeeRoutes.js
│   ├── ledgerRoutes.js
│   ├── customerPortalRoutes.js
│   └── reportRoutes.js
│
├── utils/
│   ├── sendEmail.js
│   ├── generateInvoiceNumber.js
│   └── ...
│
├── .env
├── package.json
├── server.js
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

Create a `.env` file in the root directory.

Example:

```env
PORT=4000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=https://smartkhatabooks.netlify.app

UPSTASH_REDIS_REST_URL=your_upstash_redis_url

UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

Additional environment variables may be required for email or cloud services depending on configuration.

> Never commit `.env` or real secret keys to GitHub.

---

# ▶️ Run Locally

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

The local API should normally run at:

```text
http://localhost:4000
```

---

# 🌐 API Base URLs

## Local

```text
http://localhost:4000/api
```

## Production

```text
https://backend-of-smartkhata-book-vkcv.vercel.app/api
```

---

# 📡 Important API Routes

## Authentication

| Method | Endpoint                              | Description            |
| ------ | ------------------------------------- | ---------------------- |
| POST   | `/api/user/register`                  | Register user          |
| POST   | `/api/user/login`                     | Login user             |
| POST   | `/api/user/forgot-password`           | Request password reset |
| POST   | `/api/user/reset-password/:token`     | Reset password         |
| GET    | `/api/user/wholesalers/:businessType` | Get wholesalers        |

---

## Orders

| Method | Endpoint                                | Description                   |
| ------ | --------------------------------------- | ----------------------------- |
| POST   | `/api/orders/create`                    | Create order                  |
| GET    | `/api/orders/retailer/:id`              | Retailer orders               |
| GET    | `/api/orders/wholesaler/:id`            | Wholesaler orders             |
| PATCH  | `/api/orders/:id/status`                | Update order status           |
| PATCH  | `/api/orders/:id/request-advance`       | Request advance payment       |
| PATCH  | `/api/orders/:id/pay-advance`           | Complete demo advance payment |
| PATCH  | `/api/orders/:id/request-final-payment` | Request final payment         |
| PATCH  | `/api/orders/:id/complete-payment`      | Complete demo final payment   |
| PATCH  | `/api/orders/:id/send-bill`             | Send bill to retailer         |

---

## Billing

| Method | Endpoint                             | Description                |
| ------ | ------------------------------------ | -------------------------- |
| GET    | `/api/orders/billing/retailer/:id`   | Retailer bills             |
| GET    | `/api/orders/billing/wholesaler/:id` | Wholesaler billing records |

---

## Reports

```text
/api/reports
```

---

## Ledger

```text
/api/ledger
```

---

## Employees

```text
/api/employees
```

---

## Reviews

```text
/api/reviews
```

---

## Dashboard

```text
/api/dashboard
```

---

## Customer Portal

```text
/api/customer-portal
```

---

# 🔄 Complete Business Flow

```text
Retailer Places Order
        ↓
Backend Selects Wholesaler
        ↓
Stock Reserved / Reduced
        ↓
Wholesaler Approves Order
        ↓
Wholesaler Requests Advance
        ↓
Retailer Pays using Demo Gateway
        ↓
Transaction Stored
        ↓
Order Processing
        ↓
Order On The Way
        ↓
Order Delivered
        ↓
Wholesaler Generates / Sends Bill
        ↓
Wholesaler Requests Final Payment
        ↓
Retailer Completes Demo Payment
        ↓
Transaction Stored
        ↓
Order Completed
        ↓
Ledger + Billing + Reports Updated
```

---

# 💾 Database

Smart Khata uses **MongoDB** as its primary database.

Important collections include:

- Users
- Products
- Orders
- Ledger Entries
- Employees
- Reviews
- Invoice Counters
- Other Business Data

---

# ☁️ Deployment

## Frontend

Hosted on **Netlify**:

```text
https://smartkhatabooks.netlify.app/
```

## Backend

Hosted on **Vercel**:

```text
https://backend-of-smartkhata-book-vkcv.vercel.app
```

## Database

MongoDB is used for persistent backend storage.

---

# 🔒 Security Features

Smart Khata includes:

- Password Hashing
- JWT Authentication
- Protected Routes
- Single Active Session
- Session Version Validation
- Automatic Old Session Logout
- Failed Login Tracking
- Temporary Login Blocking
- Password Reset Token Expiry
- Server-Side Payment Amount Validation
- Duplicate Demo Transaction Protection
- CORS Protection
- Environment Variable Secrets

---

# 🧪 Educational Payment Disclaimer

The Smart Khata payment gateway is a **demo/mock payment system only**.

It does not:

- Transfer real money
- Connect to real banks
- Process real cards
- Process real UPI payments
- Store real banking credentials

The payment feature exists only to demonstrate business payment workflows in the academic project.

---

# 🎓 Academic Information

| Detail       | Information          |
| ------------ | -------------------- |
| Course       | MCA                  |
| Semester     | 2                    |
| Project Type | Group Mini Project   |
| Backend      | Node.js + Express.js |
| Database     | MongoDB              |
| Frontend     | React / Flutter      |

---

# 👥 Team Contribution

This project was developed collaboratively with responsibilities divided across:

- Backend API Development
- Frontend Development
- Database Design
- Authentication
- Order Management
- Ledger Management
- Payment Workflow
- Billing
- Employee Management
- Reports
- Testing
- Documentation

---

# 📝 Project Objective

The objective of **Smart Khata Book** is to provide a digital business-management platform that helps retailers, wholesalers, customers, and shop owners manage day-to-day business operations.

The platform focuses on:

- Digital Ledger Management
- Order Management
- Inventory Management
- Billing
- Payment Tracking
- Employee Management
- Customer Records
- Business Reports
- Secure Authentication

Smart Khata connects business data across web and mobile applications through a centralized backend API.

---

# 🔮 Future Enhancements

Possible future improvements include:

- Real Payment Gateway Integration
- Real-Time Notifications
- WebSocket-Based Instant Session Logout
- Advanced Analytics
- GST Invoice Support
- PDF Invoice Export
- Admin Dashboard
- Multi-Shop Management
- Push Notifications
- AI-Based Business Insights
- Automated Payment Reminders
- Cloud Backup
- Advanced Audit Logs

---

# ❤️ Developed With

- Node.js
- Express.js
- MongoDB
- Mongoose
- React
- Flutter
- JWT
- bcrypt
- Redis
- Vercel
- Netlify

---

# 📄 License

This project is currently developed for **educational and academic purposes**.

---

# ⭐ Support

If you like this project, consider giving the repositories a ⭐ on GitHub.

## Backend Repository

https://github.com/Rakshitsoni1410/backend-of-smartkhata-book

## Web Repository

https://github.com/Rakshitsoni1410/web-smartkhatabook

## Flutter Repository

https://github.com/Rakshitsoni1410/smartkhatabook

---

**Smart Khata Book — Digital Ledger, Orders, Billing & Business Management 🚀**
