
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Sparkles,
  CreditCard,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CircleHelp,
  CheckCircle2,
  Clock3,
  AlertCircle,
  LoaderCircle,
  UserRound,
  MapPin,
  Mail,
  Phone,
  ArrowUpRight,
  Moon,
  Sun,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import SharedLoadingScreen from "../components/SharedLoadingScreen";

import "./Dashboard.css";

// LAZY-LOADED DASHBOARD COMPONENTS
const StoreProfile = lazy(() => import("./StoreProfile"));
const ProductManager = lazy(() => import("./ProductManager"));
const OrdersManager = lazy(() => import("./OrdersManager"));
const StoreLinkQR = lazy(() => import("./StoreLinkQR"));
const PlanPayments = lazy(() => import("./PlanPayments"));
const NexfyAI = lazy(() => import("./NexfyAI"));

// DASHBOARD NAVIGATION
const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My Store", icon: Store },
  { label: "Products", icon: Package },
  { label: "Orders", icon: ShoppingBag },
  { label: "Nexfy AI", icon: Sparkles },
  { label: "My Plan", icon: CreditCard },
  { label: "Store Link & QR", icon: QrCode },
  { label: "Settings", icon: Settings },
];

// SUBSCRIPTION PLANS
const planDetails = {
  starter: {
    name: "Starter",
    price: "Free",
    limit: "10 products",
  },
  growth: {
    name: "Growth",
    price: "₦1,000/month",
    limit: "200 products",
  },
  business: {
    name: "Business",
    price: "₦5,000/year",
    limit: "Unlimited products",
  },
};

// NORMALIZE PLAN NAME
const normalizePlan = (plan) => {
  const value = String(plan || "starter")
    .toLowerCase()
    .replace(/\s+plan$/, "")
    .trim();

  return value === "free" ? "starter" : value;
};

const isPaidPlan = (plan) =>
  ["growth", "business"].includes(normalizePlan(plan));

// CHECK ACTIVE PAID SUBSCRIPTION
const hasActivePaidSubscription = (vendor) => {
  if (!vendor) return false;

  const plan = normalizePlan(vendor.plan);

  const subscriptionStatus = String(
    vendor.subscription_status || ""
  ).toLowerCase();

  const paymentStatus = String(
    vendor.payment_status || ""
  ).toLowerCase();

  if (
    !isPaidPlan(plan) ||
    subscriptionStatus !== "active" ||
    paymentStatus !== "approved"
  ) {
    return false;
  }

  if (vendor.subscription_expires_at) {
    const expiry = new Date(vendor.subscription_expires_at);

    if (
      Number.isNaN(expiry.getTime()) ||
      expiry.getTime() <= Date.now()
    ) {
      return false;
    }
  }

  return true;
};

// DETERMINE INITIAL DASHBOARD PAGE
const getInitialDashboardPage = (vendor, latestPayment) => {
  if (hasActivePaidSubscription(vendor)) {
    return "Overview";
  }

  const paymentStatus = String(
    latestPayment?.status || vendor?.payment_status || ""
  ).toLowerCase();

  const requestedPlan =
    latestPayment?.requested_plan ||
    vendor?.requested_plan ||
    vendor?.plan;

  if (
    isPaidPlan(requestedPlan) ||
    ["pending", "rejected"].includes(paymentStatus)
  ) {
    return "My Plan";
  }

  return "Overview";
};

// CHECK WHETHER USER IS AN ACTIVE ADMIN
async function fetchActiveAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, email, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin verification error:", error);

    throw new Error(
      "We couldn't verify your account permissions. Please try again."
    );
  }

  return data?.is_active === true ? data : null;
}

// FETCH VENDOR PROFILE
async function fetchVendorProfile(userId) {
  const { data, error } = await supabase
    .from("vendors")
    .select(`
      id,
      auth_user_id,
      email,
      full_name,
      phone,
      business_name,
      business_category,
      business_description,
      business_address,
      city,
      state,
      plan,
      requested_plan,
      product_limit,
      subscription_status,
      payment_status,
      payment_reference,
      payment_proof_url,
      payment_approved_at,
      subscription_started_at,
      subscription_expires_at,
      approval_status,
      store_name,
      store_slug,
      store_url,
      store_logo_url,
      store_banner_url,
      store_brand_color,
      is_store_published,
      created_at
    `)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Your account was found, but your vendor profile is missing. Please contact support."
    );
  }

  return data;
}

