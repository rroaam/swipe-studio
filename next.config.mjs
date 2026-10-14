/** @type {import('next').NextConfig} */
const nextConfig = {
  // dashboard drives local scripts + reads the teardown build dir; keep it simple.
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },   // internal tool — don't fail prod build on lint
};
export default nextConfig;
