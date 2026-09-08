import { createRoot } from "react-dom/client";
import AuthGate from "./AuthGate";
import SitesGate from "./SitesGate";
import "@wonboard/editor/style.css";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  import.meta.env.MODE.startsWith("sites") ? <SitesGate /> : <AuthGate />,
);
