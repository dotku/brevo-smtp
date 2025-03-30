/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    // We'll load environment variables from .env.local and .env files
  }
}

module.exports = nextConfig
