# Smart Khata Backend 🚀

Backend API for **Smart Khata Book** — a MERN-stack digital business-management and ledger application built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

The backend powers the Smart Khata web and mobile ecosystem, handling authentication, retailer/wholesaler/customer roles, products, inventory, smart supplier selection, orders, demo payments, billing, ledger management, employees, daily attendance, in-app notifications, reviews, dashboards, reports, and the customer portal.

> **Academic note:** The payment system is a mock/demo workflow. No real money is transferred.

---

## 🔗 Project Links

| Resource          | Link                                                          |
| ----------------- | ------------------------------------------------------------- |
| Live Web App      | https://smartkhatabooks.netlify.app/                          |
| Live Backend API  | https://backend-of-smartkhata-book-vkcv.vercel.app            |
| Web Frontend Repo | https://github.com/Rakshitsoni1410/web-smartkhatabook         |
| Flutter App Repo  | https://github.com/Rakshitsoni1410/smartkhatabook             |
| Backend Repo      | https://github.com/Rakshitsoni1410/backend-of-smartkhata-book |

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/Rakshitsoni1410/backend-of-smartkhata-book.git

# 2. Enter the project directory
cd backend-of-smartkhata-book

# 3. Install dependencies
npm install

# 4. Create your .env file (see Environment Variables below)

# 5. Start the development server
npm run dev

# Production
npm start
```

Local API base URL:

```
http://localhost:4000/api
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
PORT=4000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=https://smartkhatabooks.netlify.app

UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

ATTENDANCE_TIMEZONE=Asia/Kolkata

# Email (configure per your implementation)
EMAIL_USER=your_email_account
EMAIL_PASS=your_email_app_password

# Cloudinary (when enabled)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> ⚠️ Never commit `.env` files or real secrets to GitHub.

---

## 🛠️ Tech Stack

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

## 📂 Project Structure

```
backend-of-smartkhata-book/
│
├── config/
│   ├── mongodb.js
│   └── cloudinary.js
│
├── controllers/
│   ├── userController.js
│   ├── orderController.js
│   ├── employeeController.js
│   ├── notificationController.js
│   ├── dashboardController.js
│   ├── reportController.js
│   └── ...
│
├── middlewares/
│   ├── authUser.js
│   ├── loginRateLimiter.js
│   └── ...
│
├── models/
│   ├── userModel.js
│   ├── orderModel.js
│   ├── productModel.js
│   ├── ledgerModel.js
│   ├── employeeModel.js
│   ├── notificationModel.js
│   ├── Counter.js
│   └── ...
│
├── routes/
│   ├── userRoute.js
│   ├── productRoute.js
│   ├── orderRoutes.js
│   ├── employeeRoutes.js
│   ├── notificationRoutes.js
│   ├── reviewRoutes.js
│   ├── dashboardRoutes.js
│   ├── ledgerRoutes.js
│   ├── customerPortalRoutes.js
│   └── reportRoutes.js
│
├── utils/
│   ├── sendEmail.js
│   ├── generateInvoiceNumber.js
│   ├── createNotification.js
│   └── ...
│
├── .env
├── package.json
├── server.js
└── README.md
```

---

## 📡 API Reference

### Base URLs

| Environment | URL                                                      |
| ----------- | -------------------------------------------------------- |
| Local       | `http://localhost:4000/api`                              |
| Production  | `https://backend-of-smartkhata-book-vkcv.vercel.app/api` |

---

### 🔐 Authentication / Users

| Method | Endpoint                              | Description                 |
| ------ | ------------------------------------- | --------------------------- |
| POST   | `/api/user/register`                  | Register a new user         |
| POST   | `/api/user/login`                     | Login                       |
| POST   | `/api/user/forgot-password`           | Request password reset      |
| POST   | `/api/user/reset-password/:token`     | Reset password              |
| GET    | `/api/user/wholesalers/:businessType` | Get wholesalers by category |

---

### 🛒 Orders

