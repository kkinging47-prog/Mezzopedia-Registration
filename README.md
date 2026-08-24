# MEZZOPEDIA Registration Portal

A mobile-friendly web app for **MEZZOPEDIA NATIONAL MATHEMATICS CONTEST 2026**.

Students/adults can search their name, view their user code, contest password, stage, payment status, picture link/photo, edit their name, download a registration card, notify the admin if they have paid, and upload proof of payment.

The portal also has a dedicated **Live Finalists confirmation page**. Finalists search their name, review their school, region, contact and travel information, confirm who will accompany them, correct editable details, and submit a final attendance confirmation using their contest user code.

Admins can log in, manage Students and Adults separately, upload Excel files, manually add/edit/delete records, change payment status, view proof of payment, manage notifications, and upload/change the app logo.

## Main features

- Student/adult name search with multiple matching names
- Contest user code display
- Contest password and stage display
- Google Drive/image picture link support
- Payment status: `paid`, `unpaid`, `pending`
- Downloadable registration card
- Proof of payment upload to Supabase Storage
- Admin notification panel
- Admin dashboard for Students and Adults
- Excel/CSV upload with merge/update or replace mode
- Dedicated Live Finals finalist search and confirmation page
- Live Finals travel origin and accompanying-person details
- User-code verification before finalist details can be changed or confirmed
- Confirmation audit log in Supabase
- Fixed Live Finals reporting dates by class
- Database persistence using Supabase
- Responsive design for Android, iPhone, tablets, and desktop

## Live Finals reporting dates

| Class | Reporting date |
|---|---|
| Primary 5 and Primary 6 | 31 August 2026 |
| JHS 1, JHS 2 and JHS 3 | 1 September 2026 |
| SHS and Adults | 2 September 2026 |

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

### Existing Supabase projects

If your Supabase database already existed before the contest login fields were added, run this file once in **Supabase → SQL Editor**:

```text
supabase/add-contest-login-fields.sql
```

It adds:

```text
password
stage
picture_url
```

### Live Finals confirmation setup

Run this file **once** in the same Supabase project used by the registration portal:

```text
supabase/live-finalists-confirmation.sql
```

It creates:

- `live_finalists` — the operational record for each approved finalist
- `live_finalist_confirmation_log` — an audit snapshot every time details are confirmed
- `search_live_finalists(...)` — finalist name search RPC
- `confirm_live_finalist(...)` — verified update/confirmation RPC
- indexes for name, class, region, date and confirmation status
- the approved final Live Finals list preloaded from the finalized contest data

The finalist records include school, location, region, email, phone, WhatsApp, travel origin, accompanying person, relationship, accompanying-person phone, reporting date and confirmation status. Student accompanying-person fields are prefilled where guardian information was available in the registration files. Missing values can be corrected by the finalist.

The seed is safe to rerun: records already confirmed by finalists are not overwritten by the seed update.

## 2. Add environment variables

Create a local `.env` file for local testing, or add these values directly in **Vercel → Project → Settings → Environment Variables**:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ADMIN_USERNAME=YOUR_PRIVATE_ADMIN_USERNAME
VITE_ADMIN_PASSWORD=YOUR_PRIVATE_ADMIN_PASSWORD
```

You can get the Supabase URL and anon key from **Supabase Dashboard → Project Settings → API**.

Keep your real admin username and password private. Do not commit your live `.env` file to GitHub.

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

After `supabase/live-finalists-confirmation.sql` has been run, redeploy the current `main` branch if Vercel has not automatically deployed the latest GitHub commits.

## Live Finalists user flow

1. From the registration lookup page, select **Live Finalists — Confirm Details**.
2. The finalist sees the three class/date reporting groups.
3. Search for the finalist's name.
4. Select the correct result.
5. Review class, school, school location, region, contact details, travel origin and accompanying-person details.
6. Choose **Edit Details** if anything editable is wrong.
7. Enter the contestant's existing contest user code.
8. Choose **Confirm These Details** or **Save Changes & Confirm**.
9. The database marks the finalist as confirmed and stores an audit snapshot.

Name, class and reporting date are intentionally locked on the public confirmation page. Those should be corrected by Mezzo staff rather than allowing an anonymous public edit.

## Admin login

The admin login details are controlled only through your environment variables:

```env
VITE_ADMIN_USERNAME=YOUR_PRIVATE_ADMIN_USERNAME
VITE_ADMIN_PASSWORD=YOUR_PRIVATE_ADMIN_PASSWORD
```

After changing admin credentials in Vercel, redeploy the project so the new values are included in the live build.

## Excel upload format

The app accepts `.xlsx`, `.xls`, and `.csv`.

For the contest login sheet, use these columns:

| Column | Required | Example |
|---|---:|---|
| name | Yes | Kofi Mensah |
| usercode | Yes | MZP-STU-100001 |
| password | No | abc123 |
| payment_status | No | paid / unpaid / pending |
| stage | No | Stage 1 |
| picture_url or picture | No | Google Drive image link |

The app also accepts older column names such as `full_name`, `unique_code`, `registration_code`, `phone`, `email`, and `category`.

If `usercode`/`unique_code` is blank, the app generates a code automatically. For clean Merge & Update, always keep the same `usercode` for each contestant.

A sample file is included at `sample-data/sample-upload.csv`.

## Important security note

This version uses a simple frontend admin login and Supabase public policies for the older registration-management features so the static web app can work immediately. For a public national contest, upgrade the admin side to Supabase Auth or a protected backend login so only verified administrators can edit or delete records.

The **Live Finalists confirmation system is more restricted**: it uses RLS-protected tables and `SECURITY DEFINER` RPCs, and a finalist must supply the matching contest user code before updates are accepted. Direct anonymous update access to the Live Finals tables is not granted.

Because the public check-registration page displays contest passwords, consider changing that older lookup flow later so students must verify by phone number, user code, or another private field before passwords are shown.
