import time
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from .database import Base, engine, SessionLocal, check_db_health
from .seed import seed_database
from .blueprints.auth import auth_bp
from .blueprints.telemetry import telemetry_bp
from .blueprints.nodes import nodes_bp
from .blueprints.alerts import alerts_bp
from .blueprints.dashboard import dashboard_bp
from .blueprints.simulation import simulation_bp
from .blueprints.chat import chat_bp
from .blueprints.system import system_bp
from .blueprints.gis import gis_bp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("sfews.flask")

def create_app():
    app = Flask(__name__)
    
    # Enable Cross-Origin Resource Sharing (CORS)
    CORS(app, resources={r"/*": {"origins": "*"}}, expose_headers=["X-Request-ID", "X-Process-Time-Ms"])

    # Initialize Database Schema & Seed Baseline Records
    with app.app_context():
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_database(db)
            logger.info("Database initialized and default records seeded successfully.")
        finally:
            db.close()

    # Request Tracing Middleware
    @app.before_request
    def before_request_func():
        request._start_time = time.time()

    @app.after_request
    def after_request_func(response):
        if hasattr(request, "_start_time"):
            duration_ms = round((time.time() - request._start_time) * 1000, 2)
            response.headers["X-Process-Time-Ms"] = str(duration_ms)
        return response

    # Standardized Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"detail": getattr(e, "description", "Bad Request")}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"detail": getattr(e, "description", "Endpoint or resource not found")}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"detail": "Internal server error. Incident logged."}), 500

    # Register Domain Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(telemetry_bp)
    app.register_blueprint(nodes_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(gis_bp)

    # Root Health Check
    @app.route("/", methods=["GET"])
    def root_health():
        db_stat = check_db_health()
        return jsonify({
            "service": "SFEWS Awash Early Warning API",
            "framework": "Python Flask (Production Core)",
            "version": "2.1.0",
            "database": db_stat,
            "status": "OPERATIONAL"
        }), 200

    return app
