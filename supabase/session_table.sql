-- LINE会話セッション（フロー進行状態を保持）
create table line_sessions (
  user_id text primary key,
  state text,
  updated_at timestamptz default now()
);
-- 1時間以上経過したセッションを自動削除（pg_cronが使えない場合は手動で）
-- delete from line_sessions where updated_at < now() - interval '1 hour';
