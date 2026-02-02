const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Ensure dependencies hoisted to the repo root are resolvable.
    const rootNodeModules = path.resolve(__dirname, '..', 'node_modules')
    if (!config.resolve.modules.includes(rootNodeModules)) {
      config.resolve.modules.push(rootNodeModules)
    }
    return config
  }
}

module.exports = nextConfig
