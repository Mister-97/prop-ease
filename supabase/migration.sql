-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Properties
create table if not exists properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  city text,
  state text,
  zip text,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

-- Units
create table if not exists units (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  unit_number text not null,
  bedrooms int default 1,
  bathrooms numeric(3,1) default 1,
  square_feet int,
  rent_amount numeric(10,2) default 0,
  is_occupied boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Tenants
create table if not exists tenants (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references units(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  lease_start date,
  lease_end date,
  created_at timestamptz default now()
);

-- Maintenance requests
create table if not exists maintenance_requests (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references units(id) on delete set null,
  property_id uuid references properties(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open' check (status in ('open', 'in_progress', 'completed')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  category text,
  photo_url text,
  vendor_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vendors / Contractors
create table if not exists vendors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  trade text default 'other',
  phone text,
  email text,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  unit_id uuid references units(id),
  amount numeric(10,2) not null,
  description text not null,
  category text default 'other',
  date date default current_date,
  receipt_url text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table maintenance_requests enable row level security;
alter table vendors enable row level security;
alter table expenses enable row level security;

-- RLS Policies
create policy "Users manage own properties" on properties for all using (auth.uid() = user_id);
create policy "Units via property" on units for all using (exists (select 1 from properties where properties.id = units.property_id and properties.user_id = auth.uid()));
create policy "Tenants via unit" on tenants for all using (exists (select 1 from properties where properties.id = tenants.property_id and properties.user_id = auth.uid()));
create policy "Maintenance via property" on maintenance_requests for all using (exists (select 1 from properties where properties.id = maintenance_requests.property_id and properties.user_id = auth.uid()));
create policy "Users manage own vendors" on vendors for all using (auth.uid() = user_id);
create policy "Expenses via property" on expenses for all using (exists (select 1 from properties where properties.id = expenses.property_id and properties.user_id = auth.uid()));
