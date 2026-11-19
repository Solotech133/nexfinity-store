
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  ShoppingBag,
  Package,
  MessageCircle,
  ChartNoAxesCombined,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      // STEP 1: AUTHENTICATE USER
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.user || !data?.session) {
        throw new Error(
          "We couldn't verify your login. Please try again."
        );
      }

      // STEP 2: CHECK ADMIN ACCOUNT FIRST
      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id, email, role, is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (adminError) {
        console.error("Admin verification error:", adminError);

        throw new Error(
          "We couldn't verify your account permissions. Please try again."
        );
      }

      // STEP 3: REDIRECT ACTIVE ADMIN
      if (admin?.is_active === true) {
        navigate("/admin", { replace: true });
        return;
      }

      // STEP 4: NON-ADMIN USERS GO TO VENDOR DASHBOARD
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      const errorMessage = err?.message || "";
      const lowerMessage = errorMessage.toLowerCase();

      if (
        lowerMessage.includes("invalid login credentials") ||
        lowerMessage.includes("invalid credentials")
      ) {
        setError("Incorrect email or password. Please try again.");
      } else if (
        lowerMessage.includes("email not confirmed")
      ) {
        setError(
          "Please verify your email address before logging in."
        );
      } else if (
        lowerMessage.includes("rate limit")
      ) {
        setError(
          "Too many attempts. Please wait a moment and try again."
        );
      } else {
        setError(
          errorMessage ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // PASSWORD RECOVERY
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (resetLoading) return;

    clearMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address to reset your password.");
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "If an account exists with that email, a password reset link will be sent shortly."
      );
    } catch (err) {
      console.error("Password reset error:", err);

      setError(
        err?.message ||
          "We couldn't process your request. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const returnToLogin = () => {
    setForgotMode(false);
    clearMessages();
  };

  return (
    <div className="login-page">

      {/* MAIN CONTENT */}
      <main className="login-main">

        {/* LEFT VISUAL PANEL */}
        <section className="login-visual">
          <div className="login-visual-content">

            <div className="login-eyebrow">
              <Sparkles size={15} />
              <span>YOUR BUSINESS, ONLINE</span>
            </div>

            <h1 className="login-heading">
              Everything your business needs.
              <span> One simple store.</span>
            </h1>

            <p className="login-description">
              Manage products, receive orders, and grow your business
              with your own professional online store.
            </p>

            {/* STORE ILLUSTRATION */}
            <div className="login-illustration">
              <div className="login-illustration-glow" />

              <div className="login-illustration-circle login-circle-one" />
              <div className="login-illustration-circle login-circle-two" />

              <div className="login-store-window">

                <div className="login-store-top">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="login-store-content">

                  <div className="login-store-sidebar">
                    <div className="login-store-mark">
                      <ShoppingBag size={20} />
                    </div>

                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="login-store-products">

                    <div className="login-store-banner">
                      <div className="login-banner-copy">
                        <span>YOUR ONLINE STORE</span>
                        <strong>Sell more.</strong>
                        <strong>Grow faster.</strong>
                      </div>

                      <ShoppingBag size={48} />
                    </div>

                    <div className="login-product-grid">

                      <div className="login-product-card">
                        <div className="login-product-image product-one">
                          <Package size={25} />
                        </div>
                        <span />
                        <span />
                      </div>

                      <div className="login-product-card">
                        <div className="login-product-image product-two">
                          <ShoppingBag size={25} />
                        </div>
                        <span />
                        <span />
                      </div>

                      <div className="login-product-card">
                        <div className="login-product-image product-three">
                          <Package size={25} />
                        </div>
                        <span />
                        <span />
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* FLOATING FEATURE CARDS */}
              <div className="login-float-card login-float-products">
                <div className="login-float-icon">
                  <Package size={18} />
                </div>

                <div>
                  <strong>Products</strong>
                  <span>Manage your inventory</span>
                </div>
              </div>

              <div className="login-float-card login-float-orders">
                <div className="login-float-icon">
                  <MessageCircle size={18} />
                </div>

                <div>
                  <strong>New order!</strong>
                  <span>Order received successfully</span>
                </div>

                <CheckCircle2
                  className="login-float-check"
                  size={17}
                />
              </div>

              <div className="login-float-card login-float-growth">
                <div className="login-float-icon">
                  <ChartNoAxesCombined size={18} />
                </div>

                <div>
                  <strong>Grow your business</strong>
                  <span>Your store, your customers</span>
                </div>
              </div>
            </div>

            {/* BENEFITS */}
            <div className="login-benefits">

              <div className="login-benefit">
                <CheckCircle2 size={17} />
                <span>Easy store management</span>
              </div>

              <div className="login-benefit">
                <CheckCircle2 size={17} />
                <span>Simple order tracking</span>
              </div>

              <div className="login-benefit">
                <CheckCircle2 size={17} />
                <span>Built for growing businesses</span>
              </div>

            </div>
          </div>
        </section>

        {/* RIGHT LOGIN SECTION */}
        <section className="login-form-section">
          <div className="login-card">

            {!forgotMode ? (
              <>

                <div className="login-card-heading">

                  <div className="login-card-icon login-logo">
                    <img
                      src="/images/logo2.png"
                      alt="Nexfinity Store"
                    />
                  </div>

                  <span className="login-card-label">
                    WELCOME BACK
                  </span>

                  <h2>Login</h2>

                  <p>
                    Enter your details to access your store.
                  </p>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                  <div className="login-message login-error" role="alert">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                  </div>
                )}

                {/* SUCCESS MESSAGE */}
                {message && (
                  <div className="login-message login-success" role="status">
                    <CheckCircle2 size={17} />
                    <span>{message}</span>
                  </div>
                )}

                <form
                  className="login-form"
                  onSubmit={handleLogin}
                >

                  {/* EMAIL */}
                  <div className="login-field">
                    <label htmlFor="login-email">
                      Email address
                    </label>

                    <div className="login-input-wrap">
                      <Mail size={18} />

                      <input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearMessages();
                        }}
                        autoComplete="email"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="login-field">

                    <div className="login-password-label">
                      <label htmlFor="login-password">
                        Password
                      </label>

                      <button
                        type="button"
                        className="login-forgot"
                        onClick={() => {
                          setForgotMode(true);
                          clearMessages();
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="login-input-wrap">
                      <ShieldCheck size={18} />

                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearMessages();
                        }}
                        autoComplete="current-password"
                        required
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    className="login-submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle
                          size={19}
                          className="login-button-spinner"
                        />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </button>

                </form>

                <div className="login-card-divider">
                  <span>NEW TO NEXFINITY STORE?</span>
                </div>

                <p className="login-register">
                  Don't have a store yet?{" "}
                  <Link to="/register">
                    Create your store
                  </Link>
                </p>

                <div className="login-security-note">
                  <ShieldCheck size={15} />

                  <span>
                    Your account and business information are protected.
                  </span>
                </div>

              </>
            ) : (
              <>

                {/* PASSWORD RESET */}
                <div className="login-card-heading">

                  <div className="login-card-icon">
                    <Mail size={22} />
                  </div>

                  <span className="login-card-label">
                    ACCOUNT RECOVERY
                  </span>

                  <h2>Reset your password</h2>

                  <p>
                    Enter your registered email address and we'll
                    send you a password reset link.
                  </p>
                </div>

                {error && (
                  <div className="login-message login-error" role="alert">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                  </div>
                )}

                {message && (
                  <div className="login-message login-success" role="status">
                    <CheckCircle2 size={17} />
                    <span>{message}</span>
                  </div>
                )}

                <form
                  className="login-form"
                  onSubmit={handleForgotPassword}
                >

                  <div className="login-field">
                    <label htmlFor="reset-email">
                      Email address
                    </label>

                    <div className="login-input-wrap">
                      <Mail size={18} />

                      <input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearMessages();
                        }}
                        autoComplete="email"
                        required
                        disabled={resetLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <LoaderCircle
                          size={19}
                          className="login-button-spinner"
                        />
                        Sending reset link...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </button>

                </form>

                <button
                  type="button"
                  className="login-return"
                  onClick={returnToLogin}
                >
                  Back to Login
                </button>

              </>
            )}
          </div>

          <p className="login-footer-note">
            © {new Date().getFullYear()} Nexfinity Store. All rights reserved.
          </p>
        </section>
      </main>
    </div>
  );
}
