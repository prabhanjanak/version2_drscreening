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

  // Define real PHC locations in Shimoga and nearby districts
  console.log("Defining PHC locations...");
  const phcs = [
    {
      name: "Kumsi Primary Health Centre",
      shortCode: "PHC_KUMSI",
      district: "Shivamogga",
      state: "Karnataka",
      taluk: "Shivamogga",
      pincode: "577222",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "14.0538",
      longitude: "75.4023",
      status: "active"
    },
    {
      name: "Gajanur Primary Health Centre",
      shortCode: "PHC_GAJANUR",
      district: "Shivamogga",
      state: "Karnataka",
      taluk: "Shivamogga",
      pincode: "577220",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "13.8647",
      longitude: "75.5015",
      status: "active"
    },
    {
      name: "Harnahalli Primary Health Centre",
      shortCode: "PHC_HARNAHALLI",
      district: "Shivamogga",
      state: "Karnataka",
      taluk: "Shivamogga",
      pincode: "577224",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "14.0045",
      longitude: "75.6450",
      status: "active"
    },
    {
      name: "Aldur Primary Health Centre",
      shortCode: "PHC_ALDUR",
      district: "Chikkamagaluru",
      state: "Karnataka",
      taluk: "Chikkamagaluru",
      pincode: "577111",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "13.2505",
      longitude: "75.6265",
      status: "active"
    },
    {
      name: "Mayakonda Primary Health Centre",
      shortCode: "PHC_MAYAKONDA",
      district: "Davanagere",
      state: "Karnataka",
      taluk: "Davanagere",
      pincode: "577534",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "14.2818",
      longitude: "76.0125",
      status: "active"
    },
    {
      name: "Anavatti Primary Health Centre",
      shortCode: "PHC_ANAVATTI",
      district: "Shivamogga",
      state: "Karnataka",
      taluk: "Soraba",
      pincode: "577413",
      sankaraUnit: "Sankara Eye Hospital Shimoga",
      latitude: "14.4501",
      longitude: "75.1432",
      status: "active"
    }
  ];

  console.log("Inserting PHC locations...");
  for (const phc of phcs) {
    try {
      await db.insert(screeningPlacesTable).values(phc).onConflictDoNothing();
      console.log(`✓ Inserted PHC: ${phc.name} (${phc.shortCode})`);
    } catch (e: any) {
      console.log(`Error inserting ${phc.shortCode}:`, e.message);
    }
  }

  // Generate mock patients with realistic data for these PHCs
  console.log("Inserting patient screening records...");
  const patientsData = [
    {
      uniqueId: "PT-SHM-0001",
      date: "2026-07-21",
      screeningPlaceCode: "PHC_KUMSI",
      serialNumber: 1,
      name: "Basavarajappa H S",
      age: 63,
      gender: "Male",
      address: "Kumsi Village, Shivamogga",
      phone: "9448332110",
      diabetesDuration: "8 years",
      bloodPressure: "130/85",
      drStatus: "Mild NPDR",
      advice: "6 Month Review",
      imagePath: "/uploads/pt_kumsi_1.jpg",
      imageQuality: "Good",
      referralStatus: "Follow-up",
      referToBaseHospital: false,
      createdBy: creatorId,
      latitude: "14.0541",
      longitude: "75.4025"
    },
    {
      uniqueId: "PT-SHM-0002",
      date: "2026-07-21",
      screeningPlaceCode: "PHC_GAJANUR",
      serialNumber: 1,
      name: "Gowramma Patil",
      age: 57,
      gender: "Female",
      address: "Gajanur Dam Road, Shivamogga",
      phone: "9880123456",
      diabetesDuration: "14 years",
      bloodPressure: "155/95",
      drStatus: "Severe NPDR",
      advice: "Refer to Sankara Base Hospital",
      imagePath: "/uploads/pt_gajanur_1.jpg",
      imageQuality: "Good",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId,
      latitude: "13.8650",
      longitude: "75.5019"
    },
    {
      uniqueId: "PT-SHM-0003",
      date: "2026-07-21",
      screeningPlaceCode: "PHC_HARNAHALLI",
      serialNumber: 1,
      name: "Ningappa Gowda",
      age: 69,
      gender: "Male",
      address: "Harnahalli Cross, Shivamogga",
      phone: "9900887711",
      diabetesDuration: "5 years",
      bloodPressure: "120/80",
      drStatus: "No DR",
      advice: "Annual Review",
      imagePath: "/uploads/pt_harnahalli_1.jpg",
      imageQuality: "Good",
      referralStatus: "Follow-up",
      referToBaseHospital: false,
      createdBy: creatorId,
      latitude: "14.0048",
      longitude: "75.6453"
    },
    {
      uniqueId: "PT-SHM-0004",
      date: "2026-07-21",
      screeningPlaceCode: "PHC_ALDUR",
      serialNumber: 1,
      name: "Yashodha Bai",
      age: 51,
      gender: "Female",
      address: "Aldur Main Bazaar, Chikkamagaluru",
      phone: "9611223344",
      diabetesDuration: "10 years",
      bloodPressure: "140/90",
      drStatus: "Moderate NPDR",
      advice: "3 Month Review",
      imagePath: "/uploads/pt_aldur_1.jpg",
      imageQuality: "Blur",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId,
      latitude: "13.2509",
      longitude: "75.6269"
    },
    {
      uniqueId: "PT-SHM-0005",
      date: "2026-07-21",
      screeningPlaceCode: "PHC_MAYAKONDA",
      serialNumber: 1,
      name: "Siddalingappa M",
      age: 72,
      gender: "Male",
      address: "Mayakonda Hobli, Davanagere",
      phone: "8899001122",
      diabetesDuration: "20 years",
      bloodPressure: "160/100",
      drStatus: "PDR",
      advice: "Refer to Sankara Base Hospital",
      imagePath: "/uploads/pt_mayakonda_1.jpg",
      imageQuality: "Good",
      referralStatus: "Referred",
      referToBaseHospital: true,
      createdBy: creatorId,
      latitude: "14.2821",
      longitude: "76.0128"
    },
    {
      uniqueId: "PT-SHM-0006",
      date: "2026-07-20",
      screeningPlaceCode: "PHC_KUMSI",
      serialNumber: 2,
      name: "Parvathamma S",
      age: 48,
      gender: "Female",
      address: "Kumsi Near bus stand, Shivamogga",
      phone: "9731122334",
      diabetesDuration: "2 years",
      bloodPressure: "115/75",
      drStatus: "No DR",
      advice: "Annual Review",
      imagePath: "/uploads/pt_kumsi_2.jpg",
      imageQuality: "Good",
      referralStatus: "Follow-up",
      referToBaseHospital: false,
      createdBy: creatorId,
      latitude: "14.0535",
      longitude: "75.4020"
    }
  ];

  for (const patient of patientsData) {
    try {
      await db.insert(patientsTable).values(patient).onConflictDoNothing();
      console.log(`✓ Inserted patient record: ${patient.name} (${patient.uniqueId})`);
    } catch (e: any) {
      console.log(`Error inserting patient ${patient.uniqueId}:`, e.message);
    }
  }

  console.log("Successfully pushed PHC locations and patient records!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Failed to push PHC data:", e);
    process.exit(1);
  });
