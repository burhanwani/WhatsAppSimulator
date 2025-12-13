```python
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add parent directory to path for auth_middleware
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth_middleware import ServiceAuthenticator
from cache import CacheManager

app = Flask(__name__)

# Enable CORS for frontend
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Config
DB_HOST = os.environ.get('DB_HOST', 'db')
DB_NAME = os.environ.get('DB_NAME', 'mydb')
DB_USER = os.environ.get('DB_USER', 'user')
DB_PASS = os.environ.get('DB_PASS', 'password')

def get_db_conn():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

@app.route('/keys', methods=['POST'])
@auth.require_auth(required_scope='write:keys')
def upload_key():
    """Upload public key (requires write:keys scope)"""
    # Get authenticated user from token claims
    claims = request.auth_claims
    token_user = claims.get('preferred_username') or claims.get('sub')
    
    data = request.json
    user_id = data.get('user_id')
    public_key = data.get('public_key')

    if not user_id or not public_key:
        return jsonify({"error": "Missing user_id or public_key"}), 400

    # Security: Users can only upload their own keys
    # (services with write:keys scope can upload for anyone)
    if 'service' not in claims.get('scope', '') and token_user != user_id:
        return jsonify({
            "error": "Cannot upload key for another user",
            "authenticated_as": token_user,
            "attempted_upload_for": user_id
        }), 403

    try:
        conn = get_db_conn()
        cur = conn.cursor()
        
        # Ensure user exists FIRST (simple auto-registration for demo)
        cur.execute("""
            INSERT INTO users (user_id, username, password_hash)
            VALUES (%s, %s, 'placeholder')
            ON CONFLICT (user_id) DO NOTHING
        """, (user_id, user_id))
        
        # THEN upsert key
        cur.execute("""
            INSERT INTO public_keys (user_id, public_key)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO UPDATE SET public_key = EXCLUDED.public_key
        """, (user_id, public_key))

        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Key uploaded for {user_id} (by {token_user})")
        return jsonify({"status": "Key uploaded"}), 201
    except Exception as e:
        print(f"❌ Error uploading key: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/keys/<user_id>', methods=['GET'])
@auth.require_auth(required_scope='read:keys')
def get_key(user_id):
    """Get public key (requires read:keys scope)"""
    claims = request.auth_claims
    requester = claims.get('preferred_username') or claims.get('sub')
    
    # Try cache first
    cache_key = f"pubkey:{user_id}"
    cached = cache.get(cache_key)
    if cached:
        print(f"🎯 Cache HIT: {user_id} (by {requester})")
        return jsonify(cached), 200
    
    # Cache miss - query database
    print(f"💾 Cache MISS: {user_id}, querying database...")
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT public_key FROM public_keys WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row:
            result = {"user_id": user_id, "public_key": row[0]}
            
            # Store in cache (TTL: 1 hour)
            cache.set(cache_key, result, ttl=3600)
            
            print(f"✅ Key fetched from DB: {user_id} (by {requester})")
            return jsonify(result), 200
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print(f"❌ Error fetching key: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
