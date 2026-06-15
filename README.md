# MEZZOPEDIA Registration Portal

A mobile-friendly web app for **MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026**.

Students/adults can search their name, view their unique registration code and payment status, edit their name, download a registration card, notify the admin if they have paid, and upload proof of payment.

Admins can log in, manage Students and Adults separately, upload Excel files, manually add/edit/delete records, change payment status, view proof of payment, manage notifications, and upload/change the app logo.

## Main features

- Student/adult name search with multiple matching names
- Unique registration code display
- Payment status: `paid`, `unpaid`, `pending`
- Downloadable registration card
- Proof of payment upload to Supabase Storage
- Admin notification panel
- Admin dashboard for Students and Adults
- Excel/CSV upload with merge/update or replace mode
- Database persistence using Supabase
- Responsive design for Android, iPhone, tablets, and desktop

## Tech stack

- React + TypeScript + Vite
- Supabase database and storage
- SheetJS `xlsx` for Excel parsing
- Lucide React icons

## 1. Create your Supabase database

1. Go to your Supabase dashboard and create a project.
2. Open **SQL Editor**.
3. Copy everything from `supabase/schema.sql` and run it.
4. Confirm the following tables were created:
   - `registrants`
   - `admin_notifications`
   - `app_settings`
5. Confirm the Storage bucket `payment-proofs` was created.

The SQL file includes a simple public-policy MVP setup so the app works immediately from a static host. For a high-security production setup, replace the public policies with Supabase Auth and admin roles.

## 2. Add environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=admin123
```

You can get the Supabase URL and anon key from **Supabase Dashboard → Project Settings → API**.

## 3. Run locally

```bash
npm install
npm run dev
```

Open the URL shown in your terminal, normally:

```text
http://localhost:5173
```

## 4. Build for production

```bash
npm run build
```

The production files will be created in the `dist` folder.

## 5. Deploy to Vercel

1. Upload/push this folder to GitHub.
2. Import the GitHub project into Vercel.
3. In Vercel, add the same environment variables from `.env`.
4. Deploy.

## Admin login

Default admin login:

```text
Username: admin
Password: admin123
```

You can change these in `.env` or in your Vercel environment variables.

## Excel upload format

The app accepts `.xlsx`, `.xls`, and `.csv`. Use these column names:

| Column | Required | Example |
|---|---:|---|
| full_name or name | Yes | Kofi Mensah |
| phone | No | 0240000000 |
| email | No | kofi@example.com |
| payment_status | No | paid / unpaid / pending |
| unique_code | No | MZP-STU-100001 |
| category | No | student / adult |

If `unique_code` is blank, the app generates a code automatically.

A sample file is included at `sample-data/sample-upload.csv`.

## Important security note

This version keeps the same simple admin login you requested (`admin` / `admin123`) and uses Supabase public policies so the static web app can work immediately. This is fine for an MVP or controlled launch, but for a public national contest, you should later upgrade the admin side to real Supabase Auth so only verified admins can edit or delete data.
