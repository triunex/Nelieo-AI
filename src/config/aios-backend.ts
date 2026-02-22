/**
 * Nelieo AI OS - Backend Configuration
 * 
 * Change AIOS_BACKEND_IP to point to your GCP VM's external IP.
 * All API calls, WebSocket connections, and Xpra streaming will use this.
 */

// 🔧 CHANGE THIS to your VM's external IP
const AIOS_BACKEND_IP = "34.57.38.244";

// Derived URLs (do not edit)
export const AIOS_API_URL = `http://${AIOS_BACKEND_IP}:10000`;
export const AIOS_STREAM_URL = `http://${AIOS_BACKEND_IP}:10005`;
export const AIOS_WS_URL = `http://${AIOS_BACKEND_IP}:10000`;

export default {
    AIOS_BACKEND_IP,
    AIOS_API_URL,
    AIOS_STREAM_URL,
    AIOS_WS_URL,
};
