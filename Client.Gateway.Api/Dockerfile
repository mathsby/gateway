FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Client.Gateway.Api.csproj .
RUN dotnet restore Client.Gateway.Api.csproj
COPY . .
RUN dotnet publish Client.Gateway.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render (and most PaaS hosts) inject the port to bind to via $PORT at runtime.
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet Client.Gateway.Api.dll"]
