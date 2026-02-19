import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

// 1) Base tokens + resets
import "./styles/global.css";

// 2) Layout scaffolding
import "./styles/layout.shell.css";

// 3) Utilities
import "./styles/utilities.css";

// 4) Reusable UI (pills/buttons)
import "./styles/components.ui.css";

// 5) Component skins (tables etc.)
import "./styles/tables.kc.css";

// 6) Page-specific
import "./styles/component.css";
import "./styles/dashboard.cards.css";
import "./styles/browserTabs.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
