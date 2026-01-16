import React from "react";
import { createRoot } from "react-dom/client";
import XapplyApp from "./XapplyApp";

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <XapplyApp />
    </React.StrictMode>
  );
}