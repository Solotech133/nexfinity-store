
import { useEffect, useState } from "react";
import "./Hero.css";

const slides = [
  {
    image: "/images/hero-fashion.jpg",
    title: "Fashion that gets noticed.",
    description: "Showcase your style and turn visitors into customers.",
    category: "FASHION & STYLE",
  },
  {
    image: "/images/hero-bag.jpg",
    title: "Make every product count.",
    description: "Give your products the beautiful presentation they deserve.",
    category: "FASHION ACCESSORIES",
  },
  {
    image: "/images/hero-perfume.jpg",
    title: "Beauty deserves a spotlight.",
    description: "Put your beauty and fragrance collection online.",
    category: "BEAUTY & FRAGRANCE",
  },
  {
    image: "/images/fashion.jpg",
    title: "Your brand. Your identity.",
    description: "Create a beautiful online destination for your customers.",
    category: "FASHION BUSINESS",
  },
  {
    image: "/images/food.jpg",
    title: "Serve up more sales.",
    description: "Let customers explore your food and place orders easily.",
    category: "FOOD & RESTAURANTS",
  },
  {
    image: "/images/handbag.jpg",
    title: "Every detail matters.",
    description: "Display your collection in a store that feels like your brand.",
    category: "BAGS & ACCESSORIES",
  },
  {
    image: "/images/headphones.jpg",
    title: "Technology made visible.",
    description: "Showcase your gadgets and reach more buyers.",
    category: "ELECTRONICS",
  },
  {
    image: "/images/perfume.jpg",
    title: "Let your products speak.",
    description: "Give customers a closer look at what you offer.",
    category: "FRAGRANCE",
  },
  {
    image: "/images/skincare.jpg",
    title: "Glow. Grow. Sell.",
    description: "Build your beauty business with your own online store.",
    category: "SKINCARE",
  },
  {
    image: "/images/sneakers.jpg",
    title: "Step into online selling.",
    description: "Put your latest collections in front of more customers.",
    category: "FOOTWEAR",
  },
  {
    image: "/images/store-banner.jpg",
    title: "Your business, beautifully presented.",
    description: "Everything your customers need, in one online store.",
    category: "YOUR ONLINE STORE",
  },
  {
    image: "/images/watch.jpg",
    title: "Make your brand unforgettable.",
    description: "Showcase quality products and receive orders on WhatsApp.",
    category: "WATCHES & ACCESSORIES",
  },
];

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      <div className="hero-glow" />

      <div className="hero-content">
        <span className="hero-tag">
          <span>✳</span> YOUR BUSINESS DESERVES MORE
        </span>

        <h1>
          More visibility.
          <br />
          <span>More customers.</span>
          <br />
          More sales.
        </h1>

        <p>
          Bring your business online with your own beautiful
          store. Showcase your products, reach more customers
          and receive orders directly through WhatsApp.
        </p>

        <div className="hero-actions">
          <a href="/register" className="hero-primary">
            Start selling today
          </a>

          <a href="#how-it-works" className="hero-secondary">
            See how it works
          </a>
        </div>

        <div className="hero-proof">
          <span>✳ No coding required</span>
          <span>✳ Easy store setup</span>
          <span>✳ WhatsApp ordering</span>
        </div>
      </div>

      {/* Automatic image slideshow */}

      <div className="hero-visual">
        <div className="hero-slider">
          <div
            className="hero-slider-track"
            style={{
              transform: `translateX(-${activeSlide * 100}%)`,
            }}
          >
            {slides.map((slide, index) => (
              <div className="hero-slide" key={slide.image}>
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="hero-slide-image"
                  loading={index === 0 ? "eager" : "lazy"}
                />

                <div className="hero-slide-overlay" />

                <div className="hero-slide-content">
                  <span className="slide-category">
                    {slide.category}
                  </span>

                  <h2>{slide.title}</h2>

                  <p>{slide.description}</p>

                  <a href="/register" className="slide-link">
                    Create your store
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slide indicators */}

        <div className="hero-slider-controls">
          <div className="hero-slider-dots">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.image}
                className={activeSlide === index ? "active" : ""}
                onClick={() => setActiveSlide(index)}
                aria-label={`Show slide ${index + 1}`}
                aria-current={activeSlide === index ? "true" : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
