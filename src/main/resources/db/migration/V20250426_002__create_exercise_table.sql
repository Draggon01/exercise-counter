create table exercise
(
    exercise_Id    uuid
        constraint exercisePrimaryKey primary key not null,
    exercise_Title varchar(64)                     not null
)