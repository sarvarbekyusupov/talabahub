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
            ? undefined
            : false, // Disable in dev for Swagger
      })
    );

    // Enable response compression (gzip)
    app.use(compression());

    app.use(cookieParser());
    app.setGlobalPrefix("api");
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

    const swaggerConfig = new DocumentBuilder()
      .setTitle("TalabaHub API")
      .setDescription("TalabaHub University Students Platform API Documentation")
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          name: "JWT",
          description: "Enter JWT token",
          in: "header",
        },
        "JWT-auth"
      )
      .addTag("Authentication")
      .addTag("Users")
      .addTag("Universities")
      .addTag("Categories")
      .addTag("Brands")
      .addTag("Discounts")
      .addTag("Companies")
      .addTag("Jobs")
      .addTag("Education Partners")
      .addTag("Courses")
      .addTag("Blog Posts")
      .addTag("Events")
      .addTag("Reviews")
      .addTag("Health")
      .build();

    const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api", app, swaggerDoc, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: "TalabaHub API Documentation",
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
