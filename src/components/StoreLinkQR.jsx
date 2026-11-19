
import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Copy,
  Download,
  ExternalLink,
  Share2,
  QrCode,
  Check,
  AlertCircle,
} from "lucide-react";

import "./StoreLinkQR.css";

export default function StoreLinkQR({
  storeName,
  storeUrl,
  isStoreReady = false,
}) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const hasStoreUrl =
    typeof storeUrl === "string" &&
    /^https?:\/\//i.test(storeUrl);

  const canShare = hasStoreUrl && isStoreReady;

  const copyStoreLink = async () => {
    if (!canShare) return;

    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setMessage("Your store link has been copied.");

      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("Unable to copy automatically. Please copy the link manually.");
    }
  };

  const downloadQRCode = () => {
    if (!canShare || !qrRef.current) return;

    try {
      const canvas = qrRef.current;
      const image = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");

      const filename = (storeName || "my-store")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      downloadLink.href = image;
      downloadLink.download = `${filename || "my-store"}-QR-code.png`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setMessage("Your QR code has been downloaded.");
    } catch {
      setMessage("Unable to download your QR code. Please try again.");
    }
  };

  const shareStore = async () => {
    if (!canShare) return;

    const shareData = {
      title: storeName || "My Online Store",
      text: `Visit ${storeName || "my online store"} and explore our products.`,
      url: storeUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(storeUrl);
        setMessage("Store link copied. You can now share it!");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessage("Unable to share your store link.");
      }
    }
  };

  return (
    <section className="store-qr-section">
      <div className="store-qr-header">
        <div>
          <span className="store-qr-eyebrow">
            YOUR ONLINE STORE
          </span>

          <h2>Share your store with the world.</h2>

          <p>
            Your store has its own link and QR code.
            Share them anywhere and help customers find your products.
          </p>
        </div>

        <div className="store-qr-header-icon">
          <QrCode size={28} />
        </div>
      </div>

      {!canShare ? (
        <div className="store-qr-unavailable">
          <AlertCircle size={23} />

          <div>
            <strong>Your public store isn't ready yet.</strong>

            <p>
              Your store link and QR code will become available
              after your business is approved and your storefront
              has been published.
            </p>
          </div>
        </div>
      ) : (
        <div className="store-qr-content">
          <div className="store-qr-preview">
            <QRCodeCanvas
              ref={qrRef}
              value={storeUrl}
              size={220}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#20251a"
            />

            <span className="store-qr-caption">
              SCAN TO VISIT YOUR STORE
            </span>
          </div>

          <div className="store-qr-details">
            <span className="store-qr-label">
              YOUR STORE NAME
            </span>

            <h3>{storeName || "Your Business Name"}</h3>

            <span className="store-qr-label">
              YOUR UNIQUE STORE LINK
            </span>

            <div className="store-qr-link">
              <span>{storeUrl}</span>

              <button
                type="button"
                onClick={copyStoreLink}
                aria-label="Copy store link"
                title="Copy store link"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>

            <div className="store-qr-actions">
              <button
                type="button"
                className="store-qr-primary"
                onClick={downloadQRCode}
              >
                <Download size={17} />
                Download QR Code
              </button>

              <button
                type="button"
                className="store-qr-secondary"
                onClick={shareStore}
              >
                <Share2 size={17} />
                Share Store
              </button>

              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="store-qr-visit"
              >
                Visit My Store
                <ExternalLink size={15} />
              </a>
            </div>

            {message && (
              <p className="store-qr-message" role="status">
                {message}
              </p>
            )}

            <div className="store-qr-tip">
              <strong>Grow your visibility.</strong>

              <p>
                Add your store link to your WhatsApp Status,
                Instagram bio, Facebook page, TikTok profile
                and business materials.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
