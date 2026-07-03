# Supply Changer

Supply Changer is a modern, enterprise-grade inventory and supply chain management system designed for seamless, atomic stock control and activity tracking. The platform features a high-performance NestJS backend and an elegant, optimized Expo (React Native) mobile application styled with premium glassmorphic aesthetics.

---

## ⚡ Key Features

- 📱 **Pure-JS Gesture Swipe Navigation**: Native-like horizontal swiping across main tab screens built on React Native's core `<ScrollView>` components for 1000+ items at 60 FPS without binary compilation limitations.
- 🎨 **Glassmorphism UI/UX**: Dark-themed mobile application with custom blurred panels, background orb highlights, and modern typography.
- 🔔 **Activity Notifications Logs**: Real-time push and local notifications highlighting specific stock mutations (e.g., who changed what, when, where, and by how much).
- ⚙️ **Automatic Audit Log Engine**: Transaction-level tracking. Every single stock change (increase, decrease, transfer) triggers an atomic audit log entry linked to the acting user.
- 🔒 **Sub-second Atomic Mutations**: Core inventory mutations run isolated database transactions to prevent race conditions and stock discrepancies.
- 🔑 **Role-Based Access Control (RBAC)**: Fine-grained permissions that separate Admin, Manager, and Staff roles across API endpoints and UI elements.

---

## 🛠️ Technology Stack

### Backend
- **Framework:** NestJS (Node.js)
- **Database ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Security:** Passport.js, JWT tokens, bcrypt password hashing
- **Realtime:** Socket.IO for activity and notification broadcasts

### Mobile
- **Framework:** Expo SDK 56 / React Native (TypeScript)
- **Navigation:** Expo Router (File-based navigation)
- **State Management:** Zustand
- **Animations:** React Native Reanimated (4.x)
- **Design:** Custom Vanilla CSS and React Native StyleSheet

---

## 📂 Repository Structure

```
├── backend/            # NestJS server, API routes, database schemas, and migration scripts
├── mobile/             # Expo React Native mobile application
├── docs/               # System documentation & specifications (SPEC.md)
└── README.md           # Project overview and setup guide
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or yarn
- PostgreSQL database instance
- JDK 17 & NDK 27 (for building the Android package)

---

### Backend Installation & Startup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your connection string and security details:*
   ```env
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/supplychanger"
   JWT_SECRET="your_jwt_secret"
   ```
4. Run Prisma database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Run DB Seeding to populate initial roles/accounts:
   ```bash
   npx prisma db seed
   ```
6. Start the server in watch mode:
   ```bash
   npm run start:dev
   ```

---

### Mobile Installation & Startup

1. Navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and set your local machine's IP address:*
   ```env
   EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000
   ```
4. Start the Metro packager:
   ```bash
   npm run start
   ```
5. Open the app on your device:
   - Run on Android emulator: Press `a`
   - Run on iOS simulator: Press `i`
   - Load on Expo Go/Pre-built APK: Scan QR code or connect over Metro.

---

## 📜 Core Development Guidelines

- **Single Source of Truth:** Stock values are managed entirely on the backend database. Client-side state is purely reflective.
- **Atomic Operations:** Under no circumstances should stock levels be updated without an associated `AuditLog` created inside the same transaction block.
- **Memoized Lists:** All lists (`ProductItem`, `StockMovementItem`, `SupplierItem`, `NotificationItem`) are encapsulated inside `React.memo` using defined layouts to ensure buttery-smooth viewport rendering.

---

## 🔒 License

This project is private and all rights are reserved.
