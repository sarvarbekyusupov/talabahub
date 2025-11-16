import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import { BadRequestException, ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PerformanceInterceptor } from "./common/interceptors/performance.interceptor";
import { LoggerService } from "./logger/logger.service";
import helmet from "helmet";
import * as compression from "compression";

async function start() {
  try {
    const PORT = process.env.PORT || 3000;
    const NODE_ENV = process.env.NODE_ENV || "development";

    // Configure logging levels based on environment
    const logLevels =
      NODE_ENV === "production"
        ? (["error", "warn", "log"] as ("error" | "warn" | "log")[])
        : (["error", "warn", "log", "debug", "verbose"] as (
            | "error"
            | "warn"
            | "log"
            | "debug"
            | "verbose"
          )[]);

    const app = await NestFactory.create(AppModule, {
      logger: logLevels,
    });

    // Get custom logger service
    const loggerService = app.get(LoggerService);
    app.useLogger(loggerService);

    // Security headers with Helmet
    app.use(
      helmet({
        contentSecurityPolicy:
          NODE_ENV === "production"
            ? {
                directives: {
                  defaultSrc: ["'self'"],
                  styleSrc: ["'self'", "'unsafe-inline'"],
                  scriptSrc: ["'self'", "'unsafe-inline'"],
                  imgSrc: ["'self'", "data:", "https:"],
                },
              }
            : false, // Disable in dev for Swagger
      })
    );

    // Enable response compression (gzip)
    app.use(compression());

    app.use(cookieParser());
    app.setGlobalPrefix("api", {
      exclude: ["docs"], // Exclude /docs from global prefix
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new AllExceptionsFilter());

    // Add logging and performance monitoring interceptors
    app.useGlobalInterceptors(
      new LoggingInterceptor(loggerService),
      new PerformanceInterceptor(loggerService),
    );

    // app.enableCors({
    //   origin: (origin, callback) => {
    //     const allowedOrigins = [
    //       "http://localhost:5173",
    //       "http://localhost:5174",
    //     ];
    //     if (!origin || allowedOrigins.includes(origin)) {
    //       callback(null, true);
    //     } else {
    //       callback(new BadRequestException("Not allowed by CORS"));
    //     }
    //   },
    //   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    //   credentials: true,
    // });

    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          "http://localhost:5173",
          "http://localhost:5174",
          "https://jafaiumss.vercel.app",
          "https://jafa-iums.vercel.app",
          "https://iumsjafaenergy.vercel.app",
          "https://iumsjaffaenergy.vercel.app",
          "https://jaffaiumss.vercel.app",
        ];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new BadRequestException("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    });

    // Enhanced Swagger/OpenAPI Configuration
    const swaggerConfig = new DocumentBuilder()
      .setTitle("TalabaHub API")
      .setDescription(
        `
# TalabaHub - University Students Platform API

Welcome to the TalabaHub API documentation. This API provides comprehensive services for university students in Uzbekistan.

## Features

- 🔐 **Authentication** - JWT-based secure authentication
- 👥 **User Management** - Student profiles and verification
- 🎓 **Universities** - University information and programs
- 💰 **Discounts** - Student discounts and offers
- 💼 **Jobs** - Job postings for students
- 📚 **Courses** - Educational courses and training
- 📝 **Blog** - Articles and news
- 🎉 **Events** - Campus and student events
- ⭐ **Reviews** - User reviews and ratings
- 💳 **Payments** - Integration with Click.uz and Payme

## Getting Started

1. **Register** an account at \`POST /api/auth/register\`
2. **Login** to get access token at \`POST /api/auth/login\`
3. Click the **Authorize** button (🔓) and enter your token
4. Start exploring the API!

## Rate Limiting

API requests are limited to **10 requests per minute** by default. Contact support for higher limits.

## Support

- **Email**: support@talabahub.com
- **GitHub**: https://github.com/sarvarbekyusupov/talabahub
- **Website**: https://talabahub.com
      `
      )
      .setVersion("2.0.0")
      .setContact(
        "TalabaHub Support",
        "https://talabahub.com",
        "support@talabahub.com"
      )
      .setLicense("MIT", "https://opensource.org/licenses/MIT")
      .addServer("http://localhost:3000", "Local Development")
      .addServer("https://staging-api.talabahub.com", "Staging Server")
      .addServer("https://api.talabahub.com", "Production Server")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT access token (without 'Bearer' prefix)",
          in: "header",
        },
        "JWT-auth"
      )
      // Organized tags with descriptions
      .addTag("Authentication", "User registration, login, and token management")
      .addTag("Users", "User profile management and verification")
      .addTag("Universities", "University information and programs")
      .addTag("Categories", "Discount and brand categories")
      .addTag("Brands", "Brand information and partnerships")
      .addTag("Discounts", "Student discounts and special offers")
      .addTag("Companies", "Partner companies and employers")
      .addTag("Jobs", "Job postings and applications for students")
      .addTag("Education Partners", "Educational institutions and partnerships")
      .addTag("Courses", "Online courses and training programs")
      .addTag("Blog Posts", "Articles, news, and student resources")
      .addTag("Events", "Campus events and student activities")
      .addTag("Reviews", "User reviews and ratings")
      .addTag("Upload", "File and image upload services")
      .addTag("Payment", "Payment processing (Click.uz & Payme)")
      .addTag("Health", "API health checks and system monitoring")
      .build();

    const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);

    // Custom Swagger UI configuration
    SwaggerModule.setup("docs", app, swaggerDoc, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: "none", // Collapse all by default
        filter: true, // Enable search/filter
        showRequestDuration: true, // Show request duration
        syntaxHighlight: {
          activate: true,
          theme: "monokai",
        },
        tryItOutEnabled: true,
        tagsSorter: "alpha", // Sort tags alphabetically
        operationsSorter: "alpha", // Sort operations alphabetically
      },
      customSiteTitle: "TalabaHub API Documentation",
      customfavIcon: "https://talabahub.com/favicon.ico",
      customCss: `
        .swagger-ui .topbar {
          background-color: #2c3e50;
        }
        .swagger-ui .info .title {
          color: #2c3e50;
          font-size: 2.5em;
        }
        .swagger-ui .info .description {
          font-size: 1.1em;
          line-height: 1.6;
        }
        .swagger-ui .scheme-container {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.3em;
          font-weight: 600;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        .swagger-ui .opblock {
          border-radius: 4px;
          margin: 10px 0;
        }
        .swagger-ui .opblock.opblock-post {
          border-color: #49cc90;
          background: rgba(73, 204, 144, 0.1);
        }
        .swagger-ui .opblock.opblock-get {
          border-color: #61affe;
          background: rgba(97, 175, 254, 0.1);
        }
        .swagger-ui .opblock.opblock-put {
          border-color: #fca130;
          background: rgba(252, 161, 48, 0.1);
        }
        .swagger-ui .opblock.opblock-delete {
          border-color: #f93e3e;
          background: rgba(249, 62, 62, 0.1);
        }
        .swagger-ui .btn.authorize {
          background-color: #3498db;
          border-color: #3498db;
        }
        .swagger-ui .btn.authorize:hover {
          background-color: #2980b9;
          border-color: #2980b9;
        }
      `,
    });

    await app.listen(PORT);

    loggerService.setContext("Bootstrap");
    loggerService.log(`🚀 Server is running on http://localhost:${PORT}`);
    loggerService.log(`📚 Swagger docs available at http://localhost:${PORT}/api`);
    loggerService.log(`🩺 Health check available at http://localhost:${PORT}/api/health`);
    loggerService.log(`📊 Metrics available at http://localhost:${PORT}/api/health/metrics`);
    loggerService.log(`🌍 Environment: ${NODE_ENV}`);
    loggerService.log(`📊 Log levels: ${logLevels.join(", ")}`);

    // Log production readiness status
    if (NODE_ENV === "production") {
      loggerService.log(
        "🔒 Production mode - Enhanced logging, monitoring, and performance tracking enabled"
      );
      loggerService.log("📝 Logs are being written to: logs/ directory");
    } else {
      loggerService.warn("⚠️  Development mode - All logging levels enabled");
    }
  } catch (error) {
    const logger = new Logger("Bootstrap");
    logger.error("❌ Failed to start server:");
    logger.error(error);
    process.exit(1);
  }
}

start();
