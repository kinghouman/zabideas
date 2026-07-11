using Microsoft.AspNetCore.Server.Kestrel.Https;
using Microsoft.Extensions.Options;
using NetViewApp.Models;
using NetViewApp.Services;
using Serilog.Events;
using Serilog;
using NetViewApp.Controllers;
using NetViewApp.Jobs;
using Quartz;
using NetViewApp.CSharp;
using static NetViewApp.Models.CSVModels;
using System.Diagnostics;
using CrystalQuartz.AspNetCore;
using NetViewApp.Db;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using NetViewApp.Hubs;
using NetViewApp.Helpers;
using NetViewApp.CSharp.SSH.Services;
using NetViewApp.CSharp.SSH.Hubs;
using NetViewApp.Jobs;
using System.Net.Http.Headers;
using System.Net;
using Microsoft.AspNetCore.Http.Json;
using System.Text.Json.Serialization;
using NetviewApp.Services;
using NetViewApp.Services.Gwan;
using System.Security.Cryptography;
using Microsoft.OpenApi.Models;

namespace NetViewApp
{
    public class Program
    {
        public static string ProxyHTTPServer { get; private set; }
        public static string RootFilePath { get; private set; }
        public static string LogFilePath { get; private set; }
        public static string InetFilePath { get; private set; }

        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Configure Logging FIRST - before services that may log during startup
            ConfigureLogging(builder);

            // ── Inject secrets into configuration (EVA vault + env vars) ────────────
            // Must run AFTER logging is set up, BEFORE ConfigureServices so IOptions<AppConfig>
            // picks up the injected values when the DI container is built.
            await InjectSecretsAsync(builder);
            // ─────────────────────────────────────────────────────────────────────────

            // Configure Services
            ConfigureServices(builder);

            // Configure Web Host
            ConfigureWebHost(builder);

            var app = builder.Build();

            // Set up environment-based logic
            ConfigureEnvironmentSettings(app);

            // Configure Middleware
            ConfigureMiddleware(app);

            // Configure App-Specific Services
           await ConfigureAppServices(app);

           Serilog.Log.Information("Starting program....");

            await app.RunAsync();

        }


        //======================= Configure Services =================================================


        //--------------------------Measuring performance time-------------------------------

