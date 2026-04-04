
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  domain text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on RLS
alter table profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile" 
  on profiles for select 
  using ( auth.uid() = id );

create policy "Users can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );

create policy "Users can insert own profile" 
  on profiles for insert 
  with check ( auth.uid() = id );

-- CALENDAR EVENTS TABLE
create table calendar_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  type text check (type in ('exam', 'study', 'project', 'other')),
  priority text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on RLS
alter table calendar_events enable row level security;

-- Calendar policies
create policy "Users can view own events" 
  on calendar_events for select 
  using ( auth.uid() = user_id );

create policy "Users can create own events" 
  on calendar_events for insert 
  with check ( auth.uid() = user_id );

create policy "Users can update own events" 
  on calendar_events for update 
  using ( auth.uid() = user_id );

create policy "Users can delete own events" 
  on calendar_events for delete 
  using ( auth.uid() = user_id );

-- OPPORTUNITIES TABLE
create table opportunities (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text check (category in ('Hackathon', 'Exam', 'Workshop', 'Competition')),
  scope text check (scope in ('Global', 'National', 'Regional')),
  location text,
  event_date timestamp with time zone,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Turn on RLS
alter table opportunities enable row level security;

-- Opportunities policies
-- Everyone can view opportunities (public), but only admins (service role) can edit. 
-- For now, we'll allow all authenticated users to view.
create policy "Authenticated users can view opportunities" 
  on opportunities for select 
  using ( auth.role() = 'authenticated' );

-- Insert Data for Testing
insert into opportunities (title, category, scope, location, event_date, url) values 
('Google Global Hackathon', 'Hackathon', 'Global', 'Online', now() + interval '1 month', 'https://hackathon.google.com'),
('National Engineering Exam', 'Exam', 'National', 'India', now() + interval '2 months', 'https://exam.india.gov'),
('Coimbatore AI Workshop', 'Workshop', 'Regional', 'Coimbatore', now() + interval '1 week', 'https://workshop.cbe.ai'),
('SpaceX Design Challenge', 'Competition', 'Global', 'Online', now() + interval '3 weeks', 'https://spacex.com/challenge'),
('Local React Meetup', 'Workshop', 'Regional', 'Bangalore', now() + interval '5 days', 'https://meetup.com/react-blr');
