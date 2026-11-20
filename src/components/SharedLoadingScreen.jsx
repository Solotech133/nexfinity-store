
import { Store } from "lucide-react";
import "./SharedLoadingScreen.css";

export default function SharedLoadingScreen({
  label = "Preparing your workspace",
}) {
  return (
    <div
      className="shared-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="shared-loading-card">
        <div className="shared-loading-mark" aria-hidden="true">
          <Store size={35} strokeWidth={1.8} />
        </div>

        <p className="shared-loading-brand">
          NEXFINITY <span>STORE</span>
        </p>
        <p className="shared-loading-label">{label}</p>

        <div className="shared-loading-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