| Method | Endpoint                                | Description                   |
| ------ | --------------------------------------- | ----------------------------- |
| POST   | `/api/orders/create`                    | Create order (auto or manual) |
| POST   | `/api/orders/recommendations`           | Get supplier recommendations  |
| GET    | `/api/orders/retailer/:id`              | Retailer order history        |
| GET    | `/api/orders/wholesaler/:id`            | Wholesaler order history      |
| PATCH  | `/api/orders/:id/status`                | Update order status           |
| PATCH  | `/api/orders/:id/request-advance`       | Request advance payment       |
| PATCH  | `/api/orders/:id/pay-advance`           | Record demo advance payment   |
| PATCH  | `/api/orders/:id/request-final-payment` | Request final payment         |
| PATCH  | `/api/orders/:id/complete-payment`      | Record demo final payment     |
| PATCH  | `/api/orders/:id/send-bill`             | Send bill to retailer         |

---

### 🧾 Billing

| Method | Endpoint                             | Description                |
| ------ | ------------------------------------ | -------------------------- |
| GET    | `/api/orders/billing/retailer/:id`   | Retailer bills             |
| GET    | `/api/orders/billing/wholesaler/:id` | Wholesaler billing records |

---

### 👨‍💼 Employees

| Method | Endpoint                            | Description                    |
| ------ | ----------------------------------- | ------------------------------ |
| GET    | `/api/employees`                    | List all employees             |
| GET    | `/api/employees/search`             | Search employees               |
| POST   | `/api/employees/add`                | Add employee                   |
| PUT    | `/api/employees/update/:id`         | Update employee                |
| DELETE | `/api/employees/delete/:id`         | Delete employee                |
| POST   | `/api/employees/payment/:id`        | Record salary payment          |
| POST   | `/api/employees/attendance/:id`     | Mark attendance                |
| POST   | `/api/employees/attendance/cleanup` | Normalize duplicate attendance |

---

### 🔔 Notifications

| Method | Endpoint                          | Description               |
| ------ | --------------------------------- | ------------------------- |
| GET    | `/api/notifications`              | Get all notifications     |
| GET    | `/api/notifications/unread-count` | Unread notification count |
| PATCH  | `/api/notifications/read-all`     | Mark all as read          |
| PATCH  | `/api/notifications/:id/read`     | Mark one as read          |
| DELETE | `/api/notifications/:id`          | Delete one notification   |
| DELETE | `/api/notifications/clear-all`    | Clear all notifications   |

---

### Other Routes

| Base Route             | Description            |
| ---------------------- | ---------------------- |
| `/api/ledger`          | Ledger management      |
| `/api/reports`         | Business reports       |
| `/api/reviews`         | Reviews & ratings      |
| `/api/dashboard`       | Dashboard summary data |
| `/api/customer-portal` | Customer-facing data   |

---

## ✨ Features

### 🔐 Authentication & Security

- Registration & login with phone / email support
- Password hashing with **bcrypt**
- **JWT** authentication with session version validation
- Single active session enforcement — old sessions are invalidated on new login
- Forgot password / OTP reset with token expiry
- Role-based access control (Retailer · Wholesaler · Customer)

**Single Session Example:**

```
Laptop Login   → Session Version = 1
Mobile Login   → Session Version = 2

Laptop token (v1) ❌ — rejected with 401 SESSION_EXPIRED
Mobile token  (v2) ✅ — valid
```

**Login Rate Limiting (Redis / Upstash):**

```
5 Failed Login Attempts
        ↓
Account Temporarily Blocked
        ↓
HTTP 429 Too Many Requests
```

Tracks by IP address and account (email / phone).

---

### 👥 User Roles

| Role       | Permissions                                                      |
| ---------- | ---------------------------------------------------------------- |
| Retailer   | Place orders · Pay demo invoices · View bills & ledger           |
| Wholesaler | Manage products · Approve orders · Request payments · Send bills |
| Customer   | View account · Ledger · Transaction history                      |

---

### 📦 Product & Inventory Management

- Add / Update / Delete products with category, price, and stock data
- Wholesaler product ownership
- Eligible supplier discovery for order creation
- Stock validation during order creation
- Automatic stock reservation / reduction on successful order

