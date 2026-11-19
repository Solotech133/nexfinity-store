
import { lazy, Suspense, useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import SharedLoadingScreen from "./components/SharedLoadingScreen";

import "./App.css";

// HOME PAGE COMPONENTS
const Hero = lazy(() => import("./components/Hero"));
const TrustSection = lazy(() => import("./components/TrustSection"));
const HowItWorks = lazy(() => import("./components/HowItWorks"));
const StorefrontShowcase = lazy(
  () => import("./components/StorefrontShowcase")
);
const Features = lazy(() => import("./components/Features"));
const Pricing = lazy(() => import("./components/Pricing"));

// INFORMATION PAGES
const Contact = lazy(() =>
  import("./components/InfoPages").then((module) => ({
    default: module.Contact,
  }))
);

const PrivacyPolicy = lazy(() =>
  import("./components/InfoPages").then((module) => ({
    default: module.PrivacyPolicy,
  }))
);

const TermsOfService = lazy(() =>
  import("./components/InfoPages").then((module) => ({
    default: module.TermsOfService,
  }))
);

// ACCOUNT PAGES
const Register = lazy(() => import("./components/Register"));
const Login = lazy(() => import("./components/Login"));
const ResetPassword = lazy(
  () => import("./components/ResetPassword")
);

// DASHBOARDS
const Dashboard = lazy(() => import("./components/Dashboard"));
const AdminDashboard = lazy(
  () => import("./components/AdminDashboard")
);

// PUBLIC STORE
const PublicStore = lazy(() => import("./components/PublicStore"));

// =====================================
// NEXFINITY STORE SPLASH SCREEN
// =====================================

function SplashScreen({ onComplete }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setLeaving(true);
    }, 1900);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`splash-screen ${leaving ? "splash-leaving" : ""}`}
      aria-label="Welcome to Nexfinity Store"
      role="status"
    >
      <div className="splash-content">
        <div className="splash-logo-wrapper">
          <img
            src="/images/logo.png"
            alt="Nexfinity Store"
            className="splash-logo"
          />
        </div>

        <h1 className="splash-brand">
          NEXFINITY <span>STORE</span>
        </h1>

        <p className="splash-tagline">
          Your store. Your brand. Your growth.
        </p>

        <div className="splash-loader">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

// =====================================
// LOADING WRAPPER
// =====================================

function LoadingRoute({ children }) {
  return (
    <Suspense fallback={<SharedLoadingScreen />}>
      {children}
    </Suspense>
  );
}

// =====================================
// SHARED WEBSITE LAYOUT
// =====================================

function SiteLayout({
  children,
  headerMode = "full",
  showFooter = false,
}) {
  return (
    <>
      <Header variant={headerMode} />

      <main>
        {children}
      </main>

      {showFooter && <Footer />}
    </>
  );
}

// =====================================
// HOME PAGE
// =====================================

function HomePage() {
  return (
    <SiteLayout headerMode="full" showFooter>
      <Suspense fallback={<SharedLoadingScreen />}>
        <Hero />
        <TrustSection />
        <HowItWorks />
        <StorefrontShowcase />
        <Features />
        <Pricing />
      </Suspense>
    </SiteLayout>
  );
}

// =====================================
// INFORMATION PAGE LAYOUT
// =====================================

function InformationLayout({ children }) {
  return (
    <SiteLayout headerMode="full">
      {children}
    </SiteLayout>
  );
}

// =====================================
// ACCOUNT PAGE LAYOUT
// =====================================

function AccountLayout({ children }) {
  return (
    <SiteLayout headerMode="minimal">
      {children}
    </SiteLayout>
  );
}

// =====================================
// PUBLIC STOREFRONT LAYOUT
// =====================================

function StorefrontLayout({ children }) {
  return (
    <SiteLayout headerMode="storefront">
      {children}
    </SiteLayout>
  );
}

// =====================================
// APPLICATION ROUTES
// =====================================

function AppRoutes() {
  return (
    <Routes>

      {/* HOMEPAGE */}
      <Route
        path="/"
        element={<HomePage />}
      />

      {/* INFORMATION PAGES */}
      <Route
        path="/contact"
        element={
          <LoadingRoute>
            <InformationLayout>
              <Contact />
            </InformationLayout>
          </LoadingRoute>
        }
      />

      <Route
        path="/privacy"
        element={
          <LoadingRoute>
            <InformationLayout>
              <PrivacyPolicy />
            </InformationLayout>
          </LoadingRoute>
        }
      />

      <Route
        path="/terms"
        element={
          <LoadingRoute>
            <InformationLayout>
              <TermsOfService />
            </InformationLayout>
          </LoadingRoute>
        }
      />

      {/* REGISTER */}
      <Route
        path="/register"
        element={
          <LoadingRoute>
            <AccountLayout>
              <Register />
            </AccountLayout>
          </LoadingRoute>
        }
      />

      {/* LOGIN */}
      <Route
        path="/login"
        element={
          <LoadingRoute>
            <AccountLayout>
              <Login />
            </AccountLayout>
          </LoadingRoute>
        }
      />

      {/* PASSWORD RESET */}
      <Route
        path="/reset-password"
        element={
          <LoadingRoute>
            <AccountLayout>
              <ResetPassword />
            </AccountLayout>
          </LoadingRoute>
        }
      />

      {/* VENDOR DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <LoadingRoute>
            <Dashboard />
          </LoadingRoute>
        }
      />

      {/* ADMIN DASHBOARD */}
      <Route
        path="/admin"
        element={
          <LoadingRoute>
            <AdminDashboard />
          </LoadingRoute>
        }
      />

      {/* PUBLIC VENDOR STOREFRONT */}
      <Route
        path="/store/:slug"
        element={
          <LoadingRoute>
            <StorefrontLayout>
              <PublicStore />
            </StorefrontLayout>
          </LoadingRoute>
        }
      />

      {/* UNKNOWN ROUTES */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}

// =====================================
// MAIN APP
// =====================================

export default function App() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    try {
      const alreadyShown = sessionStorage.getItem(
        "nexfinity-store-splash"
      );

      if (!alreadyShown) {
        sessionStorage.setItem(
          "nexfinity-store-splash",
          "true"
        );

        setShowSplash(true);
      }
    } catch {
      // Continue normally if browser storage is unavailable.
      setShowSplash(false);
    }
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />

      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
        />
      )}
    </BrowserRouter>
  );
}
