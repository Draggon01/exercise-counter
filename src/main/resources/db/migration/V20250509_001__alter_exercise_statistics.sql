alter table statistic_exercise_data
    drop constraint fk_checks_exercise_exercise_id,
    add constraint fk_checks_exercise_exercise_id foreign key(exercise_id) references exercise(exercise_id) on delete cascade;

alter table checks
    drop constraint fk_checks_exercise_exercise_id,
    add constraint fk_checks_exercise_exercise_id foreign key(exercise_id) references exercise(exercise_id) on delete cascade;