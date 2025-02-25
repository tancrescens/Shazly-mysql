create database crm;

use crm;

create table parents (
   parent_id int unsigned auto_increment primary key,
   surname varchar(50) not null,
   proper_name varchar(50) not null
);

ALTER TABLE parents;
MODIFY COLUMN surename last_name null;


--  children table
    --  first_name
    --  last_name
    --  id prikey auto_increment