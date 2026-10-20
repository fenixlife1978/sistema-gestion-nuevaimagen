// Single Vercel Function dispatcher.
// Keep one exposed Serverless Function to stay within Vercel Hobby limits.
// Route resolution works both with the rewrite query and with direct /api/<route> paths.
// The health route is intentionally inline so it can validate the Vercel runtime
// without loading the application/DB module graph first.

// Keep requires static for Vercel bundling, but lazy so /api/health
// cannot crash because an unrelated handler has a dependency problem.
const handlers = {
  "auth/login": () => require("./auth/login"),
  "auth/session": () => require("./auth/session"),
  "auth/logout": () => require("./auth/logout"),
  "turso": () => require("./turso"),
  "sync": () => require("./sync"),
  "bootstrap": () => require("./bootstrap"),
  "duplicidades/autorizar": () => require("./duplicidades/autorizar"),
  "personas/registrar": () => require("./personas/registrar"),
  "personas/gestion": () => require("./personas/gestion"),
  "personas/asignar-cargo": () => require("./personas/asignar-cargo"),
  "comite/gestionar": () => require("./comite/gestionar"),
  "mesas/miembros": () => require("./mesas/miembros"),
  "verificaciones": () => require("./verificaciones"),
  "actas": () => require("./actas"),
  "cortes": () => require("./cortes"),
  "usuarios/gestionar": () => require("./usuarios/gestionar"),
  "sistema/vaciar": () => require("./sistema/vaciar"),
  "centros/gestionar": () => require("./centros/gestionar"),
  "padron/gestionar": () => require("./padron/gestionar"),
  "direccion/gestionar": () => require("./direccion/gestionar"),
  "auditar": () => require("./auditar"),
};

function resolveRoute(req) {
  let route = req.query && req.query.route;
  if (Array.isArray(route)) route = route.join("/");
  route = String(route || "").replace(/^\/+|\/+$/g, "");
  if (route) return route;

  const rawUrl = String(req.url || "");
  const pathname = rawUrl.split("?")[0].replace(/^\/+|\/+$/g, "");
  if (pathname === "api") return "";
  return pathname.replace(/^api\//, "");
}

async function health(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const started = Date.now();
  const url = String(process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || "").trim();
  const token = String(process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || "").trim();

  if (!url || !token) {
    return res.status(503).json({
      ok: false,
      database: false,
      latency_ms: Date.now() - started,
      error: "Turso environment variables are not configured",
    });
  }

  const baseUrl = (url.startsWith("libsql://")
    ? url.replace("libsql://", "https://")
    : (/^https?:\/\//.test(url) ? url : "https://" + url)).replace(/\/$/, "");
  const pipelineUrl = /\/v2\/pipeline$/i.test(baseUrl) ? baseUrl : baseUrl + "/v2/pipeline";

  try {
    const response = await fetch(pipelineUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: "SELECT 1 AS ok", args: [] } },
          { type: "close" },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Turso HTTP " + response.status);
    }

    const data = await response.json();
    const result = (data.results || []).find(x => x?.type === "ok" && x?.response?.type === "execute")?.response?.result;
    const row = result?.rows?.[0];
    const value = row?.[0];
    const ok = value && typeof value === "object" ? Number(value.value) === 1 : Number(value) === 1;

    if (!ok) throw new Error("Database health check failed");

    return res.status(200).json({
      ok: true,
      database: true,
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api-health] Database check failed:", error);
    return res.status(503).json({
      ok: false,
      database: false,
      latency_ms: Date.now() - started,
      error: error.message || "Database unavailable",
    });
  }
}

module.exports = async function handler(req, res) {
  try {
    const route = resolveRoute(req);

    if (route === "health") {
      if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      return await health(res);
    }

    const handlerFactory = handlers[route];
    if (!handlerFactory) {
      return res.status(404).json({ error: "API route not found" });
    }

    const target = handlerFactory();
    if (typeof target !== "function") {
      return res.status(500).json({ error: "API handler is not callable" });
    }

    return await target(req, res);
  } catch (error) {
    console.error("[api-dispatcher] Failed:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
