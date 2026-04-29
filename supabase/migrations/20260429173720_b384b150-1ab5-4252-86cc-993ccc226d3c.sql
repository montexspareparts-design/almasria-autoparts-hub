-- Create 4 Al-Faisal Reporter staff accounts
-- Login: phone@faisal.local with password = phone number

DO $$
DECLARE
  v_users TEXT[][] := ARRAY[
    ARRAY['سارة', '01119392239'],
    ARRAY['اسماء', '01149171710'],
    ARRAY['سامح', '01038398570'],
    ARRAY['ياسمين ناجي', '01013656843']
  ];
  v_row TEXT[];
  v_name TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_user_id UUID;
  v_admin_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get any admin user_id for created_by audit
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;

  FOREACH v_row SLICE 1 IN ARRAY v_users LOOP
    v_name := v_row[1];
    v_phone := v_row[2];
    v_email := v_phone || '@faisal.local';

    -- Skip if email already exists
    SELECT id INTO v_existing_id FROM auth.users WHERE email = v_email LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      v_user_id := v_existing_id;
      RAISE NOTICE 'User already exists: %', v_email;
    ELSE
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_phone, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', v_name),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        'email',
        v_user_id::text,
        now(), now(), now()
      );

      RAISE NOTICE 'Created new user: % (%)', v_name, v_email;
    END IF;

    -- Ensure profile exists with name + phone
    INSERT INTO public.profiles (user_id, full_name, phone, email)
    VALUES (v_user_id, v_name, v_phone, v_email)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email;

    -- Grant reporter role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'reporter')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Save password to staff_passwords vault for admin retrieval
    INSERT INTO public.staff_passwords (staff_user_id, initial_password, created_by)
    VALUES (v_user_id, v_phone, v_admin_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;