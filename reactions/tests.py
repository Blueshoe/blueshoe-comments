import pytest
from django.contrib.auth import get_user_model

from comments.models import Comment
from reactions.models import Reaction

User = get_user_model()


@pytest.mark.django_db
class TestReactionsAPI:
    def test_toggle_reaction_invalid_kind(self, client):
        res = client.post(
            "/api/reactions/",
            data={
                "thread_slug": "article-1",
                "kind": "dislike",  # Negative reaction rejected
            },
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 400
        assert "Invalid reaction kind" in res.json()["error"]

    def test_toggle_reaction_missing_slug(self, client):
        res = client.post(
            "/api/reactions/",
            data={"thread_slug": "", "kind": "rocket"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 400

    def test_toggle_page_reaction_anonymous(self, client):
        # 1. Add reaction
        res1 = client.post(
            "/api/reactions/",
            data={"thread_slug": "article-1", "kind": "rocket"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res1.status_code == 200
        assert res1.json() == {"action": "added"}
        assert Reaction.objects.filter(thread_slug="article-1", kind="rocket").count() == 1

        # 2. Toggle off (remove)
        res2 = client.post(
            "/api/reactions/",
            data={"thread_slug": "article-1", "kind": "rocket"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res2.status_code == 200
        assert res2.json() == {"action": "removed"}
        assert Reaction.objects.filter(thread_slug="article-1", kind="rocket").count() == 0

    def test_toggle_comment_reaction_authenticated(self, client):
        user = User.objects.create_user(username="charlie", email="charlie@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de", thread_slug="article-1", author=user, body_markdown="Great post", status="approved"
        )
        client.force_login(user)

        res = client.post(
            "/api/reactions/",
            data={"thread_slug": "article-1", "comment_id": comment.id, "kind": "love"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 200
        assert res.json() == {"action": "added"}

        # Check comment reactions view
        res_comments = client.get("/api/comments/?thread_slug=article-1", HTTP_HOST="blueshoe.de")
        assert res_comments.status_code == 200
        comment_data = res_comments.json()[0]
        assert comment_data["reactions"]["counts"]["love"] == 1
        assert "love" in comment_data["reactions"]["active"]

    def test_get_page_reactions(self, client):
        user = User.objects.create_user(username="charlie", email="charlie@test.com")
        Reaction.objects.create(site_host="blueshoe.de", thread_slug="article-1", kind="insightful", user=user)
        client.force_login(user)

        res = client.get("/api/reactions/?thread_slug=article-1", HTTP_HOST="blueshoe.de")
        assert res.status_code == 200
        data = res.json()
        assert data["counts"]["insightful"] == 1
        assert "insightful" in data["active"]

    def test_batch_reactions(self, client):
        Comment.objects.create(
            site_host="blueshoe.de", thread_slug="article-1", body_markdown="Comment 1", status="approved"
        )
        Comment.objects.create(
            site_host="blueshoe.de", thread_slug="article-1", body_markdown="Comment 2", status="approved"
        )
        Reaction.objects.create(site_host="blueshoe.de", thread_slug="article-1", kind="celebrate", anon_hash="dummy")

        res = client.get("/api/reactions/batch/?thread_slug=article-1,article-2", HTTP_HOST="blueshoe.de")
        assert res.status_code == 200
        data = res.json()
        assert "article-1" in data
        assert "article-2" in data
        assert data["article-1"]["comment_count"] == 2
        assert data["article-1"]["reactions"]["celebrate"] == 1
        assert data["article-2"]["comment_count"] == 0

    def test_batch_reactions_missing_slug(self, client):
        res = client.get("/api/reactions/batch/", HTTP_HOST="blueshoe.de")
        assert res.status_code == 422
