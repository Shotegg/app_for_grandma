insert into contacts (id, name, avatar_url)
values
  (
    'daughter',
    'Κόρη',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80'
  ),
  (
    'grandson',
    'Εγγονός',
    'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=500&q=80'
  )
on conflict (id) do update
set
  name = excluded.name,
  avatar_url = excluded.avatar_url;
