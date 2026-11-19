
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileImage,
  FileText,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./PlanPayments.css";

const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    priceLabel: "Free",
    duration: "No payment required",
    products: "10 products",
    description: "Get started with your online store.",
  },
  growth: {
    name: "Growth",
    price: 1000,
    priceLabel: "₦1,000",
    duration: "per month",
    products: "200 products",
    description: "Grow your business with more room for products.",
  },
  business: {
    name: "Business",
    price: 5000,
    priceLabel: "₦5,000",
    duration: "per year",
    products: "Unlimited products",
    description: "More room to scale your online business.",
  },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const normalizePlan = (plan) => {
  if (!plan || plan === "free") return "starter";

  return PLANS[plan] ? plan : "starter";
};

const getPlanName = (plan) => {
  return PLANS[normalizePlan(plan)].name;
};

const getStatusLabel = (status) => {
  const labels = {
    pending: "Awaiting verification",
    approved: "Approved",
    rejected: "Rejected",
    not_required: "No payment required",
  };

  return labels[status] || status || "Unknown";
};

const getInitialSelectedPlan = (vendor, paymentList = []) => {
  const pending = paymentList.find(
    (payment) => payment.status === "pending"
  );

  if (pending && PLANS[pending.requested_plan]) {
    return pending.requested_plan;
  }

  const latestRejected = paymentList.find(
    (payment) => payment.status === "rejected"
  );

  if (
    latestRejected &&
    PLANS[latestRejected.requested_plan] &&
    latestRejected.requested_plan !== "starter"
  ) {
    return latestRejected.requested_plan;
  }

  const requestedPlan = normalizePlan(vendor?.requested_plan);

  if (requestedPlan !== "starter") {
    return requestedPlan;
  }

  const activePlan = normalizePlan(vendor?.plan);

  if (activePlan !== "starter") {
    return activePlan;
  }

  return "growth";
};

