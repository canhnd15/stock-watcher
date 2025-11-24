#!/bin/bash

# Docker Compose Deployment Script for Stock Watcher
# This script helps deploy the application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_info "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warn ".env file not found. Creating from example..."
        if [ -f .env.docker.example ]; then
            cp .env.docker.example .env
            print_warn "Please edit .env file with your configuration before continuing"
            print_warn "Especially change DB_PASSWORD and JWT_SECRET!"
            exit 1
        else
            print_error ".env.docker.example not found. Please create .env file manually."
            exit 1
        fi
    fi
    print_info ".env file found"
}

# Build images
build_images() {
    print_info "Building Docker images..."
    docker compose build
    print_info "Build completed"
}

# Start services
start_services() {
    print_info "Starting services..."
    docker compose up -d
    print_info "Services started"
}

# Stop services
stop_services() {
    print_info "Stopping services..."
    docker compose down
    print_info "Services stopped"
}

# Restart services
restart_services() {
    print_info "Restarting services..."
    docker compose restart
    print_info "Services restarted"
}

# Show logs
show_logs() {
    if [ -z "$1" ]; then
        docker compose logs -f
    else
        docker compose logs -f "$1"
    fi
}

# Show status
show_status() {
    print_info "Service status:"
    docker compose ps
    echo ""
    print_info "Resource usage:"
    docker stats --no-stream
}

# Health check
health_check() {
    print_info "Performing health checks..."
    
    # Check PostgreSQL
    if docker compose exec -T postgres pg_isready -U postgre -d trade > /dev/null 2>&1; then
        print_info "✓ PostgreSQL is healthy"
    else
        print_error "✗ PostgreSQL health check failed"
    fi
    
    # Check Backend
    if curl -f http://localhost:8899/actuator/health > /dev/null 2>&1 || curl -f http://localhost:8899/api/auth/me > /dev/null 2>&1; then
        print_info "✓ Backend is healthy"
    else
        print_warn "✗ Backend health check failed (may still be starting)"
    fi
    
    # Check Frontend
    if curl -f http://localhost:8089 > /dev/null 2>&1; then
        print_info "✓ Frontend is healthy"
    else
        print_warn "✗ Frontend health check failed (may still be starting)"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "=========================================="
    echo "  Stock Watcher Docker Deployment"
    echo "=========================================="
    echo "1. Build images"
    echo "2. Start services"
    echo "3. Stop services"
    echo "4. Restart services"
    echo "5. Show logs"
    echo "6. Show status"
    echo "7. Health check"
    echo "8. Full deployment (build + start)"
    echo "9. Update and restart"
    echo "0. Exit"
    echo "=========================================="
    echo ""
}

# Full deployment
full_deployment() {
    check_docker
    check_env
    build_images
    start_services
    sleep 5
    show_status
    health_check
}

# Update and restart
update_restart() {
    print_info "Updating application..."
    check_docker
    build_images
    restart_services
    sleep 5
    show_status
    health_check
}

# Main script
main() {
    case "${1:-menu}" in
        build)
            check_docker
            build_images
            ;;
        start)
            check_docker
            check_env
            start_services
            ;;
        stop)
            check_docker
            stop_services
            ;;
        restart)
            check_docker
            restart_services
            ;;
        logs)
            check_docker
            show_logs "$2"
            ;;
        status)
            check_docker
            show_status
            ;;
        health)
            check_docker
            health_check
            ;;
        deploy)
            full_deployment
            ;;
        update)
            update_restart
            ;;
        menu|*)
            while true; do
                show_menu
                read -p "Select an option: " choice
                case $choice in
                    1) check_docker && build_images ;;
                    2) check_docker && check_env && start_services ;;
                    3) check_docker && stop_services ;;
                    4) check_docker && restart_services ;;
                    5) 
                        echo "Enter service name (or press Enter for all): "
                        read service
                        check_docker && show_logs "$service"
                        ;;
                    6) check_docker && show_status ;;
                    7) check_docker && health_check ;;
                    8) full_deployment ;;
                    9) update_restart ;;
                    0) print_info "Exiting..."; exit 0 ;;
                    *) print_error "Invalid option" ;;
                esac
                echo ""
                read -p "Press Enter to continue..."
            done
            ;;
    esac
}

main "$@"

