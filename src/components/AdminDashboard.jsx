
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Store, LoaderCircle, LogOut, Users, CreditCard,
  Settings, LayoutDashboard, RefreshCw, CheckCircle2, XCircle,
  Eye, Building2, Clock3, AlertCircle, Save, ExternalLink,
  Ban, RotateCcw, Activity, UserRound, CalendarDays, Filter,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./AdminDashboard.css";

const formatMoney = (amount, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const readablePlan = (plan) => {
  if (!plan) return "Starter";

  const value = plan.toLowerCase();

  if (value === "free" || value === "starter") return "Starter";

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const statusClass = (status) => {
  const allowed = [
    "approved",
    "pending",
    "rejected",
    "active",
    "suspended",
    "expired",
  ];

  return allowed.includes(status) ? status : "pending";
};

const activityLabel = (action) => {
  const labels = {
    vendor_approved: "Vendor approved",
    vendor_rejected: "Vendor rejected",
    subscription_status_changed: "Subscription status changed",
    vendor_plan_changed: "Vendor plan changed",
    payment_approved: "Payment approved",
    payment_rejected: "Payment rejected",
  };

  if (labels[action]) return labels[action];

  return (action || "Activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const activityTypeLabel = (type) => {
  if (type === "vendor") return "Vendor";
  if (type === "subscription_payment") return "Payment";
  return type || "Other";
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");

  const [bankSettings, setBankSettings] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    transfer_instructions: "",
    is_active: false,
  });

  const [loadingData, setLoadingData] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [processingPayment, setProcessingPayment] = useState("");
  const [processingVendor, setProcessingVendor] = useState("");

  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // LOAD ADMIN DASHBOARD DATA

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      const [
        vendorsResult,
        paymentsResult,
        settingsResult,
        activityResult,
      ] = await Promise.all([
        supabase
          .from("vendors")
          .select(
            "id, email, full_name, phone, business_name, business_category, city, state, plan, requested_plan, product_limit, subscription_status, payment_status, approval_status, subscription_started_at, subscription_expires_at, created_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("subscription_payments")
          .select(
            "id, vendor_id, requested_plan, amount, currency, sender_name, payment_reference, receipt_path, status, rejection_reason, reviewed_at, created_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("payment_settings")
          .select(
            "id, bank_name, account_name, account_number, transfer_instructions, is_active"
          )
          .eq("id", 1)
          .maybeSingle(),

        supabase
          .from("admin_activity_logs")
          .select(
            "id, actor_id, actor_email, action, entity_type, entity_id, description, metadata, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (vendorsResult.error) throw vendorsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (activityResult.error) throw activityResult.error;

      const vendorRows = vendorsResult.data || [];
      const paymentRows = paymentsResult.data || [];

      const paymentsWithDetails = await Promise.all(
        paymentRows.map(async (payment) => {
          let receiptUrl = "";

          if (payment.receipt_path) {
            const { data, error: receiptError } =
              await supabase.storage
                .from("payment-receipts")
                .createSignedUrl(payment.receipt_path, 3600);

            if (!receiptError && data?.signedUrl) {
              receiptUrl = data.signedUrl;
            }
          }

          return {
            ...payment,
            receiptUrl,
            vendor: vendorRows.find(
              (vendor) => vendor.id === payment.vendor_id
            ),
          };
        })
      );

      setVendors(vendorRows);
      setPayments(paymentsWithDetails);
      setActivityLogs(activityResult.data || []);

      if (settingsResult.data) {
        setBankSettings({
          bank_name: settingsResult.data.bank_name || "",
          account_name: settingsResult.data.account_name || "",
          account_number: settingsResult.data.account_number || "",
          transfer_instructions:
            settingsResult.data.transfer_instructions || "",
          is_active: settingsResult.data.is_active === true,
        });
      } else {
        setBankSettings({
          bank_name: "",
          account_name: "",
          account_number: "",
          transfer_instructions: "",
          is_active: false,
        });
      }
    } catch (err) {
      console.error("Admin dashboard loading error:", err);
      setError(
        err.message ||
          "Unable to load administrator data. Please refresh and try again."
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  // VERIFY ADMINISTRATOR ACCESS

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          navigate("/login", { replace: true });
          return;
        }

        // Verify admin access through the secure database function.
        const {
          data: isAdmin,
          error: adminCheckError,
        } = await supabase.rpc("is_active_admin");

        if (adminCheckError) {
          throw adminCheckError;
        }

        if (isAdmin !== true) {
          navigate("/login", { replace: true });
          return;
        }

        if (!active) return;

        // The database function has confirmed administrator access.
        setAdmin({
          user_id: user.id,
          email: user.email || "Administrator",
          role: "administrator",
          is_active: true,
        });

        setChecking(false);
      } catch (err) {
        console.error("Admin verification failed:", err);

        if (active) {
          setError(
            err.message || "Administrator verification failed."
          );
          setChecking(false);
        }
      }
    };

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (admin) {
      loadDashboardData();
    }
  }, [admin, loadDashboardData]);

  // LOGOUT

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // BANK SETTINGS

  const handleBankChange = (event) => {
    const { name, value, type, checked } = event.target;

    setBankSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveBankSettings = async (event) => {
    event.preventDefault();

    setSavingBank(true);
    setError("");
    setNotice("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Your administrator session has expired. Please sign in again."
        );
      }

      // Confirm administrator privileges before saving.
      const {
        data: isAdmin,
        error: adminCheckError,
      } = await supabase.rpc("is_active_admin");

      if (adminCheckError) {
        throw adminCheckError;
      }

      if (isAdmin !== true) {
        throw new Error(
          "Your account does not have permission to manage bank settings."
        );
      }

      const bankName = bankSettings.bank_name.trim();
      const accountName = bankSettings.account_name.trim();
      const accountNumber = bankSettings.account_number.trim();
      const instructions =
        bankSettings.transfer_instructions.trim();

      if (
        bankSettings.is_active &&
        (!bankName || !accountName || !accountNumber)
      ) {
        throw new Error(
          "Enter the bank name, account name and account number before activating these details."
        );
      }

      const bankPayload = {
        id: 1,
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        transfer_instructions: instructions,
        is_active: bankSettings.is_active,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("payment_settings")
        .upsert(bankPayload, {
          onConflict: "id",
        });

      if (saveError) {
        console.error("Payment settings database error:", saveError);
        throw saveError;
      }

      setNotice("Bank settings saved successfully.");
      await loadDashboardData();
    } catch (err) {
      console.error("Bank settings error:", err);
      setError(
        err.message || "Unable to save bank settings."
      );
    } finally {
      setSavingBank(false);
    }
  };

  // VENDOR MANAGEMENT

  const manageVendor = async (vendor, action) => {
    const actionDetails = {
      approve: {
        rpc: "admin_approve_vendor",
        title: "Approve this vendor?",
        message: "This vendor will be approved to use the platform.",
        success: "Vendor approved successfully.",
      },
      reject: {
        rpc: "admin_reject_vendor",
        title: "Reject this vendor?",
        message: "This vendor registration will be rejected.",
        success: "Vendor registration rejected.",
      },
      suspend: {
        rpc: "admin_suspend_vendor",
        title: "Suspend this vendor?",
        message: "This vendor's active subscription will be suspended.",
        success: "Vendor suspended successfully.",
      },
      reactivate: {
        rpc: "admin_reactivate_vendor",
        title: "Reactivate this vendor?",
        message:
          "The vendor will be reactivated only if their subscription is still valid.",
        success: "Vendor account status updated successfully.",
      },
    };

    const selectedAction = actionDetails[action];

    if (!selectedAction) return;

    const confirmed = window.confirm(
      `${selectedAction.title}\n\n${selectedAction.message}`
    );

    if (!confirmed) return;

    setProcessingVendor(vendor.id);
    setError("");
    setNotice("");

    try {
      const { error: actionError } = await supabase.rpc(
        selectedAction.rpc,
        { p_vendor_id: vendor.id }
      );

      if (actionError) throw actionError;

      setNotice(selectedAction.success);

      await loadDashboardData();
    } catch (err) {
      console.error(`Vendor ${action} error:`, err);
      setError(err.message || `Unable to ${action} vendor.`);
    } finally {
      setProcessingVendor("");
    }
  };

  // PAYMENT MANAGEMENT

  const approvePayment = async (paymentId, receiptUrl) => {
    if (!receiptUrl) {
      setError(
        "This payment has no accessible receipt. Inspect the submission before approving it."
      );
      return;
    }

    const confirmed = window.confirm(
      "Have you inspected this receipt and confirmed the transfer? Approve this payment and activate the vendor's subscription?"
    );

    if (!confirmed) return;

    setProcessingPayment(paymentId);
    setError("");
    setNotice("");

    try {
      const { error: approvalError } = await supabase.rpc(
        "approve_subscription_payment",
        { p_payment_id: paymentId }
      );

      if (approvalError) throw approvalError;

      setNotice(
        "Payment approved. The vendor subscription has been updated."
      );

      await loadDashboardData();
    } catch (err) {
      console.error("Payment approval error:", err);
      setError(err.message || "Payment approval failed.");
    } finally {
      setProcessingPayment("");
    }
  };

  const rejectPayment = async (event) => {
    event.preventDefault();

    if (!rejectingPayment) return;

    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejecting this payment.");
      return;
    }

    setProcessingPayment(rejectingPayment);
    setError("");
    setNotice("");

    try {
      const { error: rejectionError } = await supabase.rpc(
        "reject_subscription_payment",
        {
          p_payment_id: rejectingPayment,
          p_reason: rejectionReason.trim(),
        }
      );

      if (rejectionError) throw rejectionError;

      setRejectingPayment(null);
      setRejectionReason("");

      setNotice("Payment rejected successfully.");

      await loadDashboardData();
    } catch (err) {
      console.error("Payment rejection error:", err);
      setError(err.message || "Payment rejection failed.");
    } finally {
      setProcessingPayment("");
    }
  };

  // DASHBOARD STATISTICS

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  );

  const pendingVendors = vendors.filter(
    (vendor) => vendor.approval_status === "pending"
  );

  const activeSubscriptions = vendors.filter(
    (vendor) =>
      ["growth", "business"].includes(
        (vendor.plan || "").toLowerCase()
      ) && vendor.subscription_status === "active"
  );

  const filteredActivityLogs = useMemo(() => {
    if (activityFilter === "vendors") {
      return activityLogs.filter(
        (log) => log.entity_type === "vendor"
      );
    }

    if (activityFilter === "payments") {
      return activityLogs.filter(
        (log) => log.entity_type === "subscription_payment"
      );
    }

    return activityLogs;
  }, [activityLogs, activityFilter]);

  const updateTab = (tab) => {
    setActiveTab(tab);
    setNotice("");
    setError("");
  };

  // AUTHENTICATION SCREENS

  if (checking) {
    return (
      <main className="admin-auth-screen">
        <div className="admin-auth-card">
          <LoaderCircle className="admin-spinner" size={34} />
          <h2>Verifying administrator access</h2>
          <p>Please wait while we secure your workspace.</p>
        </div>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="admin-auth-screen">
        <div className="admin-auth-card">
          <ShieldCheck size={35} />
          <h2>Administrator access required</h2>
          <p>
            {error ||
              "Please sign in with an active administrator account."}
          </p>
          <button onClick={() => navigate("/login")}>
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  // ADMIN DASHBOARD

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">
            <Store size={22} />
          </span>

          <div>
            <strong>NEXFINITY</strong>
            <span>MINISTORE ADMIN</span>
          </div>
        </div>

        <div className="admin-nav-label">WORKSPACE</div>

        <nav className="admin-navigation">
          <button
            className={`admin-nav-item ${
              activeTab === "overview" ? "active" : ""
            }`}
            onClick={() => updateTab("overview")}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeTab === "vendors" ? "active" : ""
            }`}
            onClick={() => updateTab("vendors")}
          >
            <Users size={18} />
            <span>Vendors</span>
            {pendingVendors.length > 0 && (
              <span className="admin-nav-count">
                {pendingVendors.length}
              </span>
            )}
          </button>

          <button
            className={`admin-nav-item ${
              activeTab === "payments" ? "active" : ""
            }`}
            onClick={() => updateTab("payments")}
          >
            <CreditCard size={18} />
            <span>Payments</span>
            {pendingPayments.length > 0 && (
              <span className="admin-nav-count">
                {pendingPayments.length}
              </span>
            )}
          </button>

          <button
            className={`admin-nav-item ${
              activeTab === "activity" ? "active" : ""
            }`}
            onClick={() => updateTab("activity")}
          >
            <Activity size={18} />
            <span>Activity Logs</span>
            {activityLogs.length > 0 && (
              <span className="admin-nav-count">
                {activityLogs.length > 99 ? "99+" : activityLogs.length}
              </span>
            )}
          </button>

          <button
            className={`admin-nav-item ${
              activeTab === "bank" ? "active" : ""
            }`}
            onClick={() => updateTab("bank")}
          >
            <Settings size={18} />
            <span>Bank Settings</span>
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <ShieldCheck size={18} />
          <span>Secure administrator access</span>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar-label">
              NEXFINITY MINISTORE
            </span>
            <h2>
              {activeTab === "overview" && "Admin overview"}
              {activeTab === "vendors" && "Vendor management"}
              {activeTab === "payments" && "Payment verification"}
              {activeTab === "activity" && "Activity logs"}
              {activeTab === "bank" && "Bank settings"}
            </h2>
          </div>

          <div className="admin-user">
            <div className="admin-user-info">
              <strong>{admin.email}</strong>
              <span>
                {admin.role?.replaceAll("_", " ") || "Administrator"}
              </span>
            </div>

            <button className="admin-logout" onClick={handleLogout}>
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-toolbar">
            <div>
              <span className="admin-eyebrow">
                MANAGEMENT CONSOLE
              </span>
              <p>Manage your MiniStore platform.</p>
            </div>

            <button
              className="admin-refresh"
              onClick={loadDashboardData}
              disabled={loadingData}
            >
              <RefreshCw
                size={15}
                className={loadingData ? "admin-refresh-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div className="admin-alert admin-alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="admin-alert admin-alert-success">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
            </div>
          )}

          {loadingData && (
            <div className="admin-loading-inline">
              <LoaderCircle className="admin-spinner" size={20} />
              Loading platform data...
            </div>
          )}

          {/* OVERVIEW */}

          {!loadingData && activeTab === "overview" && (
            <>
              <section className="admin-welcome">
                <h1>Welcome to your admin workspace.</h1>
                <p>
                  Monitor vendors, subscription payments and
                  platform settings from one place.
                </p>
              </section>

              <section className="admin-stat-grid">
                <article className="admin-stat-card">
                  <span className="admin-stat-icon">
                    <Users size={22} />
                  </span>
                  <span className="admin-stat-label">Total vendors</span>
                  <strong>{vendors.length}</strong>
                  <small>Registered businesses</small>
                </article>

                <article className="admin-stat-card">
                  <span className="admin-stat-icon">
                    <Clock3 size={22} />
                  </span>
                  <span className="admin-stat-label">
                    Pending vendor approvals
                  </span>
                  <strong>{pendingVendors.length}</strong>
                  <small>Awaiting review</small>
                </article>

                <article className="admin-stat-card">
                  <span className="admin-stat-icon">
                    <CreditCard size={22} />
                  </span>
                  <span className="admin-stat-label">
                    Pending payments
                  </span>
                  <strong>{pendingPayments.length}</strong>
                  <small>Awaiting verification</small>
                </article>

                <article className="admin-stat-card">
                  <span className="admin-stat-icon">
                    <ShieldCheck size={22} />
                  </span>
                  <span className="admin-stat-label">
                    Active subscriptions
                  </span>
                  <strong>{activeSubscriptions.length}</strong>
                  <small>Active paid plans</small>
                </article>
              </section>

              <section className="admin-section-heading">
                <div>
                  <h2>Quick management</h2>
                  <p>Choose an area to manage.</p>
                </div>
              </section>

              <section className="admin-module-grid">
                <button
                  className="admin-module-card"
                  onClick={() => updateTab("vendors")}
                >
                  <div className="admin-module-icon">
                    <Users size={23} />
                  </div>
                  <h3>Vendor management</h3>
                  <p>
                    Approve registrations, manage vendor accounts
                    and monitor subscription expiry.
                  </p>
                  <span>Manage vendors →</span>
                </button>

                <button
                  className="admin-module-card"
                  onClick={() => updateTab("payments")}
                >
                  <div className="admin-module-icon">
                    <CreditCard size={23} />
                  </div>
                  <h3>Payment verification</h3>
                  <p>
                    Review bank transfers and approve or reject
                    subscription payments.
                  </p>
                  <span>
                    Review payments ({pendingPayments.length}) →
                  </span>
                </button>

                <button
                  className="admin-module-card"
                  onClick={() => updateTab("activity")}
                >
                  <div className="admin-module-icon">
                    <Activity size={23} />
                  </div>
                  <h3>Activity logs</h3>
                  <p>
                    Track administrator actions, vendor changes
                    and subscription payment decisions.
                  </p>
                  <span>View activity ({activityLogs.length}) →</span>
                </button>

                <button
                  className="admin-module-card"
                  onClick={() => updateTab("bank")}
                >
                  <div className="admin-module-icon">
                    <Settings size={23} />
                  </div>
                  <h3>Bank settings</h3>
                  <p>
                    Configure the bank account vendors use for
                    subscription payments.
                  </p>
                  <span>Manage bank details →</span>
                </button>
              </section>
            </>
          )}

          {/* VENDOR MANAGEMENT */}

          {!loadingData && activeTab === "vendors" && (
            <section className="admin-data-section">
              <div className="admin-section-heading">
                <div>
                  <h2>Registered vendors</h2>
                  <p>
                    {vendors.length} vendor accounts found.{" "}
                    {pendingVendors.length} awaiting approval.
                  </p>
                </div>
              </div>

              <div className="admin-vendor-summary">
                <div>
                  <span>All vendors</span>
                  <strong>{vendors.length}</strong>
                </div>
                <div>
                  <span>Pending approval</span>
                  <strong>{pendingVendors.length}</strong>
                </div>
                <div>
                  <span>Active accounts</span>
                  <strong>
                    {
                      vendors.filter(
                        (v) =>
                          v.approval_status === "approved" &&
                          v.subscription_status === "active"
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Suspended accounts</span>
                  <strong>
                    {
                      vendors.filter(
                        (v) => v.subscription_status === "suspended"
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Contact</th>
                      <th>Plan</th>
                      <th>Approval</th>
                      <th>Subscription</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vendors.map((vendor) => {
                      const isProcessing =
                        processingVendor === vendor.id;

                      return (
                        <tr key={vendor.id}>
                          <td>
                            <strong>
                              {vendor.business_name || "Unnamed business"}
                            </strong>
                            <small>
                              {vendor.business_category || "Category not set"}
                            </small>
                          </td>

                          <td>
                            {vendor.email || vendor.phone || "—"}
                            <small>
                              {[vendor.city, vendor.state]
                                .filter(Boolean)
                                .join(", ") || "Location not set"}
                            </small>
                          </td>

                          <td>
                            <span className="admin-plan-tag">
                              {readablePlan(vendor.plan)}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-status ${statusClass(
                                vendor.approval_status
                              )}`}
                            >
                              {vendor.approval_status || "Unknown"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-status ${statusClass(
                                vendor.subscription_status
                              )}`}
                            >
                              {vendor.subscription_status || "—"}
                            </span>
                          </td>

                          <td>
                            {formatDate(vendor.subscription_expires_at)}
                          </td>

                          <td>
                            <div className="admin-vendor-actions">
                              {vendor.approval_status === "pending" && (
                                <>
                                  <button
                                    className="admin-approve-button"
                                    onClick={() =>
                                      manageVendor(vendor, "approve")
                                    }
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? (
                                      <LoaderCircle
                                        size={14}
                                        className="admin-spinner"
                                      />
                                    ) : (
                                      <CheckCircle2 size={14} />
                                    )}
                                    Approve
                                  </button>

                                  <button
                                    className="admin-reject-button"
                                    onClick={() =>
                                      manageVendor(vendor, "reject")
                                    }
                                    disabled={isProcessing}
                                  >
                                    <XCircle size={14} />
                                    Reject
                                  </button>
                                </>
                              )}

                              {vendor.approval_status === "approved" &&
                                vendor.subscription_status === "active" && (
                                  <button
                                    className="admin-reject-button"
                                    onClick={() =>
                                      manageVendor(vendor, "suspend")
                                    }
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? (
                                      <LoaderCircle
                                        size={14}
                                        className="admin-spinner"
                                      />
                                    ) : (
                                      <Ban size={14} />
                                    )}
                                    Suspend
                                  </button>
                                )}

                              {vendor.approval_status === "approved" &&
                                vendor.subscription_status === "suspended" && (
                                  <button
                                    className="admin-approve-button"
                                    onClick={() =>
                                      manageVendor(vendor, "reactivate")
                                    }
                                    disabled={isProcessing}
                                  >
                                    {isProcessing ? (
                                      <LoaderCircle
                                        size={14}
                                        className="admin-spinner"
                                      />
                                    ) : (
                                      <RotateCcw size={14} />
                                    )}
                                    Reactivate
                                  </button>
                                )}

                              {!isProcessing &&
                                vendor.approval_status !== "pending" &&
                                !(
                                  vendor.approval_status === "approved" &&
                                  ["active", "suspended"].includes(
                                    vendor.subscription_status
                                  )
                                ) && (
                                  <span className="admin-no-action">
                                    No action available
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {vendors.length === 0 && (
                      <tr>
                        <td colSpan="7" className="admin-empty">
                          No vendor records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="admin-footnote">
                Vendor actions are protected by Supabase administrator
                functions. Paid subscriptions are not automatically
                renewed when an account is reactivated.
              </p>
            </section>
          )}

          {/* PAYMENT VERIFICATION */}

          {!loadingData && activeTab === "payments" && (
            <section className="admin-data-section">
              <div className="admin-section-heading">
                <div>
                  <h2>Subscription payments</h2>
                  <p>
                    Review submitted receipts before activating a plan.
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="admin-empty-card">
                  <CreditCard size={30} />
                  <h3>No payment submissions yet</h3>
                  <p>
                    Vendor payment submissions will appear here.
                  </p>
                </div>
              ) : (
                <div className="admin-payment-list">
                  {payments.map((payment) => (
                    <article
                      className="admin-payment-card"
                      key={payment.id}
                    >
                      <div className="admin-payment-header">
                        <div>
                          <span className="admin-payment-plan">
                            {readablePlan(payment.requested_plan)} plan
                          </span>
                          <h3>
                            {payment.vendor?.business_name ||
                              "Vendor account"}
                          </h3>
                          <small>
                            {payment.vendor?.email || payment.vendor_id}
                          </small>
                        </div>

                        <span
                          className={`admin-status ${statusClass(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </div>

                      <div className="admin-payment-details">
                        <div>
                          <span>Amount</span>
                          <strong>
                            {formatMoney(payment.amount, payment.currency)}
                          </strong>
                        </div>

                        <div>
                          <span>Sender name</span>
                          <strong>{payment.sender_name || "—"}</strong>
                        </div>

                        <div>
                          <span>Transfer reference</span>
                          <strong>
                            {payment.payment_reference || "—"}
                          </strong>
                        </div>

                        <div>
                          <span>Submitted</span>
                          <strong>{formatDate(payment.created_at)}</strong>
                        </div>
                      </div>

                      <div className="admin-payment-actions">
                        {payment.receiptUrl ? (
                          <a
                            className="admin-receipt-link"
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye size={16} />
                            View receipt
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="admin-receipt-missing">
                            Receipt unavailable
                          </span>
                        )}

                        {payment.status === "pending" && (
                          <div className="admin-review-actions">
                            <button
                              className="admin-approve-button"
                              onClick={() =>
                                approvePayment(
                                  payment.id,
                                  payment.receiptUrl
                                )
                              }
                              disabled={
                                processingPayment === payment.id ||
                                !payment.receiptUrl
                              }
                              title={
                                !payment.receiptUrl
                                  ? "Receipt must be available before approval"
                                  : "Approve payment"
                              }
                            >
                              {processingPayment === payment.id ? (
                                <LoaderCircle
                                  size={15}
                                  className="admin-spinner"
                                />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                              Approve
                            </button>

                            <button
                              className="admin-reject-button"
                              onClick={() => {
                                setRejectingPayment(payment.id);
                                setRejectionReason("");
                              }}
                              disabled={processingPayment === payment.id}
                            >
                              <XCircle size={15} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>

                      {payment.status === "rejected" &&
                        payment.rejection_reason && (
                          <div className="admin-rejection-note">
                            <strong>Rejection reason:</strong>{" "}
                            {payment.rejection_reason}
                          </div>
                        )}

                      {rejectingPayment === payment.id && (
                        <form
                          className="admin-reject-form"
                          onSubmit={rejectPayment}
                        >
                          <label htmlFor={`reason-${payment.id}`}>
                            Reason for rejecting this payment
                          </label>

                          <textarea
                            id={`reason-${payment.id}`}
                            value={rejectionReason}
                            onChange={(event) =>
                              setRejectionReason(event.target.value)
                            }
                            placeholder="Explain why this payment cannot be approved..."
                            rows={3}
                            required
                          />

                          <div>
                            <button
                              type="submit"
                              className="admin-reject-button"
                              disabled={processingPayment === payment.id}
                            >
                              Confirm rejection
                            </button>

                            <button
                              type="button"
                              className="admin-cancel-button"
                              onClick={() => {
                                setRejectingPayment(null);
                                setRejectionReason("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ACTIVITY LOGS */}

          {!loadingData && activeTab === "activity" && (
            <section className="admin-data-section">
              <div className="admin-section-heading admin-activity-heading">
                <div>
                  <h2>Administrator activity</h2>
                  <p>
                    Review important actions performed in your
                    MiniStore admin workspace.
                  </p>
                </div>

                <span className="admin-activity-total">
                  {activityLogs.length} recent records
                </span>
              </div>

              <div className="admin-activity-filters">
                <div className="admin-activity-filter-label">
                  <Filter size={16} />
                  <span>Filter activity</span>
                </div>

                <div className="admin-activity-filter-buttons">
                  <button
                    type="button"
                    className={activityFilter === "all" ? "active" : ""}
                    onClick={() => setActivityFilter("all")}
                  >
                    All activity
                  </button>

                  <button
                    type="button"
                    className={activityFilter === "vendors" ? "active" : ""}
                    onClick={() => setActivityFilter("vendors")}
                  >
                    Vendors
                  </button>

                  <button
                    type="button"
                    className={activityFilter === "payments" ? "active" : ""}
                    onClick={() => setActivityFilter("payments")}
                  >
                    Payments
                  </button>
                </div>
              </div>

              {filteredActivityLogs.length === 0 ? (
                <div className="admin-empty-card admin-activity-empty">
                  <Activity size={32} />
                  <h3>No activity records found</h3>
                  <p>
                    {activityLogs.length === 0
                      ? "Administrator actions will appear here when vendor or payment records are changed."
                      : "There are no records in this activity filter."}
                  </p>
                </div>
              ) : (
                <div className="admin-activity-list">
                  {filteredActivityLogs.map((log) => {
                    const metadata = log.metadata || {};

                    const vendorName =
                      metadata.business_name ||
                      vendors.find(
                        (vendor) =>
                          vendor.id ===
                          (metadata.vendor_id || log.entity_id)
                      )?.business_name;

                    const paymentVendor = payments.find(
                      (payment) => payment.id === log.entity_id
                    )?.vendor?.business_name;

                    const entityName =
                      log.entity_type === "subscription_payment"
                        ? paymentVendor || vendorName || "Vendor payment"
                        : vendorName || "Vendor account";

                    return (
                      <article
                        className="admin-activity-card"
                        key={log.id}
                      >
                        <div className="admin-activity-icon">
                          {log.entity_type === "vendor" ? (
                            <Store size={19} />
                          ) : (
                            <CreditCard size={19} />
                          )}
                        </div>

                        <div className="admin-activity-main">
                          <div className="admin-activity-title-row">
                            <div>
                              <span
                                className={`admin-activity-type ${
                                  log.entity_type === "vendor"
                                    ? "vendor"
                                    : "payment"
                                }`}
                              >
                                {activityTypeLabel(log.entity_type)}
                              </span>

                              <h3>{activityLabel(log.action)}</h3>
                            </div>

                            <span className="admin-activity-date">
                              <CalendarDays size={14} />
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>

                          <p className="admin-activity-description">
                            {log.description || activityLabel(log.action)}
                          </p>

                          <div className="admin-activity-meta">
                            <span>
                              <Store size={14} />
                              {entityName}
                            </span>

                            <span>
                              <UserRound size={14} />
                              {log.actor_email || "Administrator"}
                            </span>
                          </div>

                          {(metadata.old_status || metadata.new_status) && (
                            <div className="admin-activity-change">
                              {metadata.old_status && (
                                <span>
                                  Previous:{" "}
                                  <strong>{metadata.old_status}</strong>
                                </span>
                              )}

                              {metadata.new_status && (
                                <span>
                                  New:{" "}
                                  <strong>{metadata.new_status}</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {(metadata.old_plan || metadata.new_plan) && (
                            <div className="admin-activity-change">
                              {metadata.old_plan && (
                                <span>
                                  Previous plan:{" "}
                                  <strong>
                                    {readablePlan(metadata.old_plan)}
                                  </strong>
                                </span>
                              )}

                              {metadata.new_plan && (
                                <span>
                                  New:{" "}
                                  <strong>
                                    {readablePlan(metadata.new_plan)}
                                  </strong>
                                </span>
                              )}
                            </div>
                          )}

                          {metadata.amount !== undefined && (
                            <div className="admin-activity-amount">
                              Amount:{" "}
                              <strong>
                                {formatMoney(metadata.amount, "NGN")}
                              </strong>
                              {metadata.requested_plan && (
                                <span>
                                  {" "}· {readablePlan(metadata.requested_plan)} plan
                                </span>
                              )}
                            </div>
                          )}

                          {metadata.rejection_reason && (
                            <div className="admin-rejection-note">
                              <strong>Rejection reason:</strong>{" "}
                              {metadata.rejection_reason}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <p className="admin-footnote">
                Showing up to 100 of the most recent activity records.
                Older records remain stored in the database.
              </p>
            </section>
          )}

          {/* BANK SETTINGS */}

          {!loadingData && activeTab === "bank" && (
            <section className="admin-data-section">
              <div className="admin-section-heading">
                <div>
                  <h2>Subscription bank account</h2>
                  <p>
                    These details will be displayed to vendors when
                    they submit a Growth or Business payment.
                  </p>
                </div>
              </div>

              <form
                className="admin-bank-form"
                onSubmit={saveBankSettings}
              >
                <div className="admin-bank-notice">
                  <Building2 size={20} />
                  <div>
                    <strong>Bank transfer settings</strong>
                    <p>
                      Enter the official account details that should
                      receive subscription payments.
                    </p>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <label>
                    Bank name
                    <input
                      name="bank_name"
                      value={bankSettings.bank_name}
                      onChange={handleBankChange}
                      placeholder="Enter bank name"
                    />
                  </label>

                  <label>
                    Account name
                    <input
                      name="account_name"
                      value={bankSettings.account_name}
                      onChange={handleBankChange}
                      placeholder="Enter account name"
                    />
                  </label>

                  <label>
                    Account number
                    <input
                      name="account_number"
                      value={bankSettings.account_number}
                      onChange={handleBankChange}
                      placeholder="Enter account number"
                      inputMode="numeric"
                    />
                  </label>
                </div>

                <label className="admin-instructions-label">
                  Transfer instructions
                  <textarea
                    name="transfer_instructions"
                    value={bankSettings.transfer_instructions}
                    onChange={handleBankChange}
                    rows={4}
                    placeholder="Add any instructions vendors should follow when making a transfer..."
                  />
                </label>

                <label className="admin-active-toggle">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={bankSettings.is_active}
                    onChange={handleBankChange}
                  />

                  <span>
                    <strong>Activate bank details</strong>
                    <small>
                      When enabled, vendors can see these details
                      in their payment section.
                    </small>
                  </span>
                </label>

                <button
                  type="submit"
                  className="admin-save-button"
                  disabled={savingBank}
                >
                  {savingBank ? (
                    <LoaderCircle
                      size={17}
                      className="admin-spinner"
                    />
                  ) : (
                    <Save size={17} />
                  )}
                  Save bank settings
                </button>
              </form>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
