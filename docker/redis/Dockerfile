FROM redis:7-alpine

# Copy Redis configuration
COPY redis.conf /usr/local/etc/redis/redis.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD redis-cli ping || exit 1

# Start Redis with custom config
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]

# Use the default Redis port
EXPOSE 6379