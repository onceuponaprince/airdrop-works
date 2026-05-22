# Add at the end of the file

class DiscordConnection(BaseModel):
    """OAuth-linked Discord account for message tracking."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="discord_connection",
    )
    discord_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    discord_username = models.CharField(max_length=32, db_index=True)
    display_name = models.CharField(max_length=64, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.user.wallet_address[:6]}... - Discord @{self.discord_username}"