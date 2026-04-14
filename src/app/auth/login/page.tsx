import React, { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#f0f2f5"
    }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
      <footer style={{ textAlign: "center", padding: "16px 24px", background: "transparent", fontSize: "13px", color: "#8c8c8c" }}>
        Made in India with ❤️ by <strong style={{ color: "#00897b" }}>Biometrik® Systems</strong>. All rights reserved.
      </footer>
    </div>
  );
}
