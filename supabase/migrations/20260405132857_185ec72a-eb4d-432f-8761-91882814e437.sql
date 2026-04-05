UPDATE erp_config SET value = 'https://api.alfaysalerp.com', updated_at = now() WHERE key = 'erp_base_url';
UPDATE erp_config SET value = 'live', updated_at = now() WHERE key = 'erp_mode';