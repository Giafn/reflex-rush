/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "game-dark": "#0A0A0F",
        "game-green": "#00FF88",
        "game-red": "#FF3355",
        "game-gold": "#FFD700",
        "game-blue": "#00AAFF",
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "monospace"],
        dm: ["var(--font-dm-sans)", "sans-serif"],
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
