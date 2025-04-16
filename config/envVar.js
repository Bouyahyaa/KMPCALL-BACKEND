export const socket = {
    port: process.env.SOCKET_PORT || 4000, // Default port 4000 if not specified
    corsOrigin: process.env.CORS_ORIGIN || '*', // Default to allowing all origins
  };
  
  // You can add other environment variables here as needed
  export default {
    socket,
  };