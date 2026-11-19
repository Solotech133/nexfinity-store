
import {
  MapPin,
  ShoppingBag,
  ArrowUpRight,
  Mail,
  Globe,
} from "lucide-react";

import "./StoreFooter.css";

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.1 3.9A11.4 11.4 0 0 0 2.15 17.65L.7 23.1l5.58-1.46A11.4 11.4 0 0 0 20.1 3.9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.1 7.3c-.3-.65-.62-.66-.91-.67h-.77c-.27 0-.7.1-1.06.5-.36.4-1.4 1.37-1.4 3.34s1.44 3.88 1.64 4.15c.2.27 2.78 4.45 6.87 6.06 3.4 1.34 4.1 1.07 4.84 1 .74-.07 2.39-.98 2.73-1.93.34-.95.34-1.77.24-1.94-.1-.17-.37-.27-.78-.47-.4-.2-2.39-1.18-2.76-1.31-.37-.14-.64-.2-.91.2-.27.4-1.05 1.31-1.29 1.58-.24.27-.47.3-.88.1-.4-.2-1.71-.63-3.26-2-1.2-1.07-2.01-2.4-2.25-2.8-.23-.4-.02-.62.18-.82.18-.18.4-.47.6-.7.2-.24.27-.41.4-.68.14-.27.07-.51-.03-.71-.1-.2-.9-2.18-1.23-2.98Z"
        fill="currentColor"
        transform="translate(1 0) scale(.88)"
      />
    </svg>
  );
}

export default function StoreFooter({
  variant = "vendor",
  store = null,
}) {
  const isHome = variant === "home";

  const phone = String(store?.phone || "").replace(/\D/g, "");

  let whatsappNumber = phone;

  if (whatsappNumber.startsWith("2340")) {
    whatsappNumber = `234${whatsappNumber.slice(4)}`;
  } else if (whatsappNumber.startsWith("0")) {
    whatsappNumber = `234${whatsappNumber.slice(1)}`;
  } else if (whatsappNumber.length === 10) {
    whatsappNumber = `234${whatsappNumber}`;
  }

  const whatsappLink =
    whatsappNumber.length >= 12
      ? `https://wa.me/${whatsappNumber}`
      : null;

  const storeName =
    store?.store_name || store?.business_name || "Our Store";

  const location = [
    store?.business_address,
    store?.city,
    store?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="premium-store-footer">
      <div className="premium-footer-main">

        {/* BRAND */}
        <div className="premium-footer-brand">
          <div className="premium-footer-logo">
            <ShoppingBag size={22} />
          </div>

          <h2>
            {isHome ? "Nexfinity Store" : storeName}
          </h2>

          <p>
            {isHome
              ? "Everything your business needs to sell online. Create your digital storefront, showcase your products and connect with customers."
              : store?.business_description ||
                "Discover quality products and enjoy a seamless shopping experience with us."}
          </p>

          {isHome ? (
            <a
              href="https://nexfinity.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="premium-footer-home-link"
            >
              <Globe size={15} />
              Visit Nexfinity
              <ArrowUpRight size={13} />
            </a>
          ) : (
            location && (
              <div className="premium-footer-location">
                <MapPin size={16} />
                <span>{location}</span>
              </div>
            )
          )}
        </div>

        {/* LINKS */}
        <div className="premium-footer-links">
          <h3>{isHome ? "STORE" : "EXPLORE"}</h3>

          {isHome ? (
            <>
              <a href="/#features">Features</a>
              <a href="/#how-it-works">How It Works</a>
              <a href="/#pricing">Pricing</a>
              <a href="/register">Create Your Store</a>
              <a href="/login">Vendor Login</a>
            </>
          ) : (
            <>
              <a href="#store-top">Home</a>
              <a href="#products">Shop Products</a>
              <a href="#featured">Featured Products</a>
            </>
          )}
        </div>

        {/* CONTACT */}
        <div className="premium-footer-contact">
          <h3>
            {isHome ? "GET IN TOUCH" : "NEED ASSISTANCE?"}
          </h3>

          <p>
            {isHome
              ? "Have questions about Nexfinity Store? Get in touch with our team."
              : "Have a question about a product or need help with an order? We're just a message away."}
          </p>

          {isHome ? (
            <>
              <a
                href="mailto:nexfinity97@gmail.com"
                className="premium-footer-whatsapp"
              >
                <Mail size={16} />
                Email Nexfinity
                <ArrowUpRight size={15} />
              </a>

              <a
                href="https://www.instagram.com/nexf_inity/"
                target="_blank"
                rel="noopener noreferrer"
                className="premium-footer-social"
              >
                Follow Nexfinity on Instagram
              </a>
            </>
          ) : whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-footer-whatsapp"
            >
              <WhatsAppIcon size={18} />
              Chat on WhatsApp
            </a>
          ) : (
            <p className="premium-footer-no-contact">
              Contact information currently unavailable.
            </p>
          )}
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="premium-footer-bottom">
        <p>
          © {new Date().getFullYear()}{" "}
          {isHome ? "Nexfinity Store" : storeName}.
          {" "}All rights reserved.
        </p>

        {!isHome && (
          <a
            href="https://nexfinity.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="premium-footer-powered"
          >
            <span>A product of</span>
            <strong>NEXFINITY</strong>
            <ArrowUpRight size={13} />
          </a>
        )}
      </div>

      <div className="premium-footer-signature">
        <span>POWERED BY</span>
        <strong>NEXFINITY STORE</strong>
      </div>
    </footer>
  );
}
