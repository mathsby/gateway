import http from 'k6/http';
import { check } from 'k6';

// Override with: k6 run K6/assignments-200.js -e BASE_URL=http://localhost:5199
const BASE_URL = __ENV.BASE_URL || 'https://client-gateway-api.onrender.com';
const SITE_ID = __ENV.SITE_ID || '00000000-0000-0000-0000-000000000001';

// GET /sites/{siteId}/assignments enforces a 100 requests/minute per-IP rate
// limit (see Client.Gateway.Api/Program.cs). This test intentionally stays
// well under that budget - 60 req/min, i.e. 1 req/s - so it measures genuine
// happy-path (200) performance instead of tripping 429s. Rate-limit behavior
// itself is covered separately by postman/rate-limit.postman_collection.json.
export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-arrival-rate',
      rate: 60,
      timeUnit: '1m',
      duration: '1m',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  // Wake a sleeping Render free-tier instance before measuring, so cold-start
  // latency (30-50s) doesn't skew the results below.
  http.get(`${BASE_URL}/health`);
}

export default function () {
  const res = http.get(`${BASE_URL}/sites/${SITE_ID}/assignments`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'content-type is application/json': (r) => (r.headers['Content-Type'] || '').includes('application/json'),
    'body is a non-empty array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body) && body.length > 0;
      } catch {
        return false;
      }
    },
  });
}
