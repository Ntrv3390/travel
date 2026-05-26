/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.headout.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-imgix.headout.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      }
    ],
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    if (!process.env.API_URL) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
