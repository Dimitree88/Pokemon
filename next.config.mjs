/** @type {import('next').NextConfig} */
const nextConfig = {
  // Letti via fs lato server (vanno inclusi nel bundle serverless, Vercel non li traccia
  // da solo): i dati carte (data/) e l'elenco simboli set (public/sets/, dove se ne
  // verifica l'esistenza). Tutti i simboli PNG (energy/rarity/backgrounds/elements/sets)
  // sono serviti per URL da public/.
  outputFileTracingIncludes: {
    "/**": ["./data/**", "./public/sets/**"],
  },
};

export default nextConfig;
