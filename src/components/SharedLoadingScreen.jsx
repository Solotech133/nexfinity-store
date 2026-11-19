
import { Store } from "lucide-react";
import "./SharedLoadingScreen.css";

export default function SharedLoadingScreen() {
  return (
    <div
      className="shared-loading-overlay"
      role="status"
      aria-label="Loading"
    >
      <div className="nex-loader">
        <div className="nex-loader-orbit nex-orbit-one" />
        <div className="nex-loader-orbit nex-orbit-two" />
        <div className="nex-loader-orbit nex-orbit-three" />

        <span className="nex-loader-particle particle-one" />
        <span className="nex-loader-particle particle-two" />
        <span className="nex-loader-particle particle-three" />
        <span className="nex-loader-particle particle-four" />

        <div className="nex-loader-glow" />

        <div className="nex-loader-core">
          <Store size={35} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
