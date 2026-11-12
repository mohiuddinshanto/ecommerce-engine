const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

const checks = [
  { path: "/health", expect: [200] },
  { path: "/api/store/status", expect: [200] },
  { path: "/api/store/checkout-options", expect: [200] },
  { path: "/api/categories", expect: [200] },
  { path: "/api/products", expect: [200] },
  { path: "/", expect: [200] },
  { path: "/shop", expect: [200] },
  { path: "/account", expect: [200] },
];

let failed = 0;

for (const check of checks) {
  try {
    const response = await fetch(BASE + check.path, { redirect: "manual" });
    const ok = check.expect.includes(response.status);
    if (!ok) failed += 1;
    console.log(`${ok ? "PASS" : "FAIL"} | ${check.path} -> ${response.status}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL | ${check.path} -> ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
