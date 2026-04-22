/**
 * URL do servidor Bookzinhos.
 */

const PROD_URL = "https://bookzinhos-production.up.railway.app";

const isLocal = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || 
   window.location.hostname === "127.0.0.1" || 
   window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/));

export const API_BASE_URL = isLocal
  ? `http://${window.location.hostname}:3001`
  : PROD_URL;
