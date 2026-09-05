import { createRoot } from "react-dom/client";
import AuthGate from "./AuthGate";
import "@wonboard/editor/style.css";
import "./style.css";

createRoot(document.getElementById("root")!).render(<AuthGate />);
