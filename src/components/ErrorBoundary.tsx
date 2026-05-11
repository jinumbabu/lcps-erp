"use client";

// ============================================================
// LCPS — Error Boundary
// Production error handling for React components
// ============================================================

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LCPS ErrorBoundary] Error caught:", error);
    console.error("[LCPS ErrorBoundary] Error info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // In production, you could send to an error tracking service
    // like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === "production") {
      // Send error to monitoring service
      // Example: Sentry.captureException(error);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        this.props.fallback || (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              background: "var(--bg-primary)",
            }}
          >
            <div
              style={{
                maxWidth: "480px",
                textAlign: "center",
                padding: "32px",
                background: "var(--bg-card)",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  margin: "0 auto 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 123, 114, 0.1)",
                  borderRadius: "50%",
                  fontSize: "32px",
                }}
              >
                ⚠️
              </div>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "var(--text-primary)",
                }}
              >
                Something went wrong
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "20px",
                  lineHeight: 1.6,
                }}
              >
                The application encountered an unexpected error. Please try
                refreshing the page or contact support if the problem persists.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre
                  style={{
                    textAlign: "left",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    background: "var(--bg-elevated)",
                    padding: "12px",
                    borderRadius: "6px",
                    overflow: "auto",
                    maxHeight: "200px",
                    marginBottom: "16px",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  onClick={this.handleRetry}
                  style={{
                    padding: "10px 20px",
                    background: "var(--accent-orange)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  🔄 Retry
                </button>
                <a
                  href="/"
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    fontFamily: "inherit",
                  }}
                >
                  ← Go Home
                </a>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
