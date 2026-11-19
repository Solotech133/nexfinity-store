
import { useState } from "react";
import {
  Sparkles,
  FileText,
  Megaphone,
  MessageCircle,
  Copy,
  Check,
  LoaderCircle,
  RefreshCw,
  LockKeyhole,
  WandSparkles,
  ArrowRight,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./NexfyAI.css";

const aiTools = [
  {
    id: "product_description",
    title: "Product description",
    description: "Turn product details into clear, attractive descriptions.",
    icon: FileText,
    placeholder:
      "Example: Handmade leather office bag, brown, fits a 15-inch laptop, durable zip and adjustable strap.",
    button: "Write description",
  },
  {
    id: "marketing_caption",
    title: "Marketing caption",
    description: "Create captions for WhatsApp, Instagram and Facebook.",
    icon: Megaphone,
    placeholder:
      "Example: I sell handmade leather bags for professionals. Write a caption introducing my new brown laptop bag.",
    button: "Create caption",
  },
  {
    id: "customer_reply",
    title: "Customer reply",
    description: "Write helpful and professional replies to customers.",
    icon: MessageCircle,
    placeholder:
      "Example: Customer says, 'Your product is too expensive.' Help me reply politely.",
    button: "Write reply",
  },
];

export default function NexfyAI({ vendor }) {
  const [selectedTool, setSelectedTool] = useState(aiTools[0]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const plan = String(vendor?.plan || "starter")
    .toLowerCase()
    .replace(/\s+plan$/, "")
    .trim();

  const isEligiblePlan = ["growth", "business"].includes(
    plan === "free" ? "starter" : plan
  );

  const isSubscriptionActive =
    vendor?.approval_status === "approved" &&
    vendor?.subscription_status === "active" &&
    vendor?.payment_status === "approved" &&
    vendor?.subscription_expires_at &&
    new Date(vendor.subscription_expires_at).getTime() > Date.now();

  const canUseAI = isEligiblePlan && isSubscriptionActive;

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!input.trim()) {
      setError("Please enter some information first.");
      return;
    }

    if (input.trim().length > 4000) {
      setError("Please keep your input below 4,000 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("nexfy-ai", {
          body: {
            tool: selectedTool.id,
            input: input.trim(),
          },
        });

      if (functionError) {
        let message = functionError.message;

        try {
          const response = functionError.context;
          if (response && typeof response.json === "function") {
            const details = await response.json();
            if (details?.error) message = details.error;
          }
        } catch {
          // Use the original function error message.
        }

        throw new Error(
          message || "Nexfy AI could not complete your request."
        );
      }

      if (!data?.success || !data?.result) {
        throw new Error(
          data?.error || "Nexfy AI returned an empty response."
        );
      }

      setResult(data.result);
    } catch (err) {
      console.error("Nexfy AI request failed:", err);

      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Unable to copy automatically. Please select and copy the response."
      );
    }
  };

  const handleReset = () => {
    setInput("");
    setResult("");
    setError("");
    setCopied(false);
  };

  if (!canUseAI) {
    return (
      <section className="nexfy-page">
        <div className="nexfy-hero">
          <div className="nexfy-hero-icon">
            <Sparkles size={26} />
          </div>

          <div>
            <span className="nexfy-eyebrow">YOUR BUSINESS AI ASSISTANT</span>
            <h2>Meet Nexfy AI</h2>
            <p>
              Create product descriptions, marketing captions and
              customer replies with the help of AI.
            </p>
          </div>
        </div>

        <div className="nexfy-locked-card">
          <span className="nexfy-lock-icon">
            <LockKeyhole size={25} />
          </span>

          <h3>Nexfy AI is available on Growth and Business</h3>

          <p>
            Upgrade to an active Growth or Business subscription
            to use your AI business assistant.
          </p>

          <div className="nexfy-plan-options">
            <div>
              <strong>Growth</strong>
              <span>₦1,000 / month</span>
            </div>

            <div>
              <strong>Business</strong>
              <span>₦5,000 / year</span>
            </div>
          </div>

          <p className="nexfy-locked-note">
            You can upgrade or check your payment status from the
            My Plan section of your dashboard.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="nexfy-page">
      <div className="nexfy-hero">
        <div className="nexfy-hero-icon">
          <Sparkles size={26} />
        </div>

        <div>
          <span className="nexfy-eyebrow">
            YOUR BUSINESS AI ASSISTANT
          </span>

          <h2>Meet Nexfy AI</h2>

          <p>
            What would you like to create today? Give Nexfy a few
            details and let it help you get started.
          </p>
        </div>

        <span className="nexfy-plan-badge">
          {plan === "business" ? "Business" : "Growth"} plan
        </span>
      </div>

      <div className="nexfy-workspace">
        <div className="nexfy-tool-panel">
          <div className="nexfy-section-heading">
            <span className="nexfy-eyebrow">CHOOSE A TOOL</span>
            <h3>What do you need help with?</h3>
          </div>

          <div className="nexfy-tool-list">
            {aiTools.map((tool) => {
              const Icon = tool.icon;
              const active = selectedTool.id === tool.id;

              return (
                <button
                  type="button"
                  key={tool.id}
                  className={`nexfy-tool-option ${
                    active ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedTool(tool);
                    setResult("");
                    setError("");
                    setCopied(false);
                  }}
                >
                  <span className="nexfy-tool-icon">
                    <Icon size={20} />
                  </span>

                  <span className="nexfy-tool-copy">
                    <strong>{tool.title}</strong>
                    <small>{tool.description}</small>
                  </span>

                  {active && <Check size={18} />}
                </button>
              );
            })}
          </div>

          <div className="nexfy-business-context">
            <span className="nexfy-context-icon">
              <WandSparkles size={18} />
            </span>

            <div>
              <strong>Personalised for your business</strong>
              <p>
                Nexfy uses your business name, category and description
                to make its responses more relevant.
              </p>
            </div>
          </div>
        </div>

        <div className="nexfy-generator-panel">
          <div className="nexfy-section-heading">
            <span className="nexfy-eyebrow">CREATE WITH NEXFY</span>
            <h3>{selectedTool.title}</h3>
            <p>{selectedTool.description}</p>
          </div>

          <form onSubmit={handleGenerate}>
            <label htmlFor="nexfy-input">
              Give Nexfy the details
            </label>

            <textarea
              id="nexfy-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={selectedTool.placeholder}
              rows={7}
              maxLength={4000}
              disabled={loading}
            />

            <div className="nexfy-input-footer">
              <span>{input.length}/4000 characters</span>

              <button
                type="submit"
                className="nexfy-generate-button"
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} className="nexfy-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    {selectedTool.button}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="nexfy-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="nexfy-loading">
              <LoaderCircle size={22} className="nexfy-spin" />
              <div>
                <strong>Nexfy is working on it...</strong>
                <span>This usually takes a few moments.</span>
              </div>
            </div>
          )}

          {result && (
            <div className="nexfy-result">
              <div className="nexfy-result-heading">
                <div>
                  <span className="nexfy-eyebrow">YOUR AI RESULT</span>
                  <h3>Ready for you</h3>
                </div>

                <button
                  type="button"
                  className="nexfy-copy-button"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="nexfy-result-content">
                {result}
              </div>

              <div className="nexfy-result-footer">
                <span>Review the response before sharing it with customers.</span>

                <button
                  type="button"
                  onClick={handleReset}
                  className="nexfy-reset-button"
                >
                  <RefreshCw size={15} />
                  Start again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
