import { db, screeningPlacesTable, patientsTable, systemUsersTable } from "@workspace/db";

async function main() {
  console.log("Finding current users...");
  const users = await db.select().from(systemUsersTable);
  if (users.length === 0) {
    console.log("No users found in database. Cannot create patients without createdBy user ID.");
    return;
  }
  const creatorId = users[0].id;
  const creatorName = users[0].name;
  console.log(`Using user ${creatorName} (ID: ${creatorId}) as creator.`);

  // Insert screening places
  console.log("Inserting screening places...");
  const places = [
    { name: "Shimoga Eye Clinic", shortCode: "SHM", district: "Shimoga", state: "Karnataka", status: "active" },
    { name: "Coimbatore Hospital", shortCode: "CBE", district: "Coimbatore", state: "Tamil Nadu", status: "active" },
    { name: "Bangalore Center", shortCode: "BLR", district: "Bangalore", state: "Karnataka", status: "active" },
    { name: "Guntur Screening Unit", shortCode: "GNT", district: "Guntur", state: "Andhra Pradesh", status: "active" }
  ];

  for (const place of places) {
    try {
      // Use ON CONFLICT on short_code if unique to avoid duplicates
      await db.insert(screeningPlacesTable).values(place).onConflictDoNothing();
      console.log(`✓ Inserted place ${place.shortCode}`);
    } catch (e: any) {
      console.log(`Place ${place.shortCode} already exists or error:`, e.message);
    }
  }

  // Insert patients
  console.log("Inserting test patients...");
  const patientsData = [
    {
      uniqueId: "SEH/DR/20072026/0001",
      date: "2026-07-20",
      screeningPlaceCode: "SHM",
      serialNumber: 1,
      name: "Ramanathan K",
      age: 58,
      gender: "Male",
      address: "123 Main St, Shimoga",
      phone: "9876543210",
      diabetesDuration: "5 years",
      bloodPressure: "130/85",
      drStatus: "No DR",
      advice: "Routine screening after 1 year",
      imagePath: "/uploads/pt_0001.jpg",
      imageQuality: "Good",
      referralStatus: "Follow-up",
      referToBaseHospital: false,
      createdBy: creatorId
    },
    {
      uniqueId: "PT-2026-0002",
      date: "2026-07-20",
      screeningPlaceCode: "CBE",
      serialNumber: 1,
      name: "Lakshmi Swamy",
      age: 62,
      gender: "Female",
      address: "Vadavalli, Coimbatore",
      phone: "9845612347",
      diabetesDuration: "12 years",
      bloodPressure: "145/90",
      drStatus: "Severe NPDR",
      advice: "Urgent referral to base hospital for laser photocoagulation",
      imagePath: "/uploads/pt_0002.jpg",
      imageQuality: "Good",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId
    },
    {
      uniqueId: "PT-2026-0003",
      date: "2026-07-19",
      screeningPlaceCode: "BLR",
      serialNumber: 1,
      name: "John Doe",
      age: 45,
      gender: "Male",
      address: "Indiranagar, Bangalore",
      phone: "9008811223",
      diabetesDuration: "3 years",
      bloodPressure: "120/80",
      drStatus: "Mild NPDR",
      advice: "Strict glycemic control, check back in 6 months",
      imagePath: "/uploads/pt_0003.jpg",
      imageQuality: "Blur",
      referralStatus: "Follow-up",
      referToBaseHospital: false,
      createdBy: creatorId
    },
    {
      uniqueId: "PT-2026-0004",
      date: "2026-07-19",
      screeningPlaceCode: "GNT",
      serialNumber: 1,
      name: "Koteswara Rao",
      age: 50,
      gender: "Male",
      address: "Broadipet, Guntur",
      phone: "9988776655",
      diabetesDuration: "15 years",
      bloodPressure: "150/95",
      drStatus: "PDR",
      advice: "Proliferative DR detected. Immediate referral for anti-VEGF injection.",
      imagePath: "/uploads/pt_0004.jpg",
      imageQuality: "Good",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId
    },
    {
      uniqueId: "PT-2026-0005",
      date: "2026-07-18",
      screeningPlaceCode: "SHM",
      serialNumber: 2,
      name: "Saraswathi Amma",
      age: 70,
      gender: "Female",
      address: "Gandhi Bazar, Shimoga",
      phone: "9123456789",
      diabetesDuration: "8 years",
      bloodPressure: "135/88",
      drStatus: "Moderate NPDR",
      advice: "Refer to ophthalmologist for detailed fundus exam within 1 month",
      imagePath: "/uploads/pt_0005.jpg",
      imageQuality: "Good",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId
    }
  ];

  for (const patient of patientsData) {
    try {
      await db.insert(patientsTable).values(patient).onConflictDoNothing();
      console.log(`✓ Inserted patient ${patient.name} (${patient.uniqueId})`);
    } catch (e: any) {
      console.log(`Patient ${patient.uniqueId} already exists or error:`, e.message);
    }
  }

  console.log("Done pushing test data!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Failed to push test data:", e);
    process.exit(1);
  });
