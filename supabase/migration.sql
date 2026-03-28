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

-- Rent Payments
create table if not exists rent_payments (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  property_id uuid references properties(id) on delete cascade,
  amount numeric(10,2) not null,
  due_date date not null,
  paid_date date,
  status text default 'unpaid' check (status in ('unpaid', 'paid', 'late')),
  late_fee numeric(10,2) default 0,
  notes text,
  created_at timestamptz default now()
);

alter table rent_payments enable row level security;
create policy "Rent payments via property" on rent_payments for all using (exists (select 1 from properties where properties.id = rent_payments.property_id and properties.user_id = auth.uid()));

-- Rental Applications (public, no RLS restriction on insert)
create table if not exists rental_applications (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references units(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'approved', 'denied', 'withdrawn')),
  -- Applicant info
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  -- Current housing
  current_address text,
  current_landlord text,
  current_landlord_phone text,
  monthly_rent_current numeric(10,2),
  reason_for_moving text,
  -- Employment
  employer text,
  job_title text,
  monthly_income numeric(10,2),
  employment_start_date date,
  -- References
  ref1_name text,
  ref1_phone text,
  ref1_relationship text,
  ref2_name text,
  ref2_phone text,
  ref2_relationship text,
  -- Additional
  pets boolean default false,
  pet_description text,
  vehicles int default 0,
  occupants int default 1,
  move_in_date date,
  notes text,
  -- Metadata
  ip_address text,
  created_at timestamptz default now()
);

-- Late fees (add columns to existing rent_payments if already created without them)
alter table rent_payments add column if not exists late_fee numeric(10,2) default 0;
alter table rent_payments add column if not exists notes text;

-- Auth user link for tenants (portal login)
alter table tenants add column if not exists auth_user_id uuid references auth.users(id);

-- Portal Messages (tenant <-> landlord chat)
create table if not exists portal_messages (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  sender text not null check (sender in ('tenant', 'landlord')),
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table portal_messages enable row level security;

-- Tenant can read their own messages
create policy "Tenant reads own portal messages" on portal_messages for select using (
  exists (select 1 from tenants where tenants.id = portal_messages.tenant_id and tenants.auth_user_id = auth.uid())
  or exists (
    select 1 from tenants t join properties p on p.id = t.property_id
    where t.id = portal_messages.tenant_id and p.user_id = auth.uid()
  )
);

-- Tenant can insert their own messages
create policy "Tenant sends portal messages" on portal_messages for insert with check (
  sender = 'tenant' and
  exists (select 1 from tenants where tenants.id = portal_messages.tenant_id and tenants.auth_user_id = auth.uid())
);

-- Landlord can insert messages to their tenants
create policy "Landlord sends portal messages" on portal_messages for insert with check (
  sender = 'landlord' and
  exists (
    select 1 from tenants t join properties p on p.id = t.property_id
    where t.id = portal_messages.tenant_id and p.user_id = auth.uid()
  )
);

-- Mark messages as read
create policy "Mark portal messages read" on portal_messages for update using (
  exists (select 1 from tenants where tenants.id = portal_messages.tenant_id and tenants.auth_user_id = auth.uid())
  or exists (
    select 1 from tenants t join properties p on p.id = t.property_id
    where t.id = portal_messages.tenant_id and p.user_id = auth.uid()
  )
);

-- Documents (landlord uploads, tenant downloads)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  name text not null,
  category text default 'other',
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Landlord manages documents" on documents for all using (
  exists (select 1 from properties where properties.id = documents.property_id and properties.user_id = auth.uid())
);

create policy "Tenant views own documents" on documents for select using (
  exists (
    select 1 from tenants
    where tenants.id = documents.tenant_id and tenants.auth_user_id = auth.uid()
  )
);

-- Enable RLS for applications (allow public insert)
alter table rental_applications enable row level security;
create policy "Public can submit applications" on rental_applications for insert with check (true);
create policy "Owners view applications" on rental_applications for select using (
  exists (select 1 from properties where properties.id = rental_applications.property_id and properties.user_id = auth.uid())
);
create policy "Owners update applications" on rental_applications for update using (
  exists (select 1 from properties where properties.id = rental_applications.property_id and properties.user_id = auth.uid())
);
