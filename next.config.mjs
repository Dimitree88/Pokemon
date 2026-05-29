/** @type {import('next').NextConfig} */
const nextConfig = {
  // I dati carte e i simboli energia/rarità sono letti via fs lato server: vanno
  // inclusi nel bundle serverless (Vercel non li traccia automaticamente).
  outputFileTracingIncludes: {
    "/**": ["./data/**", "./assets/energy/**", "./assets/rarity/**", "./assets/sets/**"],
  },
};

export default nextConfig;
