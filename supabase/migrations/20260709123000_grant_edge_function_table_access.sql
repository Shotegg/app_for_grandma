revoke all on table public.contacts from anon, authenticated;
revoke all on table public.contact_channels from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.read_state from anon, authenticated;

grant select, insert, update, delete on table public.contacts to service_role;
grant select, insert, update, delete on table public.contact_channels to service_role;
grant select, insert, update, delete on table public.messages to service_role;
grant select, insert, update, delete on table public.read_state to service_role;