// FETCH LATEST SUBSCRIPTION PAYMENT
async function fetchLatestSubscriptionPayment(vendorId) {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("requested_plan, status, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Latest subscription payment lookup:", error);
    return null;
  }

  return data;
}

// SUBSCRIPTION STATUS BADGE
function StatusPill({ status }) {
  const value = String(status || "pending").toLowerCase();

  const labels = {
    active: "Active",
    approved: "Approved",
    pending: "Pending approval",
    expired: "Expired",
    suspended: "Suspended",
    rejected: "Rejected",
    not_required: "Not required",
  };

  const className =
    value === "active" || value === "approved"
      ? "status-green"
      : ["rejected", "suspended", "expired"].includes(value)
        ? "status-red"
        : "status-yellow";

  return (
    <span className={`dashboard-status ${className}`}>
      {labels[value] || value.replaceAll("_", " ")}
    </span>
  );
}

// LAZY COMPONENT LOADER
function ComponentLoader() {
  return (
    <SharedLoadingScreen label="Loading your dashboard section" />
  );
}

// MAIN DASHBOARD
export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const signupPaymentPlan = location.state?.paymentIntroPlan;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [paymentIntroPlan, setPaymentIntroPlan] = useState("");
  const [paymentIntroSettings, setPaymentIntroSettings] =
    useState(null);
  const [paymentIntroLoading, setPaymentIntroLoading] =
    useState(false);
  const [paymentIntroError, setPaymentIntroError] = useState("");

  // DASHBOARD THEME
  const [theme, setTheme] = useState(() => {
    try {
      return (
        localStorage.getItem("nexfinity-dashboard-theme") ||
        "light"
      );
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("nexfinity-dashboard-theme", theme);
    } catch {
      // Dashboard remains usable if storage is unavailable.
    }
  }, [theme]);

  // SIDEBAR ESCAPE AND SCROLL MANAGEMENT
  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  // REFRESH VENDOR INFORMATION
  const refreshVendor = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError || new Error("Your session has expired.");
      }

      // ALWAYS CHECK ADMIN ACCESS FIRST.
      const admin = await fetchActiveAdmin(user.id);

      if (admin) {
        navigate("/admin", { replace: true });
        return null;
      }

      // LOAD VENDOR PROFILE ONLY FOR NON-ADMIN USERS.
      const data = await fetchVendorProfile(user.id);

      const latestPayment =
        await fetchLatestSubscriptionPayment(data.id);

      setVendor(data);

      setActivePage(
        getInitialDashboardPage(data, latestPayment)
      );

      setError("");

      return data;
    } catch (err) {
      console.error("Vendor refresh error:", err);

      setError(
        err?.message ||
          "Unable to refresh your account information."
      );

      return null;
    }
  }, [navigate]);

  // LOAD AUTHENTICATED VENDOR
  useEffect(() => {
    let mounted = true;

    const loadVendor = async () => {
      try {
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError || !user) {
          navigate("/login", { replace: true });
          return;
        }

        // STEP 1: CHECK ADMIN ACCESS FIRST.
        const admin = await fetchActiveAdmin(user.id);

        if (!mounted) return;

        if (admin) {
          navigate("/admin", { replace: true });
          return;
        }

        // STEP 2: LOAD VENDOR PROFILE.
        const data = await fetchVendorProfile(user.id);

        if (!mounted) return;

        const latestPayment =
          await fetchLatestSubscriptionPayment(data.id);

        if (!mounted) return;

        let introPlan = normalizePlan(
          signupPaymentPlan ||
            data.requested_plan ||
            data.plan
        );
        let introAlreadySeen = false;

        try {
          const pendingIntroPlan = localStorage.getItem(
            `nexfinity-payment-intro-pending:${user.id}`
          );
          introPlan = normalizePlan(
            signupPaymentPlan ||
              pendingIntroPlan ||
              data.requested_plan ||
              data.plan
          );

          if (isPaidPlan(introPlan)) {
            introAlreadySeen =
              localStorage.getItem(
                `nexfinity-payment-intro-seen:${user.id}`
              ) === introPlan;
          }
        } catch (storageError) {
          console.error(
            "Payment intro preference error:",
            storageError
          );
        }

        if (
          isPaidPlan(introPlan) &&
          !hasActivePaidSubscription(data) &&
          latestPayment?.status !== "pending" &&
          !introAlreadySeen
        ) {
          setPaymentIntroPlan(introPlan);
        }

        setVendor(data);

        setActivePage(
          getInitialDashboardPage(data, latestPayment)
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (mounted) {
          setError(
            err?.message ||
              "Something went wrong while opening your dashboard."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadVendor();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, signupPaymentPlan]);

  useEffect(() => {
    if (!paymentIntroPlan) return undefined;

    let mounted = true;

    const loadPaymentSettings = async () => {
      setPaymentIntroLoading(true);
      setPaymentIntroError("");
      setPaymentIntroSettings(null);

      try {
        const { data, error: settingsError } = await supabase
          .from("payment_settings")
          .select(
            "bank_name, account_name, account_number, transfer_instructions"
          )
          .eq("id", 1)
          .eq("is_active", true)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (mounted) {
          setPaymentIntroSettings(data);
        }
      } catch (err) {
        console.error("Payment details loading error:", err);

        if (mounted) {
          setPaymentIntroError(
            err?.message ||
              "Unable to load payment details. You can continue and check them later in My Plan."
          );
        }
      } finally {
        if (mounted) {
          setPaymentIntroLoading(false);
        }
      }
    };

    loadPaymentSettings();

    return () => {
      mounted = false;
    };
  }, [paymentIntroPlan]);

  // LOG OUT
  const handleLogout = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setError("");
    setSidebarOpen(false);

    try {
      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) {
        setError(logoutError.message);
        setSigningOut(false);
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setError("We couldn't log you out. Please try again.");
      setSigningOut(false);
    }
  };

  const handleContinueFromPaymentIntro = () => {
    try {
      localStorage.setItem(
        `nexfinity-payment-intro-seen:${vendor.auth_user_id}`,
        paymentIntroPlan
      );
      localStorage.removeItem(
        `nexfinity-payment-intro-pending:${vendor.auth_user_id}`
      );
    } catch (storageError) {
      console.error(
        "Unable to save payment intro preference:",
        storageError
      );
    }

    setPaymentIntroPlan("");
  };

  // CHANGE DASHBOARD PAGE
  const changePage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // VENDOR INFORMATION
  const planKey = normalizePlan(vendor?.plan);

  const currentPlan =
    planDetails[planKey] || planDetails.starter;

  const displayName =
    vendor?.full_name?.trim() ||
    vendor?.business_name ||
    "Vendor";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const businessInitial =
    vendor?.business_name?.trim()?.charAt(0)?.toUpperCase() ||
    "S";

  const storeSlug = vendor?.store_slug?.trim();

  const storeUrl = storeSlug
    ? `${window.location.origin}/store/${encodeURIComponent(storeSlug)}`
    : "";

  const isStoreReady =
    vendor?.approval_status === "approved" &&
    vendor?.is_store_published === true &&
    Boolean(storeSlug);

  // LOADING SCREEN
  if (loading) {
    return (
      <SharedLoadingScreen label="Loading your dashboard" />
    );
  }

  // DASHBOARD ERROR
  if (error && !vendor) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-error-card">
          <AlertCircle size={30} />

          <h2>We couldn't load your dashboard</h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>

          <button
            type="button"
            className="dashboard-text-button"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    );
  }

  // MISSING VENDOR PROFILE
  if (!vendor) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-error-card">
          <AlertCircle size={30} />

          <h2>Vendor profile unavailable</h2>

          <p>
            We couldn't find a business profile linked to this
            account. Please log out and try again, or contact support.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>

          <button
            type="button"
            className="dashboard-text-button"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell" data-theme={theme}>
      {paymentIntroPlan && (
        <div className="dashboard-payment-intro-backdrop">
          <section
            className="dashboard-payment-intro"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-payment-intro-title"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                event.currentTarget
                  .querySelector("button")
                  ?.focus();
              }
            }}
          >
            <div className="dashboard-payment-intro-heading">
              <span className="dashboard-payment-intro-icon">
                <CreditCard size={22} />
              </span>
              <span className="dashboard-eyebrow">
                PAYMENT DETAILS
              </span>
              <h2 id="dashboard-payment-intro-title">
                Your {planDetails[paymentIntroPlan]?.name} plan
              </h2>
              <p>
                Review the transfer details for your selected plan
                before continuing to your dashboard.
              </p>
            </div>

            <div className="dashboard-payment-intro-summary">
              <div>
                <small>Selected plan</small>
                <strong>
                  {planDetails[paymentIntroPlan]?.name}
                </strong>
              </div>
              <div>
                <small>Plan price</small>
                <strong>
                  {planDetails[paymentIntroPlan]?.price}
                </strong>
              </div>
            </div>

            {paymentIntroLoading && (
              <div
                className="dashboard-payment-intro-message"
                role="status"
              >
                <LoaderCircle
                  className="dashboard-payment-intro-spinner"
                  size={19}
                />
                Loading bank transfer details...
              </div>
            )}

            {paymentIntroError && (
              <div
                className="dashboard-payment-intro-message warning"
                role="alert"
              >
                <AlertCircle size={19} />
                <span>{paymentIntroError}</span>
              </div>
            )}

            {!paymentIntroLoading &&
              !paymentIntroError &&
              !paymentIntroSettings && (
                <div
                  className="dashboard-payment-intro-message warning"
                  role="status"
                >
                  <AlertCircle size={19} />
                  <span>
                    Bank transfer details are not configured yet.
                    You can continue and check again later in My Plan.
                  </span>
                </div>
              )}

            {paymentIntroSettings && (
              <div className="dashboard-payment-intro-bank">
                <h3>Official payment account</h3>
                <div>
                  <small>Bank name</small>
                  <strong>
                    {paymentIntroSettings.bank_name}
                  </strong>
                </div>
                <div>
                  <small>Account name</small>
                  <strong>
                    {paymentIntroSettings.account_name}
                  </strong>
                </div>
                <div>
                  <small>Account number</small>
                  <strong className="dashboard-payment-intro-account">
                    {paymentIntroSettings.account_number}
                  </strong>
                </div>
                {paymentIntroSettings.transfer_instructions && (
                  <p>
                    {paymentIntroSettings.transfer_instructions}
                  </p>
                )}
              </div>
            )}

            <p className="dashboard-payment-intro-note">
              You can continue now. Payment submission is available
              from My Plan after your store is approved.
            </p>

            <button
              type="button"
              className="dashboard-payment-intro-continue"
              onClick={handleContinueFromPaymentIntro}
              autoFocus
            >
              Continue to dashboard
              <ArrowUpRight size={17} />
            </button>
          </section>
        </div>
      )}

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <button
          type="button"
          className="dashboard-overlay"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* DASHBOARD SIDEBAR */}
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
        aria-label="Dashboard navigation"
      >

        {/* NEXFINITY STORE BRAND */}
        <div className="dashboard-brand">
          <Link
            to="/"
            className="dashboard-brand-link"
            aria-label="Nexfinity Store home"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src="/images/logo.png"
              alt="Nexfinity Store"
              className="dashboard-brand-image"
            />
          </Link>

          <button
            type="button"
            className="dashboard-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* WORKSPACE INFORMATION */}
        <div className="dashboard-workspace">
          <span className="dashboard-workspace-label">
            YOUR WORKSPACE
          </span>

          <div className="dashboard-workspace-name">
            <span className="dashboard-workspace-avatar">
              {businessInitial}
            </span>

            <span>
              <strong>{vendor.business_name}</strong>
              <small>Vendor account</small>
            </span>
          </div>
        </div>

        {/* MAIN NAVIGATION */}
        <nav
          className="dashboard-nav"
          aria-label="Main navigation"
        >
          <span className="dashboard-nav-label">MENU</span>

          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.label;

            return (
              <button
                type="button"
                key={item.label}
                className={`dashboard-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() => changePage(item.label)}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <Icon size={18} />

                <span>{item.label}</span>

                {isActive && (
                  <ChevronRight
                    size={16}
                    className="dashboard-nav-arrow"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="dashboard-sidebar-bottom">

          {/* SUPPORT CARD */}
          <div className="dashboard-help-card">
            <span className="dashboard-help-icon">
              <CircleHelp size={19} />
            </span>

            <strong>Need a hand?</strong>

            <p>We're here to help you get started.</p>

            <a href="mailto:nexfinity97@gmail.com">
              Contact support
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* LOGOUT */}
          <button
            type="button"
            className="dashboard-logout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut size={18} />

            {signingOut ? "Logging out..." : "Log out"}
          </button>

          {/* COPYRIGHT */}
          <div className="dashboard-sidebar-footer">
            <span>
              © {new Date().getFullYear()} Nexfinity
            </span>

            <span>Store</span>
          </div>
        </div>
      </aside>

      {/* DASHBOARD MAIN CONTENT */}
      <main className="dashboard-main">

        {/* TOP NAVIGATION BAR */}
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">

            <button
              type="button"
              className="dashboard-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              <Menu size={21} />
            </button>

            <div>
              <span className="dashboard-breadcrumb">
                Workspace
              </span>

              <h1>{activePage}</h1>
            </div>
          </div>

          <div className="dashboard-topbar-right">

            {/* THEME TOGGLE */}
            <button
              type="button"
              className="dashboard-theme-toggle"
              onClick={() =>
                setTheme((previous) =>
                  previous === "light" ? "dark" : "light"
                )
              }
              aria-label={`Switch to ${
                theme === "light" ? "dark" : "light"
              } mode`}
              title={`Switch to ${
                theme === "light" ? "dark" : "light"
              } mode`}
            >
              {theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}

              <span>
                {theme === "light" ? "Dark mode" : "Light mode"}
              </span>
            </button>

            {/* CURRENT PLAN */}
            <span className="dashboard-plan-chip">
              {currentPlan.name} plan
            </span>

            {/* USER AVATAR */}
            <div
              className="dashboard-user-avatar"
              title={displayName}
              aria-label={`Signed in as ${displayName}`}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <div className="dashboard-content">

          {/* INLINE ERROR */}
          {error && (
            <div className="dashboard-inline-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <Suspense fallback={<ComponentLoader />}>

            {/* OVERVIEW */}
            {activePage === "Overview" && (
              <>
                <section className="dashboard-welcome">
                  <div>
                    <span className="dashboard-eyebrow">
                      YOUR BUSINESS SPACE
                    </span>

                    <h2>
                      Welcome back, {displayName.split(" ")[0]}.
                    </h2>

                    <p>
                      Here's an overview of your business on
                      Nexfinity Store.
                    </p>
                  </div>

                  <div className="dashboard-welcome-mark">
                    <Store size={32} />
                  </div>
                </section>

                {/* ACCOUNT APPROVAL NOTICE */}
                {vendor.approval_status !== "approved" && (
                  <section className="dashboard-notice">
                    <div className="dashboard-notice-icon">
                      <Clock3 size={20} />
                    </div>

                    <div>
                      <strong>
                        Your account is awaiting approval
                      </strong>

                      <p>
                        Your business account is not yet approved.
                        You can review your details while we complete
                        the approval process.
                      </p>
                    </div>

                    <StatusPill status={vendor.approval_status} />
                  </section>
                )}

                {/* PAYMENT NOTICE */}
                {vendor.payment_status === "pending" && (
                  <section className="dashboard-payment-notice">
                    <AlertCircle size={20} />

                    <div>
                      <strong>
                        Payment verification pending
                      </strong>

                      <p>
                        Your selected paid plan will become active
                        after your payment has been reviewed and
                        approved.
                      </p>
                    </div>
                  </section>
                )}

                {/* STATISTICS */}
                <section className="dashboard-stat-grid">

                  <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon">
                      <Package size={20} />
                    </span>

                    <span className="dashboard-stat-label">
                      Product allowance
                    </span>

                    <strong>
                      {vendor.product_limit === 2147483647 ||
                      vendor.product_limit === -1
                        ? "Unlimited"
                        : vendor.product_limit ?? 10}
                    </strong>

                    <small>
                      {currentPlan.limit} on your current plan
                    </small>
                  </article>

                  <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon">
                      <CreditCard size={20} />
                    </span>

                    <span className="dashboard-stat-label">
                      Current plan
                    </span>

                    <strong>{currentPlan.name}</strong>

                    <small>{currentPlan.price}</small>
                  </article>

                  <article className="dashboard-stat-card">
                    <span className="dashboard-stat-icon">
                      <CheckCircle2 size={20} />
                    </span>

                    <span className="dashboard-stat-label">
                      Account status
                    </span>

                    <strong className="dashboard-stat-status">
                      {vendor.approval_status === "approved"
                        ? "Approved"
                        : "Under review"}
                    </strong>

                    <small>
                      <StatusPill status={vendor.approval_status} />
                    </small>
                  </article>
                </section>

                {/* OVERVIEW PANELS */}
                <section className="dashboard-overview-grid">

                  {/* STORE PROFILE PANEL */}
                  <article className="dashboard-panel dashboard-store-panel">
                    <div className="dashboard-panel-heading">
                      <div>
                        <span className="dashboard-eyebrow">
                          YOUR BUSINESS
                        </span>

                        <h3>Store profile</h3>
                      </div>

                      <span className="dashboard-panel-icon">
                        <Store size={20} />
                      </span>
                    </div>

                    <div className="dashboard-store-identity">
                      <span className="dashboard-store-avatar">
                        {businessInitial}
                      </span>

                      <div>
                        <strong>
                          {vendor.store_name || vendor.business_name}
                        </strong>

                        <span>
                          {vendor.business_category ||
                            "Business category not set"}
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-store-details">

                      <div>
                        <MapPin size={16} />

                        <span>
                          {[vendor.city, vendor.state]
                            .filter(Boolean)
                            .join(", ") || "Location not provided"}
                        </span>
                      </div>

                      <div>
                        <Mail size={16} />

                        <span>{vendor.email}</span>
                      </div>

                      <div>
                        <Phone size={16} />

                        <span>
                          {vendor.phone || "Phone number not provided"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dashboard-secondary-button"
                      onClick={() => changePage("My Store")}
                    >
                      View store profile
                      <ChevronRight size={16} />
                    </button>
                  </article>

                  {/* SUBSCRIPTION PANEL */}
                  <article className="dashboard-panel dashboard-plan-panel">
                    <div className="dashboard-panel-heading">
                      <div>
                        <span className="dashboard-eyebrow">
                          YOUR SUBSCRIPTION
                        </span>

                        <h3>{currentPlan.name} plan</h3>
                      </div>

                      <span className="dashboard-panel-icon">
                        <CreditCard size={20} />
                      </span>
                    </div>

                    <div className="dashboard-plan-price">
                      {currentPlan.price}
                    </div>

                    <p>{currentPlan.limit} allowance</p>

                    <div className="dashboard-plan-status">
                      <span>Subscription</span>

                      <StatusPill
                        status={vendor.subscription_status}
                      />
                    </div>

                    <div className="dashboard-plan-status">
                      <span>Payment</span>

                      <StatusPill
                        status={vendor.payment_status}
                      />
                    </div>

                    {vendor.subscription_expires_at && (
                      <div className="dashboard-plan-status">
                        <span>Expires</span>

                        <strong>
                          {new Date(
                            vendor.subscription_expires_at
                          ).toLocaleDateString("en-NG")}
                        </strong>
                      </div>
                    )}

                    <button
                      type="button"
                      className="dashboard-secondary-button"
                      onClick={() => changePage("My Plan")}
                    >
                      View plan details
                      <ChevronRight size={16} />
                    </button>
                  </article>
                </section>

                {/* QUICK ACTIONS */}
                <section className="dashboard-quick-section">
                  <div className="dashboard-section-heading">
                    <div>
                      <span className="dashboard-eyebrow">
                        GET STARTED
                      </span>

                      <h3>Your next steps</h3>
                    </div>
                  </div>

                  <div className="dashboard-quick-grid">

                    <button
                      type="button"
                      className="dashboard-quick-card"
                      onClick={() => changePage("My Store")}
                    >
                      <span>
                        <Store size={20} />
                      </span>

                      <strong>Review your store profile</strong>

                      <small>
                        Check your business information
                      </small>

                      <ChevronRight size={17} />
                    </button>

                    <button
                      type="button"
                      className="dashboard-quick-card"
                      onClick={() => changePage("Products")}
                    >
                      <span>
                        <Package size={20} />
                      </span>

                      <strong>Manage your products</strong>

                      <small>
                        Add products and manage your catalogue
                      </small>

                      <ChevronRight size={17} />
                    </button>

                    <button
                      type="button"
                      className="dashboard-quick-card"
                      onClick={() => changePage("My Plan")}
                    >
                      <span>
                        <CreditCard size={20} />
                      </span>

                      <strong>Review your plan</strong>

                      <small>See your subscription details</small>

                      <ChevronRight size={17} />
                    </button>

                    <button
                      type="button"
                      className="dashboard-quick-card"
                      onClick={() => changePage("Store Link & QR")}
                    >
                      <span>
                        <QrCode size={20} />
                      </span>

                      <strong>Get your store QR code</strong>

                      <small>
                        Share your store with customers
                      </small>

                      <ChevronRight size={17} />
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* MY STORE */}
            {activePage === "My Store" && (
              <StoreProfile
                vendor={vendor}
                setVendor={setVendor}
              />
            )}

            {/* PRODUCTS */}
            {activePage === "Products" && (
              <ProductManager vendor={vendor} />
            )}

            {/* ORDERS */}
            {activePage === "Orders" && (
              <OrdersManager vendor={vendor} />
            )}

            {/* MY PLAN */}
            {activePage === "My Plan" && (
              <PlanPayments
                vendor={vendor}
                onVendorUpdated={refreshVendor}
              />
            )}

            {/* STORE LINK AND QR */}
            {activePage === "Store Link & QR" && (
              <StoreLinkQR
                storeName={
                  vendor.store_name || vendor.business_name
                }
                storeUrl={storeUrl}
                isStoreReady={isStoreReady}
              />
            )}

            {/* NEXFY AI */}
            {activePage === "Nexfy AI" && (
              <NexfyAI vendor={vendor} />
            )}

            {/* SETTINGS */}
            {activePage === "Settings" && (
              <section className="dashboard-panel dashboard-profile-panel">

                <div className="dashboard-panel-heading">
                  <div>
                    <span className="dashboard-eyebrow">
                      ACCOUNT
                    </span>

                    <h3>Account information</h3>

                    <p>
                      Your Nexfinity Store login and business
                      account details.
                    </p>
                  </div>

                  <span className="dashboard-panel-icon">
                    <UserRound size={20} />
                  </span>
                </div>

                <div className="dashboard-profile-grid">

                  <div>
                    <small>Full name</small>

                    <strong>
                      {vendor.full_name || "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <small>Email address</small>

                    <strong>{vendor.email}</strong>
                  </div>

                  <div>
                    <small>Business name</small>

                    <strong>{vendor.business_name}</strong>
                  </div>

                  <div>
                    <small>Account created</small>

                    <strong>
                      {vendor.created_at
                        ? new Date(
                            vendor.created_at
                          ).toLocaleDateString("en-NG")
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="dashboard-settings-note">
                  <AlertCircle size={18} />

                  <span>
                    Profile editing and password management will
                    be added in a later step.
                  </span>
                </div>

                <button
                  type="button"
                  className="dashboard-secondary-button dashboard-settings-logout"
                  onClick={handleLogout}
                  disabled={signingOut}
                >
                  <LogOut size={16} />

                  {signingOut ? "Logging out..." : "Log out"}
                </button>
              </section>
            )}

          </Suspense>
        </div>
      </main>
    </div>
  );
}
