import React, { useEffect, useMemo, useState } from "react";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "./AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value = "") => value.trim().toLowerCase();

function PinInput({ value, onChange, disabled }) {
  return (
    <input
      className="w-full rounded-xl border px-3 py-2"
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="6-digit PIN"
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
        onChange(next);
      }}
    />
  );
}

export default function AuthGate() {
  const {
    status,
    signIn,
    createAccount,
    rememberSelection,
    setRememberSelection,
    initialEmail,
    lockedUser,
  } = useAuth();

  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState(initialEmail || "");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const isLocked = status === "locked";
  const emailDisabled = isLocked && !!initialEmail;

  useEffect(() => {
    setEmail(initialEmail || "");
    if (isLocked) {
      setMode("signIn");
    }
  }, [initialEmail, isLocked]);

  const canSubmitSignIn = normalizeEmail(email) && pin.length === 6;
  const canSubmitCreate =
    EMAIL_REGEX.test(normalizeEmail(email)) && pin.length === 6 && pin === confirmPin;

  const heading = useMemo(() => {
    if (isLocked) return "Unlock account";
    return mode === "create" ? "Create account" : "Sign in";
  }, [isLocked, mode]);

  const subheading = useMemo(() => {
    if (isLocked && lockedUser) {
      return `Welcome back, ${lockedUser.name || lockedUser.email || "Field Tech"}`;
    }
    if (mode === "create") {
      return "Create a local profile to save reports on this device.";
    }
    return "Use your work email and offline PIN.";
  }, [isLocked, lockedUser, mode]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (!canSubmitSignIn) return;
    setLoading(true);
    setMessage(null);
    const result = await signIn({ email, pin, remember: rememberSelection });
    setLoading(false);
    if (!result.ok) {
      if (result.error === "not-found") {
        setMessage({ type: "info", text: "No local account found. Sign in requires internet for first time." });
      } else if (result.error === "invalid-pin") {
        setMessage({ type: "error", text: "Incorrect PIN. Try again." });
      } else if (result.error === "throttled") {
        const retryIn = Math.max(0, Math.ceil((result.retryAt - Date.now()) / 1000));
        setMessage({ type: "error", text: `Too many attempts. Try again in ${retryIn}s.` });
      } else {
        setMessage({ type: "error", text: "Unable to sign in offline." });
      }
      if (result.error !== "throttled") {
        setPin("");
      }
      return;
    }
    setPin("");
    setMessage(null);
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    if (!canSubmitCreate) return;
    setLoading(true);
    setMessage(null);
    const result = await createAccount({ email, pin, name, remember: rememberSelection });
    setLoading(false);
    if (!result.ok) {
      if (result.error === "duplicate-email") {
        setMessage({ type: "error", text: "An account with that email already exists on this device." });
      } else {
        setMessage({ type: "error", text: "Unable to create account offline." });
      }
      return;
    }
    setPin("");
    setConfirmPin("");
    setName("");
    setMessage(null);
  };

  const handleSubmit = mode === "create" ? handleCreateAccount : handleSignIn;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white/95 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
            {mode === "create" ? <UserPlus size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
            <p className="text-sm text-slate-500">{subheading}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="auth-email">
              Work email
            </label>
            <input
              id="auth-email"
              className="w-full rounded-xl border px-3 py-2"
              type="email"
              autoComplete="email"
              placeholder="tech@example.com"
              value={email}
              disabled={emailDisabled}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="auth-pin">
              Offline PIN
            </label>
            <PinInput value={pin} onChange={setPin} disabled={loading} />
            <p className="text-xs text-slate-500">6 digits — stored securely on this device only.</p>
          </div>

          {mode === "create" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="auth-confirm-pin">
                  Confirm PIN
                </label>
                <PinInput value={confirmPin} onChange={setConfirmPin} disabled={loading} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="auth-name">
                  Display name <span className="text-xs text-slate-400">(optional)</span>
                </label>
                <input
                  id="auth-name"
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Field Tech"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border"
              checked={rememberSelection}
              onChange={(event) => setRememberSelection(event.target.checked)}
            />
            Remember me on this device
          </label>

          {message && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-50"
            disabled={loading || (mode === "create" ? !canSubmitCreate : !canSubmitSignIn)}
          >
            {mode === "create" ? <UserPlus size={18} /> : <LogIn size={18} />}
            {mode === "create" ? "Create account" : isLocked ? "Unlock" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === "create" ? (
            <button
              className="text-blue-600 font-medium hover:underline"
              onClick={() => {
                setMode("signIn");
                setMessage(null);
                setPin("");
                setConfirmPin("");
              }}
            >
              Already have an account? Sign in
            </button>
          ) : (
            <button
              className="text-blue-600 font-medium hover:underline"
              onClick={() => {
                setMode("create");
                setMessage(null);
                setPin("");
                setConfirmPin("");
              }}
            >
              Need an account? Create one
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
