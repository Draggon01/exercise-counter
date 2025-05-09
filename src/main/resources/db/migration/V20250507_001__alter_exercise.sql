alter table exercise
    drop column start_time;

alter table exercise
    add column start_time TIME Not NULL default '00:00:00',
    add column utc_offset integer not null default 0