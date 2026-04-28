/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#f5f1ea",
        cream: "#f7f4ec",
        linen: "#ebe3d6",
        sand: "#e8dfd2",
        stone: "#d9cfc2",
        mist: "#c8d6c4",
        sage: "#8fa68e",
        sageMuted: "#6f826e",
        moss: "#556b54",
        bark: "#4a4038",
        earth: "#3d352e",
        fern: "#b8c9b2",
        dawn: "#e5ddd0",
        sageDeep: "#5d6f5c",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(61, 53, 46, 0.14), 0 2px 10px -2px rgba(61, 53, 46, 0.08)",
        lift: "0 12px 40px -12px rgba(61, 53, 46, 0.18), 0 4px 14px rgba(61, 53, 46, 0.06)",
        natural:
          "0 22px 50px -20px rgba(85, 107, 84, 0.25), 0 10px 28px -14px rgba(61, 53, 46, 0.12)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 32px -8px rgba(61, 53, 46, 0.15)",
        input: "0 2px 12px rgba(61, 53, 46, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      },
      backgroundImage: {
        "leaf-shade":
          "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(184, 201, 178, 0.45) 0%, transparent 55%), radial-gradient(ellipse 90% 60% at 100% 30%, rgba(235, 227, 214, 0.7) 0%, transparent 50%), radial-gradient(ellipse 70% 50% at 0% 70%, rgba(200, 214, 196, 0.35) 0%, transparent 45%)",
      },
    },
  },
  plugins: [],
};
