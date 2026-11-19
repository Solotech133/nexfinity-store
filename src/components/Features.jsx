
import {
  Store,
  Package,
  MessageCircle,
  Smartphone,
  Link,
  LayoutDashboard,
} from "lucide-react";

import "./Features.css";

const features = [
  {
    number: "01",
    icon: Store,
    title: "Your own online storefront",
    description:
      "Give your business a dedicated online space that showcases your brand, products and identity.",
    className: "feature-large",
  },
  {
    number: "02",
    icon: Package,
    title: "Easy product management",
    description:
      "Add products, update prices and keep your product collection organised in one place.",
    className: "",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "WhatsApp ordering",
    description:
      "Make it easier for customers to contact your business and place orders directly through WhatsApp.",
    className: "",
  },
  {
    number: "04",
    icon: Smartphone,
    title: "Mobile-friendly shopping",
    description:
      "Give customers a smooth shopping experience on smartphones, tablets and desktop screens.",
    className: "",
  },
  {
    number: "05",
    icon: Link,
    title: "One link. More reach.",
    description:
      "Share your store link on WhatsApp, Instagram, Facebook and anywhere your customers find you.",
    className: "",
  },
  {
    number: "06",
    icon: LayoutDashboard,
    title: "Simple store management",
    description:
      "Manage your online shop from one organised dashboard without needing technical skills.",
    className: "feature-large",
  },
];

export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="features-container">

        <div className="features-heading">
          <span className="features-eyebrow">
            EVERYTHING YOUR BUSINESS NEEDS
          </span>

          <h2>
            Simple tools.
            <br />
            <span>More ways to grow.</span>
          </h2>

          <p>
            Everything comes together to help you present your
            business professionally, reach more people and make
            buying from you easier.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                className={`feature-card ${feature.className}`}
                key={feature.number}
              >
                <div className="feature-card-top">
                  <div className="feature-icon">
                    <Icon size={23} strokeWidth={1.8} />
                  </div>

                  <span className="feature-number">
                    {feature.number}
                  </span>
                </div>

                <div className="feature-card-content">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="features-bottom">
          <div>
            <span className="features-bottom-label">
              MADE FOR AMBITIOUS BUSINESSES
            </span>

            <h3>
              Your next customer could be
              <span> one click away.</span>
            </h3>
          </div>

          <a href="/register" className="features-cta">
            Start building your store
          </a>
        </div>

      </div>
    </section>
  );
}
