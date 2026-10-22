// config.js
// Central API configuration — change this ONE file for all environments.
// In production, set window.API_BASE_OVERRIDE before loading other scripts,
// or update the production URL below.

const API_BASE = (function () {
  // If a global override is set (useful for deployment), use it
  if (typeof window !== "undefined" && window.API_BASE_OVERRIDE) {
    return window.API_BASE_OVERRIDE;
  }
  // Local development
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:3000";
  }
  // ✏️  Render/Railway/etc pe deploy karne ke baad apna URL yahan daalo
  // Example: return "https://assigncheck.onrender.com";
  return "https://assigncheck.onrender.com";
})();

export default API_BASE;
