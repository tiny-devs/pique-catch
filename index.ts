// Render entrypoint shim.
// Some Render services have a saved Start Command of `node index.ts`
// (auto-detected from package.json "main"). This file makes that work by
// booting the real server. The canonical start command is `npm start`.
require('./server.js');
