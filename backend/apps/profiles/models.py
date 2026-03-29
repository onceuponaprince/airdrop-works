"""Profile model — aggregates XP, skill tree state, rank."""
from django.db import models
from django.conf import settings
from common.models import BaseModel

BRANCH_XP_FIELDS = ["educator_xp", "builder_xp", "creator_xp", "scout_xp", "diplomat_xp"]


class Profile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    total_xp = models.IntegerField(default=0, db_index=True)
    educator_xp = models.IntegerField(default=0)
    builder_xp = models.IntegerField(default=0)
    creator_xp = models.IntegerField(default=0)
    scout_xp = models.IntegerField(default=0)
    diplomat_xp = models.IntegerField(default=0)
    skill_tree_state = models.JSONField(
        default=dict,
        help_text="Map of node_id → ISO timestamp of when unlocked.",
    )
    rank = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "profiles"

    def __str__(self):
        return f"Profile({self.user}) XP={self.total_xp} Rank={self.rank}"

    @property
    def primary_branch(self) -> str:
        """Return the branch with highest XP."""
        branches = {
            "educator": self.educator_xp,
            "builder": self.builder_xp,
            "creator": self.creator_xp,
            "scout": self.scout_xp,
            "diplomat": self.diplomat_xp,
        }
        return max(branches, key=branches.get)
