/**
 * URL do servidor Bookzinhos.
 */

const PROD_URL = "https://bookzinhos-production.up.railway.app";

export const API_BASE_URL = (typeof window !== "undefined" && window.location.hostname === "localhost")
  ? "http://localhost:3001"
  : PROD_URL;
