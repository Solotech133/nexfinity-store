
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
  subcategory: "",
  image_url: "",
  is_featured: false,
  is_available: true,
};

const planLimits = {
  free: 10,
  starter: 10,
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

async function fetchVendorProducts(vendorId) {
  if (!vendorId) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      vendor_id,
      name,
      description,
      price,
      compare_at_price,
      category,
      subcategory,
      image_url,
      is_featured,
      is_available,
      created_at,
      updated_at
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const products = data || [];
  if (products.length === 0) return products;

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      variant_name,
      color,
      size,
      stock_quantity,
      is_active
    `)
    .in(
      "product_id",
      products.map((product) => product.id)
    )
    .order("sort_order", { ascending: true });

  if (variantsError) throw variantsError;

  const variantsByProduct = (variants || []).reduce(
    (result, variant) => {
      if (!result[variant.product_id]) {
        result[variant.product_id] = [];
      }
      result[variant.product_id].push(variant);
      return result;
    },
    {}
  );

  return products.map((product) => ({
    ...product,
    variants: variantsByProduct[product.id] || [],
  }));
}

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
  return (
    <ProductManagerContent
      key={vendor?.id ?? "no-vendor"}
      vendor={vendor}
    />
  );
}

function ProductManagerContent({ vendor }) {
  const fileInputRef = useRef(null);
  const saveInProgress = useRef(false);

  const vendorId = vendor?.id;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(Boolean(vendorId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variants, setVariants] = useState([]);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  // Normalise plan names received from Supabase.
  const plan = String(vendor?.plan || "free")
    .toLowerCase()
    .replace(/\s+plan$/, "")
    .trim();

  const configuredProductLimit = vendor?.product_limit;
  const productLimit =
    configuredProductLimit == null
      ? planLimits[plan] ?? planLimits.free
      : Number(configuredProductLimit);
  const effectiveProductLimit =
    productLimit === -1 || productLimit === 2147483647
      ? Infinity
      : Number.isFinite(productLimit) && productLimit >= 0
        ? productLimit
        : planLimits[plan] ?? planLimits.free;
  const isUnlimited = effectiveProductLimit === Infinity;

  const canAddProduct =
    isUnlimited || products.length < effectiveProductLimit;

  // Initial product loading.
  // State updates happen after the asynchronous request completes.
  useEffect(() => {
    if (!vendorId) return;

    let isMounted = true;

    const loadInitialProducts = async () => {
      try {
        const data = await fetchVendorProducts(vendorId);

        if (isMounted) {
          setProducts(data);
          setError("");
        }
      } catch (err) {
        console.error("Product loading error:", err);

        if (isMounted) {
          setError(
            "Unable to load your products. Please refresh and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialProducts();

    return () => {
      isMounted = false;
    };
  }, [vendorId]);

  // Reload products after creating, editing, deleting,
  // or changing product availability.
  const loadProducts = useCallback(async () => {
    if (!vendorId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchVendorProducts(vendorId);
      setProducts(data);
    } catch (err) {
      console.error("Product loading error:", err);

      setError(
        "Unable to load your products. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

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
        product.subcategory,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toLowerCase().includes(term)
        )
    );
  }, [products, search]);

  const existingSubcategories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.subcategory?.trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [products]
  );

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
    setVariantsEnabled(false);
    setVariants([]);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // Open edit form.
  const openEditForm = async (product) => {
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
      subcategory: product.subcategory || "",
      image_url: product.image_url || "",
      is_featured: Boolean(product.is_featured),
      is_available: Boolean(product.is_available),
    });
    setVariants([]);
    setVariantsEnabled(false);

    try {
      const { data, error: variantError } = await supabase
        .from("product_variants")
        .select(`
          id,
          product_id,
          variant_name,
          color,
          size,
          sku,
          attributes,
          price,
          stock_quantity,
          image_url,
          is_active,
          sort_order
        `)
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });

      if (variantError) throw variantError;

      const loadedVariants = (data || []).map((variant) => ({
        ...variant,
        material: variant.attributes?.material || "",
        style: variant.attributes?.style || "",
        customAttributes: (() => {
          if (!variant.attributes) return "";
          const custom = { ...variant.attributes };
          delete custom.material;
          delete custom.style;
          delete custom.customAttributes;
          return Object.keys(custom).length > 0
            ? JSON.stringify(custom)
            : "";
        })(),
        selectedImage: null,
        imagePreview: "",
        removeExistingImage: false,
      }));
      setVariants(loadedVariants);
      setVariantsEnabled(loadedVariants.length > 0);
    } catch (variantLoadError) {
      console.error("Variant loading error:", variantLoadError);
      setError("The product loaded, but variants could not be loaded.");
    }

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
    setVariantsEnabled(false);
    setVariants([]);
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

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        id: null,
        _key: crypto.randomUUID(),
        variant_name: "",
        color: "",
        size: "",
        sku: "",
        price: "",
        stock_quantity: 0,
        image_url: "",
        is_active: true,
        material: "",
        style: "",
        customAttributes: "",
        selectedImage: null,
        imagePreview: "",
        removeExistingImage: false,
      },
    ]);
  };

  const updateVariant = (key, field, value) => {
    setVariants((current) =>
      current.map((variant) =>
        (variant.id || variant._key) === key
          ? { ...variant, [field]: value }
          : variant
      )
    );
  };

  const removeVariant = async (variant) => {
    const key = variant.id || variant._key;

    if (variant.id) {
      const confirmed = window.confirm(
        `Deactivate variant "${variant.variant_name || [variant.color, variant.size].filter(Boolean).join(" / ") || "this variant"}"? It will remain in historical orders.`
      );
      if (!confirmed) return;

      const { error: deactivateError } = await supabase
        .from("product_variants")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", variant.id)
        .eq("product_id", editingId);

      if (deactivateError) {
        setError(deactivateError.message || "Unable to deactivate this variant.");
        return;
      }
    }

    setVariants((current) =>
      current.filter(
        (item) => (item.id || item._key) !== key
      )
    );
  };

  const handleVariantImageSelection = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!allowedImageTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, WEBP or GIF variant image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Each variant image must not be larger than 5MB.");
      event.target.value = "";
      return;
    }

    setVariants((current) =>
      current.map((variant) => {
        if ((variant.id || variant._key) !== key) return variant;

        if (variant.imagePreview?.startsWith("blob:")) {
          URL.revokeObjectURL(variant.imagePreview);
        }

        return {
          ...variant,
          selectedImage: file,
          imagePreview: URL.createObjectURL(file),
          removeExistingImage: false,
        };
      })
    );
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
      const filePath = `${vendorId}/${fileName}`;

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

  const uploadVariantImage = async (variant) => {
    if (!variant.selectedImage) {
      return variant.removeExistingImage ? null : variant.image_url || null;
    }

    setUploading(true);

    try {
      const fileExtension =
        variant.selectedImage.name.split(".").pop()?.toLowerCase() ||
        "jpg";
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = `${vendorId}/variants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, variant.selectedImage, {
          cacheControl: "3600",
          upsert: false,
          contentType: variant.selectedImage.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new Error("Unable to generate the variant image URL.");
      }

      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  // Save product.
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saveInProgress.current || saving) return;

    setError("");
    setSuccess("");

    if (!vendorId) {
      setError(
        "Vendor information is missing. Please sign in again."
      );
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a product name.");
      return;
    }

    if (!form.category.trim()) {
      setError("Enter a product category.");
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

    if (variantsEnabled) {
      const combinationKeys = new Set();

      for (const variant of variants) {
        const color = variant.color.trim();
        const size = variant.size.trim();
        const name = variant.variant_name.trim();
        const combination = [color, size, name].join("|").toLowerCase();

        if (!color && !size && !name) {
          setError(
            "Give each variant a name, colour or size."
          );
          return;
        }

        if (combinationKeys.has(combination)) {
          setError(
            "Duplicate variants are not allowed. Use a different name, colour or size."
          );
          return;
        }
        combinationKeys.add(combination);

        if (
          variant.price !== "" &&
          (!Number.isFinite(Number(variant.price)) ||
            Number(variant.price) < 0)
        ) {
          setError("Enter a valid individual variant price.");
          return;
        }

        if (
          !Number.isInteger(Number(variant.stock_quantity)) ||
          Number(variant.stock_quantity) < 0
        ) {
          setError("Variant stock quantity must be a whole number of zero or more.");
          return;
        }
      }
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

    saveInProgress.current = true;
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
        category: form.category.trim(),
        subcategory: form.subcategory.trim() || null,
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
          .eq("vendor_id", vendorId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("products")
          .insert({
            ...payload,
            vendor_id: vendorId,
          })
          .select()
          .single();
      }

      if (result.error) {
        if (uploadedImageUrl) {
          const newPath = getStoragePath(
            uploadedImageUrl,
            vendorId
          );

          if (newPath) {
            await supabase.storage
              .from("product-images")
              .remove([newPath]);
          }
        }

        throw result.error;
      }

      const savedProductId = result.data.id;

      if (editingId && !variantsEnabled) {
        const { error: deactivateVariantsError } = await supabase
          .from("product_variants")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", savedProductId);

        if (deactivateVariantsError) {
          throw deactivateVariantsError;
        }
      }

      if (variantsEnabled) {
        for (let index = 0; index < variants.length; index += 1) {
          const variant = variants[index];
          let customAttributes = {};

          if (variant.customAttributes?.trim()) {
            try {
              customAttributes = JSON.parse(variant.customAttributes);
            } catch {
              throw new Error(
                "Custom variant attributes must be valid JSON."
              );
            }
          }

          const attributes = {
            ...customAttributes,
            ...(variant.material?.trim()
              ? { material: variant.material.trim() }
              : {}),
            ...(variant.style?.trim()
              ? { style: variant.style.trim() }
              : {}),
          };
          const variantImageUrl = await uploadVariantImage(variant);
          const variantPayload = {
            product_id: savedProductId,
            variant_name: variant.variant_name.trim() || null,
            color: variant.color.trim() || null,
            size: variant.size.trim() || null,
            sku: variant.sku.trim() || null,
            attributes,
            price:
              variant.price === ""
                ? null
                : Number(variant.price),
            stock_quantity: Number(variant.stock_quantity),
            image_url: variantImageUrl,
            is_active: Boolean(variant.is_active),
            sort_order: index,
            updated_at: new Date().toISOString(),
          };

          const variantResult = variant.id
            ? await supabase
                .from("product_variants")
                .update(variantPayload)
                .eq("id", variant.id)
                .eq("product_id", savedProductId)
                .select()
                .single()
            : await supabase
                .from("product_variants")
                .insert(variantPayload)
                .select()
                .single();

          if (variantResult.error) {
            throw variantResult.error;
          }

          if (
            variant.id &&
            variant.image_url &&
            (variant.selectedImage || variant.removeExistingImage)
          ) {
            const oldVariantPath = getStoragePath(
              variant.image_url,
              vendorId
            );
            if (oldVariantPath) {
              await supabase.storage
                .from("product-images")
                .remove([oldVariantPath]);
            }
          }
        }
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
            vendorId
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
      saveInProgress.current = false;
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
        .eq("vendor_id", vendorId);

      if (deleteError) throw deleteError;

      if (product.image_url) {
        const imagePath = getStoragePath(
          product.image_url,
          vendorId
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
      .eq("vendor_id", vendorId);

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
    : `${products.length} of ${effectiveProductLimit} products`;

  const usagePercentage = isUnlimited
    ? 0
    : Math.min(
        effectiveProductLimit > 0
          ? (products.length / effectiveProductLimit) * 100
          : 100,
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

        {!isUnlimited && products.length >= effectiveProductLimit && (
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
                  {[product.category, product.subcategory]
                    .filter(Boolean)
                    .join(" / ") || "Uncategorised"}
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

                {product.variants?.some(
                  (variant) =>
                    variant.is_active &&
                    Number(variant.stock_quantity) <= 5
                ) && (
                  <p className="product-card-low-stock">
                    Low-stock variant
                  </p>
                )}

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

              <div className="product-form-row">
                <label>
                  Category

                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    placeholder="e.g. Fashion"
                    maxLength={80}
                  />
                </label>

                <label>
                  Subcategory

                  <input
                    type="text"
                    list="existing-product-subcategories"
                    value={form.subcategory}
                    onChange={(event) =>
                      updateField("subcategory", event.target.value)
                    }
                    placeholder="e.g. Crossbody bags"
                    maxLength={80}
                  />
                  <datalist id="existing-product-subcategories">
                    {existingSubcategories.map((subcategory) => (
                      <option value={subcategory} key={subcategory} />
                    ))}
                  </datalist>
                </label>
              </div>

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

              <div className="product-variants-section">
                <div className="product-variants-heading">
                  <div>
                    <strong>Product variants</strong>
                    <span>Optional · Colours, sizes, materials or styles</span>
                  </div>
                  <label className="product-checkbox-label">
                    <input
                      type="checkbox"
                      checked={variantsEnabled}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setVariantsEnabled(enabled);
                        if (enabled && variants.length === 0) {
                          addVariant();
                        }
                      }}
                    />
                    Enable variants
                  </label>
                </div>

                {variantsEnabled && (
                  <>
                    {variants.map((variant, index) => {
                      const key = variant.id || variant._key;
                      const preview =
                        variant.imagePreview ||
                        (!variant.removeExistingImage
                          ? variant.image_url
                          : "");

                      return (
                        <div className="product-variant-editor" key={key}>
                          <div className="product-variant-editor-heading">
                            <strong>Variant {index + 1}</strong>
                            <button
                              type="button"
                              className="product-delete-button"
                              onClick={() => removeVariant(variant)}
                              disabled={saving}
                            >
                              <Trash2 size={15} />
                              Remove
                            </button>
                          </div>

                          <div className="product-form-row">
                            <label>
                              Variant name
                              <input
                                type="text"
                                value={variant.variant_name || ""}
                                onChange={(event) =>
                                  updateVariant(
                                    key,
                                    "variant_name",
                                    event.target.value
                                  )
                                }
                                placeholder="e.g. Premium oversized"
                                maxLength={150}
                              />
                            </label>
                            <label>
                              SKU (optional)
                              <input
                                type="text"
                                value={variant.sku || ""}
                                onChange={(event) =>
                                  updateVariant(key, "sku", event.target.value)
                                }
                                placeholder="e.g. TSHIRT-BLK-M"
                                maxLength={100}
                              />
                            </label>
                          </div>

                          <div className="product-form-row">
                            <label>
                              Colour
                              <input
                                type="text"
                                value={variant.color || ""}
                                onChange={(event) =>
                                  updateVariant(key, "color", event.target.value)
                                }
                                placeholder="e.g. Black"
                                maxLength={80}
                              />
                            </label>
                            <label>
                              Size
                              <input
                                type="text"
                                value={variant.size || ""}
                                onChange={(event) =>
                                  updateVariant(key, "size", event.target.value)
                                }
                                placeholder="e.g. Medium"
                                maxLength={80}
                              />
                            </label>
                          </div>

                          <div className="product-form-row">
                            <label>
                              Material
                              <input
                                type="text"
                                value={variant.material || ""}
                                onChange={(event) =>
                                  updateVariant(
                                    key,
                                    "material",
                                    event.target.value
                                  )
                                }
                                placeholder="e.g. Cotton"
                                maxLength={80}
                              />
                            </label>
                            <label>
                              Style
                              <input
                                type="text"
                                value={variant.style || ""}
                                onChange={(event) =>
                                  updateVariant(key, "style", event.target.value)
                                }
                                placeholder="e.g. Oversized"
                                maxLength={80}
                              />
                            </label>
                          </div>

                          <div className="product-form-row">
                            <label>
                              Individual price (optional)
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price ?? ""}
                                onChange={(event) =>
                                  updateVariant(key, "price", event.target.value)
                                }
                                placeholder="Uses product price when blank"
                              />
                            </label>
                            <label>
                              Stock quantity
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={variant.stock_quantity ?? 0}
                                onChange={(event) =>
                                  updateVariant(
                                    key,
                                    "stock_quantity",
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                          </div>

                          <label>
                            Other attributes (optional JSON)
                            <textarea
                              rows={2}
                              value={variant.customAttributes || ""}
                              onChange={(event) =>
                                updateVariant(
                                  key,
                                  "customAttributes",
                                  event.target.value
                                )
                              }
                              placeholder={'{"fit":"regular","length":"long"}'}
                              maxLength={2000}
                            />
                          </label>

                          <div className="product-variant-image">
                            {preview ? (
                              <img src={preview} alt={`${variant.variant_name || "Variant"} preview`} />
                            ) : (
                              <ImagePlus size={24} />
                            )}
                            <div>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                hidden
                                id={`variant-image-${key}`}
                                onChange={(event) =>
                                  handleVariantImageSelection(key, event)
                                }
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById(`variant-image-${key}`)
                                    ?.click()
                                }
                                disabled={saving}
                              >
                                <Upload size={14} />
                                {preview ? "Replace image" : "Add image"}
                              </button>
                              {preview && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVariants((current) =>
                                      current.map((item) =>
                                        (item.id || item._key) === key
                                          ? {
                                              ...item,
                                              selectedImage: null,
                                              imagePreview: "",
                                              removeExistingImage: true,
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  disabled={saving}
                                >
                                  <Trash size={14} />
                                  Remove image
                                </button>
                              )}
                            </div>
                          </div>

                          <label className="product-checkbox-label">
                            <input
                              type="checkbox"
                              checked={Boolean(variant.is_active)}
                              onChange={(event) =>
                                updateVariant(
                                  key,
                                  "is_active",
                                  event.target.checked
                                )
                              }
                            />
                            Variant active and available
                          </label>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="product-add-button"
                      onClick={addVariant}
                      disabled={saving}
                    >
                      <Plus size={16} />
                      Add another variant
                    </button>
                  </>
                )}
              </div>

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
