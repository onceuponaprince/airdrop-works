class TelegramConnection(BaseModel):
    """Linked Telegram account for message tracking (via bot deep link or OAuth)."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="telegram_connection",
    )
    telegram_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    telegram_username = models.CharField(max_length=32, db_index=True)
    display_name = models.CharField(max_length=64, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField(blank=True, default="")  # bot token or user token
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.user.wallet_address[:6]}... - Telegram @{self.telegram_username}"