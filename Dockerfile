# Multi-stage Dockerfile for GoRide C++17 REST API Server (24/24 Production)
FROM gcc:12-bullseye AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    libsqlite3-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy source tree
COPY . .

# Build with CMake
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --target goride_server -j$(nproc)

# Final runtime image (ultra-lean)
FROM debian:bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary and database assets
COPY --from=builder /app/build/bin/goride_server /app/goride_server
COPY --from=builder /app/data /app/data
COPY --from=builder /app/database /app/database

# Expose C++ REST API port
EXPOSE 8080

ENV PORT=8080

CMD ["/app/goride_server"]
