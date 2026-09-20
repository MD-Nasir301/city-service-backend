# City Complaint & Service Platform

## Overview

The City Complaint & Service Platform is a backend system designed to help citizens report urban issues such as road damage, drainage problems, waste management concerns, and other civic service needs. It allows service requests to be created, tracked, assigned to staff, and monitored until completion, making communication between citizens and city administration more organized and transparent.

This platform supports role-based access for citizens, staff, admins, and super admins, with secure authentication, validation, payment handling, and activity tracking for operational transparency.

---

## Core Features

- User Roles: Citizen, Staff, Admin, and Super Admin
- Authentication: Email/password login, Google OAuth support, and Redis-based OTP verification
- Complaint / Service Requests: Create requests, assign staff, update status, and soft delete records
- Payment Gateway: Stripe Checkout Session and webhook integration for paid service requests with automated email receipts
- Security & Validation: Zod validation, JWT authentication, Helmet security headers, and rate limiting
- Audit Trail: System logs for important administrative updates and changes

---

## Tech Stack Used

### Language

- TypeScript

### Runtime & Framework

- Node.js
- Express.js

### Database & ORM

- PostgreSQL
- Prisma ORM

### Caching & Temporary Data

- Redis

### Validation & Utilities

- Zod
- Nodemailer
- EJS Templates
- Multer
- Cloudinary
- Stripe

### Security

- Helmet
- Express Rate Limit
- Bcrypt
- JWT (JSON Web Tokens)

---

## Environment Variables

Create a `.env` file in the root folder using the variables below:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public"
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:5000
CLIENT_APP_URL=http://localhost:3000

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=6d

BCRYPT_SALT_ROUNDS=12
GOOGLE_CLIENT_ID=your_google_client_id

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USER=default
REDIS_PASSWORD=your_redis_password

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

SMTP_USER=your_smtp_email
SMTP_PASSWORD=your_smtp_password
EMAIL_SENDER=your_sender_email

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=superadmin123

TESTER_ADMIN_NAME=Tester Admin
TESTER_ADMIN_EMAIL=admin2@example.com
TESTER_ADMIN_PASSWORD=admin123

TESTER_STAFF_NAME=Tester Staff
TESTER_STAFF_EMAIL=staff@example.com
TESTER_STAFF_PASSWORD=staff123
```

---

## How to Run the Project Locally

### Step 1: Clone the repository

```bash
git clone <repository-url>
cd Assignment_6
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up the `.env` file

Create a `.env` file in the project root and add the variables from the example above.

### Step 4: Run Prisma migrations

```bash
npx prisma migrate dev
```

This will set up the PostgreSQL database schema and apply the project migrations.

### Step 5: Start the development server

```bash
npm run dev
```

The backend server should start in development mode and listen on the configured port.

---

## API Endpoints Overview

Below is a simplified summary of the main route modules used in the project.

### 1. Auth Module

| Method | Endpoint                       | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| POST   | `/api/v1/auth/register`        | Register a new citizen        |
| POST   | `/api/v1/auth/verify-email`    | Verify email using OTP        |
| POST   | `/api/v1/auth/login`           | Login with email and password |
| POST   | `/api/v1/auth/google`          | Login with Google OAuth       |
| POST   | `/api/v1/auth/refresh-token`   | Refresh access token          |
| POST   | `/api/v1/auth/forgot-password` | Send OTP for password reset   |
| POST   | `/api/v1/auth/reset-password`  | Reset password with OTP       |

### 2. Categories Module

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| POST   | `/api/v1/categories`     | Create a new category |
| GET    | `/api/v1/categories`     | Get all categories    |
| GET    | `/api/v1/categories/:id` | Get single category   |
| PATCH  | `/api/v1/categories/:id` | Update category       |
| DELETE | `/api/v1/categories/:id` | Soft delete category  |

### 3. Service Requests Module

| Method | Endpoint                                           | Description                              |
| ------ | -------------------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/service-request`                          | Create a service request                 |
| GET    | `/api/v1/service-request`                          | Get all service requests                 |
| GET    | `/api/v1/service-request/my-requests`              | Get current user's requests              |
| GET    | `/api/v1/service-request/my-assigned`              | Get assigned requests for a staff member |
| GET    | `/api/v1/service-request/:id`                      | Fetch a single request                   |
| PATCH  | `/api/v1/service-request/:serviceRequestId/assign` | Assign a staff member                    |
| PATCH  | `/api/v1/service-request/:id/status`               | Change request status                    |
| DELETE | `/api/v1/service-request/:id`                      | Delete request                           |
| PATCH  | `/api/v1/service-request/:id`                      | Update request details                   |

### 4. Users Module

| Method | Endpoint           | Description                   |
| ------ | ------------------ | ----------------------------- |
| GET    | `/api/v1/users/me` | View logged-in user's profile |
| PATCH  | `/api/v1/users/me` | Update profile and image      |

### 5. Staff Module

| Method | Endpoint                        | Description                    |
| ------ | ------------------------------- | ------------------------------ |
| GET    | `/api/v1/staff/dashboard-stats` | Get staff dashboard statistics |

### 6. Comments Module

| Method | Endpoint                            | Description                        |
| ------ | ----------------------------------- | ---------------------------------- |
| POST   | `/api/v1/comment`                   | Add a comment to a service request |
| GET    | `/api/v1/comment/:serviceRequestId` | Get comments for a request         |
| PATCH  | `/api/v1/comment/:id`               | Update a comment                   |
| DELETE | `/api/v1/comment/:id`               | Delete a comment                   |

### 7. Admin Module

| Method | Endpoint                         | Description                 |
| ------ | -------------------------------- | --------------------------- |
| GET    | `/api/v1/admin/users`            | View all users              |
| PATCH  | `/api/v1/admin/users/:id/status` | Update user status          |
| PATCH  | `/api/v1/admin/users/:id/role`   | Update user role            |
| GET    | `/api/v1/admin/dashboard-stats`  | Get admin dashboard metrics |
| GET    | `/api/v1/admin/audit-logs`       | View audit logs             |
| POST   | `/api/v1/admin/create-staff`     | Create staff account        |

### 8. Payments Module

| Method | Endpoint                                   | Description                   |
| ------ | ------------------------------------------ | ----------------------------- |
| POST   | `/api/v1/payments/create-checkout-session` | Create Stripe payment session |
| POST   | `/api/v1/payments/webhook`                 | Handle Stripe webhook updates |

---

## Project Summary

This project is a role-based city service management backend built for handling citizen complaints and operational workflows. It includes secure authentication, request tracking, staff assignment, payment processing, email notifications, and audit logging to support a complete issue-resolution system.

The project is suitable for assignment submission and can be extended further with frontend integration, analytics dashboards, or additional reporting features.

## 👨‍💻 Author & Submission Info

- **Developer:** Nasir
- **Project:** City Complaint & Service Management Platform 
- **Email:** nasir21b@gmail.com
- **GitHub:** https://github.com/MD-Nasir301
