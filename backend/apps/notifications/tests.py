"""Basic tests for notifications: create, list, mark read, summary."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Notification
from .service import NotificationService

User = get_user_model()


@pytest.mark.django_db
def test_create_notification():
    user = User.objects.create_user(wallet_address="0xabc", is_active=True)
    notif = NotificationService.create_notification(
        user=user,
        notification_type="score_complete",
        title="Test Score",
        message="Scored 80",
        data={"score": 80},
        deliver_realtime=False,
    )
    assert notif.id is not None
    assert notif.read is False
    assert Notification.objects.count() == 1


@pytest.mark.django_db
def test_list_and_mark_read():
    user = User.objects.create_user(wallet_address="0xdef", is_active=True)
    Notification.objects.create(
        user=user, notification_type="system", title="Hi", message="Hello"
    )
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.get("/api/v1/notifications/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["count"] == 1

    notif_id = resp.data["results"][0]["id"]
    resp2 = client.post(f"/api/v1/notifications/{notif_id}/read/")
    assert resp2.status_code == status.HTTP_200_OK
    assert resp2.data["read"] is True


@pytest.mark.django_db
def test_mark_all_read():
    user = User.objects.create_user(wallet_address="0xghi", is_active=True)
    Notification.objects.create(user=user, notification_type="system", title="A", message="1")
    Notification.objects.create(user=user, notification_type="system", title="B", message="2")
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.post("/api/v1/notifications/read-all/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["marked_read"] == 2
    assert Notification.objects.filter(user=user, read=False).count() == 0


@pytest.mark.django_db
def test_summary_counts():
    user = User.objects.create_user(wallet_address="0xjkl", is_active=True)
    Notification.objects.create(user=user, notification_type="system", title="U1", message="u", read=False)
    Notification.objects.create(user=user, notification_type="system", title="R1", message="r", read=True)
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.get("/api/v1/notifications/summary/")
    assert resp.data["unread_count"] == 1
    assert resp.data["total_count"] == 2
