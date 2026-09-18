# CodeBuddy Security & Hardening Specification

## 1. Authentication & Session Security
- **JWT Protection**: Access tokens signed with HS256 using `JWT_SECRET`. Tokens stored and passed via `Authorization: Bearer <token>` headers.
- **Password Hashing**: User passwords hashed using `bcryptjs` with salt rounds = 10 prior to database insertion.
- **OAuth Safety**: Google & GitHub OAuth client secrets strictly processed on Node.js backend; never exposed to React frontend.

## 2. API Abuse & Injection Mitigation
- **Rate Limiting**: `express-rate-limit` enforces 300 requests / 15 minutes per IP address.
- **Security Headers**: `helmet` enforces X-Content-Type-Options, X-Frame-Options, and XSS Protection.
- **NoSQL Injection Protection**: MongoDB queries use Mongoose schema type validation and string sanitization.

## 3. Sandboxed Code Execution Safety
- Student code is **never** executed inside the Node.js server process via `child_process.exec`.
- Code execution requests are dispatched to **Judge0 API** isolated containers with strict resource bounds:
  - Max Wall Time: 5 seconds
  - Max Memory: 128 MB
  - Network Access: Disabled
  - Execution Permissions: Non-root container user
