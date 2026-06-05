# Biometrik Requirement Dashboard

An advanced, enterprise-grade Next.js application built for **Biometrik® Systems** to manage client requirements, project logistics, schedules, and generate professional branded reports. The system implements high-security passwordless login featuring biometric face verification and location tracking.

---

## 🚀 What Has Been Built Till Now

The project currently contains a fully functional, production-ready frontend and backend architecture leveraging Next.js App Router, TypeScript, and MongoDB. The core built components include:

### 1. Biometric Authentication & Verification System
*   **Two-Factor Face Security**: Captures user images via webcam and verifies them against a registered face reference stored in the database.
*   **Geolocation Audit**: Registers the physical location of the user (Latitude and Longitude) at the time of face registration to ensure auditability.
*   **External API Integration**: Communicates securely with a remote face match service using a dedicated API key and configurable similarity score thresholds.
*   **JWT Edge Middleware**: Uses stateless cookies (`jose` package) in a global Next.js Edge middleware to verify session tokens and enforce Role-Based Access Control (RBAC).

### 2. Project & Client Requirement Management
*   **Requirement Checklist**: An interactive form matching Biometrik's software solutions including:
    *   *Core Features*: Visitor Management, Attendance Management, Digilocker Authentication, Video KYC, RBAC System, Admin Panel.
    *   *Platforms*: Web Application, Android Application, iOS Application.
    *   *Deployment & Operation*: Online, Offline, Cloud Integration, On-Premise Deployment.
*   **Project Lifecycles**: Supports status updates (`Pending`, `Active`, `Completed`) and custom timeline configurations.
*   **Data Models**: Mongoose schemas built with strict type safety for `User`, `Project`, and `CalendarTask`.

### 3. Dynamic PDF Report Engine (`jsPDF`)
*   **Watermarked Reports**: Dynamically outputs multi-page client requirements with official company logos, customized branding colors, and light background watermarks.
*   **Responsive Layout**: Handles pagination and text wrapping naturally for long extra notes and specifications.

### 4. Interactive Calendar Task Planner
*   **Schedules & Actions**: Dedicated task planner to track todo lists, in-progress tasks, completed work, and cancellations.
*   **Prioritization Matrix**: Highlights tasks by priority (`Low`, `Medium`, `High`, `Urgent`) using color-coded badges on a scheduler timeline.

### 5. Role-Based Navigation & Administration
*   **Global Layout Sidebar**: Contains collapsible and responsive drawer navigation styled using **Ant Design (antd)** and **Lucide Icons**.
*   **Admin Mode**: Hides or exposes administrative paths (e.g. `/users`) based on the authenticated user's role (`ADMIN` vs `SALES`).

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Ant Design v6](https://ant.design/) & [Tailwind CSS](https://tailwindcss.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ORM](https://mongoosejs.com/)
*   **Visualizations**: [Recharts](https://recharts.org/)
*   **Utilities**: `dayjs` (date manipulation), `jspdf` (PDF generation), `bcryptjs` (passwords), `jose` (JWT verification)

---

## 📁 Repository Directory Structure

```text
requirement-dashboard/
├── src/
│   ├── app/                    # Next.js App Router files
│   │   ├── api/                # API Endpoints (Auth, Projects, Users, Calendar)
│   │   ├── auth/               # Login & Face Verification views
│   │   ├── calendar/           # Task scheduling page
│   │   ├── dashboard/          # Analytics charts & widgets dashboard
│   │   ├── profile/            # User profile settings page
│   │   ├── projects/           # Requirement configurator and lists
│   │   └── users/              # User management screen (Admin only)
│   ├── components/             # Reusable UI React components
│   │   ├── auth/               # Camera capture and biometric layouts
│   │   └── MainLayout.tsx      # Sidebar, header, and footer shell wrapper
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Library helpers (database, auth, constants, PDF generator)
│   ├── store/                  # Global state management
│   ├── styles/                 # Custom CSS overrides
│   └── types/                  # Global TypeScript declarations
├── public/                     # Static assets (Company Logo, icons)
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── package.json                # Project dependencies and npm scripts
```

---

## ⚙️ Getting Started

### Prerequisites
1.  **Node.js**: `v18.x` or later.
2.  **MongoDB**: A running instance or connection URI.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd requirement-dashboard
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```

### Setup Environment Variables
Create a `.env.local` file in the root directory and add the following keys:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_key

# Face Verification external service
FACE_VERIFY_API_URL=https://api.example.com/verify
X-API-Key=your_api_key
FACE_VERIFY_THRESHOLD=0.8
```

### Run Locally

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to access the dashboard.
