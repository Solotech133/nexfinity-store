
import { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

export default function Header({ variant = "full" }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const isFull = variant === "full";
  const isMinimal = variant === "minimal";
  const isStorefront = variant === "storefront";
  const isLogoOnly = variant === "logo-only";

  const headerClass = [
    "site-header",
    `site-header-${variant}`,
  ].join(" ");

  return (
    <header className={headerClass}>
      <div className="header-container">

        {/* NEXFINITY STORE LOGO */}
        <Link
          to="/"
          className="header-logo"
          onClick={closeMenu}
          aria-label="Nexfinity Store home"
        >
          <img
            src="/images/logo.png"
            alt="Nexfinity"
            className="header-logo-image"
          />

          <span className="header-logo-subtitle">
            STORE
          </span>
        </Link>

        {/* FULL NAVIGATION */}
        {isFull && (
          <>
            <nav
              id="header-navigation"
              className={`header-nav ${menuOpen ? "active" : ""}`}
            >
              <Link to="/" onClick={closeMenu}>
                Home
              </Link>

              <Link to="/#how-it-works" onClick={closeMenu}>
                How it works
              </Link>

              <Link to="/#features" onClick={closeMenu}>
                Features
              </Link>

              <Link to="/#pricing" onClick={closeMenu}>
                Pricing
              </Link>

              <Link
                to="/register"
                className="mobile-header-cta"
                onClick={closeMenu}
              >
                Create your store
              </Link>
            </nav>

            <Link to="/register" className="header-cta">
              Create your store
              <span aria-hidden="true">↗</span>
            </Link>

            <button
              className={`menu-toggle ${menuOpen ? "open" : ""}`}
              onClick={() => setMenuOpen((previous) => !previous)}
              aria-label={
                menuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={menuOpen}
              aria-controls="header-navigation"
              type="button"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </>
        )}

        {/* MINIMAL AND STOREFRONT HEADER */}
        {(isMinimal || isStorefront) && (
          <Link
            to="/"
            className="header-back-home"
            onClick={closeMenu}
            aria-label="Back to Nexfinity Store website"
            title="Back to website"
          >
            <span aria-hidden="true">←</span>
          </Link>
        )}

        {/* LOGO-ONLY HEADER */}
        {isLogoOnly && null}

      </div>
    </header>
  );
}
