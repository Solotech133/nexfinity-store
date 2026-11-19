
import { useState } from "react";
import {
  Mail,
  MessageCircle,
  MapPin,
  Send,
  ShieldCheck,
  ArrowUpRight,
  LockKeyhole,
  FileText,
} from "lucide-react";

import Header from "./Header";
import Footer from "./Footer";
import "./InfoPages.css";

const SUPPORT_EMAIL = "nexfinity97@gmail.com";

function InfoLayout({ eyebrow, title, description, children }) {
  return (
    <div className="info-page">
      <Header />

      <main className="info-main">
        <section className="info-hero">
          <span className="info-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>

        <div className="info-content">{children}</div>
      </main>

      <Footer />
    </div>
  );
}

/* =========================================
   CONTACT US
========================================= */

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const subject = encodeURIComponent(
      form.subject || "Nexfinity Store Enquiry"
    );

    const body = encodeURIComponent(
      `Hello Nexfinity Team,

I would like to make an enquiry.

Name: ${form.name}
Email: ${form.email}

Message:
${form.message}

Thank you.`
    );

    window.location.href =
      `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <InfoLayout
      eyebrow="CONTACT NEXFINITY"
      title={
        <>
          We're here to <span>help you grow.</span>
        </>
      }
      description="Have a question, need assistance or want to learn more about Nexfinity Store? We'd love to hear from you."
    >
      <div className="contact-grid">
        <aside className="contact-details">
          <div className="contact-intro">
            <span className="info-icon">
              <MessageCircle size={22} />
            </span>

            <h2>Let's start a conversation.</h2>

            <p>
              Whether you're setting up your online store,
              managing your products or exploring what
              Store can do for your business, our team
              is ready to assist.
            </p>
          </div>

          <a
            className="contact-method"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            <span className="contact-method-icon">
              <Mail size={19} />
            </span>

            <span>
              <small>Email support</small>
              <strong>{SUPPORT_EMAIL}</strong>
            </span>

            <ArrowUpRight size={17} />
          </a>

          <div className="contact-method">
            <span className="contact-method-icon">
              <MapPin size={19} />
            </span>

            <span>
              <small>Our location</small>
              <strong>Nigeria</strong>
            </span>
          </div>

          <div className="contact-note">
            <ShieldCheck size={20} />

            <p>
              Your enquiries are important to us. Please
              avoid including passwords, payment details
              or other confidential information in your message.
            </p>
          </div>
        </aside>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <div className="contact-form-heading">
            <span className="info-eyebrow">
              SEND US A MESSAGE
            </span>

            <h2>How can we assist you?</h2>

            <p>
              Complete the form below and your email
              application will open with your message prepared.
            </p>
          </div>

          <label htmlFor="contact-name">
            Full name
          </label>

          <input
            id="contact-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            autoComplete="name"
            required
          />

          <label htmlFor="contact-email">
            Email address
          </label>

          <input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            autoComplete="email"
            required
          />

          <label htmlFor="contact-subject">
            Subject
          </label>

          <input
            id="contact-subject"
            name="subject"
            type="text"
            value={form.subject}
            onChange={handleChange}
            placeholder="What would you like to discuss?"
            required
          />

          <label htmlFor="contact-message">
            Your message
          </label>

          <textarea
            id="contact-message"
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Write your message here..."
            rows={6}
            required
          />

          <button
            type="submit"
            className="contact-submit"
          >
            Send your enquiry
            <Send size={17} />
          </button>

          <p className="contact-form-footnote">
            Your email application will open to complete
            and send your enquiry.
          </p>
        </form>
      </div>
    </InfoLayout>
  );
}

/* =========================================
   PRIVACY POLICY
========================================= */

export function PrivacyPolicy() {
  return (
    <InfoLayout
      eyebrow="PRIVACY & DATA PROTECTION"
      title={
        <>
          Your privacy <span>matters.</span>
        </>
      }
      description="We believe trust starts with transparency. This policy explains how Nexfinity Store collects, uses, stores and protects information when you use our platform."
    >
      <article className="legal-document">
        <div className="legal-heading">
          <span className="legal-icon">
            <LockKeyhole size={21} />
          </span>

          <div>
            <h2>Privacy Policy</h2>
            <p>
              Information about your privacy and personal data.
            </p>
          </div>
        </div>

        <p>
          Nexfinity Store is an online storefront
          platform designed to help businesses establish
          their digital presence, showcase products and
          receive customer enquiries and orders through
          WhatsApp.
        </p>

        <p>
          This Privacy Policy explains how we handle
          personal information when you visit our website,
          create an account, operate a store or interact
          with our services. By using Store, you
          acknowledge the practices described in this policy.
        </p>

        <section>
          <h2>1. Information We Collect</h2>

          <p>
            We collect information that is necessary to
            operate, maintain and improve our services.
            Depending on how you interact with Store,
            this may include:
          </p>

          <ul>
            <li>
              <strong>Account information:</strong> Your
              name, email address, authentication details
              and other information provided when creating
              or managing an account.
            </li>

            <li>
              <strong>Business information:</strong> Your
              business name, description, contact details,
              location, store identity and other profile
              information.
            </li>

            <li>
              <strong>Product information:</strong> Product
              names, descriptions, prices, categories,
              photographs and other content uploaded to
              your store.
            </li>

            <li>
              <strong>Customer information:</strong>
              Information customers voluntarily provide
              when contacting vendors or making enquiries
              through available ordering channels.
            </li>

            <li>
              <strong>Technical information:</strong>
              Device and browser information, usage data,
              access logs and other technical information
              where collected by our platform or service
              providers.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>

          <p>
            Information collected through Store may
            be used to:
          </p>

          <ul>
            <li>Create, authenticate and manage user accounts.</li>
            <li>Set up and maintain vendor storefronts.</li>
            <li>Display business profiles and product listings.</li>
            <li>Generate and maintain store links and QR codes.</li>
            <li>Enable customer enquiries and WhatsApp ordering.</li>
            <li>Provide customer support and respond to requests.</li>
            <li>Maintain platform security and prevent misuse.</li>
            <li>Improve platform functionality and user experience.</li>
            <li>Comply with applicable legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2>3. Public Storefront Information</h2>

          <p>
            Store allows vendors to create public
            storefronts that customers can access through
            unique store links and QR codes.
          </p>

          <p>
            Information published by a vendor, including
            business details, product descriptions,
            photographs, prices and publicly displayed
            contact information, may be visible to anyone
            who visits that storefront.
          </p>

          <p>
            Vendors are responsible for reviewing the
            information they publish and ensuring that
            they do not disclose personal or confidential
            information unintentionally.
          </p>
        </section>

        <section>
          <h2>4. WhatsApp and Third-Party Services</h2>

          <p>
            Store provides features that allow customers
            to contact vendors through WhatsApp. When you
            choose to use these features, certain information
            may be shared with or processed by WhatsApp
            and other relevant service providers.
          </p>

          <p>
            WhatsApp and other third-party platforms operate
            independently and have their own privacy policies,
            terms and data-handling practices. We encourage
            users to review those policies before using
            external services.
          </p>
        </section>

        <section>
          <h2>5. How We Share Information</h2>

          <p>
            We do not sell personal information to third
            parties. We may share information in limited
            circumstances, including:
          </p>

          <ul>
            <li>
              With service providers that support our
              hosting, database, authentication, security
              and platform operations.
            </li>

            <li>
              Where a vendor chooses to publish information
              through a public storefront.
            </li>

            <li>
              Where a user instructs us to share information
              or uses a feature that requires such sharing.
            </li>

            <li>
              Where disclosure is required by law, regulation
              or a valid legal process.
            </li>

            <li>
              Where reasonably necessary to protect the
              rights, safety, security or integrity of
              Nexfinity, our users or the public.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Data Storage and Security</h2>

          <p>
            We take reasonable technical and organisational
            measures to protect information against
            unauthorised access, alteration, disclosure,
            loss or misuse.
          </p>

          <p>
            Access to information is intended to be limited
            to authorised purposes. However, no online
            platform, electronic transmission or storage
            system can be guaranteed to be completely
            secure.
          </p>

          <p>
            Users should keep their account credentials
            confidential and notify us if they suspect
            unauthorised access to their accounts.
          </p>
        </section>

        <section>
          <h2>7. Data Retention</h2>

          <p>
            We retain information for as long as reasonably
            necessary to provide our services, maintain
            accounts, fulfil operational requirements,
            resolve disputes, enforce our terms and comply
            with applicable legal obligations.
          </p>

          <p>
            Retention periods may vary depending on the
            type of information and the purpose for which
            it was collected.
          </p>
        </section>

        <section>
          <h2>8. Your Privacy Rights</h2>

          <p>
            Subject to applicable law, you may have the
            right to:
          </p>

          <ul>
            <li>Request access to personal information we hold about you.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of personal information where applicable.</li>
            <li>Object to or request restrictions on certain processing activities.</li>
            <li>Withdraw consent where processing is based on consent.</li>
            <li>Raise concerns about how your information is handled.</li>
          </ul>

          <p>
            Requests may be subject to identity verification,
            legal requirements and legitimate operational
            considerations.
          </p>
        </section>

        <section>
          <h2>9. Cookies and Similar Technologies</h2>

          <p>
            Our website or service providers may use cookies
            or similar technologies to support essential
            website functionality, remember preferences,
            maintain sessions, understand usage and improve
            the platform.
          </p>

          <p>
            You can manage cookies through your browser
            settings. Disabling certain cookies may affect
            the availability or functionality of some
            platform features.
          </p>
        </section>

        <section>
          <h2>10. Children's Privacy</h2>

          <p>
            Store is intended for businesses and general
            audiences. It is not designed to knowingly
            collect personal information from children
            in violation of applicable data protection laws.
          </p>
        </section>

        <section>
          <h2>11. Changes to This Privacy Policy</h2>

          <p>
            We may revise this Privacy Policy from time
            to time to reflect changes in our services,
            operational practices or applicable legal
            requirements.
          </p>

          <p>
            Any revised policy will be made available
            through this page. We encourage users to
            review it periodically.
          </p>
        </section>

        <section>
          <h2>12. Contact and Privacy Enquiries</h2>

          <p>
            If you have questions, concerns or requests
            relating to this Privacy Policy or the handling
            of your personal information, please contact us:
          </p>

          <a href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </section>
      </article>
    </InfoLayout>
  );
}

/* =========================================
   TERMS OF SERVICE
========================================= */

export function TermsOfService() {
  return (
    <InfoLayout
      eyebrow="TERMS & CONDITIONS"
      title={
        <>
          Clear terms. <span>Better business.</span>
        </>
      }
      description="These terms explain the responsibilities and conditions that apply when you access or use Nexfinity Store."
    >
      <article className="legal-document">
        <div className="legal-heading">
          <span className="legal-icon">
            <FileText size={21} />
          </span>

          <div>
            <h2>Terms of Service</h2>
            <p>
              The terms governing your use of Nexfinity Store.
            </p>
          </div>
        </div>

        <p>
          Welcome to Nexfinity Store ("Store",
          "Nexfinity", "we", "our" or "us").
        </p>

        <p>
          These Terms of Service govern your access to
          and use of the Store website, applications,
          features and related services. By accessing
          or using the platform, you agree to comply
          with these Terms.
        </p>

        <p>
          If you do not agree with these Terms, you
          should discontinue use of the platform.
        </p>

        <section>
          <h2>1. About Nexfinity Store</h2>

          <p>
            Nexfinity Store is a digital storefront
            platform that helps businesses establish an
            online presence, showcase products, share
            unique store links and QR codes, and receive
            customer enquiries and orders through WhatsApp.
          </p>

          <p>
            Our platform provides digital tools and
            infrastructure to support business visibility
            and customer engagement. The specific features
            available may depend on the subscription plan
            selected by the vendor.
          </p>
        </section>

        <section>
          <h2>2. Account Registration and Security</h2>

          <p>
            To access certain features, you may need
            to create an account and provide accurate,
            complete and current information.
          </p>

          <p>You agree to:</p>

          <ul>
            <li>Provide truthful registration information.</li>
            <li>Keep your account information accurate and updated.</li>
            <li>Maintain the confidentiality of your login credentials.</li>
            <li>Take reasonable steps to prevent unauthorised account access.</li>
            <li>Notify us promptly if you suspect a security breach.</li>
          </ul>

          <p>
            You are responsible for activities carried
            out through your account, except where
            applicable law provides otherwise.
          </p>
        </section>

        <section>
          <h2>3. Vendor Responsibilities</h2>

          <p>
            Vendors using Store are responsible for
            the businesses, products and information they
            publish through their storefronts.
          </p>

          <p>As a vendor, you agree to:</p>

          <ul>
            <li>Provide accurate business and contact information.</li>
            <li>Publish truthful product descriptions and prices.</li>
            <li>Upload only images and content you are legally permitted to use.</li>
            <li>Keep product availability and store information up to date.</li>
            <li>Respond to customer enquiries professionally.</li>
            <li>Honour accepted orders and commitments made to customers.</li>
            <li>Manage your own payment, delivery, refund and after-sales arrangements.</li>
            <li>Comply with applicable business, consumer protection and tax laws.</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>

          <p>
            You must use Store only for lawful and
            legitimate purposes.
          </p>

          <p>You must not:</p>

          <ul>
            <li>Use the platform to promote illegal products or services.</li>
            <li>Publish fraudulent, deceptive or misleading information.</li>
            <li>Infringe another person's intellectual property or privacy rights.</li>
            <li>Upload malicious software or attempt to compromise platform security.</li>
            <li>Interfere with the normal operation of the platform.</li>
            <li>Use Store to harass, defraud or harm other people.</li>
            <li>Attempt to access accounts, systems or data without authorisation.</li>
          </ul>

          <p>
            We reserve the right to investigate suspected
            misuse and take reasonable action to protect
            the platform and its users.
          </p>
        </section>

        <section>
          <h2>5. Products, Orders and Customer Transactions</h2>

          <p>
            Store enables vendors to display products
            and allows customers to contact vendors through
            available communication channels, including
            WhatsApp.
          </p>

          <p>
            Unless a particular feature expressly states
            otherwise, transactions take place directly
            between vendors and customers. Nexfinity is
            not the seller, manufacturer, distributor
            or delivery provider for products listed
            by vendors.
          </p>

          <p>
            Vendors are solely responsible for the
            products and services they offer, including
            product quality, pricing, availability,
            payment arrangements, order fulfilment,
            delivery, refunds, warranties and customer
            support.
          </p>

          <p>
            Customers should verify product details,
            payment instructions and delivery arrangements
            directly with the relevant vendor before
            completing a transaction.
          </p>
        </section>

        <section>
          <h2>6. Store Links and QR Codes</h2>

          <p>
            Store provides vendors with access to
            unique public storefront links and corresponding
            QR codes as part of the platform's store
            features and applicable subscription plans.
          </p>

          <p>
            Vendors may share their store links and QR
            codes through social media profiles, websites,
            WhatsApp, marketing materials and other
            permitted channels.
          </p>

          <p>
            Vendors are responsible for ensuring that
            the information accessible through their
            storefronts is accurate, lawful and appropriate.
          </p>
        </section>

        <section>
          <h2>7. Subscription Plans and Payments</h2>

          <p>
            Store may provide free and paid subscription
            plans with different features, product limits,
            benefits and billing periods.
          </p>

          <p>
            The applicable plan features, prices and
            payment conditions will be presented through
            the platform or the relevant subscription
            process.
          </p>

          <p>
            Access to paid features may depend on successful
            payment and the applicable subscription period.
            Vendors are responsible for reviewing their
            selected plan and payment details before
            completing a purchase.
          </p>

          <p>
            We may modify subscription features, pricing
            or billing arrangements. Where required,
            material changes will be communicated in
            accordance with applicable law and the
            relevant subscription terms.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property and User Content</h2>

          <p>
            The Store platform, including its software,
            interface, design, branding, graphics and
            original content, is owned by or licensed
            to Nexfinity and is protected by applicable
            intellectual property laws.
          </p>

          <p>
            Vendors retain ownership of content they
            upload, subject to any rights belonging to
            third parties.
          </p>

          <p>
            By uploading content to Store, you grant
            us a limited, non-exclusive permission to
            host, store, reproduce, display and process
            that content as reasonably necessary to
            operate, maintain and provide the platform.
          </p>

          <p>
            You confirm that you have the necessary
            permissions and rights to publish the content
            you submit.
          </p>
        </section>

        <section>
          <h2>9. Third-Party Platforms and Services</h2>

          <p>
            Store may integrate with or rely on
            third-party services, including WhatsApp,
            hosting providers, authentication services
            and other technology providers.
          </p>

          <p>
            These services may operate under their own
            terms, policies and availability conditions.
            Nexfinity does not control independently
            operated third-party platforms and cannot
            guarantee their continued availability or
            performance.
          </p>
        </section>

        <section>
          <h2>10. Platform Availability and Modifications</h2>

          <p>
            We aim to maintain a reliable and accessible
            service. However, uninterrupted availability
            cannot be guaranteed.
          </p>

          <p>
            We may perform maintenance, introduce updates,
            modify features or temporarily restrict
            access where reasonably necessary for
            operational, security or technical reasons.
          </p>
        </section>

        <section>
          <h2>11. Suspension and Termination</h2>

          <p>
            You may stop using Store at any time.
          </p>

          <p>
            We may restrict, suspend or terminate access
            to an account or particular features where
            reasonably necessary, including where:
          </p>

          <ul>
            <li>These Terms have been materially violated.</li>
            <li>The platform is being used for unlawful activity.</li>
            <li>There is a significant security or fraud risk.</li>
            <li>Account activity threatens the platform or other users.</li>
            <li>We are required to do so by applicable law.</li>
          </ul>

          <p>
            Where appropriate and legally permitted,
            we may provide notice and an opportunity
            to address the issue.
          </p>
        </section>

        <section>
          <h2>12. Disclaimers and Limitation of Liability</h2>

          <p>
            Store provides digital tools to support
            business visibility and customer engagement.
            We do not guarantee sales, revenue, customer
            traffic, business growth or specific commercial
            results.
          </p>

          <p>
            To the extent permitted by applicable law,
            Nexfinity is not responsible for losses
            arising from transactions between vendors
            and customers, inaccurate vendor listings,
            third-party service interruptions or
            circumstances outside our reasonable control.
          </p>

          <p>
            Nothing in these Terms excludes or limits
            any liability that cannot legally be excluded
            or limited.
          </p>
        </section>

        <section>
          <h2>13. Indemnity</h2>

          <p>
            To the extent permitted by law, vendors are
            responsible for claims, losses and expenses
            arising from their unlawful use of Store,
            their breach of these Terms or their infringement
            of another person's rights.
          </p>
        </section>

        <section>
          <h2>14. Changes to These Terms</h2>

          <p>
            We may update these Terms to reflect changes
            in our services, platform features, business
            operations or applicable legal requirements.
          </p>

          <p>
            Revised Terms will be published on this page.
            Your continued use of Store after changes
            take effect will be subject to the revised
            Terms, to the extent permitted by applicable law.
          </p>
        </section>

        <section>
          <h2>15. Governing Law</h2>

          <p>
            These Terms are governed by the laws of
            the Federal Republic of Nigeria, subject
            to any mandatory consumer protection or
            other legal rights that apply to users
            in their respective jurisdictions.
          </p>
        </section>

        <section>
          <h2>16. Contact Information</h2>

          <p>
            If you have questions or concerns about
            these Terms or your use of Nexfinity Store,
            please contact our team:
          </p>

          <a href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </section>
      </article>
    </InfoLayout>
  );
}
