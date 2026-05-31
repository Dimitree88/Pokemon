/** @type {import('next').NextConfig} */
const nextConfig = {
  // Letti via fs lato server (vanno inclusi nel bundle serverless, Vercel non li traccia
  // da solo): i dati carte (data/), i simboli rarità SVG (assets/rarity/) e l'elenco
  // simboli set (public/sets/, dove se ne verifica l'esistenza). Gli altri PNG
  // (energy/backgrounds/elements/sets) sono serviti per URL da public/.
  outputFileTracingIncludes: {
    "/**": ["./data/**", "./assets/rarity/**", "./public/sets/**"],
  },
};

export default nextConfig;
