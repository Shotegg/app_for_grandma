update storage.buckets
set allowed_mime_types = array[
  'audio/aac',
  'audio/aiff',
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
  'video/mp4'
]
where id = 'voice';
