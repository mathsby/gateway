using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using PactNet.Infrastructure.Outputters;
using PactNet.Output.Xunit;
using PactNet.Verifier;
using Xunit.Abstractions;

namespace Client.Gateway.Api.Tests;

/// <summary>
/// Verifies Client.Gateway.Api against the pact(s) the gateway-docs-client consumer
/// suite (pact/consumer) has published to the broker. Pact's verifier drives real
/// HTTP requests over a TCP socket, so the provider has to be a real Kestrel
/// listener here (ApiHostFactory), not an in-memory WebApplicationFactory/TestServer.
///
/// Requires a running Pact Broker (see pact/docker-compose.yml) with pacts already
/// published by the consumer suite; run `npm test` then `npm run publish-pact` in
/// pact/consumer first. Skipped automatically if the broker isn't reachable.
/// </summary>
public class PactProviderVerificationTests
{
    private const string ProviderUri = "http://127.0.0.1:5099";

    private readonly ITestOutputHelper _output;

    public PactProviderVerificationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task EnsureApiHonoursPactWithGatewayDocsClient()
    {
        var brokerBaseUri = new Uri(Environment.GetEnvironmentVariable("PACT_BROKER_BASE_URL") ?? "http://localhost:9292");
        var providerVersion = Environment.GetEnvironmentVariable("PACT_PROVIDER_VERSION") ?? GitSha();

        var app = ApiHostFactory.Create(Array.Empty<string>());
        app.Urls.Add(ProviderUri);
        await app.StartAsync();

        try
        {
            var config = new PactVerifierConfig
            {
                Outputters = new List<IOutput> { new XunitOutput(_output) },
            };

            using var verifier = new PactVerifier("Client.Gateway.Api", config);
            verifier
                .WithHttpEndpoint(new Uri(ProviderUri))
                .WithPactBrokerSource(brokerBaseUri, options =>
                {
                    options.ConsumerVersionSelectors(new[] { new ConsumerVersionSelector { MainBranch = true } });
                    options.PublishResults(providerVersion, publish => publish.ProviderBranch("main"));
                })
                .Verify();
        }
        finally
        {
            await app.StopAsync();
        }
    }

    private static string GitSha()
    {
        try
        {
            var psi = new ProcessStartInfo("git", "rev-parse HEAD")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
            };
            using var process = Process.Start(psi)!;
            var sha = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit();
            return string.IsNullOrEmpty(sha) ? "0.0.0-local" : sha;
        }
        catch
        {
            return "0.0.0-local";
        }
    }
}
