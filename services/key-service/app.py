import os
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

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
def upload_key():
    data = request.json
    user_id = data.get('user_id')
    public_key = data.get('public_key')

    if not user_id or not public_key:
        return jsonify({"error": "Missing user_id or public_key"}), 400

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
        return jsonify({"status": "Key uploaded"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/keys/<user_id>', methods=['GET'])
def get_key(user_id):
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT public_key FROM public_keys WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row:
            return jsonify({"user_id": user_id, "public_key": row[0]})
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
