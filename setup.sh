#!/bin/bash
# Setup script to create the full directory structure

# Create main directories
mkdir -p backend/src/{api,services,models,middleware,utils,config}
mkdir -p backend/tests/{unit,integration}
mkdir -p backend/migrations
mkdir -p backend/seeds

mkdir -p frontend/src/{components,pages,hooks,services,store,utils,styles}
mkdir -p frontend/tests/{unit,integration}
mkdir -p frontend/public

mkdir -p shared/{types,constants,utils}

mkdir -p tests/{integration,e2e}

mkdir -p docs/{adr,api,guides}

mkdir -p reports/{agent-tasks,handoffs,decisions}

mkdir -p scripts

mkdir -p .github/workflows

mkdir -p docker/{backend,frontend}

mkdir -p nginx/conf.d

echo "Directory structure created successfully!"
