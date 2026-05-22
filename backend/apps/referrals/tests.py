from django.test import TestCase
from django.contrib.auth import get_user_model
from .service import get_or_create_referral_code, generate_referral_code


User = get_user_model()


class ReferralServiceTests(TestCase):
    def test_generate_code_unique(self):
        codes = {generate_referral_code() for _ in range(100)}
        self.assertEqual(len(codes), 100)

    def test_get_or_create_referral_code(self):
        user = User.objects.create(wallet_address="0xReferralTest123")
        ref1 = get_or_create_referral_code(user)
        ref2 = get_or_create_referral_code(user)
        self.assertEqual(ref1.id, ref2.id)
        self.assertTrue(ref1.code)