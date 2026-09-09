import { createRoot } from "react-dom/client";
import App from "../../client/src/App";
import "@wonboard/editor/style.css";
import "../../client/src/style.css";

createRoot(document.getElementById("root")!).render(
  <App storageMode="desktop" onLogout={async () => false} />,
);
