-- Her sabah 10:00'da (İstanbul) o günün rezervasyon özetini Telegram'a gönderir.
-- 07:00 UTC = 10:00 Europe/Istanbul (UTC+3, yaz saati yok). CRON_SECRET /reminders ile aynıdır.
select cron.schedule('kumo-daily-summary', '0 7 * * *', $job$
  select net.http_post(
    url := 'https://qcvcvbugvbpxyimeonuf.supabase.co/functions/v1/booking/daily',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$job$);
