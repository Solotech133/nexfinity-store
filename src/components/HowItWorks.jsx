
import {
  Store,
  PackagePlus,
  MessageCircle,
} from "lucide-react";

import "./HowItWorks.css";

const steps = [
  {
    number: "01",
    icon: Store,
    title: "Create your store",
    description:
      "Set up your business profile, choose your store name and give your brand a professional online presence.",
    label: "YOUR DIGITAL STORE",
  },
  {
    number: "02",
    icon: PackagePlus,
    title: "Add your products",
    description:
      "Upload product photos, add descriptions and prices, and organise everything in one beautiful storefront.",
    label: "YOUR PRODUCT COLLECTION",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Start receiving orders",
    description:
      "Share your store link with customers and let them send their orders directly to your WhatsApp.",
    label: "YOUR NEXT CUSTOMER",
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="how-container">

        <div className="how-heading">
          <div className="how-heading-left">
            <span className="how-eyebrow">
              GET STARTED IN THREE SIMPLE STEPS
            </span>

            <h2>
              From business owner
              <br />
              <span>to online seller.</span>
            </h2>
          </div>

          <p>
            No complicated setup. No technical experience.
            Just a simpler way to take your business online
            and connect with more customers.
          </p>
        </div>

        <div className="how-steps">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article className="how-card" key={step.number}>
                <div className="how-card-top">
                  <span className="how-number">{step.number}</span>

                  <div className="how-icon">
                    <Icon size={25} strokeWidth={1.7} />
                  </div>
                </div>

                <div className="how-illustration">
                  <div className="how-illustration-circle">
                    <Icon size={45} strokeWidth={1.25} />
                  </div>

                  <span className="how-illustration-label">
                    {step.label}
                  </span>

                  <span className="how-decoration-dot" />
                </div>

                <div className="how-card-content">
                  <h3>{step.title}</h3>

                  <p>{step.description}</p>
                </div>

                <div className="how-card-footer">
                  <span>STEP {index + 1}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="how-bottom">
          <div className="how-bottom-text">
            <p>
              Your online store is closer than you think.
              <strong> Start building today.</strong>
            </p>
          </div>

          <a href="/register" className="how-cta">
            Create your store
          </a>
        </div>

      </div>
    </section>
  );
}