         public static async Task MeasureExecutionTimeAsync(Func<Task> func, string methodName)
        {
            var stopwatch = new Stopwatch();
            stopwatch.Start();

            try
            {
                await func();
            }
            finally
            {
                stopwatch.Stop();
                var elapsedTimeInSeconds = stopwatch.Elapsed.TotalSeconds;
                Log.Information($"{methodName} took {elapsedTimeInSeconds} seconds");
                Console.WriteLine($"{methodName} took {elapsedTimeInSeconds} seconds");
            }
        }
        //-----------------------------------------------------------------------
        public static void MeasureExecutionTime(Action action, string methodName)
        {
            var stopwatch = new Stopwatch();
            stopwatch.Start();

            try
            {
                action();
            }
            finally
            {
                stopwatch.Stop();
                var elapsedTimeInSeconds = stopwatch.Elapsed.TotalSeconds;
                Log.Information($"{methodName} took {elapsedTimeInSeconds} ms");
                Console.WriteLine($"{methodName} took {elapsedTimeInSeconds} ms");
            }
        }
        //-----------------------------------------------------------------------
        private static void ConfigureServices(WebApplicationBuilder builder)
        {
            // AppConfig from appsettings.json
            builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));

            // High-Availability (Primary/Backup) - single switch + auto-failover via shared Postgres
            var haRoleProvider = new NetViewApp.Services.HA.ServerRoleProvider(
                builder.Configuration,
                Microsoft.Extensions.Logging.Abstractions.NullLogger<NetViewApp.Services.HA.ServerRoleProvider>.Instance);
            builder.Services.AddSingleton(haRoleProvider);
            builder.Services.AddHostedService<NetViewApp.Services.HA.HaHeartbeatService>();

            // Enable Swagger for API documentation
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "NetView API",
                    Version = "v1",
                    Description = "Use POST /api/auth/token to get an API token, then click Authorize and paste only the token value."
                });

                // This is the app's DB-backed API token, sent as Authorization: Bearer <token>.
                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "API Token",
                    In = ParameterLocation.Header,
                    Description = "Paste token from /api/auth/token. Example: Bearer eyJ..."
                });

                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            // Controller services
            builder.Services.AddControllers();
            builder.Services.AddControllersWithViews();
            builder.Services.AddSignalR();

            // Dependency injection services
            builder.Services.AddSingleton<IDataCacheService, DataCacheService>();
            builder.Services.AddHttpClient();

            builder.Services.AddHttpClient<IPipelineService, PipelineService>();
            // builder.Services.AddHttpClient<IPipelineService, PipelineService>()
            //     .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler())
            //     .AddHttpMessageHandler(() => new LoggingHandler());

            builder.Services.AddHttpClient<GitLabController>();

            builder.Services.AddScoped<DbHelpers>();
            builder.Services.AddSingleton<ApiTokenService>();
            builder.Services.AddHttpClient<NDCRTokenService>();

            builder.Services.AddTransient<CLdap>();

            builder.Services.AddTransient<RapidDevController>();
            
            builder.Services.AddSingleton<IZabbixSnapshotService, ZabbixSnapshotService>();
            
            builder.Services.AddSingleton<PingTools>(); 

            builder.Services.AddHttpClient("CVaaSClient", client =>
            {
                client.BaseAddress = new Uri(builder.Configuration["CVaaSApi:LabUrl"]);
                client.DefaultRequestHeaders.Add("access_token", builder.Configuration["CVaaSApi:LabToken"]);
            });

            // Forescout client: always accept server certificates (intended for internal/dev devices with self-signed certs)
            builder.Services.AddHttpClient("ForescoutClient")
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                {
                    ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true,
                    UseCookies = true,
                    CookieContainer = new System.Net.CookieContainer()
                });

            builder.Services.AddHttpClient("RapidDevClient", client =>
            {
                client.BaseAddress = new Uri(builder.Configuration["RapidDevApi:BaseUrl"]);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.Timeout = TimeSpan.FromMinutes(5);
            })         
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler //  we need cookies to persist, configure the handler here :
            {
                CookieContainer = new CookieContainer(), // <-- brand‐new, private to this client
                UseCookies      = true
            });

            builder.Services.AddScoped<RapidDevHelper>();
            builder.Services.AddSingleton<GwanSnapshotStore>();
            builder.Services.AddScoped<IGwanMonitoringService, GwanMonitoringService>();
            builder.Services.AddTransient<GwanMonitoringJob>();

            var proxyUrl = builder.Configuration["AppConfig:CS_Proxy_URL"];

            builder.Services.AddHttpClient("SdwanClient", client =>
            {
                client.BaseAddress = new Uri(builder.Configuration["SdwanApi:BaseUrl"]);
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                client.Timeout = TimeSpan.FromMinutes(2);
            })
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
            {
                CookieContainer = new CookieContainer(),
                UseCookies = true,
                Proxy = new WebProxy(proxyUrl),
                UseProxy = true,
                ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true // For self-signed certificates
            });

            builder.Services.AddScoped<SdwanHelper>();


            // builder.Services.AddTransient<SshService>();
            builder.Services.AddSingleton<ISshService, SshService>();


            builder.Services.AddMacVendorServices($@"{builder.Configuration["AppConfig:RootFilePath"]}\oui.csv");

            builder.Services.AddSingleton<ClearPassService>();    // reports API
            builder.Services.AddSingleton<ClearPassTacacsCache>(); // TACACS query cache (harvest job removed)

            // EVA vault services — EvaPasswordService is the low-level client;
            // EvaSecretCacheService caches SSO/LDAP secrets and is warmed once at startup.
            builder.Services.AddSingleton<IEvaPasswordService, EvaPasswordService>();
            builder.Services.AddSingleton<IEvaSecretCacheService, EvaSecretCacheService>();

            //''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
            // Register JWT authentication + Admin Cookie authentication in Program.cs:
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var jwtKey = builder.Configuration["Jwt:Key"];
                if (string.IsNullOrWhiteSpace(jwtKey))
                {
                    throw new InvalidOperationException(
                        "Missing Jwt:Key. Set NETVIEW_JWT_KEY (and ensure the app/service account can read it), or set Jwt:Key in configuration.");
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey)),
                    ClockSkew = TimeSpan.Zero // Optional: reduce clock skew for token expiration
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken)
                            && context.HttpContext.Request.Path.StartsWithSegments("/gwanHub"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            })
            .AddCookie("NviewAdminCookieAuth", options =>
            {
                options.LoginPath = "/AdminPages/Login";
                options.LogoutPath = "/AdminPages/Logout";
                options.AccessDeniedPath = "/AdminPages/AccessDenied";
                options.Cookie.Name = "NetView.Admin.Auth";
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Strict;
                options.ExpireTimeSpan = TimeSpan.FromHours(8);
                options.SlidingExpiration = true;
                options.Events = new Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationEvents
                {
                    OnRedirectToLogin = context =>
                    {
                        // For API requests, return 401 instead of redirect
                        if (context.Request.Path.StartsWithSegments("/api"))
                        {
                            context.Response.StatusCode = 401;
                            return Task.CompletedTask;
                        }
                        context.Response.Redirect(context.RedirectUri);
                        return Task.CompletedTask;
                    }
                };
            });
            // Register the token service
            builder.Services.AddScoped<JwtTokenService>();

            // Configure CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowSpecificOrigin", policy =>
                {
                    policy.SetIsOriginAllowed(origin =>
                    {
                        var uri = new Uri(origin);
                        return uri.Host == "localhost" || uri.Host.EndsWith(".net");
                    })
                    .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                    .AllowAnyHeader()
                    .AllowCredentials();
                });
            });
   
            var env = builder.Environment; // Environment-based Quartz configuration
            var configuration = builder.Configuration; //will read the appsettings.json at startup


            // Register job classes
            builder.Services.AddTransient<DailyTasks>();
            builder.Services.AddTransient<HourlyTasks>();
            builder.Services.AddTransient<GitLabScheduledJob>();
            builder.Services.AddTransient<GSnowTasks>();
            builder.Services.AddTransient<GsnowController>();
            builder.Services.AddTransient<DnsController>();
            builder.Services.AddTransient<TokenExpiryNotifierJob>();
            builder.Services.AddTransient<NatStatisticsJob>();
            builder.Services.AddSingleton<NetViewApp.Db.BgpPeerPrefixCache>();
            builder.Services.AddTransient<BgpPrefixNotifierJob>();
            // Register ForescoutJob for monitoring rule thresholds and emailing alerts
            builder.Services.AddTransient<ForescoutJob>();
            
            builder.Services.AddTransient<IPLocator>();

            builder.Services.AddTransient<AtlasIncidentsJob>();
            
            // GTRA (BGP Routing Table Analysis) services
            builder.Services.AddSingleton<NetViewApp.Services.Gtra.GTRAService>();
            builder.Services.AddTransient<GtraCollectionJob>();
            builder.Services.AddSingleton<NetViewApp.Services.DenGtra.NviewDenGtraService>();
            builder.Services.AddTransient<NviewDenGtraCollectionJob>();
            builder.Services.AddSingleton<NetViewApp.Services.DenChecks.DenChecksService>();
            builder.Services.AddTransient<DenChecksJob>();

            builder.Services.AddSingleton<IZabbixInterfaceService, ZabbixInterfaceService>();
            builder.Services.AddSingleton<IZabbixDevicesService, ZabbixDevicesService>();

            //email services injection
            var smtpSettings = new SmtpSettings
            {
                Server = builder.Configuration["SmtpSettings:Server"],
                Port = 25,
                UseSsl = false,
                FromEmail = builder.Configuration["SmtpSettings:FromEmail"]
            };
            builder.Services.AddSingleton(smtpSettings);
            builder.Services.AddTransient<IEmailService, EmailService>();

            // ==================================================    Adding Quartz services ===============>>>
            // builder.Services.AddQuartz(q =>{

            //     // q.UseMicrosoftDependencyInjectionJobFactory();

            //     q.UseSimpleTypeLoader();
            //     //.........................................................................................
            //     bool isDailyTasksEnabled = configuration.GetValue<bool>("QuartzJobs:DailyTasksJobEnabled");
            //     if (isDailyTasksEnabled){
            //         Console.WriteLine("Starting Daily Tasks Job.");
            //         var dailyTasksJobKey = new JobKey("DailyTasksJob");
            //         q.AddJob<DailyTasks>(opts => opts.WithIdentity(dailyTasksJobKey));
            //         q.AddTrigger(opts => opts
            //             .ForJob(dailyTasksJobKey)
            //             .WithIdentity("DailyTasksJob-trigger")
            //             .WithCronSchedule("0 0 2 * * ?") // Daily at 2:00 AM
            //         );
            //     }
            //     //.........................................................................................
            //     bool isGitLabJobEnabled = configuration.GetValue<bool>("QuartzJobs:GitLabJobEnabled");
            //     if (isGitLabJobEnabled){
            //             Console.WriteLine("Starting Gitlab Jobs.");
            //             var gitLabJobKey = new JobKey("GitLabJob");
            //             q.AddJob<GitLabScheduledJob>(opts => opts.WithIdentity(gitLabJobKey));
            //             q.AddTrigger(opts => opts
            //                 .ForJob(gitLabJobKey)
            //                 .WithIdentity("GitLabJob-trigger")
            //                 .StartNow()
            //                 .WithSimpleSchedule(x => x
            //                     .WithIntervalInMinutes(15)
            //                     .RepeatForever()));
            //     }
            //     //.........................................................................................
            //     bool isGsnowJobEnabled = configuration.GetValue<bool>("QuartzJobs:GsnowJobEnabled");
            //     if (isGsnowJobEnabled){
            //         Console.WriteLine("Starting Gsnow Jobs.");
            //         GsnowJobSchedules.ConfigureGsnowJobs(q);
            //     }
            //     //.........................................................................................
            //     bool isTokenExpiryNotifierEnabled = configuration.GetValue<bool>("QuartzJobs:TokenExpiryNotifierEnabled");
            //         if (isTokenExpiryNotifierEnabled)
            //         {
            //             Console.WriteLine("Starting Token Expiry Notifier Job.");
            //             var tokenExpiryNotifierJobKey = new JobKey("TokenExpiryNotifierJob");
            //             q.AddJob<TokenExpiryNotifierJob>(opts => opts.WithIdentity(tokenExpiryNotifierJobKey));
            //             q.AddTrigger(opts => opts
            //                 .ForJob(tokenExpiryNotifierJobKey)
            //                 .WithIdentity("TokenExpiryNotifierJob-trigger")
            //                 .WithCronSchedule("0 0 8 * * ?") // Daily at 8:00 AM
            //             );
            //         }
            //     //.........................................................................................

            //     }); //builder.Services.AddQuartz

            // Enhanced Quartz configuration
            builder.Services.AddQuartz(q =>
            {
                q.UseSimpleTypeLoader();
                EnhancedJobScheduler.ConfigureJobs(q, builder.Configuration, builder.Environment, haRoleProvider.CurrentRole);
            });

            builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);   


            // <<< ============================================================================================
             
            builder.Services.Configure<JsonOptions>(options =>
            {
                options.SerializerOptions.NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals;
                options.SerializerOptions.WriteIndented = true;
            });
            

        }//ConfigureServices

        //========================= ConfigureWebHost =====================================

        private static void ConfigureWebHost(WebApplicationBuilder builder)
        {
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.ConfigureHttpsDefaults(httpsOptions =>
                {
                    httpsOptions.ClientCertificateMode = ClientCertificateMode.NoCertificate;
                });
            });
        }
        //========================= Secret Injection (EVA vault + env vars) ===================
        // ── helpers ──────────────────────────────────────────────────────────────
        /// <summary>Returns "ab***" (first 2 chars + ***) or "(empty)" for log lines.</summary>
        private static string MaskSecret(string? value) =>
            string.IsNullOrWhiteSpace(value) ? "(empty)" : (value.Length <= 2 ? "***" : value[..2] + "***");

        /// <summary>
        /// Logs a one-line summary row: ✅ SET or ❌ MISSING for the given config value.
        /// </summary>
        private static void LogSecretStatus(string label, string configKey, IConfiguration config)
        {
            var val = config[configKey];
            if (!string.IsNullOrWhiteSpace(val))
                Log.Information("[SecretSummary]   ✅  {Label,-30} → {ConfigKey,-45}  preview={Preview}",
                    label, configKey, MaskSecret(val));
            else
                Log.Warning("[SecretSummary]   ❌  {Label,-30} → {ConfigKey,-45}  NOT SET",
                    label, configKey);
        }
        // ─────────────────────────────────────────────────────────────────────────

        private static async Task InjectSecretsAsync(WebApplicationBuilder builder)
        {
            var config = builder.Configuration;
            var retrievalRows = new List<(string Secret, string Status)>();

            void AddRetrievalRow(string secret, string status)
            {
                retrievalRows.Add((secret, status));
                Log.Debug("[SecretFlow] {Secret,-42} | {Status}", secret, status);
            }

            void AddConfigStatusRow(string label, string configKey)
            {
                var val = config[configKey];
                AddRetrievalRow(label, string.IsNullOrWhiteSpace(val) ? "MISSING" : "SET");
            }

            void LogRetrievalTable()
            {
                Log.Information("[SecretFlow] Secret retrieval order (2 columns: Secret | Status)");
                foreach (var row in retrievalRows)
                {
                    Log.Information("[SecretFlow] {Secret,-42} | {Status}", row.Secret, row.Status);
                }
            }

            var bootstrapKeyCached = string.Empty;
            var bootstrapKeyResolved = false;

            // ── 1. Environment variable injection ────────────────────────────────
            Log.Information("[SecretInjection] ════════════════════════════════════════════");
            Log.Information("[SecretInjection]  Phase 1 — Environment variable secrets");
            Log.Information("[SecretInjection] ════════════════════════════════════════════");

            static bool TryGetEnv(string envName, out string value)
            {
                static string Normalize(string? raw)
                {
                    var normalized = (raw ?? string.Empty).Trim();
                    if (normalized.Length >= 2 &&
                        ((normalized.StartsWith('"') && normalized.EndsWith('"')) ||
                         (normalized.StartsWith('\'') && normalized.EndsWith('\''))))
                    {
                        normalized = normalized.Substring(1, normalized.Length - 2);
                    }
                    return normalized;
                }

                value = Normalize(Environment.GetEnvironmentVariable(envName));

                // IIS app-pool processes may not see refreshed process env immediately.
                // On Windows, also read Machine/User scopes directly.
                if (string.IsNullOrWhiteSpace(value) && OperatingSystem.IsWindows())
                {
                    value = Normalize(Environment.GetEnvironmentVariable(envName, EnvironmentVariableTarget.Machine));
                    if (string.IsNullOrWhiteSpace(value))
                    {
                        value = Normalize(Environment.GetEnvironmentVariable(envName, EnvironmentVariableTarget.User));
                    }
                }

                return !string.IsNullOrWhiteSpace(value);
            }

            static bool IsPlaceholderSecret(string? value)
            {
                var v = (value ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(v))
                    return true;

                return v.Equals("_REMOVED_", StringComparison.OrdinalIgnoreCase) ||
                       v.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase) ||
                       v.Equals("mypassword", StringComparison.OrdinalIgnoreCase) ||
                       v.Equals("password", StringComparison.OrdinalIgnoreCase);
            }

            static bool HasUsableDbConnection(string? connectionString)
            {
                if (string.IsNullOrWhiteSpace(connectionString))
                    return false;

                try
                {
                    var parsed = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);
                    return !string.IsNullOrWhiteSpace(parsed.Password) && !IsPlaceholderSecret(parsed.Password);
                }
                catch
                {
                    return false;
                }
            }

            string ResolveBootstrapKey()
            {
                if (bootstrapKeyResolved)
                {
                    return bootstrapKeyCached;
                }

                // Use a single canonical env var for the bootstrap key. If it is not set,
                // fall back to reading the local .zdcache.bin file.
                const string canonicalEnv = "NETVIEW_CERT_BOOTSTRAP_KEY";
                if (TryGetEnv(canonicalEnv, out var value))
                {
                    bootstrapKeyCached = value;
                    bootstrapKeyResolved = true;
                    AddRetrievalRow("NETVIEW_CERT_BOOTSTRAP_KEY", "ENV");
                    return bootstrapKeyCached;
                }

                var rootPath = config["AppConfig:RootFilePath"];
                var fallbackPath = string.IsNullOrWhiteSpace(rootPath)
                    ? Path.Combine(AppContext.BaseDirectory, ".zdcache.bin")
                    : Path.Combine(rootPath, ".zdcache.bin");

                try
                {
                    if (File.Exists(fallbackPath))
                    {
                        var fileValue = File.ReadAllText(fallbackPath).Trim();
                        if (!string.IsNullOrWhiteSpace(fileValue))
                        {
                            Log.Warning("[SecretInjection] Bootstrap key resolved from .zdcache.bin fallback at {Path}", fallbackPath);
                            bootstrapKeyCached = fileValue;
                            bootstrapKeyResolved = true;
                            AddRetrievalRow("NETVIEW_CERT_BOOTSTRAP_KEY", "FILE:.zdcache.bin");
                            return bootstrapKeyCached;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "[SecretInjection] Failed reading .zdcache.bin fallback from {Path}", fallbackPath);
                }

                bootstrapKeyResolved = true;
                bootstrapKeyCached = string.Empty;
                AddRetrievalRow("NETVIEW_CERT_BOOTSTRAP_KEY", "MISSING");
                return string.Empty;
            }

            bool TryResolveBootstrapPemFromEnv(string certBlobEnv, string keyBlobEnv, out string certPem, out string keyPem)
            {
                certPem = string.Empty;
                keyPem = string.Empty;

                if (!TryGetEnv(certBlobEnv, out var certBlob) || !TryGetEnv(keyBlobEnv, out var keyBlob))
                {
                    AddRetrievalRow($"{certBlobEnv}+{keyBlobEnv}", "MISSING");
                    return false;
                }

                var bootstrapKey = ResolveBootstrapKey();
                if (string.IsNullOrWhiteSpace(bootstrapKey))
                {
                    AddRetrievalRow($"Decrypt {certBlobEnv}+{keyBlobEnv}", "SKIPPED_NO_BOOTSTRAP_KEY");
                    return false;
                }

                certPem = NormalizeExpectedPem(
                    DecryptBackdoorSecret(bootstrapKey, certBlob),
                    certBlobEnv,
                    isCertificate: true);
                keyPem = NormalizeExpectedPem(
                    DecryptBackdoorSecret(bootstrapKey, keyBlob),
                    keyBlobEnv,
                    isCertificate: false);
                AddRetrievalRow($"Decrypt {certBlobEnv}+{keyBlobEnv}", "OK");
                return !string.IsNullOrWhiteSpace(certPem) && !string.IsNullOrWhiteSpace(keyPem);
            }

            async Task<(string certPem, string keyPem)?> TryResolvePemPairFromDbAsync(string certSecretName, string keySecretName)
            {
                var dbConnection = config["AppConfig:DB_DASHBOARD_CXNSTR"];
                if (!HasUsableDbConnection(dbConnection))
                {
                    AddRetrievalRow("DB cert blobs query", "SKIPPED_NO_DB_CONNECTION");
                    return null;
                }

                var bootstrapKey = ResolveBootstrapKey();
                if (string.IsNullOrWhiteSpace(bootstrapKey))
                {
                    AddRetrievalRow("DB cert blobs decrypt", "SKIPPED_NO_BOOTSTRAP_KEY");
                    return null;
                }

                await using var conn = new Npgsql.NpgsqlConnection(dbConnection);
                await conn.OpenAsync();

                var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT secret_name, encrypted_value
                    FROM public.bootstrap_secret_blobs
                    WHERE is_active = TRUE
                      AND secret_name IN (@name1, @name2);
                ";

                cmd.Parameters.AddWithValue("name1", certSecretName);
                cmd.Parameters.AddWithValue("name2", keySecretName);

                string? certEnc = null;
                string? keyEnc = null;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var secretName = reader.GetString(0);
                    var encryptedValue = reader.GetString(1);
                    if (secretName.Equals(certSecretName, StringComparison.OrdinalIgnoreCase)) certEnc = encryptedValue;
                    if (secretName.Equals(keySecretName, StringComparison.OrdinalIgnoreCase)) keyEnc = encryptedValue;
                }

                if (string.IsNullOrWhiteSpace(certEnc) || string.IsNullOrWhiteSpace(keyEnc))
                {
                    AddRetrievalRow($"DB cert blobs {certSecretName}", "MISSING");
                    return null;
                }

                var certPem = NormalizeExpectedPem(
                    DecryptBackdoorSecret(bootstrapKey, certEnc),
                    certSecretName,
                    isCertificate: true);
                var keyPem = NormalizeExpectedPem(
                    DecryptBackdoorSecret(bootstrapKey, keyEnc),
                    keySecretName,
                    isCertificate: false);

                Log.Information("[SecretInjection] Normalized DB-backed PEM blobs for cert={CertSecret} key={KeySecret}",
                    certSecretName, keySecretName);
                AddRetrievalRow($"DB cert blobs {certSecretName}", "OK");

                return (
                    certPem,
                    keyPem
                );
            }

            string NormalizeExpectedPem(string rawValue, string sourceName, bool isCertificate)
            {
                if (string.IsNullOrWhiteSpace(rawValue))
                    throw new InvalidOperationException($"Decrypted value from '{sourceName}' is empty.");

                var trimmed = rawValue.Trim();
                if (LooksLikeExpectedPem(trimmed, isCertificate))
                    return trimmed;

                if (TryDecodeBase64Utf8(trimmed, out var decoded) && LooksLikeExpectedPem(decoded, isCertificate))
                {
                    Log.Information("[SecretInjection] PEM from '{Source}' was base64-encoded and has been normalized", sourceName);
                    return decoded;
                }

                var prefix = trimmed.Length >= 16 ? trimmed[..16] : trimmed;
                var expected = isCertificate
                    ? "BEGIN/END CERTIFICATE"
                    : "BEGIN/END PRIVATE KEY (or RSA/ENCRYPTED variant)";
                throw new CryptographicException($"Invalid PEM format from '{sourceName}'. Prefix='{prefix}', expected {expected}.");
            }

            bool TryDecodeBase64Utf8(string input, out string decoded)
            {
                decoded = string.Empty;
                try
                {
                    var bytes = Convert.FromBase64String(input);
                    decoded = Encoding.UTF8.GetString(bytes).Trim();
                    return !string.IsNullOrWhiteSpace(decoded);
                }
                catch
                {
                    return false;
                }
            }

            bool LooksLikeExpectedPem(string value, bool isCertificate)
            {
                if (isCertificate)
                {
                    return value.StartsWith("-----BEGIN CERTIFICATE-----", StringComparison.Ordinal)
                        && value.Contains("-----END CERTIFICATE-----", StringComparison.Ordinal);
                }

                return (value.StartsWith("-----BEGIN PRIVATE KEY-----", StringComparison.Ordinal)
                        && value.Contains("-----END PRIVATE KEY-----", StringComparison.Ordinal))
                    || (value.StartsWith("-----BEGIN RSA PRIVATE KEY-----", StringComparison.Ordinal)
                        && value.Contains("-----END RSA PRIVATE KEY-----", StringComparison.Ordinal))
                    || (value.StartsWith("-----BEGIN ENCRYPTED PRIVATE KEY-----", StringComparison.Ordinal)
                        && value.Contains("-----END ENCRYPTED PRIVATE KEY-----", StringComparison.Ordinal));
            }

            Log.Debug("[SecretInjection] App secrets env-var injection skipped (loaded from DB table public.nview_config_secrets)");
            Log.Debug("[SecretInjection] GitLab projects env-var injection skipped (loaded from DB table public.nview_gitlab_projects)");

            Log.Information("[SecretInjection] Phase 1 complete");

            // ── 2. EVA vault injection ────────────────────────────────────────────
            // Fetched here (pre-Build) so IOptions<AppConfig> binds the correct values.
            Log.Information("[SecretInjection] ════════════════════════════════════════════");
            Log.Information("[SecretInjection]  Phase 2 — EVA Vault secrets (cert-based)");
            Log.Information("[SecretInjection] ════════════════════════════════════════════");
            var dbResolvedFromEva = false;
            try
            {
                var evaService = new EvaPasswordService();

                // DB connection from EVA SSOZabbix (same pattern as ZDash backend)
                var dbSection = builder.Configuration.GetSection("AppConfig:SSOZabbix:EvaVault");
                if (!string.IsNullOrWhiteSpace(dbSection["Namespace"]) &&
                    !string.IsNullOrWhiteSpace(dbSection["Path"]) &&
                    dbSection["Namespace"] != "FILL_NAMESPACE")
                {
                    Log.Information("[SecretInjection] Fetching DB connection from EVA SSOZabbix — Namespace={Ns} Path={Path} Domain={Domain}",
                        dbSection["Namespace"], dbSection["Path"], dbSection["Domain"] ?? "PROD");

                    if (!TryResolveBootstrapPemFromEnv("NETVIEW_EVA_SSOZABBIX_CERT_BLOB", "NETVIEW_EVA_SSOZABBIX_KEY_BLOB", out var dbCertPem, out var dbKeyPem))
                    {
                        AddRetrievalRow("NETVIEW_EVA_SSOZABBIX_CERT_BLOB+NETVIEW_EVA_SSOZABBIX_KEY_BLOB", "MISSING_FATAL");
                        Log.Error("[SecretInjection] ❌ Missing required bootstrap EVA cert/key blobs in env for SSOZabbix. Expected NETVIEW_EVA_SSOZABBIX_CERT_BLOB and NETVIEW_EVA_SSOZABBIX_KEY_BLOB. Startup will stop.");
                        throw new InvalidOperationException("Missing required env vars NETVIEW_EVA_SSOZABBIX_CERT_BLOB and NETVIEW_EVA_SSOZABBIX_KEY_BLOB.");
                    }
                    else
                    {
                        var dbPasswordFromEva = await evaService.RetrievePasswordAsync(
                            dbSection["Namespace"]!,
                            dbSection["Path"]!,
                            dbSection["Domain"] ?? "PROD",
                            dbCertPem,
                            dbKeyPem,
                            dbSection["MountPoint"] ?? "secret");

                        var baseConnectionString = config["AppConfig:DB_DASHBOARD_CXNSTR"];

                        if (string.IsNullOrWhiteSpace(baseConnectionString))
                        {
                            Log.Warning("[SecretInjection] ⚠️  Base DB connection string missing in AppConfig:DB_DASHBOARD_CXNSTR; cannot inject EVA password");
                            AddRetrievalRow("DB password from EVA (SSOZabbix)", "FAILED_NO_BASE_CONNECTION_STRING");
                        }
                        else
                        {
                            var csBuilder = new Npgsql.NpgsqlConnectionStringBuilder(baseConnectionString)
                            {
                                Password = dbPasswordFromEva
                            };

                            var finalConnectionString = csBuilder.ConnectionString;
                            config["AppConfig:DB_DASHBOARD_CXNSTR"] = finalConnectionString;
                            dbResolvedFromEva = HasUsableDbConnection(finalConnectionString);
                            AddRetrievalRow("DB password from EVA (SSOZabbix)", dbResolvedFromEva ? "SET" : "FAILED");
                        }

                        Log.Information("[SecretInjection] ✅ AppConfig:DB_DASHBOARD_CXNSTR password injected from EVA SSOZabbix  preview={Preview}",
                            MaskSecret(dbPasswordFromEva));
                    }
                }
                else
                {
                    AddRetrievalRow("AppConfig:SSOZabbix:EvaVault", "MISSING_FATAL");
                    Log.Error("[SecretInjection] ❌ AppConfig:SSOZabbix:EvaVault is not configured. Startup will stop.");
                    throw new InvalidOperationException("AppConfig:SSOZabbix:EvaVault must be configured.");
                }

                // SSO + Zabbix (same credential)
                var ssoSection = builder.Configuration.GetSection("AppConfig:SSONetview:EvaVault");
                if (!string.IsNullOrWhiteSpace(ssoSection["Namespace"]) &&
                    !string.IsNullOrWhiteSpace(ssoSection["Path"]) &&
                    ssoSection["Namespace"] != "FILL_NAMESPACE")
                {
                    Log.Information("[SecretInjection] Fetching SSO/Zabbix password from EVA — Namespace={Ns} Path={Path} Domain={Domain}",
                        ssoSection["Namespace"], ssoSection["Path"], ssoSection["Domain"] ?? "PROD");

                    var ssoPemPair = await TryResolvePemPairFromDbAsync("evavault.sso_netview.cert.pem", "evavault.sso_netview.key.pem");
                    if (ssoPemPair.HasValue)
                    {
                        var ssoPassword = await evaService.RetrievePasswordAsync(
                            ssoSection["Namespace"]!,
                            ssoSection["Path"]!,
                            ssoSection["Domain"] ?? "PROD",
                            ssoPemPair.Value.certPem,
                            ssoPemPair.Value.keyPem,
                            ssoSection["MountPoint"] ?? "secret");
                        config["AppConfig:SSO_Password"] = ssoPassword;
                        config["AppConfig:Zabbix_Password"] = ssoPassword;
                        Log.Information("[SecretInjection] ✅ AppConfig:SSO_Password + AppConfig:Zabbix_Password injected from EVA using DB-backed cert blobs");
                        AddRetrievalRow("SSO password from EVA", "SET");
                        AddRetrievalRow("Zabbix password from EVA", "SET");
                    }
                    else
                    {
                        Log.Warning("[SecretInjection] ⚠️  DB-backed SSONetview cert blobs were not found. Skipping SSO/Zabbix EVA fetch.");
                        AddRetrievalRow("SSO/Zabbix from EVA", "SKIPPED_NO_CERT_BLOBS");
                    }
                }
                else
                    Log.Warning("[SecretInjection] ⚠️  AppConfig:SSONetview:EvaVault not configured — SSO/Zabbix passwords unavailable");

                // LDAP bind password
                var ldapSection = builder.Configuration.GetSection("AppConfig:LDAP:EvaVault");
                if (!string.IsNullOrWhiteSpace(ldapSection["Namespace"]) &&
                    !string.IsNullOrWhiteSpace(ldapSection["Path"]) &&
                    ldapSection["Namespace"] != "FILL_NAMESPACE")
                {
                    Log.Information("[SecretInjection] Fetching LDAP BindPassword from EVA — Namespace={Ns} Path={Path} Domain={Domain}",
                        ldapSection["Namespace"], ldapSection["Path"], ldapSection["Domain"] ?? "PROD");

                    var ldapPemPair = await TryResolvePemPairFromDbAsync("evavault.ldap.cert.pem", "evavault.ldap.key.pem");
                    if (ldapPemPair.HasValue)
                    {
                        var ldapPassword = await evaService.RetrievePasswordAsync(
                            ldapSection["Namespace"]!,
                            ldapSection["Path"]!,
                            ldapSection["Domain"] ?? "PROD",
                            ldapPemPair.Value.certPem,
                            ldapPemPair.Value.keyPem,
                            ldapSection["MountPoint"] ?? "secret");
                        config["AppConfig:LDAP:BindPassword"] = ldapPassword;
                        Log.Information("[SecretInjection] ✅ AppConfig:LDAP:BindPassword injected from EVA using DB-backed cert blobs");
                        AddRetrievalRow("LDAP BindPassword from EVA", "SET");
                    }
                    else
                    {
                        Log.Warning("[SecretInjection] ⚠️  DB-backed LDAP cert blobs were not found. Skipping LDAP EVA fetch.");
                        AddRetrievalRow("LDAP BindPassword from EVA", "SKIPPED_NO_CERT_BLOBS");
                    }
                }
                else
                    Log.Warning("[SecretInjection] ⚠️  AppConfig:LDAP:EvaVault not configured — LDAP bind password unavailable");
            }
            catch (Exception evaEx)
            {
                Log.Error(evaEx, "[SecretInjection] ❌ EVA vault fetch failed — DB/SSO/Zabbix/LDAP secrets may be unavailable");
                throw;
            }

            // DB connection must be usable at this point (no NETVIEW_DB_CONNECTION fallback).
            if (!dbResolvedFromEva && !HasUsableDbConnection(config["AppConfig:DB_DASHBOARD_CXNSTR"]))
            {
                AddRetrievalRow("AppConfig:DB_DASHBOARD_CXNSTR", "MISSING_FATAL");
                Log.Error("[SecretInjection] ❌ AppConfig:DB_DASHBOARD_CXNSTR is not usable after EVA DB password retrieval. Startup will stop.");
                throw new InvalidOperationException("AppConfig:DB_DASHBOARD_CXNSTR is not usable and NETVIEW_DB_CONNECTION fallback is disabled.");
            }
            else
            {
                AddRetrievalRow("AppConfig:DB_DASHBOARD_CXNSTR", dbResolvedFromEva ? "SET_FROM_EVA" : "SET_PRECONFIGURED");
                Log.Information("[SecretInjection] DB connection is usable without NETVIEW_DB_CONNECTION fallback.");
            }

            try
            {
                await DbConfigurationInjector.InjectAppSecretsAsync(config);
                AddRetrievalRow("public.nview_config_secrets", "LOADED");
            }
            catch (Exception ex)
            {
                AddRetrievalRow("public.nview_config_secrets", "FAILED");
                Log.Error(ex, "[SecretInjection] ❌ Failed to load app secret keys from DB table public.nview_config_secrets");
            }

            try
            {
                await DbConfigurationInjector.InjectGitLabProjectsAsync(config);
                AddRetrievalRow("public.nview_gitlab_projects", "LOADED");
            }
            catch (Exception ex)
            {
                AddRetrievalRow("public.nview_gitlab_projects", "FAILED");
                Log.Error(ex, "[SecretInjection] ❌ Failed to load GitLab projects from DB table public.nview_gitlab_projects");
            }

            AddConfigStatusRow("AppConfig:DB_DASHBOARD_CXNSTR", "AppConfig:DB_DASHBOARD_CXNSTR");
            AddConfigStatusRow("Jwt:Key", "Jwt:Key");
            AddConfigStatusRow("AppConfig:GNI_API_RO_PWD", "AppConfig:GNI_API_RO_PWD");
            AddConfigStatusRow("AppConfig:Tacacs_Password", "AppConfig:Tacacs_Password");
            AddConfigStatusRow("AppConfig:Grafana_EMEA_APIKEY", "AppConfig:Grafana_EMEA_APIKEY");
            AddConfigStatusRow("AppConfig:NDCR_Password", "AppConfig:NDCR_Password");
            AddConfigStatusRow("AppConfig:FORESCOUT_Password", "AppConfig:FORESCOUT_Password");
            AddConfigStatusRow("SdwanApi:Password", "SdwanApi:Password");
            AddConfigStatusRow("CVaaSApi:LabToken", "CVaaSApi:LabToken");
            AddConfigStatusRow("AppConfig:SSO_Password", "AppConfig:SSO_Password");
            AddConfigStatusRow("AppConfig:Zabbix_Password", "AppConfig:Zabbix_Password");
            AddConfigStatusRow("AppConfig:LDAP:BindPassword", "AppConfig:LDAP:BindPassword");

            var projects = builder.Configuration.GetSection("AppConfig:GitLab:Projects").GetChildren().ToList();
            for (var i = 0; i < projects.Count; i++)
            {
                AddConfigStatusRow($"GitLab PAT {i}", $"AppConfig:GitLab:Projects:{i}:PersonalAccessToken");
            }

            LogRetrievalTable();
        }

        //========================= ENV Settings ==============================================

        private static void ConfigureEnvironmentSettings(WebApplication app)
        {
            var env = app.Services.GetRequiredService<IHostEnvironment>();
            var appConfig = app.Services.GetRequiredService<IOptions<AppConfig>>().Value;
            ProxyHTTPServer = appConfig.ProxyHTTPServer;
            RootFilePath = appConfig.RootFilePath;
            LogFilePath = appConfig.LogFilePath;
            InetFilePath = appConfig.InetFilePath;

            Log.Information($"EnvironmentName is {env.EnvironmentName}");

            if (env.IsDevelopment())
            {
                Console.WriteLine("Development environment detected.");
                Log.Information("Development environment detected.");
                var ufolderName = appConfig.UserFolderName;
                // RootFilePath = $@"C:\Users\{ufolderName}\source\repos\NetViewSeed";
                LogFilePath = $@"C:\Users\{ufolderName}\repos\netview-backend\Logs";
                InetFilePath = $@"{RootFilePath}\inetpub";
            }

            // 
            // var file2check = $@"C:\Users\{ufolderName}\source\repos\NetViewSeed\_env.txt";   
            // if (System.IO.File.Exists(file2check) && System.IO.File.ReadAllText(file2check).Contains("MYVM"))
            // {
            //     RootFilePath = $@"C:\Users\{ufolderName}\source\repos\NetViewSeed";
            //     LogFilePath = $@"{RootFilePath}\Logs\ZDashLogs.txt";
            //     InetFilePath = $@"{RootFilePath}\inetpub";
            // }
        }



        private static void ConfigureLogging(WebApplicationBuilder builder)
        {
            // Read log level from appsettings, default to Information
            var logLevel = builder.Configuration.GetValue<string>("Logging:LogLevel:Default") ?? "Information";
            if (!Enum.TryParse<LogEventLevel>(logLevel, out var parsedLevel))
                parsedLevel = LogEventLevel.Information;

            var loggerConfig = new LoggerConfiguration()
                .Enrich.FromLogContext();

            // Determine log levels based on environment
            LogEventLevel consoleLevel;
            LogEventLevel fileLevel;
            
            if (builder.Environment.IsDevelopment())
            {
                // DEV: Always Debug for both console and file (hardcoded for troubleshooting)
                consoleLevel = LogEventLevel.Debug;
                fileLevel = LogEventLevel.Debug;
                loggerConfig.MinimumLevel.Debug(); // Force minimum to Debug in dev
                
                // In dev, apply overrides AFTER setting minimum to Debug
                // This allows specific namespaces to be configured while keeping Debug as baseline
                var loggingSection = builder.Configuration.GetSection("Logging:LogLevel");
                foreach (var config in loggingSection.GetChildren())
                {
                    if (config.Key != "Default" && Enum.TryParse<LogEventLevel>(config.Value, out var level))
                        loggerConfig.MinimumLevel.Override(config.Key, level);
                }
            }
            else
            {
                // PROD: Use appsettings value (defaults to Information if not set)
                consoleLevel = parsedLevel;
                fileLevel = parsedLevel;
                loggerConfig.MinimumLevel.Is(parsedLevel);
                
                // Apply overrides from appsettings
                var loggingSection = builder.Configuration.GetSection("Logging:LogLevel");
                foreach (var config in loggingSection.GetChildren())
                {
                    if (config.Key != "Default" && Enum.TryParse<LogEventLevel>(config.Value, out var level))
                        loggerConfig.MinimumLevel.Override(config.Key, level);
                }
            }

            // Determine log path early (before ConfigureEnvironmentSettings runs)
            var configuredLogPath = builder.Configuration["AppConfig:LogFilePath"];
            string actualLogPath;
            
            if (builder.Environment.IsDevelopment())
            {
                var userFolder = builder.Configuration["AppConfig:UserFolderName"];
                actualLogPath = $@"C:\Users\{userFolder}\repos\netview-backend\Logs";
            }
            else
            {
                actualLogPath = configuredLogPath ?? "C:/NetViewSeed/Logs";
            }
            
            // Ensure directory exists
            Directory.CreateDirectory(actualLogPath);

            Log.Logger = loggerConfig
                .WriteTo.RollingFile(@$"{actualLogPath}\NetView.txt", fileLevel)
                .WriteTo.Console(restrictedToMinimumLevel: consoleLevel)
                .CreateLogger();
            
            Log.Information("Logging configured: Environment={Environment}, Console={ConsoleLevel}, File={FileLevel}, Path={LogPath}", 
                builder.Environment.EnvironmentName, consoleLevel, fileLevel, actualLogPath);
        }

        //=============================================================== ConfigureMiddleware =============================================================

        private static void ConfigureMiddleware(WebApplication app)
        {
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseStaticFiles();
            app.UseRouting();

            // ── CORS debug logging (remove once the issue is resolved) ──
            app.Use(async (ctx, next) =>
            {
                var origin = ctx.Request.Headers.Origin.FirstOrDefault();
                if (!string.IsNullOrEmpty(origin))
                {
                    Serilog.Log.Debug( "[CORS-DBG] {Method} {Path} Origin={Origin}", ctx.Request.Method, ctx.Request.Path, origin);
                }

                await next();

                if (!string.IsNullOrEmpty(origin))
                {
                    var acao = ctx.Response.Headers["Access-Control-Allow-Origin"].FirstOrDefault();
                    Serilog.Log.Debug("[CORS-DBG] Response {Status} ACAO={Acao} for {Method} {Path}", ctx.Response.StatusCode, acao ?? "(none)", ctx.Request.Method, ctx.Request.Path);
                }
            });

            app.UseCors("AllowSpecificOrigin");
            app.UseAuthentication();
            app.UseMiddleware<ApiTokenMiddleware>();
            app.UseAuthorization();
            app.MapHub<AlertHub>("/alertHub");
            app.MapHub<GwanHub>("/gwanHub");
            app.MapHub<A2BHub>("/a2bHub");
            app.MapHub<NetworkDeviceHub>("/sshhubs/networkdevice");

            app.UseCrystalQuartz(() =>
            {
                var schedulerFactory = app.Services.GetRequiredService<ISchedulerFactory>();
                return schedulerFactory.GetScheduler().Result;
            });

            app.MapControllers();
            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");
        }
        //============================================================== ConfigureAppServices ==============================================================

        private static async Task ConfigureAppServices(WebApplication app)
        {

             var env = app.Services.GetRequiredService<IHostEnvironment>();
              Serilog.Log.Information("Environment Name:"+env.EnvironmentName);

            // ── Warm EVA secret cache (SSO, LDAP) — for runtime ForceRefresh support ──
            var evaCache = app.Services.GetRequiredService<IEvaSecretCacheService>();
            try
            {
                await evaCache.WarmAsync();
                Log.Information("✅ EVA secret cache warmed at startup");
            }
            catch (Exception evaEx)
            {
                Log.Error(evaEx, "❌ EVA secret cache warm failed — secrets already injected pre-build, runtime refresh may not work");
            }
            // ────────────────────────────────────────────────────────────────────────

            // if (env.IsDevelopment())
            // {
            //     Serilog.Log.Information("Dev env detected");
            //     Console.WriteLine("Dev env, not loading stuff into cache");
            //     return;
            // }

            //?? seconds
            
            await MeasureExecutionTimeAsync(GsnowController.InitializeRfcDictionary, "GniController.InitializRfcDictionary");

            // Create/verify WeekChanges tables at startup BEFORE trying to hydrate from them
            try
            {
                using var scopeGtra = app.Services.CreateScope();
                var dbGtra = scopeGtra.ServiceProvider.GetRequiredService<DbHelpers>();
                await dbGtra.CreateWeekChangesSnapshotTablesAsync();
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "Failed to create WeekChanges snapshot tables at startup");
                throw;
            }

            try
            {
                using var scopeWeek = app.Services.CreateScope();
                var cfg = scopeWeek.ServiceProvider.GetRequiredService<IConfiguration>();
                var dbWeek = scopeWeek.ServiceProvider.GetRequiredService<DbHelpers>();
                var hydrateFromDb = cfg.GetValue<bool>("WeekChangesStore:HydrateDictionaryFromDbOnStartup", true);

                if (hydrateFromDb)
                {
                    var fromDb = await dbWeek.GetThisWeekChangesSnapshotAsync();
                    if (fromDb.Count > 0)
                    {
                        GsnowController.Dict_ThisWeek_RFCs.Clear();
                        foreach (var row in fromDb.Where(r => r != null && !string.IsNullOrWhiteSpace(r.number)))
                            GsnowController.Dict_ThisWeek_RFCs[row.number] = row;

                        Serilog.Log.Information("Hydrated ThisWeek RFC dictionary from DB snapshot. Count={Count}", fromDb.Count);
                    }
                }
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning(ex, "DB-based startup hydration for ThisWeek RFC dictionary failed; continuing with existing cache");
            }

            await MeasureExecutionTimeAsync(GniController.InitializeGniDictionary, "GniController.InitializeGniDictionary");


            //TacacsCmdsController.EnsureCommandIndexLoaded();

            //~10 seconds - skip for dev
            if(!env.IsDevelopment())
                await MeasureExecutionTimeAsync(DnsController.InitializeDnsDicts, "DnsController.InitializeDnsDicts");

            using (var scope = app.Services.CreateScope())
            {
                var gitLabController = scope.ServiceProvider.GetRequiredService<GitLabController>();
                //~16 seconds
                MeasureExecutionTime(gitLabController.InitializeDataCache, "GitLabController.InitializeDataCache");
            }
            //this takesa long time
            var dataCacheService = app.Services.GetRequiredService<IDataCacheService>();
           // await MeasureExecutionTimeAsync(dataCacheService.PreloadSnapshotCache, "DataCacheService.PreloadSnapshotCache");


           CVaaSConnectivityMonitorController.InitializeCache();

            // ... warm‑ups...
            try
            {
                // Warm up CVaaS inventory for default region(s)
                CvaaSDevicesInventoryController.InitializeDict("SWISS");
                // Optionally preload other regions:
                // CvaaSDevicesInventoryController.InitializeDict("AMER");
                // CvaaSDevicesInventoryController.InitializeDict("APAC");
                Serilog.Log.Information("CvaaS inventory initialized (SWISS). Device count: {Count}",  CvaaSDevicesInventoryController.dict_hostname_cvaasdevice.Count);
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "Failed to initialize CVaaS inventory at startup");
                // Decide: rethrow to stop startup, or keep running and let lazy init try later.
                // throw;
            }


            // GTRA: Create/verify tables at startup (idempotent)
            try
            {
                using var scopeGtra = app.Services.CreateScope();
                var dbGtra = scopeGtra.ServiceProvider.GetRequiredService<DbHelpers>();
                await dbGtra.CreateGtraTablesAsync();
                await dbGtra.CreateNviewDenGtraTablesAsync();
                await dbGtra.EnsureDenChecksTablesAsync();
                // Note: CreateWeekChangesSnapshotTablesAsync() is called earlier to ensure tables exist before hydration

                // Startup visibility for the DenChecks master gate (DB-controlled runtime switch).
                var denChecksControl = await dbGtra.GetDenChecksJobControlAsync();
                Serilog.Log.Information("[bi-activity] DenChecks master state at startup: Enabled={Enabled}, Paused={Paused}, IntervalMinutes={IntervalMinutes}, TimeoutMs={TimeoutMs}, MaxConcurrency={MaxConcurrency}, RetentionDays={RetentionDays}",
                    denChecksControl.Enabled,
                    denChecksControl.Paused,
                    denChecksControl.Interval_Minutes,
                    denChecksControl.Timeout_Ms,
                    denChecksControl.Max_Concurrency,
                    denChecksControl.Retention_Days);
            }
            catch (Exception ex)
            {
                Serilog.Log.Warning(ex, "GTRA/DEN-GTRA/DenChecks: Failed to create/verify tables at startup");
            }



        }

        public class LoggingHandler : DelegatingHandler
        {
            protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
            {
                var requestBody = req.Content != null 
                    ? await req.Content.ReadAsStringAsync() 
                    : "<no body>";
                Debug.WriteLine($"REQ → {req.Method} {req.RequestUri}\n{requestBody}");
                Log.Information($"REQ → {req.Method} {req.RequestUri}\n{requestBody}");
                var res = await base.SendAsync(req, ct);
                return res;
            }
}

        private static string DecryptBackdoorSecret(string password, string encryptedBase64)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new ArgumentException("Fallback password is empty", nameof(password));
            if (string.IsNullOrWhiteSpace(encryptedBase64))
                throw new ArgumentException("Fallback payload is empty", nameof(encryptedBase64));

            var combined = Convert.FromBase64String(encryptedBase64.Trim());
            if (combined.Length < 17)
                throw new InvalidOperationException("Encrypted payload is invalid");

            var salt = combined[..16];
            var cipher = combined[16..];

            using var kdf = new Rfc2898DeriveBytes(password, salt, 100_000, HashAlgorithmName.SHA256);
            var key = kdf.GetBytes(32);
            var iv = kdf.GetBytes(16);

            using var aes = Aes.Create();
            aes.Key = key;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            var plain = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
            return Encoding.UTF8.GetString(plain);
        }



    }
   


}
