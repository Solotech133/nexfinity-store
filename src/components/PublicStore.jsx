
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { updateSeoMetadata } from "../lib/seo";
import {
  MapPin,
  Store,
  ShoppingBag,
  AlertCircle,
  LoaderCircle,
  Package,
  Search,
  Sparkles,
  X,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  Home,
  Grid2X2,
  MessageCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import SharedLoadingScreen from "./SharedLoadingScreen";
import "./PublicStore.css";

export default function PublicStore() {
  const { slug } = useParams();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  // CART AND CHECKOUT
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const submissionInProgress = useRef(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  // LOAD STORE AND PRODUCTS
  useEffect(() => {
    let isMounted = true;

    async function loadStore() {
      setLoading(true);
      setError("");
      setProductsError("");
      setStore(null);
      setProducts([]);
      setCart({});

      try {
        const { data, error: fetchError } = await supabase
          .from("vendors")
          .select(`
            id,
            store_name,
            store_slug,
            business_name,
            business_category,
            business_description,
            business_address,
            city,
            state,
            phone,
            store_logo_url,
            store_banner_url,
            store_brand_color,
            is_store_published,
            approval_status
          `)
          .eq("store_slug", slug)
          .eq("is_store_published", true)
          .eq("approval_status", "approved")
          .maybeSingle();

        if (!isMounted) return;

        if (fetchError) {
          console.error("Store loading error:", fetchError);
          setError("We couldn't load this store. Please try again later.");
          setLoading(false);
          return;
        }

        if (!data) {
          setError("This store is unavailable or has not been published yet.");
          setLoading(false);
          return;
        }

        setStore(data);

        const {
          data: productData,
          error: productFetchError,
        } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            compare_at_price,
            category,
            image_url,
            is_featured,
            is_available,
            created_at
          `)
          .eq("vendor_id", data.id)
          .eq("is_available", true)
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (productFetchError) {
          console.error("Products loading error:", productFetchError);
          setProductsError("Products could not be loaded. Please try again.");
        } else {
          setProducts(productData || []);
        }

        setLoading(false);
      } catch (loadError) {
        console.error("Unexpected store loading error:", loadError);

        if (isMounted) {
          setError("Something went wrong while loading this store.");
          setLoading(false);
        }
      }
    }

    if (slug) {
      loadStore();
    } else {
      setError("Store address is missing.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // GENERAL HELPERS
  const formatPrice = (price) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);

  const storeName = store?.store_name || store?.business_name || "the store";

  useEffect(() => {
    if (!store) return;

    const name = store.store_name || store.business_name || "Online Store";
    const description = (
      store.business_description ||
      `Shop products from ${name} on NexfinityStore.`
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    updateSeoMetadata({
      title: `${name} | Shop online on NexfinityStore`,
      description,
      canonical: window.location.pathname,
      image: store.store_logo_url,
    });
  }, [store]);

  // VENDOR WHATSAPP LINK
  const getWhatsAppLink = (message) => {
    if (!store?.phone) return null;

    let number = String(store.phone).replace(/\D/g, "");

    if (number.startsWith("2340")) {
      number = `234${number.slice(4)}`;
    } else if (number.startsWith("0")) {
      number = `234${number.slice(1)}`;
    } else if (number.length === 10) {
      number = `234${number}`;
    }

    if (!number.startsWith("234") || number.length !== 13) {
      console.error("Invalid vendor WhatsApp number:", store.phone);
      return null;
    }

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  // APP-STYLE NAVIGATION HELPERS
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goHome = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCategories = () => {
    setActiveCategory("All");
    scrollToSection("store-category-list");
  };

  const contactVendor = () => {
    const link = getWhatsAppLink(
      `Hello ${storeName}, I found your store on Nexfinity Store. I would like to make an enquiry.`
    );

    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      window.alert("This store has not added a valid WhatsApp contact number yet.");
    }
  };

  // CART HELPERS
  const addToCart = (product) => {
    if (!product?.id || !product.is_available) return;

    setOrderResult(null);

    setCart((previous) => ({
      ...previous,
      [product.id]: Math.min((previous[product.id] || 0) + 1, 99),
    }));
  };

  const updateCartQuantity = (productId, quantity) => {
    setCart((previous) => {
      const updated = { ...previous };

      if (quantity <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = Math.min(Math.max(Math.floor(quantity), 1), 99);
      }

      return updated;
    });
  };

  const removeFromCart = (productId) => {
    setCart((previous) => {
      const updated = { ...previous };
      delete updated[productId];
      return updated;
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);

        if (!product || !product.is_available) return null;

        return {
          ...product,
          quantity,
          lineTotal: Number(product.price) * quantity,
        };
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  );

  // CUSTOMER FORM
  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomer((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // CHECKOUT AND ORDER SUBMISSION
  const submitOrder = async (event) => {
    event.preventDefault();
    setCheckoutError("");

    if (submissionInProgress.current || submittingOrder) return;

    if (!cartItems.length) {
      setCheckoutError("Your shopping cart is empty.");
      return;
    }

    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setCheckoutError("Please complete all required customer details.");
      return;
    }

    if (!store?.id) {
      setCheckoutError("Store information is missing. Please refresh the page.");
      return;
    }

    submissionInProgress.current = true;
    setSubmittingOrder(true);

    try {
      const { data: currentProducts, error: productError } = await supabase
        .from("products")
        .select("id, name, price, is_available")
        .eq("vendor_id", store.id)
        .in("id", cartItems.map((item) => item.id));

      if (productError) throw productError;

      const currentProductsById = new Map(
        (currentProducts || []).map((product) => [product.id, product])
      );
      const cartProductIds = new Set(cartItems.map((item) => item.id));
      const syncProducts = (current) =>
        current.flatMap((product) => {
          const currentProduct = currentProductsById.get(product.id);

          if (cartProductIds.has(product.id) && !currentProduct) {
            return [];
          }

          return currentProduct
            ? [{ ...product, ...currentProduct }]
            : [product];
        });
      const unavailableProduct = cartItems.some((item) => {
        const currentProduct = currentProductsById.get(item.id);
        return !currentProduct || !currentProduct.is_available;
      });

      if (unavailableProduct) {
        setProducts(syncProducts);
        throw new Error(
          "A product in your cart is no longer available. Review your cart and try again."
        );
      }

      const priceChanged = cartItems.some(
        (item) =>
          Number(currentProductsById.get(item.id).price) !==
          Number(item.price)
      );

      if (priceChanged) {
        setProducts(syncProducts);
        throw new Error(
          "Product prices have changed. Review your updated cart total before placing the order."
        );
      }

      const orderedProducts = cartItems.map((item) => {
        const currentProduct = currentProductsById.get(item.id);
        const price = Number(currentProduct.price);

        return {
          name: currentProduct.name,
          quantity: item.quantity,
          price,
          lineTotal: price * item.quantity,
        };
      });

      const items = cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { data, error: orderError } = await supabase.rpc(
        "create_store_order",
        {
          p_vendor_id: store.id,
          p_customer_name: customer.name.trim(),
          p_customer_phone: customer.phone.trim(),
          p_delivery_address: customer.address.trim(),
          p_customer_note: customer.note.trim() || null,
          p_items: items,
        }
      );

      if (orderError) {
        console.error("Order submission error:", orderError);
        throw new Error(orderError.message || "We couldn't submit your order.");
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success || !result?.order_reference) {
        console.error("Unexpected order response:", data);
        throw new Error(
          result?.message || "The order confirmation could not be generated."
        );
      }

      const orderReference = result.order_reference;
      const orderTotal = Number(result.total_amount);

      const messageLines = [
        `Hello ${storeName}, I have placed an order on your Nexfinity Store.`,
        "",
        `Order reference: ${orderReference}`,
        "",
        "MY ORDER:",
        ...orderedProducts.map(
          (item) =>
            `${item.name} x ${item.quantity} = ${formatPrice(item.lineTotal)}`
        ),
        "",
        `Order total: ${formatPrice(orderTotal)}`,
        "",
        "CUSTOMER DETAILS:",
        `Name: ${customer.name.trim()}`,
        `WhatsApp: ${customer.phone.trim()}`,
        `Delivery address: ${customer.address.trim()}`,
      ];

      if (customer.note.trim()) {
        messageLines.push("", `Additional note: ${customer.note.trim()}`);
      }

      messageLines.push(
        "",
        "Please confirm my order and let me know the next steps.",
        "",
        "Thank you!"
      );

      const whatsappMessage = messageLines.join("\n");
      const whatsappLink = getWhatsAppLink(whatsappMessage);

      setCart({});
      setCheckoutOpen(false);
      setCartOpen(false);

      if (whatsappLink) {
        window.location.assign(whatsappLink);
        return;
      }

      setOrderResult({
        orderId: result.order_id,
        reference: orderReference,
        total: orderTotal,
      });
    } catch (submitError) {
      console.error("Checkout error:", submitError);

      setCheckoutError(
        submitError.message || "Something went wrong. Please try again."
      );
    } finally {
      submissionInProgress.current = false;
      setSubmittingOrder(false);
    }
  };

  // PRODUCT COLLECTIONS
  const featuredProducts = useMemo(
    () => products.filter((product) => product.is_featured),
    [products]
  );

  // ALL AVAILABLE PRODUCTS ARE INCLUDED IN THE MAIN CATALOGUE
  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        products
          .map((product) => product.category?.trim())
          .filter(Boolean)
      ),
    ];

    return ["All", ...unique];
  }, [products]);

  // SEARCH, CATEGORY FILTER AND SORT APPLY TO ALL PRODUCTS
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (activeCategory !== "All") {
      result = result.filter(
        (product) => (product.category || "").trim() === activeCategory
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();

      result = result.filter((product) =>
        [product.name, product.description, product.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    if (sortBy === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return result;
  }, [products, activeCategory, searchTerm, sortBy]);

  const location = [
    store?.business_address,
    store?.city,
    store?.state,
  ]
    .filter(Boolean)
    .join(", ");

  // LOADING STATE
  if (loading) {
    return (
      <SharedLoadingScreen label="Preparing this storefront" />
    );
  }

  // STORE ERROR STATE
  if (error || !store) {
    return (
      <main className="public-store-state">
        <div className="public-store-error-icon">
          <AlertCircle size={30} />
        </div>

        <h1>Store unavailable</h1>
        <p>{error || "We couldn't find this store."}</p>

        <a href="/" className="public-store-home-link">
          Visit Nexfinity Store
        </a>
      </main>
    );
  }

  // ADD TO CART BUTTON
  const AddToCartButton = ({ product }) => (
    <button
      type="button"
      className="public-store-order-button public-store-add-button"
      onClick={() => addToCart(product)}
      aria-label={`Add ${product.name} to cart`}
    >
      <ShoppingCart size={17} />
      Add to Cart
    </button>
  );

  return (
    <main
      className="public-store-page public-store-app"
      id="store-top"
      style={{
        "--store-brand-color": store.store_brand_color || "#B8F500",
      }}
    >
      {/* HEADER */}
      <header className="public-store-header">
        <a href="/" className="public-store-brand">
          <span className="public-store-brand-icon">
            <Store size={19} />
          </span>
          <span>
            Nexfinity <strong>Store</strong>
          </span>
        </a>

        <div className="public-store-header-right">
          <span className="public-store-header-label">Independent Store</span>

          <button
            type="button"
            className="public-store-cart-trigger"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping cart, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            <strong>{cartCount}</strong>
          </button>
        </div>
      </header>

      {/* STORE HERO */}
      <section className="public-store-hero">
        <div className="public-store-banner-wrap">
          {store.store_banner_url ? (
            <img
              className="public-store-banner"
              src={store.store_banner_url}
              alt={`${storeName} banner`}
            />
          ) : (
            <div className="public-store-banner-placeholder">
              <div className="public-store-banner-pattern" />
              <span>{storeName}</span>
            </div>
          )}
          <div className="public-store-banner-overlay" />
        </div>

        <div className="public-store-profile">
          <div className="public-store-logo">
            {store.store_logo_url ? (
              <img src={store.store_logo_url} alt={`${storeName} logo`} />
            ) : (
              <Store size={38} />
            )}
          </div>

          <div className="public-store-identity">
            <span className="public-store-category">
              {store.business_category || "Local Business"}
            </span>

            <h1>{storeName}</h1>

            {store.business_name && store.business_name !== store.store_name && (
              <p className="public-store-business-name">
                {store.business_name}
              </p>
            )}

            {location && (
              <p className="public-store-location">
                <MapPin size={16} />
                {location}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* STORE CONTENT */}
      <section className="public-store-content">
        {/* ABOUT */}
        <div className="public-store-about">
          <div className="public-store-section-heading">
            <span className="public-store-heading-icon">
              <Store size={19} />
            </span>
            <div>
              <span className="public-store-eyebrow">GET TO KNOW US</span>
              <h2>Welcome to {storeName}</h2>
            </div>
          </div>

          <p>
            {store.business_description ||
              `Welcome to ${storeName}. Discover our products and place your order directly through our online store.`}
          </p>
        </div>

        {/* FEATURED PRODUCTS */}
        {featuredProducts.length > 0 && (
          <section className="public-store-featured-section" id="featured">
            <div className="public-store-section-heading">
              <span className="public-store-heading-icon">
                <Sparkles size={19} />
              </span>
              <div>
                <span className="public-store-eyebrow">HANDPICKED FOR YOU</span>
                <h2>Featured collection</h2>
              </div>
            </div>

            <div className="public-store-featured-grid">
              {featuredProducts.map((product) => (
                <article
                  className="public-store-featured-card"
                  key={product.id}
                >
                  <div className="public-store-featured-image">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <Package size={35} />
                    )}
                    <span>Featured</span>
                  </div>

                  <div className="public-store-featured-info">
                    <h3>{product.name}</h3>
                    <strong>{formatPrice(product.price)}</strong>
                    <AddToCartButton product={product} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ALL PRODUCTS */}
        <section
          className="public-store-products-section"
          id="products"
        >
          <div className="public-store-catalogue-heading">
            <div className="public-store-section-heading">
              <span className="public-store-heading-icon">
                <ShoppingBag size={19} />
              </span>
              <div>
                <span className="public-store-eyebrow">
                  EXPLORE OUR COLLECTION
                </span>
                <h2>Shop our products</h2>
                <p className="public-store-products-count">
                  {products.length} products available
                </p>
              </div>
            </div>

            {products.length > 0 && (
              <label className="public-store-sort">
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="latest">Latest</option>
                  <option value="price-low">Price: Low to high</option>
                  <option value="price-high">Price: High to low</option>
                </select>
              </label>
            )}
          </div>

          {productsError ? (
            <div className="public-store-products-message">
              <AlertCircle size={24} />
              <p>{productsError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="public-store-empty-products">
              <div className="public-store-products-icon">
                <Package size={28} />
              </div>
              <h2>Something exciting is coming</h2>
              <p>
                This store is preparing its collection. Check back soon for
                new products.
              </p>
            </div>
          ) : (
            <>
              <div className="public-store-toolbar">
                <div
                  className="public-store-category-list"
                  id="store-category-list"
                >
                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      className={activeCategory === category ? "active" : ""}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="public-store-search">
                  <Search size={17} />
                  <input
                    id="store-product-search"
                    type="search"
                    placeholder="Find something..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="public-store-no-results">
                  <Search size={27} />
                  <h3>No products found</h3>
                  <p>Try another search or category.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCategory("All");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="public-store-products-grid">
                  {filteredProducts.map((product) => {
                    const hasDiscount =
                      product.compare_at_price &&
                      Number(product.compare_at_price) > Number(product.price);

                    const discount = hasDiscount
                      ? Math.round(
                          (1 -
                            Number(product.price) /
                              Number(product.compare_at_price)) *
                            100
                        )
                      : 0;

                    return (
                      <article
                        className="public-store-product-card"
                        key={product.id}
                      >
                        <div className="public-store-product-image">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="public-store-product-no-image">
                              <ShoppingBag size={35} />
                            </div>
                          )}

                          {discount > 0 && (
                            <span className="public-store-discount">
                              {discount}% OFF
                            </span>
                          )}
                        </div>

                        <div className="public-store-product-details">
                          {product.category && (
                            <span className="public-store-product-category">
                              {product.category}
                            </span>
                          )}

                          <h3>{product.name}</h3>

                          {product.description && (
                            <p>{product.description}</p>
                          )}

                          <div className="public-store-product-bottom">
                            <div className="public-store-product-prices">
                              <strong>{formatPrice(product.price)}</strong>
                              {hasDiscount && (
                                <del>
                                  {formatPrice(product.compare_at_price)}
                                </del>
                              )}
                            </div>
                            <AddToCartButton product={product} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </section>

      {/* CART PANEL */}
      {cartOpen && (
        <div
          className="public-store-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCartOpen(false);
            }
          }}
        >
          <section
            className="public-store-cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-cart-title"
          >
            <div className="public-store-modal-heading">
              <div>
                <span className="public-store-eyebrow">YOUR SELECTION</span>
                <h2 id="public-cart-title">Shopping cart</h2>
              </div>
              <button
                type="button"
                className="public-store-close-button"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <X size={21} />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="public-store-cart-empty">
                <ShoppingBag size={38} />
                <h3>Your cart is empty</h3>
                <p>Add products from this store to get started.</p>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="public-store-cart-items">
                  {cartItems.map((item) => (
                    <article
                      className="public-store-cart-item"
                      key={item.id}
                    >
                      <div className="public-store-cart-item-image">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} />
                        ) : (
                          <Package size={24} />
                        )}
                      </div>

                      <div className="public-store-cart-item-info">
                        <h3>{item.name}</h3>
                        <strong>{formatPrice(item.price)}</strong>

                        <div className="public-store-quantity-control">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.id, item.quantity - 1)
                            }
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.id, item.quantity + 1)
                            }
                            aria-label={`Increase ${item.name} quantity`}
                            disabled={item.quantity >= 99}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="public-store-cart-item-end">
                        <strong>{formatPrice(item.lineTotal)}</strong>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="public-store-cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                  <p>
                    Delivery charges, if applicable, will be confirmed by the
                    vendor.
                  </p>
                  <button
                    type="button"
                    className="public-store-checkout-button"
                    onClick={() => {
                      setCheckoutError("");
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Proceed to checkout
                    <ShoppingBag size={17} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* CHECKOUT PANEL */}
      {checkoutOpen && (
        <div
          className="public-store-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submittingOrder
            ) {
              setCheckoutOpen(false);
            }
          }}
        >
          <section
            className="public-store-checkout-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-checkout-title"
          >
            <div className="public-store-modal-heading">
              <div>
                <span className="public-store-eyebrow">ALMOST THERE</span>
                <h2 id="public-checkout-title">Complete your order</h2>
              </div>
              <button
                type="button"
                className="public-store-close-button"
                onClick={() => setCheckoutOpen(false)}
                disabled={submittingOrder}
                aria-label="Close checkout"
              >
                <X size={21} />
              </button>
            </div>

            <div className="public-store-checkout-summary">
              <span>{cartCount} item(s) in your order</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>

            <form
              className="public-store-checkout-form"
              onSubmit={submitOrder}
            >
              <label>
                Full name <span>*</span>
                <input
                  type="text"
                  name="name"
                  value={customer.name}
                  onChange={handleCustomerChange}
                  placeholder="Enter your full name"
                  maxLength={150}
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                WhatsApp phone number <span>*</span>
                <input
                  type="tel"
                  name="phone"
                  value={customer.phone}
                  onChange={handleCustomerChange}
                  placeholder="e.g. 08012345678"
                  maxLength={30}
                  autoComplete="tel"
                  required
                />
              </label>

              <label>
                Delivery address <span>*</span>
                <textarea
                  name="address"
                  value={customer.address}
                  onChange={handleCustomerChange}
                  placeholder="Enter your delivery address"
                  maxLength={1000}
                  rows={3}
                  autoComplete="street-address"
                  required
                />
              </label>

              <label>
                Additional note <small>(Optional)</small>
                <textarea
                  name="note"
                  value={customer.note}
                  onChange={handleCustomerChange}
                  placeholder="Any extra information for the vendor?"
                  maxLength={1000}
                  rows={2}
                />
              </label>

              {checkoutError && (
                <div className="public-store-checkout-error">
                  <AlertCircle size={17} />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="public-store-checkout-total">
                <span>Order total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>

              <p className="public-store-checkout-disclaimer">
                Your order will be saved and sent to the vendor through
                WhatsApp. Payment and delivery arrangements will be confirmed
                directly with the vendor.
              </p>

              <button
                type="submit"
                className="public-store-checkout-button"
                disabled={submittingOrder || cartItems.length === 0}
              >
                {submittingOrder ? (
                  <>
                    <LoaderCircle
                      className="public-store-spinner"
                      size={18}
                    />
                    Submitting order...
                  </>
                ) : (
                  <>
                    Place order
                    <ShoppingBag size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="public-store-back-button"
                onClick={() => {
                  setCheckoutOpen(false);
                  setCartOpen(true);
                }}
                disabled={submittingOrder}
              >
                <ArrowLeft size={15} />
                Back to cart
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ORDER SUCCESS FALLBACK */}
      {orderResult && (
        <div className="public-store-modal-backdrop">
          <section
            className="public-store-success-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-order-success-title"
          >
            <div className="public-store-success-icon">
              <CheckCircle2 size={36} />
            </div>

            <span className="public-store-eyebrow">ORDER RECEIVED</span>
            <h2 id="public-order-success-title">
              Thank you for your order!
            </h2>
            <p>
              Your order has been saved successfully. Keep your order
              reference for future enquiries.
            </p>

            <div className="public-store-order-reference">
              <span>Order reference</span>
              <strong>{orderResult.reference}</strong>
            </div>

            <div className="public-store-success-total">
              <span>Order total</span>
              <strong>{formatPrice(orderResult.total)}</strong>
            </div>

            <p className="public-store-whatsapp-unavailable">
              Your order is saved, but this store does not have a valid
              WhatsApp contact number. Please keep your order reference.
            </p>

            <button
              type="button"
              className="public-store-done-button"
              onClick={() => setOrderResult(null)}
            >
              Continue shopping
            </button>
          </section>
        </div>
      )}

      {/* MOBILE-ONLY BOTTOM NAVIGATION */}
      <nav
        className="public-store-bottom-nav"
        aria-label="Store navigation"
      >
        <button
          type="button"
          className="public-store-nav-item"
          onClick={goHome}
          aria-label="Go to home"
        >
          <Home size={21} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className="public-store-nav-item"
          onClick={openCategories}
          aria-label="Browse product categories"
        >
          <Grid2X2 size={21} />
          <span>Categories</span>
        </button>

        <button
          type="button"
          className="public-store-nav-item public-store-nav-cart"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <ShoppingCart size={21} />
          {cartCount > 0 && (
            <span className="public-store-nav-badge">{cartCount}</span>
          )}
          <span>Cart</span>
        </button>

        <button
          type="button"
          className="public-store-nav-item"
          onClick={contactVendor}
          aria-label="Contact vendor on WhatsApp"
        >
          <MessageCircle size={21} />
          <span>Contact</span>
        </button>
      </nav>
    </main>
  );
}
