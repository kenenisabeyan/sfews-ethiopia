"""
⚠️ SFEWS Flask Core — Standard Domain Exceptions & RFC 7807 Error Envelopes
"""

from flask import jsonify

class DomainException(Exception):
    status_code = 400
    title = "Domain Error"

    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class EntityNotFoundError(DomainException):
    status_code = 404
    title = "Resource Not Found"

class StationUnregisteredError(DomainException):
    status_code = 404
    title = "Station Unregistered"

class HardwareOfflineError(DomainException):
    status_code = 503
    title = "Hardware Node Offline"

class SensorCalibrationError(DomainException):
    status_code = 422
    title = "Sensor Calibration Invalid"

class SecurityAuthError(DomainException):
    status_code = 401
    title = "Unauthorized Access"

def format_error_response(exc: DomainException):
    return jsonify({
        "type": f"https://sfews.gov.et/errors/{exc.__class__.__name__}",
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.message,
        "metadata": exc.details
    }), exc.status_code
