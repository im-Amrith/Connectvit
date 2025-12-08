from gevent import monkey
monkey.patch_all()
from psycogreen.gevent import patch_psycopg
patch_psycopg()
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import sqlite3
import psycopg2
import psycopg2.extras
from urllib.parse import urlparse
import bcrypt
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Database Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "connect.db")
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()

if DATABASE_URL:
    print(f"✅ Configured to use PostgreSQL: {DATABASE_URL.split('@')[1]}")
else:
    print("⚠️ Configured to use local SQLite")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def home():
    return "ConnectVit Backend is Running!", 200

class PostgresCursor:
    def __init__(self, cursor):
        self.cursor = cursor
        self.lastrowid = None
    
    def execute(self, query, params=None):
        # Convert ? to %s
        query = query.replace('?', '%s')
        
        # Handle SQLite specific syntax
        query = query.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
        query = query.replace('datetime("now")', 'NOW()')
        
        # Handle lastrowid for INSERTs
        if query.strip().upper().startswith("INSERT") and "RETURNING id" not in query:
             # This is a heuristic. Ideally we rewrite the queries.
             # But for now, let's try to append RETURNING id if it looks like an insert
             pass

        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            
            # If it was an insert, try to get the id if available (requires RETURNING id in query)
            # We will manually add RETURNING id in the specific calls that need it.
        except Exception as e:
            raise e
            
    def fetchone(self):
        return self.cursor.fetchone()
    
    def fetchall(self):
        return self.cursor.fetchall()
        
    def close(self):
        self.cursor.close()

def get_db_connection():
    if DATABASE_URL:
        # Try to connect up to 3 times
        for attempt in range(3):
            try:
                # Add Keepalives to prevent "SSL Closed" errors
                # For Supabase Transaction Pooler (port 6543), SSL is required but sometimes 'require' is too strict for the pooler handshake
                # Try 'prefer' or just rely on the URL params if possible.
                # Also, ensure the URL is the Transaction Pooler URL (port 6543) for IPv4 compatibility if needed, 
                # OR the Session Pooler (port 5432) if using IPv4 addon.
                # Hugging Face Spaces are IPv4 only.
                
                conn = psycopg2.connect(
                    DATABASE_URL, 
                    sslmode='require', 
                    connect_timeout=10,
                    keepalives=1, 
                    keepalives_idle=5, 
                    keepalives_interval=2, 
                    keepalives_count=2
                )
                return conn
            except psycopg2.OperationalError as e:
                print(f"Connection attempt {attempt+1} failed: {e}")
                if attempt == 2: # If it's the last attempt, give up and raise the error
                    raise e
                time.sleep(1) # Wait 1 second before retrying
    else:
        return sqlite3.connect(DB_PATH)        

def get_cursor(conn):
    if DATABASE_URL:
        return PostgresCursor(conn.cursor())
    else:
        return conn.cursor()

# ========== Create Tables ==========

