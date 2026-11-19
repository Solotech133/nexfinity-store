
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./ResetPassword.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess("Your password has been updated successfully.");

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err) {
      setError(
        err.message ||
          "Your reset link may have expired. Please request another one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <section className="reset-layout">
        <div className="reset-visual">
          <div className="reset-visual-icon">
            <ShieldCheck size={70} strokeWidth={1.4} />
            <span>
              <LockKeyhole size={24} />
            </span>
          </div>

          <span className="reset-eyebrow">
            YOUR ACCOUNT. YOUR SECURITY.
          </span>

          <h1>
            A fresh start
            <span> begins here.</span>
          </h1>

          <p>
            Create a new password to get back to managing
            your Nexfinity Store.
          </p>
        </div>

        <div className="reset-card">
          <span className="reset-eyebrow">ACCOUNT SECURITY</span>

          <h2>Reset Password</h2>

          <p className="reset-description">
            Choose a strong password for your account.
          </p>

          {error && (
            <div className="reset-message reset-error">
              {error}
            </div>
          )}

          {success && (
            <div className="reset-message reset-success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="reset-field">
              <label htmlFor="new-password">
                New password
              </label>

              <div className="reset-password-wrap">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div className="reset-field">
              <label htmlFor="confirm-new-password">
                Confirm new password
              </label>

              <div className="reset-password-wrap">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              className="reset-submit"
              type="submit"
              disabled={loading || Boolean(success)}
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>

          <div className="reset-login-link">
            Remembered your password?{" "}
            <Link to="/login">Login</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
