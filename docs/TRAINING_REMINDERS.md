# Training Reminder Automation

The `training_reminders` table stores training due dates and sent state. To automate reminders:

1. **Cron job** (daily): Query `training_reminders` where `due_date` is within N days and `sent_dm_at` or `sent_email_at` is null.
2. For each reminder: send DM (LiveKit or in-app reminder), send email, update `sent_dm_at` and `sent_email_at`.
3. Log to `activity_log`: `action_type = 'training_reminder_sent'`, `details = { training_reminder_id, user_id }`.

**Config**: Store rules in `auto_mode_settings` (e.g. `training_due_days_before = 14`, `caregiver_annual_training = true`).