---

### 🛒 Order Management

**Lifecycle:**

```
pending → approved → advancePending → processing → onTheWay → delivered → completed
```

Additional status: `rejected`

**Backend handles:**

- Create order with smart or manual supplier selection
- Retailer & wholesaler order history with details
- Approve / reject · Request & record demo advance payment
- Mark processing · On the Way · Delivered
- Request & record demo final payment · Complete order
- Generate / send bill · Store payment history
- Create in-app notifications on each status change

---

### 🤝 Smart Supplier Selection

#### ⚡ Smart Auto

Rule-based scoring selects the best eligible wholesaler automatically, considering:

- Product availability & required quantity
- Selling price (price-protection rule applied)
- Available stock, rating, review count
- Fair order distribution

> **Not a trained AI/ML model** — the logic is heuristic and rule-based.

#### 👤 Manual + Smart Suggestions

```
POST /api/orders/recommendations
```

Returns ranked wholesalers with reasons and a smart-recommendation flag. The retailer picks one, and the frontend submits:

```json
{
  "productName": "Rice",
  "quantity": 10,
  "unit": "kg",
  "selectionMode": "manual",
  "selectedWholesalerId": "ObjectId",
  "selectedProductId": "ObjectId"
}
```

**Before creating the order, the backend revalidates:**

- Wholesaler & product identity
- Product name match
- Current price & available stock
- Required quantity can be fulfilled

Orders store full selection metadata: mode, recommendation score, reasons, whether the recommendation was accepted, and strategy used.

---

### 💳 Demo Payment Gateway

> ⚠️ No real money is transferred — demo/mock only.

Supported methods: **UPI · Card · Net Banking**

```
Payment Requested
       ↓
Retailer Opens Demo Gateway
       ↓
Demo Method Selected & Confirmed
       ↓
Backend Validates Amount
       ↓
Demo Transaction Stored
       ↓
Order Payment State Updated
```

**Payment history stored per order:**

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

**Payment statuses:** `unpaid · advanceRequested · advancePaid · partial · paid`

---

### 🧾 Billing & Invoice Management

```
Order Delivered
        ↓
Wholesaler Generates Bill
        ↓
Wholesaler Sends Bill
        ↓
Retailer Sees Bill
        ↓
Retailer Prints / Downloads
```

Invoice includes: Invoice number · Wholesaler & retailer details · Product · Quantity · Price per unit · Total · Payment status · Order status · Invoice date.

Example invoice number:

```
ARBROS-14-09-2026-0001
```

---

### 📒 Ledger Management

Automatically records entries for:

- Order debit / credit
- Advance payment received / made
- Final payment received / made

Each entry includes transaction notes and is linked to the relevant business party.

---

### 👨‍💼 Employee Management

- Add / Edit / Delete employees with salary and role information
- Salary payment records & pending salary tracking
- Daily attendance (Present / Absent / Leave)

**One record per employee per day** (keyed by business date `YYYY-MM-DD`):

```
24 Sep → Present
24 Sep → Update to Absent  ← same record updated, no duplicate
25 Sep → New record
```

Set your timezone in `.env`:

```env
ATTENDANCE_TIMEZONE=Asia/Kolkata
```

Clean up old duplicate attendance with:

```
POST /api/employees/attendance/cleanup
```

---

### 🔔 In-App Notifications

Notification model stores: recipient · actor · related order · type · title · message · link · read state · metadata · dedupe key.

Events that create notifications:

| Event                   | Recipient  |
| ----------------------- | ---------- |
| New order               | Wholesaler |
| Order status update     | Retailer   |
| Advance requested       | Retailer   |
| Advance paid            | Wholesaler |
| Final payment requested | Retailer   |
| Final payment completed | Wholesaler |
| Bill sent               | Retailer   |

> Notification creation is a best-effort secondary action — a notification failure never breaks the main business operation.

---

### ⭐ Reviews

- Add & fetch reviews with ratings
- Associate reviews with users / business records
- Ratings and review counts contribute to smart supplier scoring

---

