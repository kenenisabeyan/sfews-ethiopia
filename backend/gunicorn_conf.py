import os
import multiprocessing

# ==========================================
# SFEWS Production Gunicorn Configuration
# Enterprise ASGI Worker Management
# ==========================================

# Network binding
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Concurrency & Worker pool sizing
# In containerized environments, allow WEB_CONCURRENCY override
default_workers = max(multiprocessing.cpu_count() * 2 + 1, 2)
workers = int(os.getenv("WEB_CONCURRENCY", default_workers))

# High-performance ASGI worker class
worker_class = "uvicorn.workers.UvicornWorker"

# Connections & Concurrency
worker_connections = 1000
backlog = 2048

# Lifetime & Memory Recycling (Prevents long-term memory fragmentation)
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", 2000))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", 100))

# Timeouts (Tuned for long-lived WebSockets and telemetry uplinks)
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", 65))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", 30))

# Logging
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"
errorlog = "-"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'
