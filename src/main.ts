import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import { BadRequestException, ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

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

    app.use(cookieParser());
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    // app.useGlobalFilters(new AllExceptionsFilter());

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
      .setTitle("UIMS API")
      .setDescription("UIMS Management System API Documentation")
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
      .addTag("UIMS API")
      .addSecurityRequirements("bearer", ["bearer"])
      .addBearerAuth()
      .build();

    const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api", app, swaggerDoc, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: "JAFA ENERGY API Documentation",
    });

    await app.listen(PORT);

    const logger = new Logger("Bootstrap");
    logger.log(`🚀 Server is running on http://localhost:${PORT}`);
    logger.log(`📚 Swagger docs available at http://localhost:${PORT}/api`);
    logger.log(`🌍 Environment: ${NODE_ENV}`);
    logger.log(`📊 Log levels: ${logLevels.join(", ")}`);

    // Log production readiness status
    if (NODE_ENV === "production") {
      logger.log(
        "🔒 Production mode - Enhanced security and optimized logging enabled"
      );
    } else {
      logger.warn("⚠️  Development mode - All logging levels enabled");
    }
  } catch (error) {
    const logger = new Logger("Bootstrap");
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
