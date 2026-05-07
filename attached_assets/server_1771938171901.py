import os
from flask import Flask, request, send_from_directory, jsonify

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

messages = []

@app.route('/')
def index():
    return open('index.html').read()

@app.route('/send', methods=['POST'])
def send_message():
    msg = request.form.get('message')
    if msg:
        messages.append({'type': 'text', 'content': msg})
    return '', 204

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' in request.files:
        f = request.files['file']
        filename = f.filename
        path = os.path.join(UPLOAD_FOLDER, filename)
        f.save(path)
        messages.append({'type': 'image', 'content': filename})
    return '', 204

@app.route('/messages')
def get_messages():
    return jsonify(messages)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    # Replit provides the port in the environment variable
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
