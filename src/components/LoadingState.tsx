"use client";

// ============================================================
// LCPS — Loading State Component
// Consistent loading UI across the application
// ============================================================

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  size?: "small" | "medium" | "large";
}

export default function LoadingState({
  message = "Loading...",
  subMessage,
  fullScreen = false,
  size = "medium",
}: LoadingStateProps) {
  const spinnerSizes = {
    small: { width: 24, height: 24, borderWidth: 2 },
    medium: { width: 40, height: 40, borderWidth: 3 },
    large: { width: 64, height: 64, borderWidth: 4 },
  };

  const spinnerSize = spinnerSizes[size];

  const containerStyles = fullScreen
    ? {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }
    : {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      };

  return (
    <div style={containerStyles}>
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Animated Spinner */}
        <div
          style={{
            width: spinnerSize.width,
            height: spinnerSize.height,
            borderRadius: "50%",
            border: `${spinnerSize.borderWidth}px solid var(--border-subtle)`,
            borderTopColor: "var(--accent-orange)",
            animation: "spin 0.8s linear infinite",
          }}
        />

        {/* Message */}
        <div>
          <p
            style={{
              fontSize: size === "small" ? 13 : 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {message}
          </p>
          {subMessage && (
            <p
              style={{
                fontSize: size === "small" ? 11 : 13,
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
              }}
            >
              {subMessage}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Skeleton loader for grid/spreadsheet
export function SkeletonLoader({ rows = 5, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ padding: "20px" }}>
      {/* Header skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            style={{
              height: "40px",
              background: "var(--bg-elevated)",
              borderRadius: "6px",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                height: "48px",
                background: "var(--bg-elevated)",
                borderRadius: "6px",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${(rowIndex * 0.1 + colIndex * 0.05)}s`,
              }}
            />
          ))}
        </div>
      ))}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// Network status indicator
export function NetworkStatus({
  isOnline,
  isSynced,
}: {
  isOnline: boolean;
  isSynced: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px",
        background: isOnline ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 123, 114, 0.1)",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 500,
        color: isOnline ? "var(--accent-green)" : "var(--accent-red)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: isOnline ? "var(--accent-green)" : "var(--accent-red)",
          animation: isOnline && !isSynced ? "pulse 1s ease-in-out infinite" : "none",
        }}
      />
      {isOnline ? (isSynced ? "Synced" : "Syncing...") : "Offline"}
    </div>
  );
}
