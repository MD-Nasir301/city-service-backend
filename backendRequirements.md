# Backend Requirements for Frontend Integration

This document describes the API implemented by the current backend source. It is based on the Express route registration, controllers, validators, services, middleware, Prisma schema, and repository documentation.

## 1. Overview & Base Config

### Base URL and transport

- Backend origin is configured by the deployment. Local development uses the configured `PORT` (the README example is `5000`).
- API base path: `/api/v1`.
- Full URL pattern: `${BACKEND_ORIGIN}/api/v1`.
- JSON endpoints use `Content-Type: application/json`.
- Upload endpoints use `multipart/form-data`.
- CORS allows the configured `FRONTEND_URL` and credentials are enabled.
- Frontend requests should send credentials (`credentials: "include"` or Axios `withCredentials: true`).
- A global rate limiter allows 100 requests per 15 minutes. A rate-limit response is approximately `{ success: false, message: "Too many requests, please try again later." }`.

### Roles

The backend has four roles, not three:

```ts
type Role = "CITIZEN" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
```

### Authentication

- Access and refresh JWTs are set as HTTP-only cookies named `accessToken` and `refreshToken` by login, Google login, email verification, and refresh-token endpoints.
- Protected routes read the access token from the `accessToken` cookie first, then `Authorization: Bearer <accessToken>`, then the raw `Authorization` header value.
- Login and refresh response bodies also expose both tokens in `data`; prefer the HTTP-only cookies for browser authentication and do not persist tokens in local storage.
- Access token cookie lifetime is one day; refresh token cookie lifetime is seven days in the controllers. JWT expiry is also configurable with `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN`.
- There is no logout endpoint in the current backend. A frontend logout must clear its local auth state and may clear cookies only if the backend later adds a cookie-clearing route.
- `POST /api/v1/auth/refresh-token` requires the `refreshToken` cookie and rotates both tokens.
- Protected requests reject missing/invalid tokens with `401`, disallowed roles with `403`, blocked users with `403`, and missing users with `404`.
- Staff created by an admin have `needPasswordChange: true`; protected resources are rejected until the password is reset. The reset-password route is exempt from this check.

### Common response and error shapes

Successful responses normally use:

