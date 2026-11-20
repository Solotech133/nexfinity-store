
import { lazy, Suspense, useEffect, useState } from "react";

import {
  BrowserRouter,
  Link,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import { updateSeoMetadata } from "./lib/seo";
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

const publicRouteMetadata = {
  "/": {
    title: "NexfinityStore | Your Online Marketplace",
    description:
      "Discover products, explore online stores and shop from trusted vendors on NexfinityStore.",
  },
  "/contact": {
    title: "Contact NexfinityStore",
    description:
      "Contact the NexfinityStore team for help with online stores, vendor accounts and shopping.",
  },
  "/privacy": {
    title: "Privacy Policy | NexfinityStore",
    description:
      "Read how NexfinityStore collects, uses and protects account and shopping information.",
  },
  "/terms": {
    title: "Terms of Service | NexfinityStore",
    description:
      "Review the terms for using NexfinityStore as a vendor or shopper.",
  },
};

function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    const isPrivateRoute = [
      "/register",
      "/login",
      "/reset-password",
      "/dashboard",
      "/admin",
    ].includes(normalizedPath);
    const isStoreRoute = normalizedPath.startsWith("/store/");
    const isPublicRoute =
      isStoreRoute ||
      Object.prototype.hasOwnProperty.call(
        publicRouteMetadata,
        normalizedPath
      );
    const metadata = publicRouteMetadata[normalizedPath] || {
      title: isStoreRoute
        ? "Online Store | NexfinityStore"
        : "Page not found | NexfinityStore",
      description: isStoreRoute
        ? "Explore products and shop directly from this vendor's online store on NexfinityStore."
        : "Explore NexfinityStore online stores and products from trusted vendors.",
    };

    updateSeoMetadata({
      ...metadata,
      canonical: normalizedPath,
      robots:
        isPrivateRoute || !isPublicRoute
          ? "noindex, nofollow"
          : "index, follow",
    });
  }, [pathname]);

  return null;
}

// =====================================
// LOADING WRAPPER
// =====================================

function LoadingRoute({ children, label = "Loading your page" }) {
  return (
    <Suspense fallback={<SharedLoadingScreen label={label} />}>
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
      <Suspense
        fallback={
          <SharedLoadingScreen label="Loading the homepage" />
        }
      >
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

function HomeRoute() {
  const [sessionStatus, setSessionStatus] = useState("checking");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (active) {
          setSessionStatus(
            data.session ? "authenticated" : "anonymous"
          );
        }
      } catch (err) {
        console.error("Home session check error:", err);
        if (active) setSessionStatus("error");
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [retryCount]);

  if (sessionStatus === "checking") {
    return (
      <SharedLoadingScreen label="Restoring your account" />
    );
  }

  if (sessionStatus === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  if (sessionStatus === "error") {
    return (
      <SiteLayout headerMode="full">
        <section className="home-session-error" role="alert">
          <h1>Could not restore your sign-in</h1>
          <p>
            Please try again or sign in to open your dashboard.
          </p>
          <div className="home-session-error-actions">
            <button
              type="button"
              onClick={() => {
                setSessionStatus("checking");
                setRetryCount((count) => count + 1);
              }}
            >
              Try again
            </button>
            <Link to="/login">Sign in</Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return <HomePage />;
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
        element={<HomeRoute />}
      />

      {/* INFORMATION PAGES */}
      <Route
        path="/contact"
        element={
          <LoadingRoute>
            <Contact />
          </LoadingRoute>
        }
      />

      <Route
        path="/privacy"
        element={
          <LoadingRoute>
            <PrivacyPolicy />
          </LoadingRoute>
        }
      />

      <Route
        path="/terms"
        element={
          <LoadingRoute>
            <TermsOfService />
          </LoadingRoute>
        }
      />

      {/* REGISTER */}
      <Route
        path="/register"
        element={
          <LoadingRoute label="Preparing registration">
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
          <LoadingRoute label="Opening sign in">
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
          <LoadingRoute label="Preparing password reset">
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
          <LoadingRoute label="Opening your dashboard">
            <Dashboard />
          </LoadingRoute>
        }
      />

      {/* ADMIN DASHBOARD */}
      <Route
        path="/admin"
        element={
          <LoadingRoute label="Verifying administrator access">
            <AdminDashboard />
          </LoadingRoute>
        }
      />

      {/* PUBLIC VENDOR STOREFRONT */}
      <Route
        path="/store/:slug"
        element={
          <LoadingRoute label="Opening this storefront">
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
  return (
    <BrowserRouter>
      <SeoManager />
      <AppRoutes />
    </BrowserRouter>
  );
}
