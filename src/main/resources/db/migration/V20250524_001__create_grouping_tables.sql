create table groups
(
    group_Id   uuid
        constraint pk_group primary key not null,
    group_name varchar(256)             not null
);

create table user_group_mapping
(
    username   varchar(64) not null,
    group_id   uuid        not null,
    is_invited boolean, --used to check if this is only an invitation or already assigned group
    Constraint pk_user_group_mapping primary key (username, group_id),
    CONSTRAINT fk_user_group_mapping_username FOREIGN KEY (username)
        REFERENCES users (username) ON DELETE CASCADE,
    CONSTRAINT fk_user_group_mapping_group FOREIGN KEY (group_id)
        REFERENCES groups (group_id) ON DELETE CASCADE

);

create table exercise_group_mapping
(
    exercise_id uuid not null,
    group_id    uuid not null,
    CONSTRAINT pk_exercise_group_mapping PRIMARY KEY (exercise_id, group_id),
    CONSTRAINT fk_exercise_group_mapping_exercise FOREIGN KEY (exercise_id)
        REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    CONSTRAINT fk_exercise_group_mapping_group FOREIGN KEY (group_id)
        REFERENCES groups (group_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_group_mapping_group_id ON user_group_mapping (group_id);
CREATE INDEX idx_exercise_group_mapping_group_id ON exercise_group_mapping (group_id);
CREATE INDEX idx_exercise_group_mapping_exercise_id ON exercise_group_mapping (exercise_id);

alter table exercise
    add column visibility varchar(256) not null default 'PRIVATE'; -- should be PRIVATE|PUBLIC|GROUPS

alter table users
    add column issuer varchar(256); --store issuer of the link which allows to create a new account no fk because users should be deletable but reference should still stay

create table register_link
(
    register_link_id uuid not null,
    creator_username          varchar(64) not null,
    CONSTRAINT pk_register_link primary key (register_link_id),
    CONSTRAINT fk_creator_user_username foreign key (creator_username) references users (username)
);