```ts
interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

Most errors use:

```ts
interface ApiError {
  success: false;
  statusCode: number;
  name?: string;
  message: string;
  error?: unknown; // development only
  stack?: string; // development only
}
```

Category list responses use `meta.totalPage` (singular) instead of `meta.totalPages`. The root health route and Stripe webhook use their own response shapes.

## 2. Modules & API Endpoints Summary

Authorization labels: **Public** means no access token; **Authenticated** means any listed role; **Role-specific** means the listed role is required.

### Auth

Authentication supports citizen registration with email OTP, email/password login, Google ID-token exchange, token refresh, and password recovery. Registration creates the user only after OTP verification. OTPs expire after five minutes.

#### `POST /api/v1/auth/register`

- Authorization: Public.
- Body: `{ name: string; email: string; password: string; phoneNumber?: string }`.
- Password: 8-100 characters with uppercase, lowercase, number, and special character.
- Success: `201`, `data: null`, message `Verification OTP Sent`.

#### `POST /api/v1/auth/verify-email`

- Authorization: Public.
- Body: `{ email: string; otp: string }`; OTP must be exactly six characters.
- Success: `201`, `data: { user: User; accessToken: string; refreshToken: string }`; cookies are set.

#### `POST /api/v1/auth/login`

- Authorization: Public.
- Body: `{ email: string; password: string }` with the standard password rules.
- Success: `200`, `data: { accessToken: string; refreshToken: string }`; cookies are set. The response does not include a `user` object.

#### `POST /api/v1/auth/google`

- Authorization: Public.
- Body: `{ idToken: string }`.
- Success: `200`, `data: { accessToken: string; refreshToken: string }`; cookies are set. New Google accounts receive the `CITIZEN` role.

#### `POST /api/v1/auth/refresh-token`

- Authorization: Public route requiring the `refreshToken` cookie. No body.
- Success: `200`, `data: { accessToken: string; refreshToken: string }`; cookies are replaced.

#### `POST /api/v1/auth/forgot-password`

- Authorization: Public.
- Body: `{ email: string }`.
- Success: `200`, `data: null`; a six-character OTP is emailed.

#### `POST /api/v1/auth/reset-password`

- Authorization: Public; also usable by staff blocked by `needPasswordChange`.
- Body: `{ email: string; newPassword: string; otp: string }`.
- Success: `200`, `data: null`.

### Categories

Categories are public to read and admin-managed. Deleted categories are soft-deleted and excluded from normal reads.

#### `POST /api/v1/categories`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: `{ name: string; description?: string; type: CategoryType; unitName?: string | null; basePrice?: number }`.
- `name` is at least three characters; `basePrice` is non-negative and defaults to `0`.
- Success: `201`, `data: Category`.

#### `GET /api/v1/categories`

- Authorization: Public.
- Query: `search?: string`, `type?: CategoryType`, `page?: number` (default `1`), `limit?: number` (default `10`).
- Success: `200`, `data: Category[]`, `meta: { page; limit; total; totalPage }`.

#### `GET /api/v1/categories/:id`

- Authorization: Public.
- Success: `200`, `data: Category`.

#### `PATCH /api/v1/categories/:id`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: any subset of `{ name?: string; description?: string; type?: CategoryType; unitName?: string | null; basePrice?: number; isActive?: boolean }`.
- Success: `200`, `data: Category`.

#### `DELETE /api/v1/categories/:id`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: none.
- Success: `200`, `data: Category` with `isDeleted: true`.

### Service Requests

Service requests are the complaint/service workflow. Paid request amount is calculated as `category.basePrice * quantity`; free requests use quantity `1`, amount `0`, and are created with `isPaid: true`.

#### `POST /api/v1/service-request`

- Authorization: Role-specific: `CITIZEN`, `ADMIN`, `SUPER_ADMIN`.
- Content type: `multipart/form-data`.
- Files: up to four files in repeated `images` fields.
- Structured fields may be regular multipart fields or a JSON string in a `data` field.
- Payload: `{ categoryId: string; title: string; description: string; address: string; latitude?: number; longitude?: number; priority?: Priority; quantity?: number; preferredStartDate?: string; preferredEndDate?: string }`.
- `title` is at least five characters, `description` at least ten, `quantity` at least one, and dates must be ISO datetimes with end >= start.
- Success: `201`, `data: ServiceRequest`; image URLs and public IDs are generated server-side.

#### `GET /api/v1/service-request`

- Authorization: Authenticated: `CITIZEN`, `STAFF`, `ADMIN`, `SUPER_ADMIN`.
- Query: `search?`, `status?: RequestStatus`, `priority?: Priority`, `type?: CategoryType`, `categoryId?: string`, `page?: string` (default `"1"`), `limit?: string` (default `"10"`), `sortBy?: string` (default `createdAt`), `sortOrder?: "asc" | "desc"` (default `"desc"`).
- Search checks title, description, and address. Citizens see free requests plus their own; staff see free requests plus assigned requests; admins see all non-deleted requests.
- Success: `200`, `data: ServiceRequest[]` with category, citizen, assigned-staff, and comment summaries, plus standard `meta`.

#### `GET /api/v1/service-request/my-requests`

- Authorization: Role-specific: `CITIZEN`, `ADMIN`, `SUPER_ADMIN`.
- Query: `search?`, `status?`, `priority?`, `type?`, `page?`, `limit?`; defaults are page `1`, limit `10`.
- Success: `200`, `data: ServiceRequest[]` with category summary and payment summary `{ id; amount; status }`, plus standard `meta`.

#### `GET /api/v1/service-request/my-assigned`

- Authorization: Role-specific: `STAFF`.
- Query: `search?`, `status?`, `priority?`, `type?`, `page?`, `limit?`; defaults are page `1`, limit `10`.
- Success: `200`, `data: ServiceRequest[]` with category summary and citizen `{ id; name; email; phoneNumber }`, plus standard `meta`.

#### `GET /api/v1/service-request/:id`

- Authorization: Authenticated: all four roles. Citizens may view only their own requests; staff may view only assigned requests.
- Success: `200`, `data: ServiceRequest` with category `{ id; name; type; description }`, citizen contact, assigned-staff contact, comments, and full payment or `null`.

#### `PATCH /api/v1/service-request/:serviceRequestId/assign`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: `{ assignedStaffId: string }`.
- Success: `200`, `data: ServiceRequest`; status becomes `ASSIGNED`.

#### `PATCH /api/v1/service-request/:id/status`

- Authorization: Role-specific: `STAFF`, `ADMIN`, `SUPER_ADMIN`.
- Body: `{ status: RequestStatus }`.
- Staff must be assigned to the request and use these transitions: `ASSIGNED -> ACCEPTED | REJECTED`, `ACCEPTED -> IN_PROGRESS | REJECTED`, `IN_PROGRESS -> RESOLVED`. Admins are not subject to these staff transition checks.
- Success: `200`, `data: ServiceRequest`.

#### `DELETE /api/v1/service-request/:id`

- Authorization: Role-specific: `CITIZEN`, `ADMIN`, `SUPER_ADMIN`.
- Citizens may delete only their own `PENDING` request. The operation is a soft delete.
- Success: `200`, `data: ServiceRequest` with `isDeleted: true`.

#### `PATCH /api/v1/service-request/:id`

- Authorization: Route allows `CITIZEN`, `ADMIN`, `SUPER_ADMIN`; implementation requires the authenticated user to own the request and the request to be `PENDING`.
- Content type: `multipart/form-data`; up to four new `images` files. Structured fields may be regular fields or JSON in `data`.
- Body: any subset of `{ title?: string; description?: string; address?: string; latitude?: number; longitude?: number; priority?: Priority; quantity?: number; preferredStartDate?: string; preferredEndDate?: string }`.
- Success: `200`, `data: ServiceRequest`.

### Users

#### `GET /api/v1/users/me`

- Authorization: Authenticated: all four roles.
- Success: `200`, `data: { id; name; email; phoneNumber; role; status; imageUrl; createdAt; updatedAt }`.

#### `PATCH /api/v1/users/me`

- Authorization: Authenticated: all four roles.
- Content type: `multipart/form-data`.
- File: optional single file in field `image`.
- Fields: `{ name?: string; phoneNumber?: string }`.
- Success: `200`, `data: { id; name; email; phoneNumber; imageUrl; imagePublicId; role; status; updatedAt }`.

### Comments

#### `POST /api/v1/comment`

- Authorization: Authenticated: all four roles.
- Body: `{ serviceRequestId: string; text: string; isInternal?: boolean }`.
- Citizens are forced to `isInternal: false`.
- Success: `201`, `data: Comment` with author `{ id; name; role; imageUrl }`.

#### `GET /api/v1/comment/:serviceRequestId`

- Authorization: Authenticated: all four roles.
- Success: `200`, `data: Comment[]` ordered oldest first. Citizens do not receive internal comments; other roles do.

#### `PATCH /api/v1/comment/:id`

- Authorization: Authenticated: all four roles; only the comment owner may update.
- Body: `{ text?: string; isInternal?: boolean }`.
- Success: `200`, `data: { id; text; isInternal; updatedAt }`.

#### `DELETE /api/v1/comment/:id`

- Authorization: Authenticated: all four roles; owner, `ADMIN`, or `SUPER_ADMIN` may delete.
- Body: none.
- Success: `200`, `data: Comment`.

### Payments

#### `POST /api/v1/payments/create-checkout-session`

- Authorization: Role-specific: `CITIZEN`.
- Body: `{ serviceRequestId: string }`.
- The request must belong to the citizen, be `ACCEPTED`, unpaid, unresolved, and have a positive total amount.
- Success: `200`, `data: { paymentUrl: string | null }`.
- Redirect the browser to `paymentUrl`. The frontend must not call the webhook.

#### `GET /api/v1/payments/my-payments`

- Authorization: Role-specific: `CITIZEN`, `ADMIN`, `SUPER_ADMIN`.
- Query: ignored by the current implementation; this endpoint is not paginated.
- Success: `200`, `data: Payment[]` for the authenticated user, each with request `{ id; title; category: { name } }`.

#### `GET /api/v1/payments/:id`

- Authorization: Authenticated: all four roles. Citizens can view their own payments; staff can view payments for assigned requests; admins have unrestricted access.
- Success: `200`, `data: Payment` with full service request and user `{ id; name; email }`.

#### `GET /api/v1/payments`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Query: `page?: string | number` (default `1`), `limit?: string | number` (default `10`), `status?: PaymentStatus`, `search?: string`.
- Search checks transaction ID, payer name, and payer email.
- Success: `200`, `data: Payment[]` with payer `{ id; name; email }` and request `{ id; title }`, plus standard `meta`.

#### `POST /api/v1/payments/webhook`

- Authorization: Server-to-server Stripe signature, not a frontend endpoint.
- Content type: raw `application/json`; requires `stripe-signature`.
- Invalid signatures return `400` plain text. Valid events return `{ received: true }`.
- `checkout.session.completed` marks the payment and service request paid. Failed asynchronous checkout marks the payment failed.

### Staff

#### `GET /api/v1/staff/dashboard-stats`

- Authorization: Role-specific: `STAFF`.
- Success: `200`, `data: { totalAssignedRequests; inProgressRequests; resolvedRequests; cancelledRequests; rejectedRequests }`.

### Admin

#### `GET /api/v1/admin/users`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Query: `search?`, `role?`, `status?`, `page?`, `limit?`, `sortBy?` (default `createdAt`), `sortOrder?: "asc" | "desc"` (default `"desc"`).
- Success: `200`, `data: UserListItem[]`, plus standard `meta`.

#### `PATCH /api/v1/admin/users/:id/status`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: `{ status: "ACTIVE" | "BLOCKED" }`.
- Success: `200`, `data: { id; name; email; role; status; updatedAt }`.

#### `PATCH /api/v1/admin/users/:id/role`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: `{ role: Role }`.
- Success: `200`, `data: { id; name; email; role; updatedAt }`.
- An admin cannot change another admin's role; a super-admin cannot be modified; only a super-admin can promote to `SUPER_ADMIN`.

#### `GET /api/v1/admin/dashboard-stats`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Success: `200`, `data: { users: { totalUsers; totalCitizens; totalStaff; totalAdmins; totalSupperAdmins }; serviceRequests: { totalRequests; pendingRequests; inProgressRequests; resolvedRequests; cancelledRequests; rejectedRequests }; categories: { totalCategories } }`.

#### `GET /api/v1/admin/audit-logs`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Query: `search?`, `action?: AuditAction`, `entityName?`, `performedById?`, `page?`, `limit?`, `sortBy?` (default `createdAt`), `sortOrder?: "asc" | "desc"` (default `"desc"`).
- Success: `200`, `data: AuditLog[]` with `performedBy { id; name; email; role }`, plus standard `meta`.

#### `POST /api/v1/admin/create-staff`

- Authorization: Role-specific: `ADMIN`, `SUPER_ADMIN`.
- Body: `{ name: string; email: string; phoneNumber?: string; department: Department; designation?: string; qualification?: string }`.
- A random temporary password is emailed; it is not returned in the API response.
- Success: `201`, `data: User` with nested `staffProfile { id; department; designation; qualification; isAvailable; joiningDate }`.

### Root route

#### `GET /`

- Authorization: Public.
- Success: `{ success: true; message: "Welcome to City Services Backend" }`.

## 3. Data Models & Types

All IDs are UUID strings. Dates are returned as JSON ISO timestamp strings. Numeric amounts are JavaScript numbers.

```ts
type Role = "SUPER_ADMIN" | "ADMIN" | "CITIZEN" | "STAFF";
type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
type AuthProvider = "CREDENTIAL" | "GOOGLE";
type CategoryType = "FREE" | "PAID";
type RequestStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CANCELLED"
  | "REJECTED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "ASSIGNMENT"
  | "ROLE_CHANGE"
  | "CREATE_STAFF";
