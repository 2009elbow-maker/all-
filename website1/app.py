from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os

import openmeteo_requests

import pandas as pd
import requests_cache
from retry_requests import retry

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'
CORS(app)

# MariaDB connection config
db_config = {
    'host': 'localhost',
    'port': 3307,
    'user': 'root',
    'password': 'Root',
    'database': 'userDB'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except Error as e:
        print(f"Error: {e}")
        return None

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 204
    
    if request.method == 'POST':
        try:
            data = request.get_json(force=True) if request.content_length else {}
        except:
            data = request.form.to_dict()
        
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
                user = cursor.fetchone()
                
                if user:
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['full_name'] = user['full_name']
                    return jsonify({'success': True, 'message': 'Login successful', 'redirect': '/dashboard'})
                else:
                    return jsonify({'success': False, 'message': 'Invalid username or password'})
            except Exception as e:
                return jsonify({'success': False, 'message': str(e)})
            finally:
                cursor.close()
                conn.close()
        else:
            return jsonify({'success': False, 'message': 'Database connection failed'})
    
    return render_template('website1154.html')

@app.route('/register', methods=['GET', 'POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 204
    
    if request.method == 'POST':
        try:
            data = request.get_json(force=True) if request.content_length else {}
        except:
            data = request.form.to_dict()
        
        username = data.get('username')
        password = data.get('password')
        full_name = data.get('full_name')
        email = data.get('email')
        
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, email))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'Username or email already exists'})
                
                cursor.execute(
                    "INSERT INTO users (full_name, username, password, email) VALUES (%s, %s, %s, %s)",
                    (full_name, username, password, email)
                )
                conn.commit()
                return jsonify({'success': True, 'message': 'Registration successful', 'redirect': '/login'})
            except Exception as e:
                conn.rollback()
                return jsonify({'success': False, 'message': str(e)})
            finally:
                cursor.close()
                conn.close()
        else:
            return jsonify({'success': False, 'message': 'Database connection failed'})
    
    return render_template('websiteregister.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    full_name = session['full_name']
    is_admin = username == 'Admin'
    
    return render_template('dashboard_flask.html', username=username, full_name=full_name, is_admin=is_admin)

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id, full_name, username, email FROM users")
            users = cursor.fetchall()
            return jsonify(users)
        finally:
            cursor.close()
            conn.close()
    return jsonify([])

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if session.get('username') != 'Admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM users WHERE id = %s AND username != %s", (user_id, 'Admin'))
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'message': str(e)})
        finally:
            cursor.close()
            conn.close()
    return jsonify({'success': False})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
