-- Convert KARAM (sales.team@almasriaautoparts.com) from moderator to reporter (Al-Faisal staff)
DELETE FROM public.user_roles
WHERE user_id = 'e16c7ad9-c78b-4f65-a951-813d7ddd177b'
  AND role = 'moderator';

INSERT INTO public.user_roles (user_id, role)
VALUES ('e16c7ad9-c78b-4f65-a951-813d7ddd177b', 'reporter')
ON CONFLICT (user_id, role) DO NOTHING;