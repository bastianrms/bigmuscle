/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    runtime: "nodejs",   // ⬅️ zwingt alles auf Node Runtime
  },
};

export default nextConfig;