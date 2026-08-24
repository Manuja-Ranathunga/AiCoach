def _auth_headers(client, unique_email: str) -> dict[str, str]:
    signup = client.post("/auth/signup", json={"email": unique_email, "password": "supersecret123"})
    token = signup.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_exercises_requires_auth(client):
    response = client.get("/exercises")

    assert response.status_code == 403


def test_exercises_returns_seeded_catalog(client, unique_email):
    headers = _auth_headers(client, unique_email)

    response = client.get("/exercises", headers=headers)

    assert response.status_code == 200
    exercises = response.json()
    assert len(exercises) == 6

    statuses_by_slug = {exercise["slug"]: exercise["status"] for exercise in exercises}
    assert statuses_by_slug["squat"] == "available"
    for slug, status in statuses_by_slug.items():
        if slug != "squat":
            assert status == "coming_soon"