def create_tables():
    conn = get_db_connection()
    cursor = get_cursor(conn)

    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            date_of_joining TEXT NOT NULL
        )
    ''')

    # Messages Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            receiver TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Groups Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Group Members Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            UNIQUE (group_id, username)
        )
    ''')
    
    # Group Messages Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS group_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups (id)
        )
    ''')

    # Posts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            caption TEXT,
            image_url TEXT,
            timestamp TEXT NOT NULL
        )
    ''')
    
    # Post Likes Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (post_id) REFERENCES posts (id),
            UNIQUE (post_id, username)
        )
    ''')

    # Enable RLS for Postgres to secure tables from public API access
    if DATABASE_URL:
        tables = ["users", "messages", "groups", "group_members", "group_messages", "posts", "post_likes"]
        for table in tables:
            try:
                cursor.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
            except Exception as e:
                print(f"⚠️ Could not enable RLS for {table}: {e}")

    conn.commit()
    conn.close()

create_tables()

# ========== Signup ==========

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    full_name = data.get("fullName")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not email.endswith("@vitstudent.ac.in"):
        return jsonify({"error": "Invalid email format. Use example@vitstudent.ac.in"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    date_of_joining = datetime.now().strftime("%d-%m-%Y")

    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        cursor.execute('''
            INSERT INTO users (full_name, username, email, password, date_of_joining)
            VALUES (?, ?, ?, ?, ?)
        ''', (full_name, username, email, hashed_password, date_of_joining))
        conn.commit()
        conn.close()
        return jsonify({"message": "Sign-up successful!"}), 201
    except Exception as e:
        # Check for integrity error in a DB-agnostic way or catch specific exceptions
        if "unique constraint" in str(e).lower() or "already exists" in str(e).lower():
             return jsonify({"error": "Username or email already exists. Try a different one."}), 409
        return jsonify({"error": "Server error. Please try again.", "details": str(e)}), 500

# ========== Login ==========

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    cursor = get_cursor(conn)
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user[4].encode('utf-8')):
        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user[0],
                "full_name": user[1],
                "username": user[2],
                "email": user[3],
                "date_of_joining": user[5]
            }
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# ========== Get Users ==========

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        cursor.execute('SELECT id, full_name, username, email, date_of_joining FROM users')
        users = cursor.fetchall()
        conn.close()

        user_list = []
        for user in users:
            user_list.append({
                "id": user[0],
                "full_name": user[1],
                "username": user[2],
                "email": user[3],
                "date_of_joining": user[4]
            })

        return jsonify(user_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch users", "details": str(e)}), 500

# ========== Get Messages ==========

@app.route('/api/messages', methods=['GET'])
def get_messages():
    try:
        sender = request.args.get('sender')
        receiver = request.args.get('receiver')

        if not sender or not receiver:
            return jsonify({"error": "Sender and receiver are required"}), 400

        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Get messages where current user is either sender or receiver
        cursor.execute('''
            SELECT * FROM messages 
            WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
            ORDER BY timestamp ASC
        ''', (sender, receiver, receiver, sender))
        
        messages = cursor.fetchall()
        conn.close()

        message_list = []
        for msg in messages:
            message_list.append({
                "id": msg[0],
                "sender": msg[1],
                "receiver": msg[2],
                "message": msg[3],
                "timestamp": msg[4]
            })

        return jsonify(message_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch messages", "details": str(e)}), 500

# ========== Get Chat History ==========

@app.route('/api/chat-history', methods=['GET'])
def get_chat_history():
    try:
        username = request.args.get('username')
        
        if not username:
            return jsonify({"error": "Username parameter is required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Find all unique conversations involving this user
        cursor.execute('''
            SELECT DISTINCT 
                CASE 
                    WHEN sender = ? THEN receiver 
                    ELSE sender 
                END as participant
            FROM messages
            WHERE sender = ? OR receiver = ?
        ''', (username, username, username))
        
        participants = cursor.fetchall()
        chat_history = []
        
        for participant in participants:
            participant_username = participant[0]
            
            # Get the last message exchanged with this participant
            cursor.execute('''
                SELECT * FROM messages 
                WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (username, participant_username, participant_username, username))
            
            last_message = cursor.fetchone()
            
            if last_message:
                chat_history.append({
                    "participants": [username, participant_username],
                    "lastMessage": last_message[3],  # message content
                    "timestamp": last_message[4],    # timestamp
                    "type": "direct"
                })
        
        # Get all groups the user is a member of
        cursor.execute('''
            SELECT g.id, g.name, g.description, g.created_at
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.username = ?
        ''', (username,))
        
        groups = cursor.fetchall()
        
        for group in groups:
            group_id = group[0]
            group_name = group[1]
            
            # Get the last message in this group
            cursor.execute('''
                SELECT * FROM group_messages 
                WHERE group_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (group_id,))
            
            last_message = cursor.fetchone()
            
            if last_message:
                chat_history.append({
                    "group_id": group_id,
                    "group_name": group_name,
                    "lastMessage": last_message[3],  # message content
                    "sender": last_message[2],       # sender
                    "timestamp": last_message[4],    # timestamp
                    "type": "group"
                })
            else:
                chat_history.append({
                    "group_id": group_id,
                    "group_name": group_name,
                    "lastMessage": "No messages yet",
                    "sender": "",
                    "timestamp": group[3],  # created_at
                    "type": "group"
                })
        
        conn.close()
        return jsonify(chat_history), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch chat history", "details": str(e)}), 500

# ========== Real-Time Chat ==========

@socketio.on('join')
def handle_join(data):
    room = get_room_id(data['sender'], data['receiver'])
    join_room(room)
    print(f"{data['sender']} joined room {room}")

@socketio.on('join_group')
def handle_join_group(data):
    room = f"group_{data['group_id']}"
    join_room(room)
    print(f"{data['username']} joined group room {room}")

@socketio.on('send_message')
def handle_send_message(data):
    room = get_room_id(data['sender'], data['receiver'])
    message = {
        "sender": data["sender"],
        "receiver": data["receiver"],
        "message": data["message"],
        "timestamp": datetime.now().isoformat()
    }

    # Save to SQLite
    conn = get_db_connection()
    cursor = get_cursor(conn)
    cursor.execute('''
        INSERT INTO messages (sender, receiver, message, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (message["sender"], message["receiver"], message["message"], message["timestamp"]))
    conn.commit()
    conn.close()

    emit('receive_message', message, room=room)
    print(f"Message from {message['sender']} to {message['receiver']} in room {room}")

@socketio.on('send_group_message')
def handle_send_group_message(data):
    group_id = data['group_id']
    room = f"group_{group_id}"
    message = {
        "group_id": group_id,
        "sender": data["sender"],
        "message": data["message"],
        "timestamp": datetime.now().isoformat()
    }

    # Save to SQLite
    conn = get_db_connection()
    cursor = get_cursor(conn)
    cursor.execute('''
        INSERT INTO group_messages (group_id, sender, message, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (message["group_id"], message["sender"], message["message"], message["timestamp"]))
    conn.commit()
    conn.close()

    emit('receive_group_message', message, room=room)
    print(f"Group message from {message['sender']} in group {group_id} room {room}")

def get_room_id(user1, user2):
    return "-".join(sorted([user1, user2]))

# ========== Group Management ==========

@app.route('/api/groups', methods=['GET'])
def get_user_groups():
    try:
        username = request.args.get('username')
        
        if not username:
            return jsonify({"error": "Username parameter is required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Get all groups the user is a member of
        cursor.execute('''
            SELECT g.id, g.name, g.description, g.created_by, g.created_at, gm.is_admin
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.username = ?
        ''', (username,))
        
        groups = cursor.fetchall()
        group_list = []
        
        for group in groups:
            group_list.append({
                "id": group[0],
                "name": group[1],
                "description": group[2],
                "created_by": group[3],
                "created_at": group[4],
                "is_admin": bool(group[5])
            })
        
        conn.close()
        return jsonify(group_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch groups", "details": str(e)}), 500

@app.route('/api/all-groups', methods=['GET'])
def get_all_groups():
    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        cursor.execute('SELECT id, name, description, created_by, created_at FROM groups')
        groups = cursor.fetchall()
        
        group_list = []
        for group in groups:
            # Get member count
            cursor.execute('SELECT COUNT(*) FROM group_members WHERE group_id = ?', (group[0],))
            member_count = cursor.fetchone()[0]
            
            group_list.append({
                "id": group[0],
                "name": group[1],
                "description": group[2],
                "created_by": group[3],
                "created_at": group[4],
                "member_count": member_count
            })
        
        conn.close()
        return jsonify(group_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch groups", "details": str(e)}), 500

@app.route('/api/groups/create', methods=['POST'])
def create_group():
    try:
        data = request.json
        name = data.get("name")
        description = data.get("description", "")
        created_by = data.get("username")
        
        if not name or not created_by:
            return jsonify({"error": "Group name and creator username are required"}), 400
        
        created_at = datetime.now().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            # Postgres
            cursor.execute('''
                INSERT INTO groups (name, description, created_by, created_at)
                VALUES (%s, %s, %s, %s) RETURNING id
            ''', (name, description, created_by, created_at))
            group_id = cursor.fetchone()[0]
        else:
            # SQLite
            cursor.execute('''
                INSERT INTO groups (name, description, created_by, created_at)
                VALUES (?, ?, ?, ?)
            ''', (name, description, created_by, created_at))
            group_id = cursor.lastrowid
        
        # Add creator as a member and admin
        if DATABASE_URL:
             cursor.execute('''
                INSERT INTO group_members (group_id, username, joined_at, is_admin)
                VALUES (%s, %s, %s, %s)
            ''', (group_id, created_by, created_at, 1))
        else:
            cursor.execute('''
                INSERT INTO group_members (group_id, username, joined_at, is_admin)
                VALUES (?, ?, ?, ?)
            ''', (group_id, created_by, created_at, 1))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Group created successfully",
            "group_id": group_id
        }), 201
    except Exception as e:
        return jsonify({"error": "Failed to create group", "details": str(e)}), 500

@app.route('/api/groups/<int:group_id>', methods=['GET'])
def get_group_details(group_id):
    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Get group details
        cursor.execute('SELECT * FROM groups WHERE id = ?', (group_id,))
        group = cursor.fetchone()
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        # Get group members
        cursor.execute('''
            SELECT gm.username, gm.joined_at, gm.is_admin, u.full_name
            FROM group_members gm
            JOIN users u ON gm.username = u.username
            WHERE gm.group_id = ?
        ''', (group_id,))
        
        members = cursor.fetchall()
        member_list = []
        
        for member in members:
            member_list.append({
                "username": member[0],
                "joined_at": member[1],
                "is_admin": bool(member[2]),
                "full_name": member[3]
            })
        
        conn.close()
        
        return jsonify({
            "id": group[0],
            "name": group[1],
            "description": group[2],
            "created_by": group[3],
            "created_at": group[4],
            "members": member_list
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch group details", "details": str(e)}), 500

@app.route('/api/groups/<int:group_id>/members', methods=['POST'])
def add_group_member(group_id):
    conn = None
    try:
        data = request.json
        username = data.get("username")
        added_by = data.get("added_by")
        
        if not username or not added_by:
            return jsonify({"error": "Username and added_by are required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Allow self-join or admin-add
        if username != added_by:
            # Check if the user adding is an admin
            cursor.execute('''
                SELECT is_admin FROM group_members
                WHERE group_id = ? AND username = ?
            ''', (group_id, added_by))
            
            admin_check = cursor.fetchone()
            
            if not admin_check or not admin_check[0]:
                return jsonify({"error": "Only group admins can add members"}), 403
        
        # Check if user exists
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Add user to group
        joined_at = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO group_members (group_id, username, joined_at, is_admin)
            VALUES (?, ?, ?, ?)
        ''', (group_id, username, joined_at, False))
        
        conn.commit()
        return jsonify({"message": "Member added successfully"}), 200
    except Exception as e:
        if "unique constraint" in str(e).lower() or "already exists" in str(e).lower():
             return jsonify({"error": "User is already a member of this group"}), 409
        return jsonify({"error": "Failed to add member", "details": str(e)}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/groups/<int:group_id>/messages', methods=['GET'])
def get_group_messages(group_id):
    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Get group messages
        cursor.execute('''
            SELECT * FROM group_messages 
            WHERE group_id = ?
            ORDER BY timestamp ASC
        ''', (group_id,))
        
        messages = cursor.fetchall()
        message_list = []
        
        for msg in messages:
            message_list.append({
                "id": msg[0],
                "group_id": msg[1],
                "sender": msg[2],
                "message": msg[3],
                "timestamp": msg[4]
            })
        
        conn.close()
        
        return jsonify(message_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch group messages", "details": str(e)}), 500

@app.route('/api/groups/<int:group_id>/leave', methods=['POST'])
def leave_group(group_id):
    try:
        data = request.json
        username = data.get("username")
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Check if user is in the group
        cursor.execute('''
            SELECT * FROM group_members
            WHERE group_id = ? AND username = ?
        ''', (group_id, username))
        
        member = cursor.fetchone()
        
        if not member:
            return jsonify({"error": "User is not a member of this group"}), 404
        
        # Check if user is the only admin
        cursor.execute('''
            SELECT COUNT(*) FROM group_members
            WHERE group_id = ? AND is_admin = 1
        ''', (group_id,))
        
        admin_count = cursor.fetchone()[0]
        
        if admin_count == 1 and member[4]:  # If user is admin and the only admin
            # Check if there are other members
            cursor.execute('''
                SELECT COUNT(*) FROM group_members
                WHERE group_id = ?
            ''', (group_id,))
            
            member_count = cursor.fetchone()[0]
            
            if member_count > 1:
                return jsonify({"error": "Cannot leave group as the only admin. Promote another member to admin first."}), 400
        
        # Remove user from group
        cursor.execute('''
            DELETE FROM group_members
            WHERE group_id = ? AND username = ?
        ''', (group_id, username))
        
        # If this was the last member, delete the group
        cursor.execute('''
            SELECT COUNT(*) FROM group_members
            WHERE group_id = ?
        ''', (group_id,))
        
        remaining_members = cursor.fetchone()[0]
        
        if remaining_members == 0:
            # Delete all group messages
            cursor.execute('DELETE FROM group_messages WHERE group_id = ?', (group_id,))
            # Delete the group
            cursor.execute('DELETE FROM groups WHERE id = ?', (group_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Left group successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to leave group", "details": str(e)}), 500

# ========== Test DB Route ==========

@app.route("/test-db")
def test_db():
    conn = get_db_connection()
    cursor = get_cursor(conn)
    cursor.execute('''
        INSERT INTO messages (sender, receiver, message, timestamp)
        VALUES (?, ?, ?, ?)
    ''', ("test_user", "test_receiver", "Hello from Flask (SQLite/Postgres)", datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return "Inserted test message into DB!"

# ========== User Profile ==========

@app.route('/api/user-profile', methods=['GET'])
def get_user_profile():
    try:
        username = request.args.get('username')
        
        if not username:
            return jsonify({"error": "Username parameter is required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Get user profile
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if we have a bio table
        if DATABASE_URL:
             cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_bio')")
             table_exists = cursor.fetchone()[0]
        else:
             cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_bio'")
             table_exists = cursor.fetchone()

        if not table_exists:
            # Create bio table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_bio (
                    username TEXT PRIMARY KEY,
                    bio TEXT,
                    updated_at TEXT
                )
            ''')
            conn.commit()
        
        # Get bio if it exists
        cursor.execute('SELECT bio FROM user_bio WHERE username = ?', (username,))
        bio_row = cursor.fetchone()
        bio = bio_row[0] if bio_row else ""
        
        conn.close()
        
        return jsonify({
            "username": user[2],
            "full_name": user[1],
            "email": user[3],
            "date_of_joining": user[5],
            "bio": bio
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch profile", "details": str(e)}), 500

@app.route('/api/update-bio', methods=['POST'])
def update_bio():
    try:
        data = request.json
        username = data.get("username")
        bio = data.get("bio")
        
        if not username or bio is None:
            return jsonify({"error": "Username and bio are required"}), 400
        
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Create bio table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_bio (
                username TEXT PRIMARY KEY,
                bio TEXT,
                updated_at TEXT
            )
        ''')
        
        # Update or insert bio
        current_time = datetime.now().isoformat()
        
        if DATABASE_URL:
            # Postgres UPSERT
            cursor.execute('''
                INSERT INTO user_bio (username, bio, updated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (username) DO UPDATE SET bio = EXCLUDED.bio, updated_at = EXCLUDED.updated_at
            ''', (username, bio, current_time))
        else:
            # SQLite UPSERT
            cursor.execute('''
                INSERT OR REPLACE INTO user_bio (username, bio, updated_at)
                VALUES (?, ?, ?)
            ''', (username, bio, current_time))
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Bio updated successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to update bio", "details": str(e)}), 500

# ========== Posts ==========

@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        cursor.execute('SELECT * FROM posts ORDER BY timestamp DESC')
        posts = cursor.fetchall()
        
        post_list = []
        for post in posts:
            # Get likes for this post
            cursor.execute('SELECT username FROM post_likes WHERE post_id = ?', (post[0],))
            likes = [row[0] for row in cursor.fetchall()]
            
            post_list.append({
                "id": post[0],
                "username": post[1],
                "caption": post[2],
                "image_url": post[3],
                "timestamp": post[4],
                "likes": likes
            })
        
        conn.close()
        return jsonify(post_list), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch posts", "details": str(e)}), 500

@app.route('/api/posts/create', methods=['POST'])
def create_post():
    try:
        data = request.json
        username = data.get("username")
        caption = data.get("caption")
        image_url = data.get("image_url")
        
        if not username or not image_url:
            return jsonify({"error": "Username and image are required"}), 400
            
        timestamp = datetime.now().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_URL:
            cursor.execute('''
                INSERT INTO posts (username, caption, image_url, timestamp)
                VALUES (%s, %s, %s, %s) RETURNING id
            ''', (username, caption, image_url, timestamp))
            post_id = cursor.fetchone()[0]
        else:
            cursor.execute('''
                INSERT INTO posts (username, caption, image_url, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (username, caption, image_url, timestamp))
            post_id = cursor.lastrowid
            
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "Post created successfully",
            "post": {
                "id": post_id,
                "username": username,
                "caption": caption,
                "image_url": image_url,
                "timestamp": timestamp,
                "likes": []
            }
        }), 201
    except Exception as e:
        return jsonify({"error": "Failed to create post", "details": str(e)}), 500

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    try:
        data = request.json
        username = data.get("username")
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
            
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        # Check if already liked
        cursor.execute('SELECT * FROM post_likes WHERE post_id = ? AND username = ?', (post_id, username))
        existing_like = cursor.fetchone()
        
        if existing_like:
            # Unlike
            cursor.execute('DELETE FROM post_likes WHERE post_id = ? AND username = ?', (post_id, username))
            action = "unliked"
        else:
            # Like
            timestamp = datetime.now().isoformat()
            if DATABASE_URL:
                cursor.execute('INSERT INTO post_likes (post_id, username, timestamp) VALUES (%s, %s, %s)', (post_id, username, timestamp))
            else:
                cursor.execute('INSERT INTO post_likes (post_id, username, timestamp) VALUES (?, ?, ?)', (post_id, username, timestamp))
            action = "liked"
            
        conn.commit()
        
        # Get updated likes list
        cursor.execute('SELECT username FROM post_likes WHERE post_id = ?', (post_id,))
        likes = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            "message": f"Post {action} successfully",
            "likes": likes
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to like/unlike post", "details": str(e)}), 500

# ========== Run ==========

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5010))
    socketio.run(app, debug=True, port=port, host='0.0.0.0')
