import type {NextConfig} from 'next';
import withPWA from 'next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['crypto'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Explicitly map '@' to 'src' to ensure Webpack resolves TS path aliases during Docker builds
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve?.alias || {}),
      ['@']: path.resolve(__dirname, 'src'),
      ['firebase/app']: path.resolve(__dirname, 'node_modules/firebase/app/dist/index.cjs.js'),
      ['firebase/auth']: path.resolve(__dirname, 'node_modules/firebase/auth/dist/index.cjs.js'),
      ['firebase/firestore']: path.resolve(__dirname, 'node_modules/firebase/firestore/dist/index.cjs.js'),
      ['firebase/storage']: path.resolve(__dirname, 'node_modules/firebase/storage/dist/index.cjs.js'),
    };
    return config;
  },
  output: 'standalone',
};

// wrap with PWA
const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default withPWAConfig(nextConfig);
