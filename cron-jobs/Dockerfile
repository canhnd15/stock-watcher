# Multi-stage build for cron-jobs Spring Boot application
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install curl and netcat for health checks
RUN apk add --no-cache curl netcat-openbsd

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8898

# Health check - simple port check since cron-jobs doesn't expose REST APIs
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8898/actuator/health || nc -z localhost 8898 || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

