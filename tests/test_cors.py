import pytest
from django.test import Client


@pytest.mark.django_db
class TestCorsConfiguration:
    def test_cors_options_preflight_www_blueshoe_io(self):
        client = Client()
        res = client.options(
            "/api/comments/?thread_slug=cors-test",
            HTTP_ORIGIN="https://www.blueshoe.io",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-visitor-id",
            HTTP_HOST="community.blueshoe.io",
        )
        assert res.status_code == 200
        assert res.headers.get("Access-Control-Allow-Origin") == "https://www.blueshoe.io"
        assert "x-visitor-id" in res.headers.get("Access-Control-Allow-Headers", "").lower()
        assert res.headers.get("Access-Control-Allow-Credentials") == "true"

    def test_cors_get_request_blueshoe_de(self):
        client = Client()
        res = client.get(
            "/api/comments/?thread_slug=cors-test",
            HTTP_ORIGIN="https://www.blueshoe.de",
            HTTP_X_VISITOR_ID="visitor-abc-123",
            HTTP_HOST="community.blueshoe.de",
        )
        assert res.status_code == 200
        assert res.headers.get("Access-Control-Allow-Origin") == "https://www.blueshoe.de"
        assert res.headers.get("Access-Control-Allow-Credentials") == "true"

    def test_cors_local_dev(self):
        client = Client()
        res = client.options(
            "/api/comments/?thread_slug=cors-test",
            HTTP_ORIGIN="http://localhost:3000",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-visitor-id",
            HTTP_HOST="localhost:8079",
        )
        assert res.status_code == 200
        assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"
