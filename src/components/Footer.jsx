
import { Link } from "react-router-dom";
import { useState } from "react";
import "./Footer.css";

export default function Footer() {
  const [currentYear] = useState(() => new Date().getFullYear());

  return (
    <footer className="site-footer">
      <div className="footer-main">

        {/* Brand */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-mark"></span>
            Nexfinity store
          </Link>

          <p>
            Your business deserves more. Create your own
            beautiful online store, showcase your products
            and receive orders directly through WhatsApp.
          </p>

          <Link to="/register" className="footer-cta">
            Create your store
          </Link>
        </div>

        {/* Explore */}
        <div className="footer-column">
          <h3>EXPLORE</h3>
          <Link to="/">Home</Link>
          <a href="/#how-it-works">How it works</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
        </div>

        {/* Businesses */}
        <div className="footer-column">
          <h3>FOR BUSINESSES</h3>
          <Link to="/register">Create your store</Link>
          <Link to="/login">Vendor login</Link>
          <Link to="/register">Start selling</Link>
        </div>

        {/* Support */}
        <div className="footer-column">
          <h3>SUPPORT</h3>
          <a href="/#how-it-works">Getting started</a>
          <a href="/#features">Store features</a>
          <Link to="/contact">Contact us</Link>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="footer-bottom">
        <p>
          © {currentYear} Nexfinity Store
          All rights reserved.
        </p>

        <div className="footer-bottom-links">
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of service</Link>
        </div>
      </div>

      {/* Decorative brand text */}
      <div className="footer-decoration">
        <span>NEXFINITY</span>
      </div>
    </footer>
  );
}
