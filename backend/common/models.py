"""Shared base model inherited by all AI(r)Drop models."""
import uuid
from django.db import models


class BaseModel(models.Model):
    """Abstract base with UUID primary key and auto timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.id}>"
