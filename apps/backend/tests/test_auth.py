PASSWORD = "supersecret123"


def test_signup_success(client, unique_email):
    response = client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_signup_duplicate_email_fails(client, unique_email):
    client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})
    response = client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})

    assert response.status_code == 400


def test_login_correct_password_succeeds(client, unique_email):
    client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})
    response = client.post("/auth/login", json={"email": unique_email, "password": PASSWORD})

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password_fails(client, unique_email):
    client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})
    response = client.post("/auth/login", json={"email": unique_email, "password": "wrongpassword"})

    assert response.status_code == 401


def test_me_with_valid_token_succeeds(client, unique_email):
    signup = client.post("/auth/signup", json={"email": unique_email, "password": PASSWORD})
    token = signup.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["email"] == unique_email


def test_me_without_token_fails(client):
    response = client.get("/auth/me")

    assert response.status_code == 403
