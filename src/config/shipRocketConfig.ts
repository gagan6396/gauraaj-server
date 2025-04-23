const shipRocketConfig: any = {
  baseUrl: process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in",
  email: process.env.SHIPROCKET_EMAIL || "your-email@example.com",
  password: process.env.SHIPROCKET_PASSWORD || "your-shiprocket-password",
};

export default shipRocketConfig;
