Create Table register(
    register_id uuid not null,
    issuer varchar(255) not null,
    primary key (register_id),
    foreign key (issuer) references users(username) on delete cascade
);

drop table if exists register_link;