import http from "node:http";
import https from "node:https";

const SUPABASE_TARGET = "tivjvifsygayopbgrfhp.supabase.co";
const PORT = 54321;

const server = http.createServer((req, res) => {
  // Always forward using clean headers and exact target host
  const headers = { ...req.headers, host: SUPABASE_TARGET };
  delete headers["content-length"];

  const options = {
    hostname: SUPABASE_TARGET,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: SUPABASE_TARGET,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("[proxy-error]", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(err.message);
    }
  });

  req.pipe(proxyReq);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[supabase-proxy] Ready on http://127.0.0.1:${PORT} -> https://${SUPABASE_TARGET}`);
});
