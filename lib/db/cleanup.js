import pg from "pg";
const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

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

      // 3. Ensure the unique constraint patients_unique_id_unique exists on patients.unique_id
      const constraintCheck = await client.query(`
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'patients_unique_id_unique';
      `);

      if (constraintCheck.rows.length === 0) {
        console.log("Unique constraint 'patients_unique_id_unique' not found on 'patients' table. Adding it manually...");
        await client.query(`
          ALTER TABLE patients ADD CONSTRAINT patients_unique_id_unique UNIQUE (unique_id);
        `);
        console.log("Unique constraint 'patients_unique_id_unique' added successfully.");
      } else {
        console.log("Unique constraint 'patients_unique_id_unique' already exists on 'patients' table.");
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
