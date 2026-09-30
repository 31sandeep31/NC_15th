// Copies province GeoJSON files into public/districts and writes manifest.json
// Run: node scripts/gen-districts.mjs

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(__dirname, "../../districts");
const outputDir = join(__dirname, "../public/districts");

const DISTRICT_NE = {
  Achham: "अछाम",
  Arghakhanchi: "अर्घाखाँची",
  Baglung: "बागलुङ",
  Baitadi: "बैतडी",
  Bajhang: "बझाङ",
  Bajura: "बाजुरा",
  Banke: "बाँके",
  Bara: "बारा",
  Bardiya: "बर्दिया",
  Bhaktapur: "भक्तपुर",
  Bhojpur: "भोजपुर",
  Chitawan: "चितवन",
  Dailekh: "दैलेख",
  Dadeldhura: "दडेल्धुरा",
  Dang: "दाङ",
  Darchula: "दार्चुला",
  Dhading: "धादिङ",
  Dhankuta: "धनकुटा",
  Dhanusha: "धनुषा",
  Dolakha: "दोलखा",
  Dolpa: "डोल्पा",
  Doti: "डोटी",
  Gulmi: "गुल्मी",
  Gorkha: "गोरखा",
  Humla: "हुम्ला",
  Ilam: "इलाम",
  Jajarkot: "जाजरकोट",
  Jhapa: "झापा",
  Jumla: "जुम्ला",
  Kailali: "कैलाली",
  Kapilbastu: "कपिलवस्तु",
  Kaski: "कास्की",
  Kalikot: "कालिकोट",
  Kavrepalanchok: "काभ्रेपलाञ्चोक",
  Kanchanpur: "कञ्चनपुर",
  Kathmandu: "काठमाडौं",
  Khotang: "खोटाङ",
  Lalitpur: "ललितपुर",
  Lamjung: "लमजुङ",
  Mahottari: "महोत्तरी",
  Makwanpur: "मकवानपुर",
  Manang: "मनाङ",
  Morang: "मोरङ",
  Mugu: "मुगु",
  Mustang: "मुस्ताङ",
  Myagdi: "म्याग्दी",
  Nawalpur: "नवलपुर",
  Nuwakot: "नुवाकोट",
  Okhaldhunga: "ओखलढुङ्गा",
  Palpa: "पाल्पा",
  Panchthar: "पाँचथर",
  Parasi: "परासी",
  Parbat: "पर्वत",
  Parsa: "पर्सा",
  Pyuthan: "प्युठान",
  Ramechhap: "रामेछाप",
  Rasuwa: "रसुवा",
  Rautahat: "रौतहट",
  Rolpa: "रोल्पा",
  "Rukum East": "रुकुम पूर्व",
  "Rukum West": "रुकुम पश्चिम",
  Rupandehi: "रुपन्देही",
  Salyan: "सल्यान",
  Sankhuwasabha: "संखुवासभा",
  Sarlahi: "सर्लाही",
  Saptari: "सप्तरी",
  Siraha: "सिराहा",
  Solukhumbu: "सोलुखुम्बु",
  Sindhuli: "सिन्धुली",
  Sindhupalchok: "सिन्धुपाल्चोक",
  Sunsari: "सुनसरी",
  Surkhet: "सुर्खेत",
  Syangja: "स्याङ्जा",
  Tanahu: "तनहुँ",
  Taplejung: "ताप्लेजुङ",
  Terhathum: "तेह्रथुम",
  Udayapur: "उदयपुर",
};

const PROVINCE_NE = {
  Bagmati: "बागमती",
  Gandaki: "गण्डकी",
  Karnali: "कर्णाली",
  Koshi: "कोशी",
  Lumbini: "लुम्बिनी",
  Madhesh: "मधेश",
  Sudurpashchim: "सुदूरपश्चिम",
};

if (!existsSync(sourceDir)) {
  console.error(`Source folder not found: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const files = readdirSync(sourceDir).filter((f) => f.endsWith(".json"));
const manifest = [];
const missing = [];

for (const file of files) {
  const province = file.replace(/\.json$/, "");
  copyFileSync(join(sourceDir, file), join(outputDir, file));

  const geo = JSON.parse(readFileSync(join(sourceDir, file), "utf8"));
  for (const feature of geo.features ?? []) {
    const district = feature?.properties?.District;
    if (!district) continue;
    const districtNe = DISTRICT_NE[district];
    if (!districtNe) missing.push(district);
    manifest.push({
      district,
      districtNe: districtNe ?? district,
      province,
      provinceNe: PROVINCE_NE[province] ?? province,
      file,
    });
  }
}

manifest.sort((a, b) => a.district.localeCompare(b.district));

writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

if (missing.length > 0) {
  console.warn(`Missing Nepali names for: ${[...new Set(missing)].join(", ")}`);
}
console.log(`Copied ${files.length} province files, manifest has ${manifest.length} districts.`);
