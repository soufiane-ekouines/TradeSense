import requests

url = "http://localhost:5000/api/auth/register"
data = {
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
