import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import Storefront from "./Storefront";
import "./style.css";
const Admin = lazy(() => import("./Admin"));
createRoot(document.getElementById("root")).render(
  location.pathname.startsWith("/admin") ? (
    <Suspense
      fallback={
        <div className="boot">
          <span className="boot-mark">V</span>Memuat Vernola Studio…
        </div>
      }
    >
      <Admin />
    </Suspense>
  ) : (
    <Storefront />
  ),
);
