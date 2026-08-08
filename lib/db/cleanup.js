import pg from "pg";
const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  let client;
  try {
    client = new Client({ connectionString });
    await client.connect();
  } catch (err) {
    if (err.code === "3D000" || err.message?.includes("does not exist")) {
      console.log(`Target database does not exist yet. Attempting automatic creation...`);
      try {
        const urlObj = new URL(connectionString);
        const dbName = urlObj.pathname.slice(1);
        urlObj.pathname = "/postgres";
        const rootClient = new Client({ connectionString: urlObj.toString() });
        await rootClient.connect();
        await rootClient.query(`CREATE DATABASE "${dbName}";`);
        await rootClient.end();
        console.log(`Database "${dbName}" created successfully!`);
        
        client = new Client({ connectionString });
        await client.connect();
      } catch (createErr) {
        console.error("Could not auto-create database:", createErr.message);
        return;
      }
    } else {
      console.error("Database connection error:", err.message);
      return;
    }
  }

  try {
    console.log("Starting pre-migration database cleanup...");

    // 1. Check if system_users and active_sessions tables exist
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'active_sessions'
      ) AND EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_users'
      ) as exists;
    `);

    if (tableCheck.rows[0].exists) {
      // Clean up orphaned active_sessions rows
      const orphanCountRes = await client.query(`
        SELECT COUNT(*) FROM active_sessions 
        WHERE user_id NOT IN (SELECT id FROM system_users);
      `);
      const orphanCount = parseInt(orphanCountRes.rows[0].count, 10);
      
      if (orphanCount > 0) {
        console.log(`Found ${orphanCount} orphaned session records. Cleaning up...`);
        await client.query(`
          DELETE FROM active_sessions 
          WHERE user_id NOT IN (SELECT id FROM system_users);
        `);
        console.log("Orphaned active_sessions cleaned successfully.");
      } else {
        console.log("No orphaned active_sessions found.");
      }
    } else {
      console.log("active_sessions or system_users tables do not exist yet. Skipping session cleanup.");
    }

    // 2. Check if patients table exists and clean up duplicate unique_id values
    const patientTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'patients'
      ) as exists;
    `);

    if (patientTableCheck.rows[0].exists) {
      const duplicatesRes = await client.query(`
        SELECT unique_id, COUNT(*) 
        FROM patients 
        GROUP BY unique_id 
        HAVING COUNT(*) > 1;
      `);

      if (duplicatesRes.rows.length > 0) {
        console.log(`Found ${duplicatesRes.rows.length} duplicate patient unique_id keys. Resolving duplicates...`);
        
        for (const row of duplicatesRes.rows) {
          const uniqueId = row.unique_id;
          if (!uniqueId) continue;
          
          // Get all patients with this uniqueId ordered by id (keep the first one, modify the rest)
          const patientsListRes = await client.query(`
            SELECT id FROM patients 
            WHERE unique_id = $1 
            ORDER BY id ASC;
          `, [uniqueId]);
          
          // Keep index 0, modify the rest
          for (let i = 1; i < patientsListRes.rows.length; i++) {
            const patientId = patientsListRes.rows[i].id;
            const newUniqueId = `${uniqueId}-dup-${patientId}`;
            console.log(`Resolving duplicate: patient ID ${patientId} unique_id ${uniqueId} -> ${newUniqueId}`);
            
            await client.query(`
              UPDATE patients 
              SET unique_id = $1 
              WHERE id = $2;
            `, [newUniqueId, patientId]);
          }
        }
        console.log("Duplicate patient unique_ids resolved successfully.");
      } else {
        console.log("No duplicate patient unique_ids found.");
      }

    // 3. Drop legacy non-DR conference tables if present
    const legacyTables = [
      'participants', 'assignments', 'uploaded_files', 'food_logs', 
      'food_sessions', 'attendance_logs', 'goodies_logs', 'rsvp', 
      'personal_details', 'submission_settings'
    ];
    for (const tableName of legacyTables) {
      await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    }
    console.log("Legacy conference application tables cleaned up.");

    // 4. Update existing patient registration / Visit IDs to standard SEH/DR/DDMMYYYY/SerialNumber format
    if (patientTableCheck.rows[0].exists) {
      const nonStandardPatientsRes = await client.query(`
        SELECT id, unique_id, date, serial_number FROM patients 
        WHERE unique_id NOT LIKE 'SEH/DR/%';
      `);

      if (nonStandardPatientsRes.rows.length > 0) {
        console.log(`Updating ${nonStandardPatientsRes.rows.length} existing patient records to SEH/DR/DDMMYYYY/SerialNumber format...`);
        for (const p of nonStandardPatientsRes.rows) {
          const dateStr = p.date || new Date().toISOString().split('T')[0];
          const [yyyy, mm, dd] = dateStr.split('-');
          const ddmmyyyy = `${dd || '25'}${mm || '07'}${yyyy || '2026'}`;
          const padSerial = String(p.serial_number || p.id).padStart(4, '0');
          const formattedId = `SEH/DR/${ddmmyyyy}/${padSerial}`;
          
          await client.query(`
            UPDATE patients SET unique_id = $1 WHERE id = $2;
          `, [formattedId, p.id]);
        }
        console.log("All existing patient Visit IDs updated to SEH/DR/DDMMYYYY/SerialNumber standard.");
      }
    }

    // 6. Ensure vc_referrals table has both address and village columns
    const vcRefCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vc_referrals') as exists;
    `);
    if (vcRefCheck.rows[0].exists) {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vc_referrals' AND column_name = 'address') THEN
            ALTER TABLE vc_referrals ADD COLUMN address text;
          END IF;
          IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'vc_referrals' AND column_name = 'village') THEN
            ALTER TABLE vc_referrals ADD COLUMN village text;
          END IF;
          UPDATE vc_referrals SET address = village WHERE address IS NULL AND village IS NOT NULL;
          UPDATE vc_referrals SET village = address WHERE village IS NULL AND address IS NOT NULL;
        END $$;
      `);
      console.log("vc_referrals address and village columns verified & synchronized.");
    }
  } else {
    console.log("patients table does not exist yet. Skipping patient cleanup.");
  }

    console.log("Pre-migration database cleanup completed successfully.");
  } catch (error) {
    console.error("Error during pre-migration cleanup:", error);
    // Don't crash migration process if tables don't exist yet (first-time setup)
  } finally {
    await client.end();
  }
}

run();
