"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getSettings, updateSettings, resetSettings, SystemSettings } from "@/services/settingsService";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { lcpsUser, isAdmin } = useAuthStore();
  const isAdminBool = isAdmin();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [tempSettings, setTempSettings] = useState<Partial<SystemSettings>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
      setTempSettings(data);
    } catch (error) {
      console.error("[Settings] Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: number) => {
    setTempSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!lcpsUser || !tempSettings) return;
    setSaving(true);
    try {
      await updateSettings(tempSettings, lcpsUser.uid, lcpsUser.email);
      await loadSettings();
      setHasChanges(false);
    } catch (error) {
      console.error("[Settings] Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!lcpsUser) return;
    if (!window.confirm("Reset all settings to default values? This cannot be undone.")) return;
    setSaving(true);
    try {
      await resetSettings(lcpsUser.uid, lcpsUser.email);
      await loadSettings();
      setHasChanges(false);
    } catch (error) {
      console.error("[Settings] Failed to reset settings:", error);
      alert("Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdminBool) {
    return (
      <AppShell>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Only administrators can access system settings.
          </p>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <p style={{ color: "var(--text-muted)" }}>Loading settings…</p>
        </div>
      </AppShell>
    );
  }

  const settingsGroups = [
    {
      title: "Production Calculations",
      description: "Core formulas for batch quantity and runtime calculations",
      fields: [
        { key: "latexConsumptionPerHour" as const, label: "Latex Consumption Rate", unit: "kg/hour", step: 0.1 },
        { key: "batchMultiplier" as const, label: "Batch Multiplier", unit: "", step: 0.001 },
      ],
    },
    {
      title: "Maturation Settings",
      description: "Default and threshold values for maturation tracking",
      fields: [
        { key: "defaultMaturationHours" as const, label: "Default Maturation", unit: "hours", step: 1 },
        { key: "overMaturationWarningHours" as const, label: "Warning Threshold", unit: "hours", step: 1 },
        { key: "overMaturationCriticalHours" as const, label: "Critical Threshold", unit: "hours", step: 1 },
      ],
    },
    {
      title: "Process Durations",
      description: "Time durations for each production stage",
      fields: [
        { key: "preparationDuration" as const, label: "Total Preparation", unit: "hours", step: 1 },
        { key: "stabilizerDuration" as const, label: "Stabilizer Process", unit: "hours", step: 1 },
        { key: "dispersionOffset" as const, label: "Dispersion Offset", unit: "hours", step: 1 },
        { key: "dispersionDuration" as const, label: "Dispersion Process", unit: "hours", step: 1 },
        { key: "dewebberOffset" as const, label: "Dewebber Offset", unit: "hours", step: 1 },
      ],
    },
    {
      title: "Deductions",
      description: "Quantity deductions for special first-batch operations",
      fields: [
        { key: "sideReserveDeduction" as const, label: "Side Reserve Deduction", unit: "kg", step: 100 },
        { key: "dipTankDeduction" as const, label: "Dip Tank Deduction", unit: "kg", step: 100 },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>System Settings</h1>
          <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, color: "var(--text-muted)" }}>
            Admin Only
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              opacity: hasChanges ? 1 : 0.5,
              cursor: hasChanges ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 900 }}>
          {settingsGroups.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
              className="lcps-card"
              style={{ marginBottom: 24 }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                {group.title}
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                {group.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {group.fields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">
                      {field.label}
                      {field.unit && <span style={{ color: "var(--text-muted)", marginLeft: 4 }}> ({field.unit})</span>}
                    </label>
                    <input
                      type="number"
                      step={field.step}
                      className="lcps-input"
                      value={tempSettings[field.key] ?? settings?.[field.key] ?? 0}
                      onChange={(e) => handleSettingChange(field.key, parseFloat(e.target.value))}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lcps-card"
            style={{ marginBottom: 24, borderLeft: "3px solid var(--accent-amber)" }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--accent-amber)" }}>
              ⚠️ Important Notes
            </h2>
            <ul style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Changing these settings affects all future batch calculations</li>
              <li>Existing batches will retain their original calculated values</li>
              <li>Changes are logged in the audit trail for accountability</li>
              <li>Reset to defaults will restore all values to factory settings</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
