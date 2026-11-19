
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  X,
  Save,
  ImagePlus,
  Star,
  Eye,
  EyeOff,
  LoaderCircle,
  AlertCircle,
  Upload,
  Trash,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./ProductManager.css";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  category: "",
  image_url: "",
  is_featured: false,
  is_available: true,
};

const planLimits = {
  free: 10,
  starter: 50,
  growth: 200,
  business: Infinity,
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(price || 0));

function getStoragePath(imageUrl, vendorId) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker =
      "/storage/v1/object/public/product-images/";

    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const path = decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );

    if (!path.startsWith(`${vendorId}/`)) return null;

    return path;
  } catch {
    return null;
  }
}

export default function ProductManager({ vendor }) {
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  // Normalise plan names received from Supabase.
  const plan = String(vendor?.plan || "free")
    .toLowerCase()
    .replace(/\s+plan$/, "")
    .trim();

  const productLimit = planLimits[plan] ?? planLimits.free;
  const isUnlimited = productLimit === Infinity;
  const canAddProduct =
    isUnlimited || products.length < productLimit;

  // Load products.
  const loadProducts = useCallback(async () => {
    if (!vendor?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select(`
          id,
          vendor_id,
          name,
          description,
          price,
          compare_at_price,
          category,
          image_url,
          is_featured,
          is_available,
          created_at,
          updated_at
        `)
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      console.error("Product loading error:", err);

      setError(
        "Unable to load your products. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [vendor?.id]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Clean up temporary image previews.
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Search products.
  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return products;

    return products.filter((product) =>
      [
        product.name,
        product.description,
        product.category,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(term)
        )
    );
  }, [products, search]);

  // Reset image selection.
  const resetImageSelection = () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");
    setRemoveExistingImage(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Open new product form.
  const openNewForm = () => {
    if (!canAddProduct) {
      setError(
        "You've reached your product limit. Upgrade your plan to add more products."
      );
      return;
    }

    resetImageSelection();
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Open edit form.
  const openEditForm = (product) => {
    resetImageSelection();

    setEditingId(product.id);

    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      compare_at_price:
        product.compare_at_price == null
          ? ""
          : String(product.compare_at_price),
      category: product.category || "",
      image_url: product.image_url || "",
      is_featured: Boolean(product.is_featured),
      is_available: Boolean(product.is_available),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Close form.
  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    resetImageSelection();
    setError("");
  };

  // Update form field.
  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // Select image from device.
  const handleImageSelection = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!allowedImageTypes.includes(file.type)) {
      setError(
        "Please select a JPG, PNG, WEBP or GIF image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Your image must not be larger than 5MB.");

      event.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedImage(file);
    setImagePreview(previewUrl);
    setRemoveExistingImage(false);
  };

  // Upload image to Supabase Storage.
  const uploadProductImage = async () => {
    if (!selectedImage) {
      return form.image_url || null;
    }

    setUploading(true);

    try {
      const fileExtension =
        selectedImage.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `${vendor.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, selectedImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedImage.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Unable to generate the image URL.");
      }

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  // Save product.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!vendor?.id) {
      setError("Vendor information is missing. Please sign in again.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a product name.");
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Enter a valid product price.");
      return;
    }

    if (
      form.compare_at_price !== "" &&
      (!Number.isFinite(Number(form.compare_at_price)) ||
        Number(form.compare_at_price) < 0)
    ) {
      setError("Enter a valid previous price.");
      return;
    }

    if (
      form.compare_at_price !== "" &&
      Number(form.compare_at_price) <= Number(form.price)
    ) {
      setError(
        "The previous price must be higher than the selling price."
      );
      return;
    }

    if (
      form.image_url.trim() &&
      !/^https?:\/\/.+/i.test(form.image_url.trim())
    ) {
      setError(
        "Enter a valid image URL or select an image from your device."
      );
      return;
    }

    // Enforce product limit when adding a new product.
    if (!editingId && !canAddProduct) {
      setError(
        "You've reached your product limit. Upgrade your plan to add more products."
      );
      return;
    }

    setSaving(true);

    let uploadedImageUrl = null;

    try {
      if (selectedImage) {
        uploadedImageUrl = await uploadProductImage();
      }

      const imageUrl = selectedImage
        ? uploadedImageUrl
        : removeExistingImage
          ? null
          : form.image_url.trim() || null;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        compare_at_price:
          form.compare_at_price === ""
            ? null
            : Number(form.compare_at_price),
        category: form.category.trim() || null,
        image_url: imageUrl,
        is_featured: form.is_featured,
        is_available: form.is_available,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (editingId) {
        result = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId)
          .eq("vendor_id", vendor.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("products")
          .insert({
            ...payload,
            vendor_id: vendor.id,
          })
          .select()
          .single();
      }

      if (result.error) {
        if (uploadedImageUrl) {
          const newPath = getStoragePath(
            uploadedImageUrl,
            vendor.id
          );

          if (newPath) {
            await supabase.storage
              .from("product-images")
              .remove([newPath]);
          }
        }

        throw result.error;
      }

      // Remove old image after successful update.
      if (editingId) {
        const oldProduct = products.find(
          (product) => product.id === editingId
        );

        const oldImageUrl = oldProduct?.image_url;

        if (
          oldImageUrl &&
          (selectedImage || removeExistingImage)
        ) {
          const oldPath = getStoragePath(
            oldImageUrl,
            vendor.id
          );

          if (oldPath) {
            const { error: removeError } =
              await supabase.storage
                .from("product-images")
                .remove([oldPath]);

            if (removeError) {
              console.warn(
                "Old product image could not be removed:",
                removeError
              );
            }
          }
        }
      }

      setSuccess(
        editingId
          ? "Product updated successfully."
          : "Product added successfully."
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      resetImageSelection();

      await loadProducts();
    } catch (err) {
      console.error("Product save error:", err);

      setError(
        err?.message ||
          "Unable to save this product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete product and stored image.
  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(product.id);

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("vendor_id", vendor.id);

      if (deleteError) throw deleteError;

      if (product.image_url) {
        const imagePath = getStoragePath(
          product.image_url,
          vendor.id
        );

        if (imagePath) {
          const { error: imageDeleteError } =
            await supabase.storage
              .from("product-images")
              .remove([imagePath]);

          if (imageDeleteError) {
            console.warn(
              "Product image cleanup failed:",
              imageDeleteError
            );
          }
        }
      }

      setSuccess("Product deleted successfully.");
      await loadProducts();
    } catch (err) {
      console.error("Product delete error:", err);

      setError(
        "Unable to delete this product. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle product availability.
  const toggleAvailability = async (product) => {
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("products")
      .update({
        is_available: !product.is_available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id)
      .eq("vendor_id", vendor.id);

    if (updateError) {
      console.error("Availability update error:", updateError);
      setError("Unable to update product availability.");
      return;
    }

    setSuccess(
      product.is_available
        ? "Product hidden from your store."
        : "Product is now available in your store."
    );

    await loadProducts();
  };

  const usageText = isUnlimited
    ? `${products.length} products · Unlimited`
    : `${products.length} of ${productLimit} products`;

  const usagePercentage = isUnlimited
    ? 0
    : Math.min(
        (products.length / productLimit) * 100,
        100
      );

  const currentImage = selectedImage
    ? imagePreview
    : removeExistingImage
      ? ""
      : imagePreview || form.image_url;

  return (
    <section className="product-manager">
      <div className="product-manager-heading">
        <div>
          <span className="product-manager-eyebrow">
            STORE MANAGEMENT
          </span>

          <h1>My Products</h1>

          <p>
            Manage the products displayed on your online store.
          </p>
        </div>

        <button
          type="button"
          className="product-add-button"
          onClick={openNewForm}
          disabled={!canAddProduct}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="product-usage-card">
        <div className="product-usage-top">
          <div>
            <span>PRODUCT USAGE</span>
            <strong>{usageText}</strong>
          </div>

          <span className="product-plan-label">
            {plan} plan
          </span>
        </div>

        {!isUnlimited && (
          <div className="product-usage-track">
            <span style={{ width: `${usagePercentage}%` }} />
          </div>
        )}

        {!isUnlimited && products.length >= productLimit && (
          <p className="product-limit-message">
            You've reached your product limit. Upgrade your plan
            to add more.
          </p>
        )}
      </div>

      {error && !showForm && (
        <div className="product-alert product-alert-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="product-alert product-alert-success">
          {success}
        </div>
      )}

      <div className="product-toolbar">
        <div className="product-search">
          <Search size={17} />

          <input
            type="search"
            placeholder="Search your products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <span className="product-total">
          {products.length}{" "}
          {products.length === 1 ? "product" : "products"}
        </span>
      </div>

      {loading ? (
        <div className="product-loading">
          <LoaderCircle size={28} />
          <p>Loading your products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="product-empty">
          <div className="product-empty-icon">
            <Package size={32} />
          </div>

          <h2>
            {search
              ? "No products found"
              : "Your store is waiting for products"}
          </h2>

          <p>
            {search
              ? "Try another product name or category."
              : "Add your first product to start building your online store."}
          </p>

          {!search && (
            <button
              type="button"
              className="product-add-button"
              onClick={openNewForm}
              disabled={!canAddProduct}
            >
              <Plus size={18} />
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-card-image">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <div className="product-image-placeholder">
                    <ImagePlus size={30} />
                    <span>No image added</span>
                  </div>
                )}

                {product.is_featured && (
                  <span className="product-featured-tag">
                    <Star size={12} fill="currentColor" />
                    Featured
                  </span>
                )}

                <span
                  className={`product-status ${
                    product.is_available
                      ? "available"
                      : "unavailable"
                  }`}
                >
                  {product.is_available ? "Available" : "Hidden"}
                </span>
              </div>

              <div className="product-card-body">
                <span className="product-card-category">
                  {product.category || "Uncategorised"}
                </span>

                <h3>{product.name}</h3>

                <p className="product-card-description">
                  {product.description || "No product description."}
                </p>

                <div className="product-card-prices">
                  <strong>{formatPrice(product.price)}</strong>

                  {product.compare_at_price && (
                    <del>
                      {formatPrice(product.compare_at_price)}
                    </del>
                  )}
                </div>

                <div className="product-card-actions">
                  <button
                    type="button"
                    onClick={() => openEditForm(product)}
                    disabled={deletingId === product.id}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAvailability(product)}
                    title={
                      product.is_available
                        ? "Hide product"
                        : "Make product available"
                    }
                    disabled={deletingId === product.id}
                  >
                    {product.is_available ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="product-delete-button"
                    onClick={() => deleteProduct(product)}
                    title="Delete product"
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id ? (
                      <LoaderCircle
                        size={15}
                        className="product-button-spinner"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="product-modal-backdrop">
          <div className="product-modal">
            <div className="product-modal-heading">
              <div>
                <span className="product-manager-eyebrow">
                  PRODUCT DETAILS
                </span>

                <h2>
                  {editingId ? "Edit Product" : "Add New Product"}
                </h2>
              </div>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Product name

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="e.g. Premium Leather Bag"
                  maxLength={150}
                  required
                />
              </label>

              <div className="product-form-row">
                <label>
                  Selling price (₦)

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    placeholder="15000"
                    required
                  />
                </label>

                <label>
                  Previous price (₦)

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compare_at_price}
                    onChange={(event) =>
                      updateField(
                        "compare_at_price",
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label>
                Category

                <input
                  type="text"
                  value={form.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                  placeholder="e.g. Accessories"
                  maxLength={80}
                />
              </label>

              <label>
                Product description

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Describe your product..."
                  rows={4}
                  maxLength={1500}
                />
              </label>

              <div className="product-image-upload-section">
                <div className="product-image-upload-heading">
                  <strong>Product image</strong>
                  <span>Optional · Maximum 5MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelection}
                  hidden
                />

                {currentImage ? (
                  <div className="product-upload-preview">
                    <img
                      src={currentImage}
                      alt="Product preview"
                    />

                    <div className="product-upload-preview-actions">
                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        disabled={saving}
                      >
                        <Upload size={15} />
                        Replace image
                      </button>

                      <button
                        type="button"
                        className="product-upload-remove"
                        onClick={() => {
                          resetImageSelection();
                          setRemoveExistingImage(true);
                        }}
                        disabled={saving}
                      >
                        <Trash size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="product-image-dropzone"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={saving}
                  >
                    <span className="product-image-upload-icon">
                      <ImagePlus size={27} />
                    </span>

                    <strong>Select a product image</strong>

                    <span>
                      Choose from your gallery or computer
                    </span>

                    <span className="product-image-upload-hint">
                      JPG, PNG, WEBP or GIF
                    </span>
                  </button>
                )}

                <p className="product-image-upload-note">
                  On supported phones, you can choose an existing
                  photo or use the camera option in your device's
                  image picker.
                </p>
              </div>

              <div className="product-form-options">
                <label className="product-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(event) =>
                      updateField(
                        "is_featured",
                        event.target.checked
                      )
                    }
                  />

                  <span>Feature this product</span>
                </label>

                <label className="product-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(event) =>
                      updateField(
                        "is_available",
                        event.target.checked
                      )
                    }
                  />

                  <span>Product is available</span>
                </label>
              </div>

              {error && (
                <div className="product-alert product-alert-error">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              <div className="product-modal-actions">
                <button
                  type="button"
                  className="product-cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-save-button"
                  disabled={saving || uploading}
                >
                  {saving || uploading ? (
                    <LoaderCircle
                      className="product-button-spinner"
                      size={17}
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {uploading
                    ? "Uploading image..."
                    : saving
                      ? "Saving..."
                      : editingId
                        ? "Save Changes"
                        : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
