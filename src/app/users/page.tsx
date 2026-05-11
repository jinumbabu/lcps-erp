"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getAllUsers, updateUserRole } from "@/services/userService";
import { LCPSUser } from "@/types";
import { USER_ROLES } from "@/lib/constants";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function UsersPage() {
  const { lcpsUser, isAdmin } = useAuthStore();
  const isAdminBool = isAdmin();
  const [users, setUsers] = useState<LCPSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("[Users] Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: keyof typeof USER_ROLES) => {
    if (!lcpsUser) return;
    if (userId === lcpsUser.uid) {
      alert("You cannot change your own role");
      return;
    }
    
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole, lcpsUser.uid, lcpsUser.email);
      await loadUsers();
    } catch (error) {
      console.error("[Users] Failed to update role:", error);
      alert("Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isAdminBool) {
    return (
      <AppShell>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Only administrators can access user management.
          </p>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading users…</p>
        </div>
      </AppShell>
    );
  }

  const roleColors: Record<keyof typeof USER_ROLES, string> = {
    ADMIN: "var(--accent-red)",
    SUPERVISOR: "var(--accent-orange)",
    OPERATOR: "var(--accent-green)",
  };

  return (
    <AppShell>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>User Management</h1>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, color: "var(--text-muted)" }}>
            {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="page-content">
        <div className="lcps-card" style={{ maxWidth: 900 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  User
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Role
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <motion.tr
                  key={user.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                      }}>
                        {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {user.displayName}
                        </div>
                        {user.uid === lcpsUser?.uid && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {user.email}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as keyof typeof USER_ROLES)}
                      disabled={updatingUserId === user.uid || user.uid === lcpsUser?.uid}
                      style={{
                        padding: "6px 10px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 6,
                        color: roleColors[user.role as keyof typeof USER_ROLES],
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: user.uid === lcpsUser?.uid ? "not-allowed" : "pointer",
                        opacity: updatingUserId === user.uid ? 0.5 : 1,
                      }}
                    >
                      {Object.entries(USER_ROLES).map(([key, value]) => (
                        <option key={key} value={value}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "16px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {user.createdAt ? format(user.createdAt.toDate(), "dd MMM yyyy") : "—"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <h3 style={{ fontSize: 16, marginBottom: 8, color: "var(--text-primary)" }}>No users yet</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Users will appear here when they sign in to the system.
              </p>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lcps-card"
          style={{ maxWidth: 900, marginTop: 24, borderLeft: "3px solid var(--accent-blue)" }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--accent-blue)" }}>
            Role Permissions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 16 }}>
            {[
              { role: "Admin", color: "var(--accent-red)", perms: ["Full system access", "User management", "Settings configuration", "Unlock compounded batches"] },
              { role: "Supervisor", color: "var(--accent-orange)", perms: ["Edit schedules", "Create planning sheets", "Manage batches", "View all data"] },
              { role: "Operator", color: "var(--accent-green)", perms: ["View only access", "Timeline monitoring", "Dashboard view"] },
            ].map((r) => (
              <div key={r.role} style={{ padding: 16, background: "var(--bg-elevated)", borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.color, marginBottom: 8 }}>{r.role}</div>
                <ul style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 16, margin: 0 }}>
                  {r.perms.map((perm) => (
                    <li key={perm} style={{ marginBottom: 4 }}>{perm}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
