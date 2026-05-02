
-- Function: send morning restock summary to all staff
CREATE OR REPLACE FUNCTION public.send_morning_restock_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int := 0;
  v_hot int := 0;
  v_inserted int := 0;
  v_title text;
  v_message text;
BEGIN
  -- count restocked items in last 24h using the existing RPC logic
  SELECT count(*), count(*) FILTER (WHERE had_shortage_request)
  INTO v_total, v_hot
  FROM public.get_restocked_items(1);

  -- skip if nothing to report
  IF v_total = 0 THEN
    RETURN jsonb_build_object('sent', 0, 'reason', 'no_restocks');
  END IF;

  v_title := '🎉 وصل امبارح: ' || v_total || ' صنف';
  v_message := CASE
    WHEN v_hot > 0 THEN
      'فيه ' || v_total || ' صنف رصيدهم زاد امبارح، منهم 🔥 ' || v_hot ||
      ' كان عميل بيسأل عليهم. اضغط لمراجعة الفرص.'
    ELSE
      'فيه ' || v_total || ' صنف رصيدهم زاد امبارح. اضغط لمراجعة القائمة.'
  END;

  -- insert one notification per staff (admin / moderator / reporter)
  INSERT INTO public.notifications (user_id, title, message, type, is_read)
  SELECT DISTINCT ur.user_id,
         v_title,
         v_message || ' /staff/restocked',
         'restock_morning',
         false
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','moderator','reporter');

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'sent', v_inserted,
    'total_items', v_total,
    'hot_items', v_hot
  );
END;
$$;
