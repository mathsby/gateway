import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';

const { eachLike, like, regex, string, uuid } = MatchersV3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Modelling the Gateway docs site as the consumer of these endpoints (see
// pact/README.md) since no in-repo TS client is wired to Client.Gateway.Api yet.
const provider = new PactV3({
  consumer: 'gateway-docs-client',
  provider: 'Client.Gateway.Api',
  dir: path.resolve(__dirname, '../pacts'),
});

// Any non-empty GUID returns the same mock assignment list; the all-zero GUID is
// the service's built-in "site not found" case (see AssignmentService.cs).
const KNOWN_SITE_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const UNKNOWN_SITE_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /sites/{siteId}/assignments', () => {
  it('returns the assignments for a known site', async () => {
    provider
      .uponReceiving('a request for assignments on a known site')
      .withRequest({
        method: 'GET',
        path: `/sites/${KNOWN_SITE_ID}/assignments`,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json; charset=utf-8') },
        // endDate is deliberately left out of the contract: it's null for some
        // records and a date for others, and the docs site doesn't depend on it.
        body: eachLike({
          id: uuid(),
          siteId: uuid(),
          employeeName: string('Jordan Smith'),
          status: string('Active'),
          startDate: regex(/^\d{4}-\d{2}-\d{2}$/, '2026-01-05'),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/sites/${KNOWN_SITE_ID}/assignments`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0]).toMatchObject({
        employeeName: expect.any(String),
        status: expect.any(String),
      });
    });
  });

  it('returns 404 for a site that does not exist', async () => {
    provider
      .uponReceiving('a request for assignments on an unknown site')
      .withRequest({
        method: 'GET',
        path: `/sites/${UNKNOWN_SITE_ID}/assignments`,
      })
      .willRespondWith({
        status: 404,
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/sites/${UNKNOWN_SITE_ID}/assignments`);
      expect(response.status).toBe(404);
    });
  });
});
