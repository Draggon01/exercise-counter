
-- create database entries for start and interval time for exercise refresh.
alter table exercise
    add column start_time time with time zone not null default '00:00:00+01:00',
    add column days_repeat integer not null default 1;

-- create a table where the checks are stored, while the scheduler does not clean it up, the check persists

create table checks(
    exercise_id uuid not null,
    username varchar(255) not null,
    constraint fk_checks_exercise_exercise_id foreign key(exercise_id) references exercise(exercise_id),
    constraint fk_username_users_username foreign key (username) references users(username),
    constraint pk_checks primary key (exercise_id, username)
);

create index checks_idx on checks(exercise_id, username);

-- create table where finished actions are stored,

create table statistic_exercise_data(
    exercise_id uuid not null,
    statistic json,
    constraint fk_checks_exercise_exercise_id foreign key(exercise_id) references exercise(exercise_id),
    constraint pk_statistic_exercise_data primary key (exercise_id)
)

