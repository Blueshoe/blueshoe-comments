import pytest


@pytest.mark.django_db
class TestApiDocs:
    def test_docs_page(self, client):
        res = client.get("/docs/")
        assert res.status_code == 200
        assert "text/html" in res["Content-Type"]
        assert "Blueshoe Community API" in res.content.decode()
        assert "/api/openapi.json" in res.content.decode()

    def test_docs_page_no_trailing_slash(self, client):
        res = client.get("/docs")
        assert res.status_code in (200, 301, 302)

    def test_openapi_schema(self, client):
        res = client.get("/api/openapi.json")
        assert res.status_code == 200
        data = res.json()
        assert "openapi" in data
        assert "paths" in data
        assert "/api/comments/" in data["paths"]
        assert "/api/reactions/" in data["paths"]
        assert "/api/me/" in data["paths"]
