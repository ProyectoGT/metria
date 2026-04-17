-- Add tipo column to agenda for activity type classification
alter table agenda add column if not exists tipo text not null default 'actividad';
