/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-75ddd5150ec748d0a5fea996ff47c735.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;