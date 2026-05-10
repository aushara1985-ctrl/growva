/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Allow /api/g.js as canonical snippet URL (maps to /api/g route)
      { source: '/api/g.js', destination: '/api/g' },
    ]
  },
}

module.exports = nextConfig
