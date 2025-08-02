/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.alchemyapi.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tokens.1inch.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tokens-data.1inch.io",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
