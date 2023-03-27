/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000,
  detectOpenHandles: true,
  transform: {
    "^.+\\.(js|ts|tsx)$": "ts-jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!clownface-shacl-path|@rdfjs|@tpluscode|@zazuko/)"]
};
