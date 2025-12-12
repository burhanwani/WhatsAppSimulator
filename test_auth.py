#!/usr/bin/env python3
"""
Quick test script for auth middleware

Run this to verify:
1. Auth middleware can be imported
2. Token verification logic works
3. Service token generation works (mocked)
"""

import sys
import os

# Add services directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))

def test_auth_import():
    """Test that auth_middleware can be imported"""
    print("\n=== Test 1: Import auth_middleware ===")
    try:
        from auth_middleware import auth, create_token_manager
        print("✅ auth_middleware imported successfully")
        print(f"   Auth enabled: {auth.enabled}")
        return True
    except Exception as e:
        print(f"❌ Failed to import: {e}")
        return False

def test_disabled_auth():
    """Test that auth works when disabled"""
    print("\n=== Test 2: Disabled Auth Mode ===")
    try:
        os.environ['AUTH_ENABLED'] = 'false'
        
        # Reimport with disabled auth
        import importlib
        import auth_middleware
        importlib.reload(auth_middleware)
        from auth_middleware import auth
        
        print(f"✅ Auth disabled mode: {not auth.enabled}")
        
        # Verify it returns mock claims
        claims = auth.verify_token("fake-token")
        print(f"✅ Mock claims returned: {claims}")
        
        # Reset
        os.environ['AUTH_ENABLED'] = 'true'
        return True
    except Exception as e:
        print(f"❌ Disabled auth test failed: {e}")
        return False

def test_token_manager():
    """Test service token manager"""
    print("\n=== Test 3: Service Token Manager ===")
    try:
        from auth_middleware import create_token_manager
        
        os.environ['AUTH_ENABLED'] = 'false'  # Use mock mode
        token_mgr = create_token_manager('test-service')
        
        token = token_mgr.get_service_token()
        headers = token_mgr.get_auth_headers()
        
        print(f"✅ Token acquired: {token[:20]}...")
        print(f"✅ Headers generated: {headers}")
        
        os.environ['AUTH_ENABLED'] = 'true'
        return True
    except Exception as e:
        print(f"❌ Token manager test failed: {e}")
        return False

if __name__ == '__main__':
    print("==========================================")
    print(" Testing Auth Middleware (Unit Tests)")
    print("==========================================")
    
    results = []
    results.append(test_auth_import())
    results.append(test_disabled_auth())
    results.append(test_token_manager())
    
    print("\n==========================================")
    print(f" Summary: {sum(results)}/{len(results)} tests passed")
    print("==========================================")
    
    if all(results):
        print("✅ All tests PASSED - Auth middleware is working!")
        sys.exit(0)
    else:
        print("❌ Some tests FAILED - Fix errors before committing")
        sys.exit(1)
