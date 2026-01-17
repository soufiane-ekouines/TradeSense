import time
import random
import uuid
from models import db, Transaction, Challenge, Plan, User
from datetime import datetime

class PaymentService:
    def process_cmi_payment(self, user_id, plan_slug, amount):
        """
        Simulates CMI Card Payment.
        """
        # 1. Simulate Network Latency (2s)
        time.sleep(2)

        # 2. Simulate Success/Failure (Force Success for User MVP Demo)
        # if random.random() < 0.1:
        #    return {'success': False, 'error': 'Transaction declined by bank'}

        # 3. Create Transaction Record
        txn_id = str(uuid.uuid4())
        txn = Transaction(
            user_id=user_id,
            amount=amount,
            currency='DH',
            purpose=f'challenge_purchase_{plan_slug}',
            method='CMI',
            status='completed',
            metadata_json=f'{{"transaction_id": "{txn_id}", "card_mask": "**** 4242"}}'
        )
        db.session.add(txn)
        
        # 4. Activate Challenge
        return self._activate_challenge(user_id, plan_slug, txn)


    def process_crypto_payment(self, user_id, plan_slug, amount):
        """
        Simulates Crypto Payment (returns wallet address).
        """
        # For MVP, we just simulate instant success after "confirmation"
        time.sleep(1.5)
        
        wallet_address = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
        
        txn = Transaction(
            user_id=user_id,
            amount=amount,
            currency='USD', # Crypto usually USD denominated
            purpose=f'challenge_purchase_{plan_slug}',
            method='CRYPTO',
            status='completed', # Auto-complete for MVP flow
            metadata_json=f'{{"wallet": "{wallet_address}", "network": "ERC20"}}'
        )
        db.session.add(txn)
        
        return self._activate_challenge(user_id, plan_slug, txn)

    def process_paypal_payment(self, user_id, plan_slug, amount):
        """
        Simulates PayPal Payment.
        """
        # 1. Simulate Network Latency
        time.sleep(1.5)

        # 2. Create Transaction Record
        txn_id = str(uuid.uuid4())
        txn = Transaction(
            user_id=user_id,
            amount=amount,
            currency='DH',
            purpose=f'challenge_purchase_{plan_slug}',
            method='PAYPAL',
            status='completed',
            metadata_json=f'{{"paypal_txn_id": "{txn_id}", "status": "VERIFIED"}}'
        )
        db.session.add(txn)
        
        return self._activate_challenge(user_id, plan_slug, txn)

    def _activate_challenge(self, user_id, plan_slug, txn):
        try:
            plan = Plan.query.filter_by(slug=plan_slug).first()
            if not plan:
                return {'success': False, 'error': 'Invalid Plan'}

            # Deactivate old challenges? Or allow multiple? 
            # For MVP, let's keep it simple: Create new active challenge.
            
            # Start Balance logic (hardcoded mapping or from Plan)
            # Assuming Plan has features_json with start_balance
            features = plan.get_features()
            start_balance = features.get('start_balance', 10000)
            if plan_slug == 'starter': start_balance = 10000
            elif plan_slug == 'pro': start_balance = 50000
            elif plan_slug == 'elite': start_balance = 100000

            challenge = Challenge(
                user_id=user_id,
                plan_id=plan.id,
                start_balance=start_balance,
                equity=start_balance,
                status='active',
                created_at=datetime.utcnow()
            )
            db.session.add(challenge)
            db.session.commit()
            
            return {'success': True, 'challenge_id': challenge.id, 'txn_id': txn.id}

        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}
