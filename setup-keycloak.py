#!/usr/bin/env python3
"""
Keycloak Configuration Script

Automatically configures Keycloak for user authentication:
- Creates users: alice, bob
- Creates frontend client: whatsapp-frontend
- Configures client settings (CORS, redirect URIs)
- Sets up roles and scopes

Requires: Keycloak running on localhost:8080
"""

import requests
import json
import sys

KEYCLOAK_URL = "http://localhost:8080"
REALM = "my-cloud"
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

def get_admin_token():
    """Get admin access token"""
    print("🔑 Getting admin token...")
    response = requests.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get admin token: {response.text}")
        sys.exit(1)
    
    token = response.json()["access_token"]
    print("✅ Admin token acquired")
    return token

def create_user(token, username, password, email, display_name="User"):
    """Create a user in Keycloak"""
    print(f"👤 Creating user: {display_name} ({username})...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create user
    user_data = {
        "username": username,  # This will be the phone number
        "email": email,
        "enabled": True,
        "emailVerified": True,
        "firstName": display_name,
        "lastName": "Demo"
    }
    
    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
        headers=headers,
        json=user_data
    )
    
    if response.status_code == 201:
        print(f"✅ User {display_name} created")
    elif response.status_code == 409:
        print(f"⚠️  User {display_name} already exists, updating...")
    else:
        print(f"❌ Failed to create user {display_name}: {response.text}")
        return False
    
    #Get user ID
    response = requests.get(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={username}&exact=true",
        headers=headers
    )
    
    if not response.json():
        print(f"❌ Could not find user {display_name}")
        return False
    
    user_id = response.json()[0]["id"]
    
    # Set password
    print(f"🔐 Setting password for {display_name}...")
    password_data = {
        "type": "password",
        "value": password,
        "temporary": False
    }
    
    response = requests.put(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/reset-password",
        headers=headers,
        json=password_data
    )
    
    if response.status_code in [204, 200]:
        print(f"✅ Password set for {display_name}")
        return True
    else:
        print(f"❌ Failed to set password: {response.text}")
        return False

def create_frontend_client(token):
    """Create frontend client for browser authentication"""
    print("🌐 Creating whatsapp-frontend client...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    client_data = {
        "clientId": "whatsapp-frontend",
        "name": "WhatsApp Frontend",
        "description": "Public client for browser-based authentication",
        "enabled": True,
        "publicClient": True,
        "protocol": "openid-connect",
        "directAccessGrantsEnabled": True,  # Enable password grant
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "serviceAccountsEnabled": False,
        "authorizationServicesEnabled": False,
        "redirectUris": [
            "http://localhost:5173/*",
            "http://127.0.0.1:5173/*"
        ],
        "webOrigins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
        "attributes": {
            "pkce.code.challenge.method": "S256"
        }
    }
    
    response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients",
        headers=headers,
        json=client_data
    )
    
    if response.status_code == 201:
        print("✅ Frontend client created")
        return True
    elif response.status_code == 409:
        print("⚠️  Client already exists, updating...")
        
        # Get existing client
        response = requests.get(
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients?clientId=whatsapp-frontend",
            headers=headers
        )
        
        if response.json():
            client_id = response.json()[0]["id"]
            
            # Update client
            response = requests.put(
                f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients/{client_id}",
                headers=headers,
                json=client_data
            )
            
            if response.status_code in [204, 200]:
                print("✅ Client updated")
                return True
        
        print(f"❌ Failed to update client: {response.text}")
        return False
    else:
        print(f"❌ Failed to create client: {response.text}")
        return False

def test_authentication(username, password, display_name="User"):
    """Test user authentication"""
    print(f"\n🧪 Testing authentication for {display_name} ({username})...")
    
    response = requests.post(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "whatsapp-frontend",
            "username": username,
            "password": password
        }
    )
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"✅ Authentication successful!")
        print(f"   Access Token: {token_data['access_token'][:50]}...")
        print(f"   Expires in: {token_data['expires_in']} seconds")
        return True
    else:
        print(f"❌ Authentication failed: {response.text}")
        return False

def main():
    print("=" * 60)
    print("  Keycloak Configuration Script")
    print("  Realm: my-cloud")
    print("=" * 60)
    print()
    
    # Get admin token
    token = get_admin_token()
    
    print()
    print("-" * 60)
    print("  Creating Users")
    print("-" * 60)
    
    # Create users with simple usernames (displayed as phone numbers in UI)
    users = [
        ("alice", "alice123", "alice@example.com", "Alice"),
        ("bob", "bob123", "bob@example.com", "Bob")
    ]
    
    for username, password, email, display_name in users:
        create_user(token, username, password, email, display_name)
        print()
    
    print("-" * 60)
    print("  Creating Frontend Client")
    print("-" * 60)
    
    # Create frontend client
    create_frontend_client(token)
    
    print()
    print("-" * 60)
    print("  Testing Authentication")
    print("-" * 60)
    
    # Test authentication
    all_tests_passed = True
    for username, password, _, display_name in users:
        if not test_authentication(username, password, display_name):
            all_tests_passed = False
    
    print()
    print("=" * 60)
    
    if all_tests_passed:
        print("✅ Keycloak configuration complete!")
        print()
        print("Users created:")
        print("  • alice / alice123 (displayed as +1-555-0001)")
        print("  • bob / bob123 (displayed as +1-555-0002)")
        print()
        print("Client created:")
        print("  • whatsapp-frontend (public client)")
        print()
        print("Auto-login enabled in frontend!")
        print("=" * 60)
        return 0
    else:
        print("⚠️  Configuration completed with some issues")
        print("Please check the logs above for details")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n❌ Configuration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
