# Pact contract testing

Consumer-driven contract tests between the docs site (modelled here as the
consumer, since no in-repo TS client is wired to the API yet) and
`Client.Gateway.Api` (the provider), covering `GET /sites/{siteId}/assignments`
and `GET /sites/{siteId}/workers`.

- **Consumer** (`gateway-docs-client`): [`consumer/`](consumer/) — Pact JS
  (`PactV3`), generates a pact file per test run.
- **Provider** (`Client.Gateway.Api`): [`../Client.Gateway.Api.Tests/PactProviderVerificationTests.cs`](../Client.Gateway.Api.Tests/PactProviderVerificationTests.cs)
  — PactNet, verifies the provider against whatever pact the broker says is
  current for the consumer's `main` branch.
- **Broker**: a disposable local [Pact Broker](docker-compose.yml)
  (`pactfoundation/pact-broker` + Postgres) — no hosted account or cost. Not
  meant to be shared infra; it's scoped to this repo's local dev loop.

## Why a broker, and why two separate test suites

The consumer (TypeScript) and provider (.NET) can't run in the same process or
share a mock — the whole point of contract testing is that they're verified
independently, against a contract exchanged as data. The broker is that
exchange point: the consumer publishes what it expects, the provider asks the
broker for the latest expectations and checks itself against them for real
(over an actual HTTP connection, not an in-memory host — Pact's verifier is a
native/Rust component and can't see .NET's in-memory `TestServer`).

## Run it

```bash
# 1. Start the broker (from repo root or here)
docker compose -f pact/docker-compose.yml up -d

# 2. Consumer: generate the pact, then publish it to the broker
cd pact/consumer
npm install
npm test            # writes pacts/gateway-docs-client-Client.Gateway.Api.json
npm run publish-pact

# 3. Provider: verify Client.Gateway.Api against whatever the broker has
cd ../..
dotnet test Client.Gateway.Api.Tests --filter FullyQualifiedName~PactProviderVerificationTests
```

Tear down the broker with `docker compose -f pact/docker-compose.yml down -v`
(the `-v` also drops its Postgres volume, since it's disposable local state).

## Config

| Env var | Used by | Default |
| --- | --- | --- |
| `PACT_BROKER_BASE_URL` | consumer publish script, provider test | `http://localhost:9292` |
| `PACT_CONSUMER_VERSION` | consumer publish script | current git SHA |
| `PACT_PROVIDER_VERSION` | provider test | current git SHA |

Both sides default to tagging/reading the `main` branch. In CI, run step 2 on
every push (so the broker always has the latest consumer expectations) and
step 3 as part of the API's build — that's what actually closes the
consumer/provider feedback loop; a broker with nothing pushed to it, or a
provider that's never asked, doesn't verify anything by itself.

## Scope

Deliberately excluded from the contract: the `endDate` field on assignments
(it's `null` for some records and a date for others; the consumer's needs
don't require pinning that down) and the exact shape of the 404 error body
(only the status code is asserted). Both endpoints are otherwise stateless —
any non-empty site GUID returns the same mock list, the all-zero GUID 404s —
so there's no provider-state wiring here; if a real backend replaces the mock
services and responses start depending on actual site data, provider states
(`.given(...)` on the consumer side, a state-change handler on the provider
side) will need to be added.
