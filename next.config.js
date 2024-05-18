/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  experimental: {
    nextScriptWorkers: true,
  }
}

module.exports = nextConfig
