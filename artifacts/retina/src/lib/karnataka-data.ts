/**
 * Complete and official dataset of all 31 Districts of Karnataka and their respective Taluks.
 * Used for Campsite registry, screening intake, filters, and reports.
 */

export interface KarnatakaDistrictData {
  district: string;
  taluks: string[];
}

export const KARNATAKA_DISTRICTS_DATA: KarnatakaDistrictData[] = [
  {
    district: "Bagalkote",
    taluks: ["Bagalkote", "Badami", "Bilagi", "Guledgudda", "Hungund", "Ilkal", "Jamkhandi", "Mudhol", "Rabkavi Banhatti"]
  },
  {
    district: "Ballari (Bellary)",
    taluks: ["Ballari", "Kampli", "Kurugodu", "Sanduru", "Siruguppa"]
  },
  {
    district: "Belagavi (Belgaum)",
    taluks: [
      "Belagavi", "Athani", "Bailhongal", "Chikkodi", "Gokak", "Hukkeri", "Kagawad", 
      "Khanapur", "Kittur", "Mudalagi", "Nippani", "Raibag", "Ramdurg", "Saundatti (Yaragatti)"
    ]
  },
  {
    district: "Bengaluru Rural",
    taluks: ["Devanahalli", "Doddaballapura", "Hosakote", "Nelamangala"]
  },
  {
    district: "Bengaluru Urban",
    taluks: ["Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal", "Yelahanka"]
  },
  {
    district: "Bidar",
    taluks: ["Bidar", "Aurad", "Basavakalyan", "Bhalki", "Homnabad", "Hulsoor", "Kamalnagar"]
  },
  {
    district: "Chamarajanagar",
    taluks: ["Chamarajanagar", "Gundlupete", "Hanur", "Kollegala", "Yelanduru"]
  },
  {
    district: "Chikkaballapura",
    taluks: ["Chikkaballapura", "Bagepalli", "Chelur", "Chintamani", "Gauribidanur", "Gudibanda", "Sidlaghatta"]
  },
  {
    district: "Chikkamagaluru",
    taluks: ["Chikkamagaluru", "Ajjampura", "Kadur", "Kalasa", "Koppa", "Mudigere", "Narasimharajapura", "Sringeri", "Tarikere"]
  },
  {
    district: "Chitradurga",
    taluks: ["Chitradurga", "Challakere", "Hiriyur", "Holalkere", "Hosadurga", "Molakalmuru"]
  },
  {
    district: "Dakshina Kannada",
    taluks: ["Mangaluru", "Bantwal", "Beltangadi", "Kadaba", "Moodabidri", "Puttur", "Sullia"]
  },
  {
    district: "Davanagere",
    taluks: ["Davanagere", "Channagiri", "Harihara", "Honnali", "Jagalur", "Nyamathi"]
  },
  {
    district: "Dharwad",
    taluks: ["Dharwad", "Alnavar", "Annigeri", "Hubballi (Rural)", "Hubballi (Urban)", "Kalghatgi", "Kundgol", "Navalgund"]
  },
  {
    district: "Gadag",
    taluks: ["Gadag", "Gajendragad", "Lakshmeshwar", "Mundargi", "Nargund", "Ron", "Shirahatti"]
  },
  {
    district: "Hassan",
    taluks: ["Hassan", "Alur", "Arkalgud", "Arsikere", "Belur", "Channarayapatna", "Holenarasipura", "Sakleshpur"]
  },
  {
    district: "Haveri",
    taluks: ["Haveri", "Byadgi", "Hangal", "Hirekerur", "Ranebennur", "Rattihalli", "Savanur", "Shiggaon"]
  },
  {
    district: "Kalaburagi (Gulbarga)",
    taluks: ["Kalaburagi", "Afzalpur", "Aland", "Chincholi", "Chitapur", "Jevargi", "Kalgi", "Kamalapur", "Sedam", "Shahabad", "Yadrav"]
  },
  {
    district: "Kodagu (Coorg)",
    taluks: ["Madikeri", "Kushalnagar", "Ponnampet", "Somwarpet", "Virajpet"]
  },
  {
    district: "Kolar",
    taluks: ["Kolar", "Bangarapet", "KGF (Robertsonpet)", "Malur", "Mulbagal", "Srinivaspur"]
  },
  {
    district: "Koppal",
    taluks: ["Koppal", "Gangavathi", "Kanakagiri", "Karatagi", "Kukanoor", "Kushtagi", "Yelburga"]
  },
  {
    district: "Mandya",
    taluks: ["Mandya", "Krishnarajpete", "Maddur", "Malavalli", "Nagamangala", "Pandavapura", "Srirangapatna"]
  },
  {
    district: "Mysuru (Mysore)",
    taluks: ["Mysuru", "Heggadadevankote", "Hunsur", "Krishnarajanagara", "Nanjangud", "Piriyapatna", "Saligrama", "Saragur", "T. Narasipura"]
  },
  {
    district: "Raichur",
    taluks: ["Raichur", "Devadurga", "Lingsugur", "Manvi", "Maski", "Sindhanur", "Sirwar"]
  },
  {
    district: "Ramanagara",
    taluks: ["Ramanagara", "Channapatna", "Harohalli", "Kanakapura", "Magadi"]
  },
  {
    district: "Shivamogga (Shimoga)",
    taluks: ["Shivamogga", "Bhadravathi", "Hosanagara", "Sagar", "Shikaripura", "Soraba", "Thirthahalli"]
  },
  {
    district: "Tumakuru (Tumkur)",
    taluks: ["Tumakuru", "Chiknayakanhalli", "Gubbi", "Koratagere", "Kunigal", "Madhugiri", "Pavagada", "Sira", "Tiptur", "Turuvekere"]
  },
  {
    district: "Udupi",
    taluks: ["Udupi", "Brahmavara", "Byndoor", "Hebri", "Karkala", "Kaup", "Kundapura"]
  },
  {
    district: "Uttara Kannada (Karwar)",
    taluks: ["Karwar", "Ankola", "Bhatkal", "Dandeli", "Haliyal", "Honnavar", "Joida", "Kumta", "Mundgod", "Siddapur", "Sirsi", "Yellapur"]
  },
  {
    district: "Vijayanagara",
    taluks: ["Hosapete", "Hagaribommanahalli", "Harapanahalli", "Hoovina Hadagali", "Kotturu", "Kudligi"]
  },
  {
    district: "Vijayapura (Bijapur)",
    taluks: ["Vijayapura", "Babaleshwar", "Basavana Bagewadi", "Chadchan", "Devar Hippargi", "Indi", "Kolhar", "Muddebihal", "Nidagundi", "Sindagi", "Talikoti", "Tikota"]
  },
  {
    district: "Yadgir",
    taluks: ["Yadgir", "Gurmitkal", "Hunasagi", "Shahapur", "Surpur", "Wadagera"]
  }
];

export const ALL_KARNATAKA_DISTRICTS = KARNATAKA_DISTRICTS_DATA.map(d => d.district);

export function getTaluksForDistrict(districtName: string): string[] {
  if (!districtName) return [];
  const found = KARNATAKA_DISTRICTS_DATA.find(
    d => d.district.toLowerCase() === districtName.toLowerCase() ||
         d.district.toLowerCase().includes(districtName.toLowerCase()) ||
         districtName.toLowerCase().includes(d.district.toLowerCase())
  );
  return found ? found.taluks : [];
}
