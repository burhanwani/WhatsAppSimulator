"""
Shared authentication middleware for service-to-service JWT validation.

This module provides:
- JWT token verification against Keycloak public key
- Scope-based authorization
- Decorator for protecting endpoints
- Service token acquisition (client credentials grant)

Zero-Trust Principle: Every service must prove its identity.
"""

import os
import jwt
import requests
from functools import wraps
from typing import Optional, Callable

class ServiceAuthenticator:
    """Handles JWT authentication and authorization for microservices"""
    
    def __init__(self):
        self.keycloak_url = os.environ.get('KEYCLOAK_URL', 'http://keycloak:8080')
        self.realm = os.environ.get('KEYCLOAK_REALM', 'my-cloud')
        self.public_key = None
        self.enabled = os.environ.get('AUTH_ENABLED', 'true').lower() == 'true'
        
        if self.enabled:
            self._fetch_public_key()
        else:
            print("WARNING: Authentication is DISABLED (AUTH_ENABLED=false)")
    
    def _fetch_public_key(self):
        """Fetch Keycloak's public key for JWT verification"""
        try:
            url = f"{self.keycloak_url}/realms/{self.realm}"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            realm_info = resp.json()
            
            # Format public key for PyJWT
            public_key_pem = realm_info['public_key']
            self.public_key = f"-----BEGIN PUBLIC KEY-----\n{public_key_pem}\n-----END PUBLIC KEY-----"
            
            print(f"✅ Keycloak public key fetched from {self.realm}")
        except Exception as e:
            print(f"❌ Failed to fetch Keycloak public key: {e}")
            print("   Services will reject all authenticated requests!")
            raise
    
    def verify_token(self, token: str) -> dict:
        """
        Verify JWT token and return claims
        
        Args:
            token: JWT token string
            
        Returns:
            dict: Decoded token claims
            
        Raises:
            Exception: If token is invalid, expired, or verification fails
        """
        if not self.enabled:
            # Return mock claims for testing
            return {"sub": "test-user", "scope": "read:keys write:keys"}
        
        try:
            # Decode and verify JWT signature
            claims = jwt.decode(
                token,
                self.public_key,
                algorithms=['RS256'],
                audience='my-microservice',
                options={"verify_aud": True}
            )
            return claims
            
        except jwt.ExpiredSignatureError:
            raise Exception("Token expired")
        except jwt.InvalidAudienceError:
            raise Exception("Invalid token audience")
        except jwt.InvalidTokenError as e:
            raise Exception(f"Invalid token: {str(e)}")
    
    def require_auth(self, required_scope: Optional[str] = None) -> Callable:
        """
        Decorator to require authentication on Flask endpoints
        
        Usage:
            @app.route('/protected')
            @auth.require_auth(required_scope='write:keys')
            def protected_endpoint():
                claims = request.auth_claims
                return jsonify({"user": claims['sub']})
        
        Args:
            required_scope: Optional scope that must be present in token
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Lazy import Flask (only when actually used)
                from flask import request, jsonify
                
                if not self.enabled:
                    # Skip auth check if disabled
                    request.auth_claims = {"sub": "test-user"}
                    return func(*args, **kwargs)
                
                # Extract token from Authorization header
                auth_header = request.headers.get('Authorization')
                if not auth_header:
                    return jsonify({"error": "Missing Authorization header"}), 401
                
                # Expect format: "Bearer <token>"
                parts = auth_header.split()
                if len(parts) != 2 or parts[0].lower() != 'bearer':
                    return jsonify({"error": "Invalid Authorization header format"}), 401
                
                token = parts[1]
                
                try:
                    claims = self.verify_token(token)
                except Exception as e:
                    return jsonify({"error": str(e)}), 401
                
                # Check required scope if specified
                if required_scope:
                    scopes = claims.get('scope', '').split()
                    if required_scope not in scopes:
                        return jsonify({
                            "error": f"Missing required scope: {required_scope}",
                            "required": required_scope,
                            "provided": scopes
                        }), 403
                
                # Add claims to request context for use in endpoint
                request.auth_claims = claims
                return func(*args, **kwargs)
            
            return wrapper
        return decorator


class ServiceTokenManager:
    """Manages service-to-service authentication tokens"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.keycloak_url = os.environ.get('KEYCLOAK_URL', 'http://keycloak:8080')
        self.realm = os.environ.get('KEYCLOAK_REALM', 'my-cloud')
        self.client_secret = os.environ.get('SERVICE_SECRET', 'helloWorld')
        self.enabled = os.environ.get('AUTH_ENABLED', 'true').lower() == 'true'
        self._cached_token = None
        self._token_expiry = 0
    
    def get_service_token(self) -> str:
        """
        Get JWT token for this service (client credentials grant)
        
        Caches token and refreshes when expired.
        
        Returns:
            str: JWT access token
        """
        import time
        
        if not self.enabled:
            return "test-token"
        
        # Return cached token if still valid (with 5min buffer)
        if self._cached_token and time.time() < self._token_expiry - 300:
            return self._cached_token
        
        # Fetch new token from Keycloak
        try:
            url = f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
            response = requests.post(
                url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.service_name,
                    "client_secret": self.client_secret
                },
                timeout=5
            )
            response.raise_for_status()
            
            token_data = response.json()
            self._cached_token = token_data['access_token']
            self._token_expiry = time.time() + token_data.get('expires_in', 3600)
            
            print(f"✅ Service token acquired for {self.service_name} (expires in {token_data.get('expires_in')}s)")
            return self._cached_token
            
        except Exception as e:
            print(f"❌ Failed to get service token: {e}")
            raise
    
    def get_auth_headers(self) -> dict:
        """
        Get Authorization header dict for outbound service calls
        
        Returns:
            dict: {"Authorization": "Bearer <token>"}
        """
        token = self.get_service_token()
        return {"Authorization": f"Bearer {token}"}


# Global instances (import these in your services)
auth = ServiceAuthenticator()

def create_token_manager(service_name: str) -> ServiceTokenManager:
    """
    Create a token manager for a specific service
    
    Usage:
        from auth_middleware import create_token_manager
        token_mgr = create_token_manager('chat-processor')
        headers = token_mgr.get_auth_headers()
        requests.get('http://key-service/keys/alice', headers=headers)
    """
    return ServiceTokenManager(service_name)
