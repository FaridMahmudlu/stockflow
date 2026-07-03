# StockFlow

StockFlow is a modern, enterprise-ready inventory and supply chain management system designed for seamless, atomic stock control. The platform consists of a progressive NestJS backend and a highly optimized, high-performance Expo (React Native) mobile application built with premium glassmorphic aesthetics.

---

## Key Features

- ⚡ **High Performance List Rendering**: Custom-optimized list rendering using memoized layout calculations (`getItemLayout`), standalone item components, and `useMemo` caching to handle 1000+ products and stock movements smoothly at 60 FPS.
- 🔒 **Sub-second Atomic Stock Mutations**: Complete transaction-isolated stock adjustments to prevent race conditions and inventory mismatches.
- 📋 **Audit Log Engine**: Automatic database logging of every stock modification (increase, decrease, transfer) linked to the acting user.
- 🔔 **Smart Notifications**: Real-time push and local notifications triggered by backend stock thresholds (low stock, critical, system announcements).
- 🎨 **Premium UI/UX (Glassmorphism)**: Beautiful dark-themed mobile app with glassmorphic cards, custom spring animations (`react-native-reanimated`), and a unified icon system.
- 🔑 **Role-Based Access Control (RBAC)**: Strict permission layer separating Admin, Manager, and Staff accounts across both API endpoints and mobile UI actions.

---

## Technology Stack

### Backend
- **Framework:** NestJS (Node.js)
- **Database ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Security:** Passport.js, JWT tokens, bcrypt password hashing

### Mobile
- **Framework:** Expo SDK 51 / React Native (TypeScript)
- **Navigation:** Expo Router (File-based navigation)
- **State Management:** Zustand
- **Animations:** React Native Reanimated (4.x)
- **Icons:** Feather (via `@expo/vector-icons`)

---

## Repository Structure

```
├── backend/            # NestJS server, API routes, database schemas, and migration scripts
├── mobile/             # Expo React Native mobile application
├── docs/               # System documentation & API specifications
└── README.md           # Project overview and setup guide
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or yarn
- PostgreSQL database instance
- JDK 17 & NDK 27 (for building the Android package)

---

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment variables. Create a `.env` file in the `backend` directory based on `.env.example`:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/stockflow"
   JWT_SECRET="your_secure_jwt_secret"
   ```

4. Run Prisma database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the backend in development watch mode:
   ```bash
   npm run start:dev
   ```

---

### Mobile Setup

1. Navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `mobile` directory:
   ```env
   EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000
   ```

4. Start the Metro packager:
   ```bash
   npx expo start
   ```

5. Run on your connected device or emulator:
   - Press `a` for Android
   - Press `i` for iOS (if running on macOS)

---

## Core Architecture Guidelines

- **Single Source of Truth:** The database is the absolute source of truth for stock quantities. The client mobile application never computes stock math locally; it initiates actions that are processed atomically on the backend server.
- **Audit Logs:** Under no circumstances should a stock mutation (increase, decrease, transfer) succeed without generating an associated audit log row within the same database transaction.
- **Component Memoization:** All items rendered within lists (`ProductItem`, `StockMovementItem`, `SupplierItem`, `NotificationItem`) are encapsulated inside `React.memo` to optimize render loops and ensure stutter-free scrolling on mobile devices.

---

## License

This project is licensed under the MIT License.