export default function PlanPayments({
  vendor,
  onVendorUpdated,
}) {
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(() =>
    getInitialSelectedPlan(vendor)
  );

  const [senderName, setSenderName] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receipt, setReceipt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentPlan = normalizePlan(vendor?.plan);

  const pendingPayment = useMemo(
    () => payments.find((payment) => payment.status === "pending"),
    [payments]
  );

  const loadPaymentData = useCallback(async () => {
    if (!vendor?.id) {
      setLoading(false);
      setError("Your vendor account could not be identified.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [settingsResult, paymentsResult] = await Promise.all([
        supabase
          .from("payment_settings")
          .select(
            "bank_name, account_name, account_number, transfer_instructions, is_active"
          )
          .eq("id", 1)
          .eq("is_active", true)
          .maybeSingle(),

        supabase
          .from("subscription_payments")
          .select(
            "id, requested_plan, amount, currency, sender_name, payment_reference, receipt_path, status, rejection_reason, created_at, reviewed_at, subscription_started_at, subscription_expires_at"
          )
          .eq("vendor_id", vendor.id)
          .order("created_at", { ascending: false }),
      ]);

      if (settingsResult.error) {
        throw settingsResult.error;
      }

      if (paymentsResult.error) {
        throw paymentsResult.error;
      }

      const loadedPayments = paymentsResult.data || [];

      setPaymentSettings(settingsResult.data || null);
      setPayments(loadedPayments);

      setSelectedPlan((previousPlan) => {
        const pending = loadedPayments.find(
          (payment) => payment.status === "pending"
        );

        if (pending && PLANS[pending.requested_plan]) {
          return pending.requested_plan;
        }

        const rejected = loadedPayments.find(
          (payment) => payment.status === "rejected"
        );

        if (
          rejected &&
          PLANS[rejected.requested_plan] &&
          rejected.requested_plan !== "starter"
        ) {
          return rejected.requested_plan;
        }

        if (PLANS[previousPlan] && previousPlan !== "starter") {
          return previousPlan;
        }

        return getInitialSelectedPlan(vendor, loadedPayments);
      });
    } catch (err) {
      console.error("Payment data error:", err);

      setError(
        err.message || "Unable to load your payment information."
      );
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) {
      setReceipt(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, WEBP, or PDF receipt.");
      event.target.value = "";
      setReceipt(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your receipt must not exceed 5MB.");
      event.target.value = "";
      setReceipt(null);
      return;
    }

    setReceipt(file);
  };

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!vendor?.id) {
      setError("Your vendor account could not be identified.");
      return;
    }

    if (vendor.approval_status !== "approved") {
      setError(
        "Your store must be approved before you can submit a subscription payment."
      );
      return;
    }

    if (!paymentSettings) {
      setError(
        "Bank transfer details are not available yet. Please check again later."
      );
      return;
    }

    if (pendingPayment) {
      setError(
        "You already have a payment awaiting verification. Please wait for the admin to review it."
      );
      return;
    }

    if (!PLANS[selectedPlan] || selectedPlan === "starter") {
      setError("Please select a paid subscription plan.");
      return;
    }

    if (!senderName.trim()) {
      setError("Enter the name used to make the bank transfer.");
      return;
    }

    if (!paymentReference.trim()) {
      setError("Enter your payment transaction reference.");
      return;
    }

    if (!receipt) {
      setError("Please upload your payment receipt.");
      return;
    }

    const plan = PLANS[selectedPlan];

    const fileExtension =
      receipt.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension = fileExtension.replace(/[^a-z0-9]/g, "");

    const uniqueFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExtension}`;

    const receiptPath = `${vendor.id}/${uniqueFileName}`;

    setSubmitting(true);

    let receiptUploaded = false;

    try {
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(receiptPath, receipt, {
          cacheControl: "3600",
          upsert: false,
          contentType: receipt.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      receiptUploaded = true;

      const { error: insertError } = await supabase
        .from("subscription_payments")
        .insert({
          vendor_id: vendor.id,
          requested_plan: selectedPlan,
          amount: plan.price,
          currency: "NGN",
          sender_name: senderName.trim(),
          payment_reference: paymentReference.trim(),
          receipt_path: receiptPath,
          status: "pending",
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(
        "Your payment receipt has been submitted successfully. Your subscription will be updated after admin verification."
      );

      setSenderName("");
      setPaymentReference("");
      setReceipt(null);

      const fileInput = document.getElementById(
        "subscription-payment-receipt"
      );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadPaymentData();

      if (onVendorUpdated) {
        await onVendorUpdated();
      }
    } catch (err) {
      console.error("Payment submission error:", err);

      if (receiptUploaded) {
        const { error: cleanupError } = await supabase.storage
          .from("payment-receipts")
          .remove([receiptPath]);

        if (cleanupError) {
          console.error(
            "Receipt cleanup error:",
            cleanupError
          );
        }
      }

      if (
        err.code === "23505" ||
        err.message?.toLowerCase().includes("duplicate")
      ) {
        setError(
          "You already have a payment awaiting verification. Please wait for the current payment to be reviewed."
        );

        await loadPaymentData();
      } else {
        setError(
          err.message ||
            "We could not submit your payment. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="plan-payments-loading">
        <LoaderCircle className="spinning" size={28} />
        <p>Loading subscription information...</p>
      </div>
    );
  }

  return (
    <div className="plan-payments">
      <div className="payments-heading">
        <div>
          <span className="payments-eyebrow">SUBSCRIPTION</span>
          <h2>My Plan</h2>
          <p>
            Manage your Nexfinity MiniStore subscription and payments.
          </p>
        </div>

        <button
          type="button"
          className="payments-refresh"
          onClick={loadPaymentData}
          disabled={submitting}
          title="Refresh payment information"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="current-plan-card">
        <div className="current-plan-icon">
          <ShieldCheck size={25} />
        </div>

        <div className="current-plan-info">
          <span className="current-plan-label">CURRENT PLAN</span>
          <h3>{getPlanName(currentPlan)}</h3>
          <p>{PLANS[currentPlan]?.products || "10 products"}</p>
        </div>

        <div className="current-plan-status">
          <span
            className={`payment-status-pill ${
              vendor?.subscription_status || "active"
            }`}
          >
            {vendor?.subscription_status || "active"}
          </span>

          {vendor?.subscription_expires_at && (
            <small>
              Expires: {formatDate(vendor.subscription_expires_at)}
            </small>
          )}
        </div>
      </section>

      {vendor?.approval_status !== "approved" && (
        <div className="payment-notice warning">
          <Info size={19} />
          <div>
            <strong>Store approval required</strong>
            <p>
              Your store must be approved before you can submit a
              subscription payment.
            </p>
          </div>
        </div>
      )}

      {pendingPayment && (
        <div className="payment-notice pending">
          <Clock3 size={20} />
          <div>
            <strong>Payment awaiting verification</strong>
            <p>
              Your {getPlanName(pendingPayment.requested_plan)} payment
              of {formatCurrency(pendingPayment.amount)} is being
              reviewed. You cannot submit another payment until this
              one has been reviewed.
            </p>
          </div>
        </div>
      )}

      <section className="available-plans">
        <div className="section-heading">
          <div>
            <h3>Choose your plan</h3>
            <p>Select the subscription that works for your business.</p>
          </div>
        </div>

        <div className="subscription-plan-grid">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = currentPlan === key;
            const isSelected = selectedPlan === key;

            return (
              <article
                className={`subscription-plan-card ${
                  isSelected ? "selected" : ""
                } ${isCurrent ? "current" : ""}`}
                key={key}
              >
                {isCurrent && (
                  <span className="plan-current-label">
                    CURRENT PLAN
                  </span>
                )}

                <h4>{plan.name}</h4>

                <div className="plan-price">
                  <strong>{plan.priceLabel}</strong>
                  {plan.price > 0 && <span>{plan.duration}</span>}
                </div>

                <p className="plan-description">
                  {plan.description}
                </p>

                <div className="plan-feature">
                  <CheckCircle2 size={16} />
                  {plan.products}
                </div>

                {key === "starter" ? (
                  <div className="plan-free-note">
                    Free plan
                  </div>
                ) : (
                  <button
                    type="button"
                    className={
                      isSelected
                        ? "plan-select-button selected"
                        : "plan-select-button"
                    }
                    onClick={() => {
                      setSelectedPlan(key);
                      setError("");
                      setSuccess("");
                    }}
                    disabled={Boolean(pendingPayment) || submitting}
                  >
                    {isSelected ? "Selected" : "Choose plan"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {selectedPlan !== "starter" && (
        <section className="payment-submission-section">
          <div className="section-heading">
            <div>
              <h3>Make a bank transfer</h3>
              <p>
                Complete your transfer and submit your receipt for
                verification.
              </p>
            </div>
          </div>

          {!paymentSettings ? (
            <div className="payment-notice warning">
              <Info size={20} />
              <div>
                <strong>Bank details not configured</strong>
                <p>
                  The administrator has not added bank transfer
                  details yet. Please check again later.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bank-details-card">
                <div className="bank-details-title">
                  <CreditCard size={20} />
                  <div>
                    <h4>Official payment account</h4>
                    <p>Transfer to the account below.</p>
                  </div>
                </div>

                <div className="bank-detail-row">
                  <span>Bank name</span>
                  <strong>{paymentSettings.bank_name}</strong>
                </div>

                <div className="bank-detail-row">
                  <span>Account name</span>
                  <strong>{paymentSettings.account_name}</strong>
                </div>

                <div className="bank-detail-row">
                  <span>Account number</span>
                  <strong className="account-number">
                    {paymentSettings.account_number}
                  </strong>
                </div>

                <div className="bank-transfer-amount">
                  <span>Amount to transfer</span>
                  <strong>
                    {formatCurrency(PLANS[selectedPlan].price)}
                  </strong>
                </div>

                {paymentSettings.transfer_instructions && (
                  <div className="transfer-instructions">
                    <Info size={17} />
                    <p>{paymentSettings.transfer_instructions}</p>
                  </div>
                )}
              </div>

              <form
                className="payment-submission-form"
                onSubmit={handleSubmitPayment}
              >
                <div className="payment-form-heading">
                  <h4>Submit payment details</h4>
                  <p>
                    Enter your transfer information and attach your
                    receipt.
                  </p>
                </div>

                <div className="payment-form-grid">
                  <label className="payment-field">
                    <span>Plan selected</span>
                    <input
                      type="text"
                      value={`${PLANS[selectedPlan].name} — ${formatCurrency(
                        PLANS[selectedPlan].price
                      )}`}
                      readOnly
                    />
                  </label>

                  <label className="payment-field">
                    <span>Name of sender *</span>
                    <input
                      type="text"
                      placeholder="Name used for the transfer"
                      value={senderName}
                      onChange={(event) =>
                        setSenderName(event.target.value)
                      }
                      maxLength={120}
                      required
                    />
                  </label>

                  <label className="payment-field full-width">
                    <span>Transaction reference *</span>
                    <input
                      type="text"
                      placeholder="Enter your bank transaction reference"
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      maxLength={150}
                      required
                    />
                  </label>

                  <div className="payment-field full-width">
                    <span>Upload transfer receipt *</span>

                    <label
                      className={`receipt-upload ${
                        receipt ? "has-file" : ""
                      }`}
                      htmlFor="subscription-payment-receipt"
                    >
                      {receipt ? (
                        <>
                          {receipt.type === "application/pdf" ? (
                            <FileText size={25} />
                          ) : (
                            <FileImage size={25} />
                          )}
                          <span>
                            <strong>{receipt.name}</strong>
                            <small>
                              {(receipt.size / 1024 / 1024).toFixed(2)} MB
                            </small>
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={25} />
                          <span>
                            <strong>Click to upload receipt</strong>
                            <small>
                              JPG, PNG, WEBP or PDF · Maximum 5MB
                            </small>
                          </span>
                        </>
                      )}
                    </label>

                    <input
                      id="subscription-payment-receipt"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptChange}
                      required
                      className="receipt-file-input"
                    />
                  </div>
                </div>

                {error && (
                  <div className="payment-feedback error">
                    <XCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="payment-feedback success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-payment-button"
                  disabled={
                    submitting ||
                    Boolean(pendingPayment) ||
                    vendor?.approval_status !== "approved"
                  }
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="spinning" size={19} />
                      Submitting payment...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Submit payment for verification
                    </>
                  )}
                </button>

                <p className="payment-security-note">
                  Your receipt is stored securely and can only be
                  accessed by you and authorized administrators.
                </p>
              </form>
            </>
          )}
        </section>
      )}

      <section className="payment-history-section">
        <div className="section-heading">
          <div>
            <h3>Payment history</h3>
            <p>Track your subscription payment submissions.</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="empty-payment-history">
            <CreditCard size={27} />
            <strong>No payment history yet</strong>
            <p>
              Your submitted subscription payments will appear here.
            </p>
          </div>
        ) : (
          <div className="payment-history-list">
            {payments.map((payment) => (
              <article className="payment-history-item" key={payment.id}>
                <div className="payment-history-icon">
                  {payment.status === "approved" ? (
                    <CheckCircle2 size={21} />
                  ) : payment.status === "rejected" ? (
                    <XCircle size={21} />
                  ) : (
                    <Clock3 size={21} />
                  )}
                </div>

                <div className="payment-history-main">
                  <strong>
                    {getPlanName(payment.requested_plan)} subscription
                  </strong>

                  <span>
                    {formatCurrency(payment.amount)} ·{" "}
                    {formatDate(payment.created_at)}
                  </span>

                  {payment.payment_reference && (
                    <small>
                      Reference: {payment.payment_reference}
                    </small>
                  )}

                  {payment.rejection_reason && (
                    <p className="payment-rejection-reason">
                      Reason: {payment.rejection_reason}
                    </p>
                  )}

                  {payment.status === "approved" &&
                    payment.subscription_expires_at && (
                      <small>
                        Subscription expires:{" "}
                        {formatDate(payment.subscription_expires_at)}
                      </small>
                    )}
                </div>

                <span
                  className={`payment-status-pill ${payment.status}`}
                >
                  {getStatusLabel(payment.status)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}