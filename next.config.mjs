/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.razorpay.com",
      "connect-src 'self' https://*.razorpay.com",
      "frame-src https://checkout.razorpay.com https://*.razorpay.com",
    ].join('; '),
  },
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
  {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains'},
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{source: '/:path*', headers: securityHeaders}];
  },
};
export default nextConfig;
