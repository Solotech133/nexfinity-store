
import {
  Check,
  Sparkles,
  Crown,
  Rocket,
  Bot,
} from "lucide-react";

import "./Pricing.css";

const plans = [
  {
    name: "Free",
    subtitle: "Explore online selling and get your business started.",
    price: "₦0",
    period: "Free plan",
    icon: Rocket,
    featured: false,
    features: [
      "Personal online storefront",
      "Up to 10 product uploads",
      "Unique store link",
      "Downloadable QR code",
      "WhatsApp ordering",
      "Mobile-friendly store",
      "Basic store management",
    ],
    button: "Get started free",
    plan: "free",
  },
  {
    name: "Growth",
    subtitle: "Everything you need to grow your online presence.",
    price: "₦1,000",
    period: "Per month",
    icon: Sparkles,
    featured: true,
    features: [
      "Everything in Free",
      "Up to 200 product uploads",
      "Nexfy AI Product Assistant",
      "Unique store link and QR code",
      "Enhanced product presentation",
      "More store customisation",
      "Improved store management",
    ],
    button: "Choose Growth",
    plan: "growth",
  },
  {
    name: "Business",
    subtitle: "More freedom and tools for ambitious businesses.",
    price: "₦5,000",
    period: "Per year",
    icon: Crown,
    featured: false,
    features: [
      "Everything in Starter",
      "Unlimited product uploads",
      "Nexfy AI Product Assistant",
      "Unique store link and QR code",
      "Premium storefront customisation",
      "Advanced product presentation",
      "Priority support",
    ],
    button: "Choose Business",
    plan: "business",
  },
];

export default function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">

        <div className="pricing-heading">
          <span className="pricing-eyebrow">
            SIMPLE PLANS. BIGGER POSSIBILITIES.
          </span>

          <h2>
            Choose how you want
            <span> to grow your business.</span>
          </h2>

          <p>
            Start for free, upgrade when you're ready,
            and get the tools you need to sell more online.
          </p>
        </div>

        {/* NEXFY AI ASSISTANT */}

        <div className="pricing-ai-note">
          <div className="pricing-ai-icon">
            <Bot size={25} strokeWidth={1.7} />
          </div>

          <div className="pricing-ai-content">
            <span className="pricing-ai-label">
              YOUR SMART STORE ASSISTANT
            </span>

            <strong>
              Meet Nexfy, your AI Product Assistant.
            </strong>

            <p>
              Turn simple product details into attractive product
              descriptions in seconds. Nexfy helps you present your
              products professionally and make your store more
              appealing to customers.
            </p>
          </div>
        </div>

        {/* PRICING PLANS */}

        <div className="pricing-grid">
          {plans.map((plan) => {
            const Icon = plan.icon;

            return (
              <article
                className={`pricing-card ${
                  plan.featured ? "pricing-featured" : ""
                }`}
                key={plan.name}
              >
                {plan.featured && (
                  <span className="pricing-popular">
                    MOST POPULAR
                  </span>
                )}

                <div className="pricing-card-top">
                  <div className="pricing-icon">
                    <Icon size={23} strokeWidth={1.7} />
                  </div>

                  <h3>{plan.name}</h3>
                  <p>{plan.subtitle}</p>
                </div>

                <div className="pricing-price">
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </div>

                <div className="pricing-divider" />

                <div className="pricing-features">
                  <span className="pricing-features-title">
                    WHAT'S INCLUDED
                  </span>

                  {plan.features.map((feature) => (
                    <div
                      className="pricing-feature"
                      key={feature}
                    >
                      <span className="pricing-check">
                        <Check size={13} strokeWidth={2.5} />
                      </span>

                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <a
                  href={`/register?plan=${plan.plan}`}
                  className={`pricing-button ${
                    plan.featured
                      ? "pricing-button-featured"
                      : ""
                  }`}
                >
                  {plan.button}
                </a>

                {plan.plan !== "free" && (
                  <span className="pricing-payment-note">
                    Bank transfer · Admin approval required
                  </span>
                )}
              </article>
            );
          })}
        </div>

        {/* BOTTOM MESSAGE */}

        <div className="pricing-bottom">
          <div>
            <strong>
              Your business deserves a better online presence.
            </strong>

            <p>
              Start with Free and upgrade whenever your business
              is ready.
            </p>
          </div>

          <span className="pricing-bottom-note">
            One store. One unique link. More opportunities.
          </span>
        </div>

      </div>
    </section>
  );
}
