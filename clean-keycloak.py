#!/usr/bin/env python3
"""
Clean Keycloak - delete all users and create fresh alice/bob
"""
import requests
import json
import time

KEYCLOAK_URL = "http://localhost:8080"
REALM = "my-cloud"

def get_admin_token():
    response = requests.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": "admin",
            "password": "admin"
        }
    )
    return response.json()["access_token"]

print("🔑 Getting admin token...")
token = get_admin_token()
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get all users
print("\n🗑️  Deleting all existing users...")
users_response = requests.get(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
    headers=headers
)

deleted_count = 0
for user in users_response.json():
    user_id = user["id"]
    username = user.get("username", "unknown")
    requests.delete(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}",
        headers=headers
    )
    print(f"   ✅ Deleted: {username}")
    deleted_count += 1

print(f"   Total deleted: {deleted_count}")

# Wait a moment for Keycloak to process
time.sleep(1)

# Create fresh users
print("\n👤 Creating fresh users...")
for username in ["alice", "bob"]:
    password = f"{username}123"
    
    user_data = {
        "username": username,
        "email": f"{username}@whatsapp-demo.com",
        "enabled": True,
        "emailVerified": True,
        "firstName": username.capitalize(),
        "lastName": "User"
    }
    
    create_response = requests.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
        headers=headers,
        json=user_data
    )
    
    if create_response.status_code == 201:
        print(f"   ✅ Created: {username}")
        
        # Get user ID
        users_response = requests.get(
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={username}&exact=true",
            headers=headers
        )
        user_id = users_response.json()[0]["id"]
        
        # Set password
        password_data = {
            "type": "password",
            "value": password,
            "temporary": False
        }
        
        requests.put(
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/reset-password",
            headers=headers,
            json=password_data
        )
        print(f"   🔐 Password set: {password}")
        
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
            print(f"   ✅ Login verified")
        else:
            print(f"   ❌ Login failed: {test_response.text}")
    else:
        print(f"   ❌ Failed to create {username}: {create_response.text}")

print("\n" + "="*60)
print("✅ Keycloak cleaned and configured!")
print("  Users:")
print("    • alice / alice123")
print("    • bob / bob123")
print("="*60)
