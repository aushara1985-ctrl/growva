// Prints the SQL that creates one real clinic account. The password is read from the environment and is never printed.
//   CLINIC_NAME="..." CLINIC_EMAIL="..." CLINIC_PASSWORD="..." node scripts/create-clinic-sql.mjs > clinic.sql
//   wrangler d1 execute rafiq-demo --remote --file=clinic.sql      (then delete clinic.sql: it holds the password hash)
import { hashPassword } from '../functions/_lib/auth.js';
const { CLINIC_NAME, CLINIC_EMAIL, CLINIC_PASSWORD } = process.env;
if (!CLINIC_NAME || !CLINIC_EMAIL || !CLINIC_PASSWORD || CLINIC_PASSWORD.length < 12) { console.error('Need CLINIC_NAME, CLINIC_EMAIL and CLINIC_PASSWORD (12+ characters) in the environment.'); process.exit(1); }
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const id = 'c_' + [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 14);
console.log(`INSERT INTO clinics (id,name,email,pass_hash,active,created_ts) VALUES (${q(id)},${q(CLINIC_NAME)},${q(CLINIC_EMAIL.trim().toLowerCase())},${q(await hashPassword(CLINIC_PASSWORD))},1,${Date.now()});`);