type EntityName =
  | "STAFF"
  | "CITIZEN"
  | "SERVICE"
  | "DEPARTMENT"
  | "USER"
  | "CATEGORY";
type Department =
  | "ROAD_REPAIR"
  | "DRAINAGE_AND_SEWERAGE"
  | "WASTE_MANAGEMENT"
  | "PARK_AND_TREE_TRIMMING"
  | "STREET_LIGHTING";

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  imageUrl: string | null;
  imagePublicId?: string | null;
  role: Role;
  status: UserStatus;
  authProvider?: AuthProvider;
  emailVerified?: boolean;
  needPasswordChange?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface StaffProfile {
  id: string;
  userId?: string;
  department: Department;
  designation: string | null;
  qualification: string | null;
  isAvailable: boolean;
  joiningDate: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  type: CategoryType;
  unitName: string | null;
  basePrice: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  imagePublicIds: string[];
  quantity: number;
  totalAmount: number;
  isPaid: boolean;
  isDeleted: boolean;
  status: RequestStatus;
  priority: Priority;
  preferredStartDate: string | null;
  preferredEndDate: string | null;
  citizenId: string;
  categoryId: string;
  assignedStaffId: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, "id" | "name" | "type"> & {
    description?: string | null;
  };
  citizen?: Pick<User, "id" | "name" | "email"> & {
    phoneNumber?: string | null;
  };
  assignedStaff?: Pick<User, "id" | "name"> & {
    email?: string;
    phoneNumber?: string | null;
  };
  comments?: Array<{
    id: string;
    text: string;
    isInternal?: boolean;
    createdAt?: string;
  }>;
  payment?:
    | Payment
    | { id: string; amount: number; status: PaymentStatus }
    | null;
}

