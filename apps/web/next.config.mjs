/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lantern/engine', '@lantern/schema'],
  // `pnpm build` at the repo root and a running `next dev` were writing to the
  // same .next, and the build pulled the chunks out from under the dev server
  // mid-session — the page 500s with MODULE_NOT_FOUND and looks like the app
  // broke. They get separate directories so a build is just a build.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};
export default nextConfig;
