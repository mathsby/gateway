import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MatchersV3, PactV3 } from '@pact-foundation/pact';

const { eachLike, like, string, uuid } = MatchersV3;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const provider = new PactV3({
  consumer: 'gateway-docs-client',
  provider: 'Client.Gateway.Api',
  dir: path.resolve(__dirname, '../pacts'),
});

// Any non-empty GUID returns the same mock worker list; the all-zero GUID is the
// service's built-in "site not found" case (see WorkerService.cs).
const KNOWN_SITE_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const UNKNOWN_SITE_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /sites/{siteId}/workers', () => {
  it('returns the workers for a known site', async () => {
    provider
      .uponReceiving('a request for workers on a known site')
      .withRequest({
        method: 'GET',
        path: `/sites/${KNOWN_SITE_ID}/workers`,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json; charset=utf-8') },
        body: eachLike({
          id: uuid(),
          siteId: uuid(),
          name: string('Jordan Smith'),
          role: string('Electrician'),
          status: string('Active'),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/sites/${KNOWN_SITE_ID}/workers`);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0]).toMatchObject({
        name: expect.any(String),
        role: expect.any(String),
        status: expect.any(String),
      });
    });
  });

  it('returns 404 for a site that does not exist', async () => {
    provider
      .uponReceiving('a request for workers on an unknown site')
      .withRequest({
        method: 'GET',
        path: `/sites/${UNKNOWN_SITE_ID}/workers`,
      })
      .willRespondWith({
        status: 404,
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/sites/${UNKNOWN_SITE_ID}/workers`);
      expect(response.status).toBe(404);
    });
  });
});