interface Payment {
  id: string;
  amount: number;
  transactionId: string;
  status: PaymentStatus;
  paymentMethod: string | null;
  serviceRequestId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "name" | "email">;
  serviceRequest?:
    | ServiceRequest
    | { id: string; title: string; category?: { name: string } };
}

interface Comment {
  id: string;
  text: string;
  isInternal: boolean;
  serviceRequestId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "name" | "role" | "imageUrl">;
}

interface AuditLog {
  id: string;
  action: AuditAction;
  entityName: string;
  entityId: string;
  details: unknown | null;
  createdAt: string;
  performedById: string;
  performedBy?: Pick<User, "id" | "name" | "email" | "role">;
}
```

## 4. File Upload & Special Instructions

### FormData endpoints

- `PATCH /api/v1/users/me`: use `multipart/form-data`; optional single file field is `image`; text fields are `name` and `phoneNumber`.
- `POST /api/v1/service-request`: use `multipart/form-data`; up to four files under `images`.
- `PATCH /api/v1/service-request/:id`: use `multipart/form-data`; up to four files under `images`.
- Request mutation structured data can be sent as ordinary multipart fields or as JSON in `data`. Local `File` objects must not be put inside a JSON `images` array.
- Files are held in memory, uploaded to Cloudinary, and returned/stored as secure URLs. The frontend should enforce the four-file limit and show local previews before upload.

### Query, filtering, pagination, and sorting

- List pagination is one-based. Defaults are generally `page=1` and `limit=10`.
- Standard list metadata is `{ page, limit, total, totalPages }`; categories return `totalPage` instead.
- Query values arrive as URL strings even when interfaces describe them as numbers.
- Search/filter patterns:
  - Categories: `search`, `type`, `page`, `limit`.
  - Service requests: `search`, `status`, `priority`, `type`, `categoryId`; all requests also accept `sortBy`, `sortOrder`.
  - Admin users: `search`, `role`, `status`, `page`, `limit`, `sortBy`, `sortOrder`.
  - Audit logs: `search`, `action`, `entityName`, `performedById`, `page`, `limit`, `sortBy`, `sortOrder`.
  - All payments: `status`, `search`, `page`, `limit`.
- `GET /payments/my-payments` and comment lists are not paginated.
- Stripe Checkout redirects to the configured frontend paths `/payments/success?session_id=...` and `/payments/cancel`. Payment state is authoritative only after the webhook updates the database, so the success page should refetch the payment/request.
- The frontend should treat `400`, `401`, `403`, `404`, and rate-limit responses as distinct UI states and use the response `message` for user-facing error feedback.
