
import {
  Search,
  ShoppingBag,
  Heart,
  Star,
} from "lucide-react";

import "./StorefrontShowcase.css";

const products = [
  {
    name: "Classic Everyday Bag",
    category: "Fashion",
    price: "₦28,500",
    image: "/images/hero-bag.jpg",
    tag: "BESTSELLER",
  },
  {
    name: "Signature Fragrance",
    category: "Beauty",
    price: "₦18,000",
    image: "/images/hero-perfume.jpg",
    tag: "POPULAR",
  },
  {
    name: "Modern Style Collection",
    category: "Fashion",
    price: "₦35,000",
    image: "/images/hero-fashion.jpg",
    tag: "NEW ARRIVAL",
  },
];

export default function StorefrontShowcase() {
  return (
    <section className="showcase-section" id="storefront">
      <div className="showcase-container">

        <div className="showcase-heading">
          <span className="showcase-eyebrow">
            YOUR BUSINESS, BEAUTIFULLY PRESENTED
          </span>

          <h2>
            A storefront that
            <span> feels like your brand.</span>
          </h2>

          <p>
            Give your customers a beautiful shopping experience.
            Your products, your identity and your business, all
            in one easy-to-share online store.
          </p>
        </div>

        <div className="showcase-layout">

          <div className="showcase-copy">
            <span className="showcase-label">
              THE ONLINE STORE EXPERIENCE
            </span>

            <h3>
              More than a link.
              <br />
              <span>Your own digital shop.</span>
            </h3>

            <p>
              Imagine sharing one link and giving customers access
              to your products, prices and business information.
              That's the experience Nexfinity MiniStore helps you create.
            </p>

            <div className="showcase-points">
              <div>
                <span className="showcase-point-icon">✓</span>
                <span>Beautiful product presentation</span>
              </div>

              <div>
                <span className="showcase-point-icon">✓</span>
                <span>Easy product discovery</span>
              </div>

              <div>
                <span className="showcase-point-icon">✓</span>
                <span>Direct WhatsApp ordering</span>
              </div>
            </div>

            <a href="/register" className="showcase-cta">
              Build your storefront
            </a>
          </div>

          <div className="store-preview">

            <div className="store-browser">
              <div className="store-browser-dots">
                <span />
                <span />
                <span />
              </div>

              <div className="store-browser-address">
                yourstore.nexfinity.com
              </div>

              <span className="store-browser-menu">•••</span>
            </div>

            <div className="store-content">

              <div className="store-topbar">
                <div className="store-brand">
                  <div className="store-brand-icon">S</div>
                  <div>
                    <strong>STUDIO & CO.</strong>
                    <span>Style that speaks.</span>
                  </div>
                </div>

                <div className="store-top-icons">
                  <Search size={18} />
                  <ShoppingBag size={18} />
                </div>
              </div>

              <div className="store-welcome">
                <div>
                  <span>WELCOME TO OUR STORE</span>
                  <h3>Find your next favourite.</h3>
                  <p>Thoughtfully selected. Beautifully made.</p>
                </div>

                <div className="store-welcome-mark">S.</div>
              </div>

              <div className="store-categories">
                <span className="active">All products</span>
                <span>Fashion</span>
                <span>Beauty</span>
                <span>Accessories</span>
              </div>

              <div className="store-products-heading">
                <div>
                  <span>CURATED FOR YOU</span>
                  <h4>Featured products</h4>
                </div>

                <span className="store-view-all">View all</span>
              </div>

              <div className="store-products">
                {products.map((product) => (
                  <article className="store-product" key={product.name}>
                    <div className="store-product-image">
                      <img src={product.image} alt={product.name} />

                      <span className="store-product-tag">
                        {product.tag}
                      </span>

                      <span className="store-product-heart">
                        <Heart size={14} />
                      </span>
                    </div>

                    <div className="store-product-info">
                      <span>{product.category}</span>
                      <h5>{product.name}</h5>
                      <strong>{product.price}</strong>
                    </div>
                  </article>
                ))}
              </div>

              <div className="store-rating">
                <div className="store-rating-stars">
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                </div>

                <span>A little shop with a lot of style.</span>
              </div>

            </div>

            <div
              className="store-whatsapp-float"
              aria-label="WhatsApp ordering preview"
            >
              <span className="whatsapp-icon-wrap">
                <svg
                  viewBox="0 0 32 32"
                  role="img"
                  aria-label="WhatsApp"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="currentColor"
                    d="M16.04 2.67c-7.35 0-13.32 5.97-13.32 13.32 0 2.35.62 4.64 1.8 6.65L2.6 29.33l6.86-1.8a13.28 13.28 0 0 0 6.57 1.72h.01c7.35 0 13.32-5.97 13.32-13.32 0-3.56-1.39-6.9-3.91-9.42a13.24 13.24 0 0 0-9.41-3.9zm0 24.34h-.01a11.05 11.05 0 0 1-5.63-1.54l-.4-.24-4.07 1.07 1.09-3.97-.26-.41a11.04 11.04 0 0 1-1.7-5.93c0-6.1 4.97-11.07 11.08-11.07 2.96 0 5.74 1.15 7.83 3.25a11 11 0 0 1 3.24 7.83c0 6.1-4.97 11.07-11.07 11.07zm6.08-8.29c-.33-.16-1.96-.97-2.26-1.08-.3-.11-.52-.16-.74.16-.22.33-.85 1.08-1.04 1.3-.19.22-.38.25-.71.08-.33-.16-1.39-.51-2.64-1.63-.98-.87-1.64-1.95-1.83-2.28-.19-.33-.02-.51.14-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.06-.41-.03-.57-.08-.16-.74-1.79-1.02-2.45-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.72s1.17 3.16 1.33 3.38c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.96-.8 2.24-1.57.27-.77.27-1.43.19-1.57-.08-.14-.3-.22-.63-.38z"
                  />
                </svg>
              </span>

              <span>Order on WhatsApp</span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
