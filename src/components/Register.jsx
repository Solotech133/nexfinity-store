
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "../lib/supabase";
import "./Register.css";

const validPlans = ["starter", "growth", "business"];

const plans = [
  { id: "starter", name: "Starter", price: "Free" },
  { id: "growth", name: "Growth", price: "₦1,000/mo" },
  { id: "business", name: "Business", price: "₦5,000/yr" },
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedPlan = searchParams.get("plan")?.toLowerCase();

  const initialPlan =
    requestedPlan === "free"
      ? "starter"
      : validPlans.includes(requestedPlan)
        ? requestedPlan
        : "starter";

  const [plan, setPlan] = useState(initialPlan);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    category: "",
    description: "",
    address: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const email = form.email.trim().toLowerCase();

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your WhatsApp phone number.");
      return;
    }

    if (!form.businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }

    if (!form.category) {
      setError("Please select your business category.");
      return;
    }

    if (
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim()
    ) {
      setError("Please complete your business location details.");
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!validPlans.includes(plan)) {
      setError("Please select a valid subscription plan.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              phone: form.phone.trim(),
              business_name: form.businessName.trim(),
              business_category: form.category,
              business_description: form.description.trim(),
              business_address: form.address.trim(),
              city: form.city.trim(),
              state: form.state.trim(),
              requested_plan: plan,
            },
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (data.user && data.user.identities?.length === 0) {
        throw new Error(
          "An account with this email already exists. Please log in instead."
        );
      }

      if (data.user && plan !== "starter") {
        try {
          localStorage.setItem(
            `nexfinity-payment-intro-pending:${data.user.id}`,
            plan
          );
        } catch (storageError) {
          console.error(
            "Unable to remember the selected payment plan:",
            storageError
          );
        }
      }

      if (data.session) {
        navigate("/dashboard", {
          replace: true,
          state:
            plan === "starter"
              ? null
              : { paymentIntroPlan: plan },
        });
        return;
      }

      setSuccess(
        "Your account has been created successfully. Please check your email to verify your account, then log in to continue."
      );

      setForm((previous) => ({
        ...previous,
        password: "",
        confirmPassword: "",
      }));
    } catch (err) {
      console.error("Registration error:", err);

      const message = err?.message?.toLowerCase() || "";

      if (
        message.includes("already registered") ||
        message.includes("already exists") ||
        message.includes("user already registered")
      ) {
        setError(
          "An account with this email already exists. Please log in instead."
        );
      } else if (message.includes("invalid api key")) {
        setError(
          "The registration service is currently unavailable. Please contact support."
        );
      } else {
        setError(
          err?.message || "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* REGISTRATION LAYOUT */}
      <section className="register-layout">

        {/* LEFT INTRODUCTION */}
        <div className="register-intro">
          <span className="register-eyebrow">
            YOUR BUSINESS. YOUR ONLINE STORE.
          </span>

          <h1>
            Let's build something
            <span> your customers will love.</span>
          </h1>

          <p>
            Create your account and give your business a
            professional online storefront. Your products,
            your brand, your own store link.
          </p>

          <div className="register-benefits">
            <div>
              <span>01</span>
              Your own online storefront
            </div>

            <div>
              <span>02</span>
              Orders through WhatsApp
            </div>

            <div>
              <span>03</span>
              A unique store link and QR code
            </div>
          </div>
        </div>

        {/* REGISTRATION FORM */}
        <div className="register-card">

          <div className="register-card-heading">
            <span className="register-eyebrow">
              GET STARTED
            </span>

            <h2>Create your account</h2>

            <p>
              Tell us a little about yourself and your business.
            </p>
          </div>

          {error && (
            <div
              className="register-message register-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="register-message register-success"
              role="status"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* PERSONAL DETAILS */}
            <div className="register-field">
              <label htmlFor="fullName">Full name</label>

              <input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                placeholder="Your full name"
                autoComplete="name"
                required
                disabled={loading}
              />
            </div>

            <div className="register-field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="register-field">
              <label htmlFor="phone">WhatsApp phone number</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                placeholder="+234..."
                autoComplete="tel"
                required
                disabled={loading}
              />
            </div>

            {/* BUSINESS DETAILS */}
            <div className="register-divider">
              <span>YOUR BUSINESS DETAILS</span>
            </div>

            <div className="register-field">
              <label htmlFor="businessName">Business name</label>

              <input
                id="businessName"
                name="businessName"
                value={form.businessName}
                onChange={updateField}
                placeholder="e.g. Studio & Co."
                required
                disabled={loading}
              />
            </div>

            <div className="register-field">
              <label htmlFor="category">Business category</label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={updateField}
                required
                disabled={loading}
              >
                <option value="">Choose a category</option>
                <option value="Fashion and clothing">Fashion and clothing</option>
                <option value="Beauty and skincare">Beauty and skincare</option>
                <option value="Food and drinks">Food and drinks</option>
                <option value="Electronics">Electronics</option>
                <option value="Home and lifestyle">Home and lifestyle</option>
                <option value="Health and wellness">Health and wellness</option>
                <option value="Arts and crafts">Arts and crafts</option>
                <option value="Photography">Photography</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="register-field">
              <label htmlFor="description">Business description</label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Tell customers what your business offers..."
                rows="3"
                disabled={loading}
              />
            </div>

            <div className="register-field">
              <label htmlFor="address">Business address</label>

              <input
                id="address"
                name="address"
                value={form.address}
                onChange={updateField}
                placeholder="Street or area"
                required
                disabled={loading}
              />
            </div>

            <div className="register-two-columns">
              <div className="register-field">
                <label htmlFor="city">City</label>

                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  placeholder="City"
                  required
                  disabled={loading}
                />
              </div>

              <div className="register-field">
                <label htmlFor="state">State</label>

                <input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  placeholder="State"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* PLAN SELECTION */}
            <div className="register-divider">
              <span>CHOOSE YOUR PLAN</span>
            </div>

            <div className="register-plan-options">
              {plans.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`register-plan ${
                    plan === item.id ? "selected" : ""
                  }`}
                  onClick={() => setPlan(item.id)}
                  aria-pressed={plan === item.id}
                  disabled={loading}
                >
                  <span>{item.name}</span>
                  <strong>{item.price}</strong>
                </button>
              ))}
            </div>

            {/* PASSWORD */}
            <div className="register-field">
              <label htmlFor="password">Create password</label>

              <div className="register-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength="8"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="confirmPassword">Confirm password</label>

              <div className="register-password">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={updateField}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  title={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating your account..." : "Create account"}
            </button>

            <p className="register-terms">
              By creating an account, you agree to use
              Nexfinity Store responsibly and provide
              accurate business information.
            </p>
          </form>

          {/* LOGIN LINK */}
          <div className="register-login-link">
            Already have an account?
            <Link to="/login"> Log in</Link>
          </div>

        </div>
      </section>
    </div>
  );
}
