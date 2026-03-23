-- Message Center test data: sent_messages, incoming_emails, activity_log
-- Inserts 0 rows if client_profiles is empty (run seed_test_minimal first for data)
-- Safe to run multiple times (incoming_emails uses ON CONFLICT)

INSERT INTO public.sent_messages (client_id, sender_name, recipient_email, subject, body)
SELECT cp.id, 'Maria Caregiver', 'alice@example.com', 'Welcome to UFCi', 'Hi Alice, welcome to United Family Caregivers. Let me know if you have any questions.'
FROM public.client_profiles cp
WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid
LIMIT 1;

INSERT INTO public.sent_messages (client_id, sender_name, recipient_email, subject, body)
SELECT cp.id, 'Kloudy', 'test_client@ufci-test.local', 'Reminder: Upcoming appointment', 'This is a friendly reminder about your appointment next week. Please confirm.'
FROM public.client_profiles cp
WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid
LIMIT 1;

INSERT INTO public.incoming_emails (message_id, from_email, to_email, subject, body, client_id)
SELECT 'msg-test-incoming-001', 'alice@example.com', 'caregiver@ufci.local', 'Question about services', 'Hi, I had a question about the services you offer. Can someone call me back?', cp.id
FROM public.client_profiles cp
WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid
LIMIT 1
ON CONFLICT (message_id) DO NOTHING;

INSERT INTO public.incoming_emails (message_id, from_email, to_email, subject, body, client_id)
SELECT 'msg-test-incoming-002', 'family@example.com', 'info@ufci.local', 'Re: Mom''s care plan', 'Thank you for the update. We appreciate the detailed care plan.', cp.id
FROM public.client_profiles cp
WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid
LIMIT 1
ON CONFLICT (message_id) DO NOTHING;

INSERT INTO public.activity_log (user_id, client_id, action_type, details)
SELECT 'a1111111-1111-1111-1111-111111111101'::uuid, cp.id, 'note_added', '{"note":"Initial intake call completed"}'::jsonb
FROM public.client_profiles cp
WHERE cp.user_id = 'b2222222-2222-2222-2222-222222222201'::uuid
LIMIT 1;
