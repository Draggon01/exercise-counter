create table show_exercise_for_user
(
    username    varchar(255) not null,
    exercise_id uuid         not null,
    constraint pk_show_exercise_for_user primary key (username, exercise_id),
    constraint fk_show_exercise_for_user_user foreign key (username)
        references db.public.users (username) on delete cascade,
    constraint fk_show_exercise_for_user_exercise foreign key (exercise_id)
        references db.public.exercise (exercise_id) on delete cascade
);