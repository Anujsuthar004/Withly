import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["New age social media platform/**"] },
  ...nextVitals,
];

export default config;
