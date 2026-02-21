"""
Django management command to clean up expired authentication tokens.

This command can be run manually or scheduled as a cron job to periodically
remove expired tokens from the database. It also provides monitoring and
analytics for token usage patterns.

Features:
- Clean up expired tokens from all authentication token types (magic code tokens)
- Monitor token usage patterns and statistics
- Generate cleanup reports with detailed metrics
- Support for dry-run mode to preview cleanup operations
- Automatic scheduling support for cron jobs
"""

import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, models
from tokens.models import MagicCodeToken
from tokens.errors import log_auth_event
import logging

logger = logging.getLogger('django')

# Constants
SYSTEM_IP = "127.0.0.1"


class Command(BaseCommand):
    help = 'Clean up expired authentication tokens and monitor token usage patterns'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show how many tokens would be deleted without actually deleting them',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed cleanup information and statistics',
        )
        parser.add_argument(
            '--report',
            action='store_true',
            help='Generate detailed token usage report',
        )
        parser.add_argument(
            '--token-type',
            choices=['magic_code', 'all'],
            default='all',
            help='Specify which token type to clean up (default: all)',
        )
        parser.add_argument(
            '--older-than-days',
            type=int,
            default=0,
            help='Only clean tokens older than specified days (0 = only expired tokens)',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        dry_run = options['dry_run']
        verbose = options['verbose']
        generate_report = options['report']
        token_type = options['token_type']
        older_than_days = options['older_than_days']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting token cleanup process ({"dry-run" if dry_run else "live"})...'
            )
        )
        
        # Generate usage report if requested
        if generate_report:
            self._generate_usage_report()
        
        # Perform cleanup based on token type
        cleanup_results = {}
        
        # Wrap all cleanup operations in a single transaction for consistency
        # Only for non-dry-run operations
        if not dry_run:
            with transaction.atomic():
                if token_type == 'all':
                    cleanup_results['magic_code'] = self._cleanup_tokens(MagicCodeToken, dry_run, older_than_days, verbose)
                    cleanup_results['other'] = self._cleanup_other_tokens(dry_run, older_than_days, verbose)
                elif token_type == 'magic_code':
                    cleanup_results['magic_code'] = self._cleanup_tokens(MagicCodeToken, dry_run, older_than_days, verbose)
        else:
            # Dry run doesn't need transaction
            if token_type == 'all':
                cleanup_results['magic_code'] = self._cleanup_tokens(MagicCodeToken, dry_run, older_than_days, verbose)
                cleanup_results['other'] = self._cleanup_other_tokens(dry_run, older_than_days, verbose)
            elif token_type == 'magic_code':
                cleanup_results['magic_code'] = self._cleanup_tokens(MagicCodeToken, dry_run, older_than_days, verbose)
        
        # Calculate totals
        total_cleaned = sum(result['cleaned'] for result in cleanup_results.values())
        total_found = sum(result['found'] for result in cleanup_results.values())
        
        # Calculate execution time once
        execution_time = time.time() - start_time
        
        # Display summary
        self._display_summary(cleanup_results, total_cleaned, total_found, dry_run, execution_time)
        
        # Log cleanup event for monitoring
        if not dry_run and total_cleaned > 0:
            log_auth_event(
                event_type="token_cleanup_completed",
                email="system",
                request_ip=SYSTEM_IP,
                user_agent="cleanup_command",
                additional_data={
                    'tokens_cleaned': total_cleaned,
                    'token_types': list(cleanup_results.keys()),
                    'execution_time_seconds': execution_time
                }
            )

    def _cleanup_tokens(self, token_model, dry_run, older_than_days, verbose):
        """Clean up tokens for a specific model type."""
        try:
            # Build query for expired tokens
            cutoff_time = timezone.now()
            if older_than_days > 0:
                cutoff_time = timezone.now() - timedelta(days=older_than_days)
                query = token_model.objects.filter(date_created__lt=cutoff_time)
            else:
                query = token_model.objects.filter(date_expires__lte=timezone.now())
            
            # In dry run, we need to count first
            if dry_run:
                found_count = query.count()
                if verbose and found_count > 0:
                    self._show_token_details(token_model, query, found_count)
                return {'found': found_count, 'cleaned': 0}
            
            # For actual deletion, get count from delete operation
            if verbose:
                # Need to count for verbose output before deletion
                found_count = query.count()
                if found_count > 0:
                    self._show_token_details(token_model, query, found_count)
                deleted_count, _ = query.delete()
            else:
                # Single operation: delete and get count
                deleted_count, _ = query.delete()
                found_count = deleted_count
            
            return {'found': found_count, 'cleaned': deleted_count}
            
        except Exception as e:
            logger.error(f"Error cleaning up {token_model.__name__} tokens: {e}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f'Error cleaning {token_model.__name__} tokens: {e}')
            )
            return {'found': 0, 'cleaned': 0}

    def _cleanup_other_tokens(self, dry_run, older_than_days, verbose):
        """Clean up other token types (UnsubscribeToken, SocketToken, DocumentToken)."""
        try:
            from tokens.models import UnsubscribeToken, SocketToken, DocumentToken
        except ImportError as e:
            logger.error(f"Error importing token models: {e}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f'Error importing token models: {e}')
            )
            return {'found': 0, 'cleaned': 0}
        
        total_found = 0
        total_cleaned = 0
        
        try:
            for token_model in [UnsubscribeToken, SocketToken, DocumentToken]:
                cutoff_time = timezone.now()
                if older_than_days > 0:
                    cutoff_time = timezone.now() - timedelta(days=older_than_days)
                    query = token_model.objects.filter(date_created__lt=cutoff_time)
                else:
                    query = token_model.objects.filter(date_expires__lte=timezone.now())
                
                if dry_run:
                    found_count = query.count()
                    total_found += found_count
                    if verbose and found_count > 0:
                        self.stdout.write(f'  {token_model.__name__}: {found_count} tokens')
                else:
                    # Single operation: delete and get count
                    deleted_count, _ = query.delete()
                    total_found += deleted_count
                    total_cleaned += deleted_count
                    if verbose and deleted_count > 0:
                        self.stdout.write(f'  {token_model.__name__}: {deleted_count} tokens deleted')
            
            return {'found': total_found, 'cleaned': total_cleaned}
            
        except Exception as e:
            logger.error(f"Error cleaning up other tokens: {e}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f'Error cleaning up other tokens: {e}')
            )
            return {'found': 0, 'cleaned': 0}

    def _show_token_details(self, token_model, query, count):
        """Show detailed information about tokens to be cleaned."""
        self.stdout.write(f'\n{token_model.__name__} Details:')
        self.stdout.write(f'  Total tokens to clean: {count}')
        
        # Show breakdown by action for authentication tokens
        if hasattr(token_model, 'action'):
            actions = query.values('action').annotate(
                count=models.Count('action')
            ).order_by('action')
            
            for action_data in actions:
                self.stdout.write(f'    {action_data["action"]}: {action_data["count"]} tokens')
        
        # Show age distribution
        now = timezone.now()
        age_ranges = [
            ('< 1 hour', timedelta(hours=1)),
            ('1-24 hours', timedelta(days=1)),
            ('1-7 days', timedelta(days=7)),
            ('> 7 days', None)
        ]
        
        for label, delta in age_ranges:
            if delta:
                if label == '< 1 hour':
                    range_query = query.filter(date_created__gt=now - delta)
                else:
                    prev_delta = age_ranges[age_ranges.index((label, delta)) - 1][1]
                    range_query = query.filter(
                        date_created__lte=now - prev_delta,
                        date_created__gt=now - delta
                    )
            else:
                range_query = query.filter(date_created__lte=now - timedelta(days=7))
            
            range_count = range_query.count()
            if range_count > 0:
                self.stdout.write(f'    {label}: {range_count} tokens')

    def _generate_usage_report(self):
        """Generate detailed token usage report."""
        self.stdout.write(self.style.SUCCESS('\n=== TOKEN USAGE REPORT ==='))
        
        try:
            # Current token counts
            magic_code_total = MagicCodeToken.objects.count()
            magic_code_expired = MagicCodeToken.objects.filter(date_expires__lte=timezone.now()).count()
            magic_code_used = MagicCodeToken.objects.filter(used_at__isnull=False).count()
            magic_code_active = MagicCodeToken.objects.filter(
                date_expires__gt=timezone.now(),
                used_at__isnull=True
            ).count()
            
            self.stdout.write(f'\nMagic Code Tokens:')
            self.stdout.write(f'  Total: {magic_code_total}')
            self.stdout.write(f'  Active: {magic_code_active}')
            self.stdout.write(f'  Used: {magic_code_used}')
            self.stdout.write(f'  Expired: {magic_code_expired}')
            
            # Usage patterns (last 24 hours)
            last_24h = timezone.now() - timedelta(hours=24)
            recent_tokens = MagicCodeToken.objects.filter(date_created__gte=last_24h)
            recent_logins = recent_tokens.filter(action='login').count()
            recent_signups = recent_tokens.filter(action='signup').count()
            
            self.stdout.write(f'\nLast 24 Hours Activity:')
            self.stdout.write(f'  New tokens created: {recent_tokens.count()}')
            self.stdout.write(f'  Login attempts: {recent_logins}')
            self.stdout.write(f'  Signup attempts: {recent_signups}')
            
            # Success rates
            recent_used = recent_tokens.filter(used_at__isnull=False).count()
            success_rate = (recent_used / recent_tokens.count() * 100) if recent_tokens.count() > 0 else 0
            
            self.stdout.write(f'  Success rate: {success_rate:.1f}%')
            
            # Report for other token types (UnsubscribeToken, SocketToken, DocumentToken)
            
        except Exception as e:
            logger.error(f"Error generating usage report: {e}")
            self.stdout.write(self.style.ERROR(f'Error generating report: {e}'))

    def _display_summary(self, cleanup_results, total_cleaned, total_found, dry_run, execution_time):
        """Display cleanup summary."""
        self.stdout.write(self.style.SUCCESS('\n=== CLEANUP SUMMARY ==='))
        
        for token_type, result in cleanup_results.items():
            if result['found'] > 0:
                action = "Would delete" if dry_run else "Deleted"
                self.stdout.write(
                    f'{token_type.replace("_", " ").title()}: {action} {result["cleaned"]} of {result["found"]} tokens'
                )
        
        if total_found == 0:
            self.stdout.write(self.style.SUCCESS('No expired tokens found to clean up'))
        else:
            action = "would be deleted" if dry_run else "deleted"
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nTotal: {total_cleaned} of {total_found} tokens {action}'
                )
            )
        
        self.stdout.write(f'Execution time: {execution_time:.2f} seconds')
        
        if dry_run and total_found > 0:
            self.stdout.write(
                self.style.WARNING(
                    '\nThis was a dry run. Use without --dry-run to actually delete tokens.'
                )
            )