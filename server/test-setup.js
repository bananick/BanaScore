// Bootstrap that lets `node --test` run TypeScript test files via ts-node,
// compiled as CommonJS using tsconfig.node.json (cross-platform, no env vars).
const path = require('path');

require('ts-node').register({
  project: path.resolve(__dirname, '../tsconfig.node.json'),
  transpileOnly: true,
});
