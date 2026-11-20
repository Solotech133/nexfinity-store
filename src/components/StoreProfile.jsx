
import { useEffect, useRef, useState } from "react";
import {
  Store,
  Save,
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ImagePlus,
  Palette,
  Upload,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./StoreProfile.css";

const DEFAULT_BRAND_COLOR = "#B8F500";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function getInitialFormData(vendor) {
  return {
    business_name: vendor?.business_name || "",
    store_name: vendor?.store_name || "",
    business_category: vendor?.business_category || "",
    business_description: vendor?.business_description || "",
    phone: vendor?.phone || "",
    business_address: vendor?.business_address || "",
    city: vendor?.city || "",
    state: vendor?.state || "",
    store_brand_color:
      vendor?.store_brand_color || DEFAULT_BRAND_COLOR,
  };
}

export default function StoreProfile({ vendor, setVendor }) {
  return (
    <StoreProfileForm
      key={vendor?.id ?? "no-vendor"}
      vendor={vendor}
      setVendor={setVendor}
    />
  );
}

function StoreProfileForm({ vendor, setVendor }) {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(vendor)
  );

  const [logoPreview, setLogoPreview] = useState(
    () => vendor?.store_logo_url || ""
  );

  const [bannerPreview, setBannerPreview] = useState(
    () => vendor?.store_banner_url || ""
  );

  const [uploading, setUploading] = useState({
    logo: false,
    banner: false,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const logoObjectUrl = useRef(null);
  const bannerObjectUrl = useRef(null);

  // Vendor-backed state is initialized when the keyed form mounts.
  // A new vendor ID remounts this form with the new vendor's data.

  // CLEAN UP TEMPORARY IMAGE PREVIEWS
  useEffect(() => {
    return () => {
      if (logoObjectUrl.current) {
        URL.revokeObjectURL(logoObjectUrl.current);
      }

      if (bannerObjectUrl.current) {
        URL.revokeObjectURL(bannerObjectUrl.current);
      }
    };
  }, []);

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  // CREATE AN INSTANT LOCAL IMAGE PREVIEW
  const createImagePreview = (file, imageType) => {
    const previewUrl = URL.createObjectURL(file);

    if (imageType === "logo") {
      if (logoObjectUrl.current) {
        URL.revokeObjectURL(logoObjectUrl.current);
      }

      logoObjectUrl.current = previewUrl;
      setLogoPreview(previewUrl);
    } else {
      if (bannerObjectUrl.current) {
        URL.revokeObjectURL(bannerObjectUrl.current);
      }

      bannerObjectUrl.current = previewUrl;
      setBannerPreview(previewUrl);
    }
  };

  const clearTemporaryPreview = (imageType) => {
    if (imageType === "logo" && logoObjectUrl.current) {
      URL.revokeObjectURL(logoObjectUrl.current);
      logoObjectUrl.current = null;
    }

    if (imageType === "banner" && bannerObjectUrl.current) {
      URL.revokeObjectURL(bannerObjectUrl.current);
      bannerObjectUrl.current = null;
    }
  };

  // UPLOAD LOGO OR BANNER
  const uploadStoreImage = async (event, imageType) => {
    const input = event.target;
    const file = input.files?.[0];

    // Allow selecting the same image again.
    input.value = "";

    if (!file) return;

    if (!vendor?.id) {
      showMessage("Your vendor profile could not be identified.");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showMessage(
        "Unsupported image format. Please use JPG, PNG, WebP or GIF."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showMessage("Image must not exceed 5MB.");
      return;
    }

    // SHOW THE PREVIEW BEFORE UPLOADING
    createImagePreview(file, imageType);

    setUploading((previous) => ({
      ...previous,
      [imageType]: true,
    }));

    setMessage("");

    try {
      // CHECK AUTHENTICATION
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user?.id) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      // CREATE A UNIQUE STORAGE FILE PATH
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const safeExtension = /^[a-z0-9]+$/.test(extension)
        ? extension
        : "jpg";

      const filePath =
        `${user.id}/${vendor.id}/${imageType}-${Date.now()}.${safeExtension}`;

      // UPLOAD IMAGE TO SUPABASE STORAGE
      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        if (
          uploadError.message?.toLowerCase().includes("bucket")
        ) {
          throw new Error(
            'The "store-assets" storage bucket could not be found. Please check your Supabase Storage setup.'
          );
        }

        if (
          uploadError.message?.toLowerCase().includes("row-level security") ||
          uploadError.message?.toLowerCase().includes("policy")
        ) {
          throw new Error(
            "Supabase Storage permission denied. Please check the storage upload policies."
          );
        }

        throw uploadError;
      }

      // GENERATE PUBLIC IMAGE URL
      const { data: publicData } = supabase.storage
        .from("store-assets")
        .getPublicUrl(filePath);

      const imageUrl = publicData?.publicUrl;

      if (!imageUrl) {
        throw new Error("Could not generate the image URL.");
      }

      // SAVE IMAGE URL TO THE VENDOR DATABASE
      const column =
        imageType === "logo"
          ? "store_logo_url"
          : "store_banner_url";

      const { data, error: updateError } = await supabase
        .from("vendors")
        .update({
          [column]: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vendor.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(
          `Image uploaded, but its URL could not be saved: ${updateError.message}`
        );
      }

      // UPDATE PARENT VENDOR STATE
      setVendor((previous) => ({
        ...previous,
        ...data,
      }));

      // REPLACE TEMPORARY PREVIEW WITH PERMANENT URL
      clearTemporaryPreview(imageType);

      if (imageType === "logo") {
        setLogoPreview(imageUrl);
      } else {
        setBannerPreview(imageUrl);
      }

      showMessage(
        imageType === "logo"
          ? "Your store logo has been uploaded successfully."
          : "Your store banner has been uploaded successfully.",
        "success"
      );
    } catch (error) {
      console.error(`${imageType} upload error:`, error);

      showMessage(
        error.message || "Image upload failed. Please try again."
      );
    } finally {
      setUploading((previous) => ({
        ...previous,
        [imageType]: false,
      }));
    }
  };

  // SAVE BUSINESS PROFILE
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!vendor?.id) {
      showMessage("Vendor profile could not be identified.");
      return;
    }

    if (uploading.logo || uploading.banner) {
      showMessage("Please wait for your image uploads to finish.");
      return;
    }

    if (
      !/^#[0-9A-Fa-f]{6}$/.test(formData.store_brand_color)
    ) {
      showMessage("Please enter a valid six-digit brand colour.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("vendors")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vendor.id)
        .select()
        .single();

      if (error) throw error;

      setVendor((previous) => ({
        ...previous,
        ...data,
      }));

      showMessage(
        "Your store profile has been updated successfully.",
        "success"
      );
    } catch (error) {
      console.error("Store profile update error:", error);

      showMessage(
        error.message || "Unable to save your store profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="store-profile-page">
      <div className="store-profile-heading">
        <div>
          <span className="store-profile-eyebrow">
            STORE MANAGEMENT
          </span>

          <h2>Store Profile</h2>

          <p>
            Manage your business information and how customers
            discover your store.
          </p>
        </div>

        <div className="store-profile-icon">
          <Store size={25} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* STOREFRONT BRANDING */}
        <section className="store-profile-card">
          <div className="store-profile-card-heading">
            <ImagePlus size={19} />

            <div>
              <h3>Storefront Branding</h3>
              <p>
                Personalise your storefront with your own logo,
                banner and brand colour.
              </p>
            </div>
          </div>

          <div className="store-profile-upload-grid">
            {/* LOGO UPLOAD */}
            <div className="store-profile-upload-item">
              <div className="store-profile-upload-preview logo-preview">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Store logo preview"
                  />
                ) : (
                  <div className="store-profile-empty-preview">
                    <Store size={35} />
                    <span>Logo Preview</span>
                  </div>
                )}

                {logoPreview && (
                  <span className="store-profile-preview-label">
                    LOGO PREVIEW
                  </span>
                )}

                {uploading.logo && (
                  <div className="store-profile-preview-loading">
                    <LoaderCircle
                      size={25}
                      className="store-profile-spinner"
                    />
                    <span>Uploading logo...</span>
                  </div>
                )}
              </div>

              <div className="store-profile-upload-info">
                <strong>Store Logo</strong>

                <p>
                  Square image recommended. JPG, PNG or WebP.
                  Maximum 5MB.
                </p>

                <label
                  className={`store-profile-upload-button ${
                    uploading.logo ? "is-uploading" : ""
                  }`}
                >
                  {uploading.logo ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="store-profile-spinner"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploading.logo || uploading.banner}
                    onChange={(event) =>
                      uploadStoreImage(event, "logo")
                    }
                    hidden
                  />
                </label>
              </div>
            </div>

            {/* BANNER UPLOAD */}
            <div className="store-profile-upload-item banner-upload-item">
              <div className="store-profile-upload-preview banner-preview">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Store banner preview"
                  />
                ) : (
                  <div className="store-profile-empty-preview">
                    <ImagePlus size={35} />
                    <span>Banner Preview</span>
                  </div>
                )}

                {bannerPreview && (
                  <span className="store-profile-preview-label">
                    BANNER PREVIEW
                  </span>
                )}

                {uploading.banner && (
                  <div className="store-profile-preview-loading">
                    <LoaderCircle
                      size={25}
                      className="store-profile-spinner"
                    />
                    <span>Uploading banner...</span>
                  </div>
                )}
              </div>

              <div className="store-profile-upload-info">
                <strong>Store Banner</strong>

                <p>
                  Wide image recommended. JPG, PNG or WebP.
                  Maximum 5MB.
                </p>

                <label
                  className={`store-profile-upload-button ${
                    uploading.banner ? "is-uploading" : ""
                  }`}
                >
                  {uploading.banner ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="store-profile-spinner"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {bannerPreview
                        ? "Change Banner"
                        : "Upload Banner"}
                    </>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={uploading.logo || uploading.banner}
                    onChange={(event) =>
                      uploadStoreImage(event, "banner")
                    }
                    hidden
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="store-profile-color-section">
            <div className="store-profile-color-heading">
              <Palette size={19} />

              <div>
                <strong>Store Brand Colour</strong>
                <p>
                  Choose the primary colour customers see on your
                  storefront.
                </p>
              </div>
            </div>

            <div className="store-profile-color-control">
              <input
                type="color"
                name="store_brand_color"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(
                    formData.store_brand_color
                  )
                    ? formData.store_brand_color
                    : DEFAULT_BRAND_COLOR
                }
                onChange={handleChange}
                aria-label="Choose your storefront brand colour"
              />

              <input
                type="text"
                name="store_brand_color"
                value={formData.store_brand_color}
                onChange={(event) => {
                  const value = event.target.value;

                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    handleChange(event);
                  }
                }}
                placeholder="#B8F500"
                maxLength={7}
                aria-label="Brand colour hex code"
              />

              <span
                className="store-profile-color-swatch"
                style={{
                  backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(
                    formData.store_brand_color
                  )
                    ? formData.store_brand_color
                    : DEFAULT_BRAND_COLOR,
                }}
              />
            </div>

            <small>
              Your chosen colour will be used on your public storefront.
            </small>
          </div>
        </section>

        {/* BUSINESS INFORMATION */}
        <section className="store-profile-card">
          <div className="store-profile-card-heading">
            <Building2 size={19} />

            <div>
              <h3>Business Information</h3>
              <p>Tell customers about your business.</p>
            </div>
          </div>

          <div className="store-profile-grid">
            <div className="store-profile-field">
              <label>Business Name</label>

              <input
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="Enter your business name"
                maxLength={120}
                required
              />
            </div>

            <div className="store-profile-field">
              <label>Store Display Name</label>

              <input
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="Enter your store name"
                maxLength={120}
                required
              />
            </div>

            <div className="store-profile-field full-width">
              <label>Business Category</label>

              <select
                name="business_category"
                value={formData.business_category}
                onChange={handleChange}
              >
                <option value="">Select a category</option>
                <option value="Fashion">Fashion</option>
                <option value="Beauty & Cosmetics">
                  Beauty & Cosmetics
                </option>
                <option value="Electronics">Electronics</option>
                <option value="Food & Groceries">
                  Food & Groceries
                </option>
                <option value="Home & Living">Home & Living</option>
                <option value="Health & Wellness">
                  Health & Wellness
                </option>
                <option value="Accessories">Accessories</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="store-profile-field full-width">
              <label>Business Description</label>

              <textarea
                name="business_description"
                value={formData.business_description}
                onChange={handleChange}
                placeholder="Describe your business and what you offer..."
                rows={5}
                maxLength={1000}
              />

              <span className="store-profile-character-count">
                {formData.business_description.length}/1000
              </span>
            </div>
          </div>
        </section>

        {/* CONTACT INFORMATION */}
        <section className="store-profile-card">
          <div className="store-profile-card-heading">
            <Phone size={19} />

            <div>
              <h3>Contact Information</h3>
              <p>Make it easy for customers to reach you.</p>
            </div>
          </div>

          <div className="store-profile-grid">
            <div className="store-profile-field">
              <label>WhatsApp Phone Number</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
                maxLength={25}
              />
            </div>
          </div>
        </section>

        {/* BUSINESS LOCATION */}
        <section className="store-profile-card">
          <div className="store-profile-card-heading">
            <MapPin size={19} />

            <div>
              <h3>Business Location</h3>
              <p>
                Help customers know where your business is located.
              </p>
            </div>
          </div>

          <div className="store-profile-grid">
            <div className="store-profile-field full-width">
              <label>Street Address</label>

              <input
                name="business_address"
                value={formData.business_address}
                onChange={handleChange}
                placeholder="Enter your business address"
                maxLength={250}
              />
            </div>

            <div className="store-profile-field">
              <label>City</label>

              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                maxLength={100}
              />
            </div>

            <div className="store-profile-field">
              <label>State</label>

              <input
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state"
                maxLength={100}
              />
            </div>
          </div>
        </section>

        {/* SUCCESS AND ERROR MESSAGES */}
        {message && (
          <div className={`store-profile-message ${messageType}`}>
            {messageType === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}

            <span>{message}</span>
          </div>
        )}

        {/* SAVE PROFILE */}
        <div className="store-profile-actions">
          <button
            type="submit"
            disabled={
              saving || uploading.logo || uploading.banner
            }
          >
            {saving ? (
              <>
                <LoaderCircle
                  size={18}
                  className="store-profile-spinner"
                />
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Store Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
