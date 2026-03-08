/**
 * SideDrawer — slide-in navigation panel triggered from the header menu button.
 * Covers: Run History, User Settings, + future placeholders.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────

const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconCoach = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const IconDevice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavRow {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick?: () => void;
  soon?: boolean;
}

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSettings: () => void;
  onHistory: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SideDrawer({ isOpen, onClose, onSettings, onHistory }: SideDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const navRows: NavRow[] = [
    {
      icon: <IconHistory />,
      label: "Run History",
      sublabel: "Activity & past runs",
      onClick: () => { onClose(); onHistory(); },
    },
    {
      icon: <IconSettings />,
      label: "User Settings",
      sublabel: "Profile, pacing & goals",
      onClick: () => { onClose(); onSettings(); },
    },
    {
      icon: <IconCoach />,
      label: "Coach Profiles",
      sublabel: "Personalised training plans",
      soon: true,
    },
    {
      icon: <IconDevice />,
      label: "Device Sync",
      sublabel: "Garmin, Apple Watch, HR bands",
      soon: true,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)" }}
          />

          {/* Panel — slides in from the left */}
          <motion.nav
            key="drawer-panel"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed top-0 left-0 bottom-0 z-[201] flex flex-col"
            style={{ width: 288, background: "var(--bg-surface)", borderRight: "1px solid var(--border-mid)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5"
              style={{ paddingTop: "max(3rem, env(safe-area-inset-top))", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div>
                <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Navigation</p>
                <h2 className="brand-title text-2xl mt-0.5" style={{ color: "var(--text-bold)" }}>AI Coach</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="btn-outline flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: "50%", color: "var(--text-secondary)" }}
              >
                <IconX />
              </button>
            </div>

            {/* Nav rows */}
            <div className="scrollable-thin flex-1 py-3 px-3 flex flex-col gap-1">
              {navRows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  disabled={row.soon}
                  className="btn-list-item w-full flex items-center gap-4 rounded-2xl"
                  style={{
                    padding: "14px 16px",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-bold)",
                    opacity: row.soon ? 0.45 : 1,
                    cursor: row.soon ? "default" : "pointer",
                    textTransform: "none",
                    letterSpacing: "normal",
                    fontWeight: "normal",
                  }}
                >
                  <span style={{ color: row.soon ? "var(--text-muted)" : "var(--brand-primary)", flexShrink: 0 }}>
                    {row.icon}
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: row.soon ? "var(--text-muted)" : "var(--text-bold)" }}>
                        {row.label}
                      </span>
                      {row.soon && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}
                        >
                          Soon
                        </span>
                      )}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{row.sublabel}</span>
                  </span>
                  {!row.soon && (
                    <span style={{ color: "var(--text-muted)", flexShrink: 0 }}><IconChevronRight /></span>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4"
              style={{ borderTop: "1px solid var(--border-subtle)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                GPS-powered · AI coaching · Real-time metrics
              </p>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
