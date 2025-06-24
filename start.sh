#!/bin/bash

# Note-taking App Startup Script for Void Linux with runit
# This script starts both backend (Django) and frontend (React) servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Function to check if a port is in use
check_port() {
    local port=$1
    if ss -tlnp | grep -q ":$port "; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(ss -tlnp | grep ":$port " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
    if [ -n "$pids" ]; then
        print_warning "Killing processes on port $port: $pids"
        echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
        sleep 2
        # Force kill if still running
        echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
    fi
}

# Function to start backend
start_backend() {
    print_status "Starting Django backend server..."
    
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found in $BACKEND_DIR/venv"
        print_status "Please create virtual environment first:"
        print_status "cd $BACKEND_DIR && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
        return 1
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check if dependencies are installed
    if ! python -c "import django" 2>/dev/null; then
        print_error "Django not installed. Installing dependencies..."
        pip install -r requirements.txt || {
            print_error "Failed to install Python dependencies"
            return 1
        }
    fi
    
    # Check if migrations need to be applied
    if ! python manage.py showmigrations --plan | grep -q "\[X\]"; then
        print_status "Applying database migrations..."
        python manage.py migrate || {
            print_error "Failed to apply migrations"
            return 1
        }
    fi
    
    # Start Django server in background
    print_status "Starting Django server on http://localhost:8000"
    nohup python manage.py runserver --noreload > django.log 2>&1 &
    echo $! > django.pid
    
    # Wait a moment and check if server started successfully
    sleep 3
    if ! check_port 8000; then
        print_error "Failed to start Django server"
        cat django.log
        return 1
    fi
    
    print_success "Django backend started successfully"
    return 0
}

# Function to start frontend
start_frontend() {
    print_status "Starting React frontend server..."
    
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_error "node_modules not found. Installing dependencies..."
        npm install || {
            print_error "Failed to install npm dependencies"
            return 1
        }
    fi
    
    # Start React development server in background
    print_status "Starting React server on http://localhost:3000"
    nohup npm start > react.log 2>&1 &
    echo $! > react.pid
    
    # Wait for React server to start (it takes longer)
    print_status "Waiting for React server to start..."
    local count=0
    while [ $count -lt 30 ]; do
        if check_port 3000; then
            break
        fi
        sleep 2
        count=$((count + 1))
        echo -n "."
    done
    echo
    
    if ! check_port 3000; then
        print_error "Failed to start React server"
        cat react.log
        return 1
    fi
    
    print_success "React frontend started successfully"
    return 0
}

# Function to stop servers
stop_servers() {
    print_status "Stopping servers..."
    
    # Stop backend
    if [ -f "$BACKEND_DIR/django.pid" ]; then
        local django_pid=$(cat "$BACKEND_DIR/django.pid")
        if kill -0 "$django_pid" 2>/dev/null; then
            print_status "Stopping Django server (PID: $django_pid)"
            kill -TERM "$django_pid" 2>/dev/null || true
        fi
        rm -f "$BACKEND_DIR/django.pid"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_DIR/react.pid" ]; then
        local react_pid=$(cat "$FRONTEND_DIR/react.pid")
        if kill -0 "$react_pid" 2>/dev/null; then
            print_status "Stopping React server (PID: $react_pid)"
            kill -TERM "$react_pid" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_DIR/react.pid"
    fi
    
    # Kill any remaining processes on our ports
    kill_port 8000
    kill_port 3000
    
    print_success "Servers stopped"
}

# Function to show server status
show_status() {
    print_status "Server Status:"
    
    # Check Django
    if check_port 8000; then
        print_success "Django backend: Running on http://localhost:8000"
    else
        print_warning "Django backend: Not running"
    fi
    
    # Check React
    if check_port 3000; then
        print_success "React frontend: Running on http://localhost:3000"
    else
        print_warning "React frontend: Not running"
    fi
}

# Function to show logs
show_logs() {
    local service=$1
    case $service in
        "backend"|"django")
            if [ -f "$BACKEND_DIR/django.log" ]; then
                print_status "Django logs:"
                tail -f "$BACKEND_DIR/django.log"
            else
                print_warning "No Django logs found"
            fi
            ;;
        "frontend"|"react")
            if [ -f "$FRONTEND_DIR/react.log" ]; then
                print_status "React logs:"
                tail -f "$FRONTEND_DIR/react.log"
            else
                print_warning "No React logs found"
            fi
            ;;
        *)
            print_error "Unknown service: $service. Use 'backend' or 'frontend'"
            ;;
    esac
}

# Main execution
case "${1:-start}" in
    "start")
        print_status "Starting Note-taking App..."
        
        # Check if ports are already in use
        if check_port 8000; then
            print_warning "Port 8000 is already in use"
            kill_port 8000
        fi
        
        if check_port 3000; then
            print_warning "Port 3000 is already in use"
            kill_port 3000
        fi
        
        # Start backend first
        if start_backend; then
            # Start frontend
            if start_frontend; then
                print_success "All servers started successfully!"
                echo
                print_status "Access your application at:"
                print_status "Frontend: http://localhost:3000"
                print_status "Backend API: http://localhost:8000"
                echo
                print_status "To stop servers: $0 stop"
                print_status "To check status: $0 status"
                print_status "To view logs: $0 logs [backend|frontend]"
            else
                print_error "Failed to start frontend, stopping backend"
                stop_servers
                exit 1
            fi
        else
            print_error "Failed to start backend"
            exit 1
        fi
        ;;
    "stop")
        stop_servers
        ;;
    "restart")
        stop_servers
        sleep 2
        exec "$0" start
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  start     Start both backend and frontend servers (default)"
        echo "  stop      Stop all servers"
        echo "  restart   Restart all servers"
        echo "  status    Show server status"
        echo "  logs      Show logs for backend or frontend"
        echo "  help      Show this help message"
        echo
        echo "Examples:"
        echo "  $0                    # Start servers"
        echo "  $0 start              # Start servers"
        echo "  $0 stop               # Stop servers"
        echo "  $0 status             # Check status"
        echo "  $0 logs backend       # Show Django logs"
        echo "  $0 logs frontend      # Show React logs"
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Use '$0 help' for usage information"
        exit 1
        ;;
esac