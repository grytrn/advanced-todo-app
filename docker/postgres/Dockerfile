FROM postgres:16-alpine

# Set default environment variables
ENV POSTGRES_USER=todouser
ENV POSTGRES_DB=tododb

# Copy initialization scripts if any
# COPY ./init.sql /docker-entrypoint-initdb.d/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD pg_isready -U $POSTGRES_USER -d $POSTGRES_DB || exit 1

# Use the default PostgreSQL port
EXPOSE 5432