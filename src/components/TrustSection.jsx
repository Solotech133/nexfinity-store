
import {
  Store,
  Smartphone,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";

import "./TrustSection.css";

const benefits = [
  {
    icon: Store,
    title: "Your own online store",
    description:
      "Give your business a professional space where customers can discover your products.",
    highlight: "A storefront that reflects your brand",
  },
  {
    icon: Smartphone,
    title: "Built around WhatsApp",
    description:
      "Let customers place orders and connect with you through a platform they already use.",
    highlight: "Connect directly with customers",
  },
  {
    icon: ShoppingBag,
    title: "Made for growing businesses",
    description:
      "Organise your products, showcase your brand and make shopping easier for your customers.",
    highlight: "Everything organised in one place",
  },
];

export default function TrustSection() {
  return (
    <section className="trust-section">
      <div className="trust-container">

        <div className="trust-intro">
          <span className="trust-eyebrow">
            SMART TOOLS FOR AMBITIOUS BUSINESSES
          </span>

          <h2>
            Everything your business needs
            <span> to sell online.</span>
          </h2>

          <p>
            You focus on running your business. Nexfinity MiniStore
            gives you the tools to showcase your products and receive
            orders with ease.
          </p>
        </div>

        <div className="trust-benefits">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <article className="trust-card" key={benefit.title}>
                <div className="trust-card-top">
                  <span className="trust-number">
                    0{index + 1}
                  </span>

                  <div className="trust-icon">
                    <Icon size={23} strokeWidth={1.7} />
                  </div>
                </div>

                <h3>{benefit.title}</h3>

                <p>{benefit.description}</p>

                <span className="trust-card-check">
                  <CheckCircle2 size={15} />
                  {benefit.highlight}
                </span>
              </article>
            );
          })}
        </div>

        <div className="trust-bottom">
          <p>
            Your business deserves a better way to sell.
            <strong> Let's make it happen.</strong>
          </p>
        </div>

      </div>
    </section>
  );
}
