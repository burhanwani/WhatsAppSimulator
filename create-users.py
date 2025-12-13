#!/usr/bin/env python3
"""
Quick Keycloak user creation script - creates alice and bob with passwords
"""
import requests
import json

KEYCLOAK_URL = "http://localhost:8080"
REALM = "my-cloud"

# Get admin token
print("Getting admin token...")
response = requests.post(
    f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
    data={
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": "admin",
        "password": "admin"
    }
)
token = response.json()["access_token"]
print("✅ Got admin token")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Delete and recreate both users
for username in ["alice", "bob"]:
    print(f"\n🔧 Setting up {username}...")
    
    # Delete if exists
    users_response = requests.get(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={username}&exact=true",
        headers=headers
    )
    
    if users_response.json():
        user_id = users_response.json()[0]["id"]
        requests.delete(
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}",
            headers=headers
        )
        print(f"   Deleted existing {username}")
    
    # Create user
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "enabled": True,
        "emailVerified": True,
        "firstName": username.capitalize(),
        "lastName": "Demo"
    }
    
    create_response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
        headers=headers,
        json=user_data
    )
    
    if create_response.status_code != 201:
        print(f"   ❌ Failed to create {username}: {create_response.text}")
        continue
    
    print(f"   ✅ Created {username}")
    
    # Get user ID
    users_response = requests.get(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={username}&exact=true",
        headers=headers
    )
    user_id = users_response.json()[0]["id"]
    
    # Set password
    password = f"{username}123"
    password_data = {
        "type": "password",
        "value": password,
        "temporary": False
    }
    
    pwd_response = requests.put(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/reset-password",
        headers=headers,
        json=password_data
    )
    
    if pwd_response.status_code in [204, 200]:
        print(f"   ✅ Password set: {password}")
    else:
        print(f"   ❌ Failed to set password: {pwd_response.text}")
    
    # Test login
    test_response = requests.post(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "whatsapp-frontend",
            "username": username,
            "password": password
        }
    )
    
    if test_response.status_code == 200:
        print(f"   ✅ Login test passed")
    else:
        print(f"   ❌ Login test failed: {test_response.text}")

print("\n" + "="*60)
print("✅ Keycloak users configured!")
print("  • alice / alice123")
print("  • bob / bob123")
print("="*60)
