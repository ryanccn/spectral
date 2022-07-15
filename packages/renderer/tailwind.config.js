const defaultTheme = require('tailwindcss/defaultTheme');
// const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['**/*.{ts,tsx,js,jsx,vue}', 'index.html'].map((str) => {
    return './packages/renderer/' + str;
  }),

  theme: {
    extend: {},
  },

  plugins: [require('@tailwindcss/typography')],
};
