alter table exercise
    add column creator varchar(255) not null default 'leon',
    add constraint fk_exercise_user_username foreign key (creator) references users(username)


