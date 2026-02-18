--table that holds streak for specific exercise / updated automatically on day complete.
create table exercise_streak
(
    exercise_id uuid,
    username    varchar(255),
    streak      int,
    primary key (exercise_id, username),
    constraint fk_exerciseStreak_exercises_exercise_id foreign key (exercise_id) references db.public.exercise (exercise_id),
    constraint fk_exerciseStreak_users_username foreign key (username) references users (username)
);

--table that holds streak for user if he completed all listed exercises
create table complete_streak
(
    username varchar(255),
    streak   int,
    primary key (username),
    constraint fk_completeStreak_users_username foreign key (username) references users (username)
);