### 📊 Dashboard APIs

Provides aggregated business data: orders, inventory, employees, payments, and activity summaries per role.

---

### 📈 Reports

```
GET /api/reports/...
```

Report data: orders · recent orders · payment status · stock · reviews · ledger activity · business performance.

---

### 👤 Customer Portal

```
GET /api/customer-portal/...
```

Customer-facing ledger, transaction history, and account data.

---

## 🔒 Security Features

- Password hashing with bcrypt
- JWT authentication & session version validation
- Single active session + automatic old-session rejection
- Failed login tracking with temporary blocking (Redis / Upstash)
- Password reset with token expiry
- Role checks & ownership validation on all protected routes
- Server-side payment amount validation
- Duplicate demo transaction protection
- Manual order selection revalidation (price + stock rechecked server-side)
- CORS configuration
- Environment variable secrets — never hardcoded

---

## 💾 Database Collections

| Collection     | Description                       |
| -------------- | --------------------------------- |
| Users          | Retailers, wholesalers, customers |
| Products       | Wholesaler inventory              |
| Orders         | Full order lifecycle              |
| Ledger Entries | Financial records                 |
| Employees      | Staff & salary data               |
| Notifications  | In-app notification records       |
| Reviews        | Ratings & feedback                |
| Counter        | Invoice number sequences          |

---

## 🔄 Complete Business Flow

```
Retailer Needs Stock
        ↓
Select Ordering Mode
   ┌────┴────────────────┐
   ↓                     ↓
Smart Auto           Choose Myself
   ↓                     ↓
Backend Scores       Recommendations
Suppliers            Returned
   ↓                     ↓
                  Retailer Selects
   └──────────┬──────────┘
              ↓
Backend Revalidates Product + Stock + Price
              ↓
        Order Created
              ↓
    Stock Reserved / Reduced
              ↓
    Wholesaler Notification
              ↓
      Wholesaler Approves
              ↓
       Advance Requested
              ↓
  Retailer Completes Demo Payment
              ↓
          Processing
              ↓
           On The Way
              ↓
           Delivered
              ↓
    Bill Generated & Sent
              ↓
  Final Payment Requested
              ↓
  Retailer Completes Demo Payment
              ↓
           Completed
              ↓
  Ledger / Billing / Reports Updated
```

---

## ☁️ Deployment

| Layer         | Platform        | URL                                                |
| ------------- | --------------- | -------------------------------------------------- |
| Frontend      | Netlify         | https://smartkhatabooks.netlify.app/               |
| Backend       | Vercel          | https://backend-of-smartkhata-book-vkcv.vercel.app |
| Database      | MongoDB Atlas   | Persistent cloud storage                           |
| Session Cache | Redis / Upstash | Distributed login-attempt tracking                 |

---

## 🔮 Future Enhancements

- Real payment gateway integration
- Native push notifications
- WebSocket real-time updates & instant session logout
- GST invoice support & advanced PDF export
- Advanced analytics & demand forecasting
- Admin dashboard & multi-shop management
- Automated payment reminders
- Advanced audit logs
- Optional ML-based recommendations

---

## 🎓 Academic Information

| Detail       | Information          |
| ------------ | -------------------- |
| Project      | Smart Khata Book     |
| Course       | MCA — Semester 2     |
| Project Type | Group Mini Project   |
| Backend      | Node.js + Express.js |
| Database     | MongoDB              |
| Frontends    | React.js + Flutter   |

---

## 🧪 Educational Payment Disclaimer

The Smart Khata payment gateway is a **demo/mock system only**.

It does **not**:

- Transfer real money
- Connect to real banks
- Process real card or UPI payments
- Store real banking credentials

---

## 👨‍💻 Author

Developed by **rrsoni**
GitHub: https://github.com/Rakshitsoni1410

---

## 📄 License

Developed for **educational and academic purposes**.

---

> ⭐ If you find Smart Khata Book useful, consider starring the repositories on GitHub!
>
> **Smart Khata Book — Digital Ledger, Smart Orders, Billing, Employees, Notifications & Business Management 🚀**
