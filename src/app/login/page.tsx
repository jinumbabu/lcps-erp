"use client";

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle redirect result from Google Sign-In
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          router.replace("/dashboard");
        }
      } catch (error) {
        // Ignore redirect errors (no pending redirect)
        console.log("No pending redirect result");
      }
    };
    handleRedirectResult();
  }, [router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace("Firebase: ", "").replace(/\(.*\)\.?/, "").trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      
      // Try popup first
      try {
        await signInWithPopup(auth, provider);
        router.replace("/dashboard");
      } catch (popupError: any) {
        // If popup fails (likely blocked), fall back to redirect
        console.log("Popup failed, trying redirect:", popupError);
        await signInWithRedirect(auth, provider);
      }
    } catch (err: unknown) {
      const error = err as any;
      let msg = "Google sign-in failed";
      
      // Provide helpful error messages
      if (error.code === "auth/popup-blocked") {
        msg = "Popup blocked by browser. Please allow popups for this site.";
      } else if (error.code === "auth/popup-closed-by-user") {
        msg = "Sign-in popup was closed. Please try again.";
      } else if (error.code === "auth/unauthorized-domain") {
        msg = "This domain is not authorized. Please add it to Firebase Auth authorized domains.";
      } else if (error.code === "auth/configuration-not-found") {
        msg = "Google Sign-In is not enabled in Firebase Console.";
      } else if (error.message) {
        msg = error.message.replace("Firebase: ", "").trim();
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 20% 50%, rgba(247,129,102,0.06) 0%, transparent 60%), var(--bg-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Background grid pattern */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              background:
                "linear-gradient(135deg, var(--accent-orange), #ff6347)",
              borderRadius: 14,
              marginBottom: 16,
              boxShadow: "0 8px 24px rgba(247,129,102,0.3)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="9" x2="9" y2="21" />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 4,
              color: "var(--text-primary)",
            }}
          >
            LCPS ERP
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Latex Compounding Production Scheduling
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            padding: 28,
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          }}
        >
          <h2
            style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              marginBottom: 16,
              transition: "all 0.15s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="email"
                type="email"
                className="lcps-input"
                placeholder="supervisor@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="lcps-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
              />
            </div>

            {error && (
              <div
                className="alert-banner alert-danger"
                style={{ marginBottom: 16, fontSize: 12 }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "10px 16px",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Processing…
                </>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-orange)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          Antigravity Compounding Planning · LCPS ERP v1.0
        </p>
      </motion.div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
