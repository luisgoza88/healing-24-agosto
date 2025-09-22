const nextConfig = {
  turbopack: {
    // Evita la advertencia de root incorrecto (monorepo con lockfiles múltiples)
    root: __dirname,
  },
};

export default nextConfig;
