import type {NextConfig} from 'next';
import withPWA from 'next-pwa';
import path from 'path';

const firebasePackages = ['app', 'auth', 'firestore', 'storage'] as const;

const firebaseAliasWebpack = firebasePackages.reduce<Record<string, string>>((aliases, pkg) => {
  aliases[`firebase/${pkg}`] = path.resolve(__dirname, 'node_modules/firebase', pkg, 'dist/index.cjs.js');
  return aliases;
}, {});

const firebaseAliasTurbo = firebasePackages.reduce<Record<string, string>>((aliases, pkg) => {
  const absolutePath = path.resolve(__dirname, 'node_modules/firebase', pkg, 'dist/index.cjs.js');
  const relativePath = path.relative(__dirname, absolutePath).split(path.sep).join('/');
  aliases[`firebase/${pkg}`] = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  return aliases;
}, {});

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['crypto'],
  turbopack: {
    resolveAlias: firebaseAliasTurbo,
  },
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
      ...firebaseAliasWebpack,
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
