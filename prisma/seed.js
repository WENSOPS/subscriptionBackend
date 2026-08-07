// import { randomUUID } from "crypto";
// import "dotenv/config";
// import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// import { PrismaClient } from "../generated/prisma/client.js";

// const adapter = new PrismaMariaDb({
//   host: process.env.DATABASE_HOST,
//   user: process.env.DATABASE_USER,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE_NAME,
//   connectionLimit: 20,
// });

// const prisma = new PrismaClient({ adapter });

// // ── ID generator (same as your generateId.ts) ────────────────────────────────
// const ID_PREFIX = {
//   service:        "SVC",
//   package:        "PKG",
//   packageService: "PKGS",
// };

// function generateId(model) {
//   return `${ID_PREFIX[model]}_${randomUUID()}`;
// }

// // ── Unlimited sentinel ────────────────────────────────────────────────────────
// const UNLIMITED = 999;

// // ── 1. SERVICE DEFINITIONS ───────────────────────────────────────────────────
// //   price = standalone market value (INR)
// //   Use 0 for services that are always bundled / have no standalone price

// const SERVICE_DEFS = [
//   { key: "darshan",            title: "VIP Darshan Voucher",                description: "VIP darshan at partner temples across India",                                         price: 5000  },
//   { key: "bhasmAarti",         title: "Bhasm Aarti VVIP Booking",            description: "Exclusive VVIP booking for Bhasm Aarti at Mahakaleshwar Ujjain",                     price: 10000 },
//   { key: "heritage",           title: "Heritage Monument Fast-Track Pass",   description: "Skip-the-line entry at India's iconic heritage monuments",                           price: 2500  },
//   { key: "domesticLounge",     title: "Domestic Airport Lounge Access",      description: "Access to domestic terminal lounges at WENS partner airports",                       price: 2500  },
//   { key: "intlLounge",         title: "International Airport Lounge Access", description: "Access to international terminal lounges via Priority Pass",                         price: 5000  },
//   { key: "spa",                title: "Spa & Wellness Voucher",              description: "Session at a premium WENS partner wellness centre",                                   price: 3000  },
//   { key: "fineDining",         title: "Fine Dining Voucher",                 description: "Curated dining experience at Michelin-recommended & 5-star partner restaurants",     price: 5000  },
//   { key: "vehicleUpgrade",     title: "Vehicle Upgrade Voucher",             description: "Upgrade vehicle category for one trip at no additional charge",                      price: 15000 },
//   { key: "concierge",          title: "24×7 Concierge Helpline",             description: "Round-the-clock helpline for bookings, changes and emergencies",                     price: 0     },
//   { key: "dedicatedRM",        title: "Dedicated Relationship Manager",      description: "Single point of contact available 24×7 for all your needs",                         price: 0     },
//   { key: "personalConcierge",  title: "Personal Concierge Suite",            description: "Dedicated RM + Personal Concierge — two professionals on your account",              price: 0     },
//   { key: "securityAssessment", title: "Personal Security Risk Assessment",   description: "One-time consultation by ex-NSG advisor with personalised safety brief",             price: 10000 },
//   { key: "armedGuard",         title: "Armed Bodyguard Protection",          description: "Licensed armed security personnel assigned to every trip",                           price: 0     },
//   { key: "airportConcierge",   title: "Airport Concierge Service",           description: "Meet & assist service at Mumbai, Delhi and Bangalore airports",                      price: 20000 },
//   { key: "priorityDispatch",   title: "Priority Dispatch",                   description: "Guaranteed vehicle dispatch within the promised response window",                    price: 0     },
//   { key: "familyMembership",   title: "Family Membership Extension",         description: "Spouse gets a dedicated booking line; trips are family-transferable",                price: 0     },
// ];

// // ── 2. PACKAGE → SERVICE MAPPING ─────────────────────────────────────────────
// //   count = number of units included (999 = unlimited)
// const PACKAGE_SERVICE_MAP = {
//   essential: {
//     darshan:        1,
//     domesticLounge: 1,
//     concierge:      1,
//   },
//   executive: {
//     darshan:        2,
//     domesticLounge: 2,
//     heritage:       1,
//     vehicleUpgrade: 1,
//     concierge:      1,
//   },
//   premium: {
//     darshan:            3,
//     bhasmAarti:         1,
//     domesticLounge:     3,
//     intlLounge:         1,
//     heritage:           2,
//     spa:                1,
//     vehicleUpgrade:     1,
//     securityAssessment: 1,
//     armedGuard:         1,
//     dedicatedRM:        1,
//     priorityDispatch:   1,
//   },
//   elite: {
//     darshan:            5,
//     bhasmAarti:         1,
//     domesticLounge:     UNLIMITED,
//     intlLounge:         3,
//     heritage:           3,
//     spa:                1,
//     fineDining:         1,
//     vehicleUpgrade:     1,
//     securityAssessment: 1,
//     armedGuard:         1,
//     personalConcierge:  1,
//     priorityDispatch:   1,
//   },
//   sovereign: {
//     darshan:            UNLIMITED,
//     bhasmAarti:         1,
//     domesticLounge:     UNLIMITED,
//     intlLounge:         UNLIMITED,
//     heritage:           5,
//     spa:                4,
//     fineDining:         2,
//     vehicleUpgrade:     UNLIMITED,
//     securityAssessment: 1,
//     armedGuard:         1,
//     airportConcierge:   1,
//     priorityDispatch:   1,
//     familyMembership:   1,
//   },
// };

// // ── 3. PACKAGE DEFINITIONS ───────────────────────────────────────────────────

// const PACKAGE_DEFS = [
//   {
//     id_key:         "essential",
//     name:           "ESSENTIAL",
//     regularPrice:   65000,
//     discountedPrice:24999,
//     description:    "Your gateway to assured premium mobility",
//     vehicleType:    "Sedan",
//     bodyguardType:  "MMA Fighter",
//     trips:          3,
//     validity:       12,
//     category:       "membership",
//     tags:           "essential,sedan,mma",
//     sequence:       1,
//     isActive:       true,
//   },
//   {
//     id_key:         "executive",
//     name:           "EXECUTIVE",
//     regularPrice:   85000,
//     discountedPrice:49999,
//     description:    "Chosen by 6 in 10 subscribers — the smart upgrade",
//     vehicleType:    "SUV",
//     bodyguardType:  "MMA Fighter",
//     trips:          4,
//     validity:       12,
//     category:       "membership",
//     tags:           "executive,suv,mma",
//     sequence:       2,
//     isActive:       true,
//   },
//   {
//     id_key:         "premium",
//     name:           "PREMIUM",
//     regularPrice:   135000,
//     discountedPrice:74999,
//     description:    "Elevated security for those who don't compromise",
//     vehicleType:    "SUV",
//     bodyguardType:  "Armed Bodyguard",
//     trips:          5,
//     validity:       12,
//     category:       "membership",
//     tags:           "premium,suv,armed",
//     sequence:       3,
//     isActive:       true,
//   },
//   {
//     id_key:         "elite",
//     name:           "ELITE",
//     regularPrice:   195000,
//     discountedPrice:99999,
//     description:    "Where C-suite executives, celebrities & dignitaries travel",
//     vehicleType:    "Luxury Sedan",
//     bodyguardType:  "Armed Bodyguard",
//     trips:          5,
//     validity:       12,
//     category:       "membership",
//     tags:           "elite,luxury-sedan,armed",
//     sequence:       4,
//     isActive:       true,
//   },
//   {
//     id_key:         "sovereign",
//     name:           "SOVEREIGN",
//     regularPrice:   365000,
//     discountedPrice:199999,
//     description:    "The ultimate. Reserved for those who define the room they enter.",
//     vehicleType:    "Luxury SUV",
//     bodyguardType:  "Armed Bodyguard",
//     trips:          5,
//     validity:       12,
//     category:       "membership",
//     tags:           "sovereign,luxury-suv,armed,ultra-exclusive",
//     sequence:       5,
//     isActive:       true,
//   },
// ];

// // ── MAIN ─────────────────────────────────────────────────────────────────────

// async function main() {
//   console.log("🌱 Starting seed...\n");

//   // ── Step 1: Upsert services ────────────────────────────────────────────────
//   console.log("📦 Seeding services...");

//   const serviceMap = {}; // key → id

//   for (const def of SERVICE_DEFS) {
//     const existing = await prisma.service.findUnique({
//       where: { title: def.title },
//     });

//     if (existing) {
//       serviceMap[def.key] = existing.id;
//       console.log(`  ↩  Service exists: ${def.title}`);
//     } else {
//       const created = await prisma.service.create({
//         data: {
//           id:          generateId("service"),
//           title:       def.title,
//           description: def.description,
//           price:       def.price,
//           isActive:    true,
//         },
//       });
//       serviceMap[def.key] = created.id;
//       console.log(`  ✅ Created service: ${def.title} (${created.id})`);
//     }
//   }

//   console.log(`\n  Total services: ${Object.keys(serviceMap).length}\n`);

//   // ── Step 2: Upsert packages + package_services ─────────────────────────────
//   console.log("📋 Seeding packages...");

//   for (const pkg of PACKAGE_DEFS) {
//     // Upsert package (find by name since that's @unique)
//     let packageRecord = await prisma.package.findUnique({
//       where: { name: pkg.name },
//     });

//     if (!packageRecord) {
//       packageRecord = await prisma.package.create({
//         data: {
//           id:              generateId("package"),
//           name:            pkg.name,
//           regularPrice:    pkg.regularPrice,
//           discountedPrice: pkg.discountedPrice,
//           description:     pkg.description,
//           vehicleType:     pkg.vehicleType,
//           bodyguardType:   pkg.bodyguardType,
//           trips:           pkg.trips,
//           validity:        pkg.validity,
//           category:        pkg.category,
//           tags:            pkg.tags,
//           sequence:        pkg.sequence,
//           isActive:        pkg.isActive,
//         },
//       });
//       console.log(`  ✅ Created package: ${pkg.name} (${packageRecord.id})`);
//     } else {
//       console.log(`  ↩  Package exists: ${pkg.name} (${packageRecord.id})`);
//     }

//     // Upsert package_services
//     const serviceEntries = PACKAGE_SERVICE_MAP[pkg.id_key];

//     for (const [serviceKey, count] of Object.entries(serviceEntries)) {
//       const serviceId = serviceMap[serviceKey];
//       if (!serviceId) continue;

//       const existing = await prisma.packageService.findUnique({
//         where: {
//           packageId_serviceId: {
//             packageId: packageRecord.id,
//             serviceId,
//           },
//         },
//       });

//       if (!existing) {
//         await prisma.packageService.create({
//           data: {
//             id:        generateId("packageService"),
//             packageId: packageRecord.id,
//             serviceId,
//             count,
//           },
//         });
//         console.log(`     → Linked service: ${serviceKey} × ${count === UNLIMITED ? "∞" : count}`);
//       } else {
//         // Update count in case it changed
//         await prisma.packageService.update({
//           where: { id: existing.id },
//           data:  { count: count },
//         });
//         console.log(`     → Updated service: ${serviceKey} × ${count === UNLIMITED ? "∞" : count}`);
//       }
//     }
//   }

//   console.log("\n✅ Seed complete!");
// }

// main()
//   .catch((e) => {
//     console.error("❌ Seed failed:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

import { randomUUID } from "crypto";
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaMariaDb({
  host:            process.env.DATABASE_HOST,
  user:            process.env.DATABASE_USER,
  password:        process.env.DATABASE_PASSWORD,
  database:        process.env.DATABASE_NAME,
  connectionLimit: 20,
});

const prisma = new PrismaClient({ adapter });

// ── ID generator ─────────────────────────────────────────────────────────────
const ID_PREFIX = {
  service:        "SVC",
  package:        "PKG",
  packageService: "PKGS",
};

function generateId(model) {
  return `${ID_PREFIX[model]}_${randomUUID()}`;
}

// ── Unlimited sentinel ────────────────────────────────────────────────────────
const UNLIMITED = 999;

// ── 1. SERVICE DEFINITIONS ───────────────────────────────────────────────────
// NOTE: Services that already exist in the membership seed (by title) will be
//       reused automatically — no duplicates created.

const SERVICE_DEFS = [
  // ── Reused from membership seed (matched by title) ────────────────────────
  { key: "armedGuard",       title: "Armed Bodyguard Protection",          description: "Licensed armed security personnel assigned to every trip",                      price: 0     },
  { key: "dedicatedRM",      title: "Dedicated Relationship Manager",      description: "Single point of contact available 24×7 for all your needs",                    price: 0     },
  { key: "darshan",          title: "VIP Darshan Voucher",                 description: "VIP darshan at partner temples across India",                                   price: 5000  },

  // ── New services for airport transfer packages ────────────────────────────
  { key: "chauffeur",        title: "Professional Chauffeur Service",      description: "Uniformed, trained driver with personalised arrival/departure board",           price: 2000  },
  { key: "securityOfficer",  title: "Personal Security Officer",           description: "Trained unarmed security escort from gate to destination",                      price: 3000  },
  { key: "cpo",              title: "Close Protection Officer",            description: "Risk-aware close protection with VIP movement management",                      price: 5000  },
  { key: "flightMonitor",    title: "Flight Monitoring",                   description: "Real-time flight tracking for timely and punctual pickup",                      price: 0     },
  { key: "luggageAssist",    title: "Luggage Assistance",                  description: "Dedicated help with bags from arrival to vehicle",                              price: 0     },
  { key: "customerSupport",  title: "24/7 Customer Support",              description: "Round-the-clock assistance for queries or changes",                              price: 0     },
  { key: "inCarWifi",        title: "In-Car Wi-Fi",                        description: "High-speed connectivity throughout the journey",                                price: 200   },
  { key: "jetlagPill",       title: "Jetlag Pill",                         description: "Complimentary supplement to ease post-flight fatigue",                          price: 150   },
  { key: "hygieneKit",       title: "Hygiene Kit",                         description: "Sanitiser, wipes, premium tissue, mineral water — freshness on arrival",        price: 300   },
  { key: "placardReceiving", title: "Placard Receiving",                   description: "VIP arrival board with your name at the airport terminal gate",                 price: 0     },
  { key: "videoShoot",       title: "Arrival Video Shoot",                 description: "Professional videographer captures your arrival, shared within 24 hours",       price: 3000  },
  { key: "vipEscortVehicle", title: "VIP Escort Security Vehicle",         description: "Dedicated escort vehicle with security team following your convoy",             price: 5000  },
  { key: "fullConvoy",       title: "Full Convoy Formation",               description: "3-vehicle convoy — lead car, principal vehicle & chase car",                   price: 15000 },
  { key: "meetAndGreet",     title: "Elite Concierge Meet & Greet",        description: "Concierge escorts you from aircraft door through all processes to vehicle",     price: 5000  },
  { key: "tajRefreshments",  title: "Taj Hotel Refreshments",              description: "High tea/coffee with seating at Taj Hotel, Mumbai (subject to availability)",   price: 2000  },
  { key: "boardingEscort",   title: "Boarding Escort",                     description: "Personal escort through departure gate to the boarding bridge",                 price: 10000 },
  { key: "airportParking",   title: "Airport Parking Coverage",            description: "All airport parking charges fully covered for the service duration",            price: 5000  },
  { key: "armedPso12hr",     title: "Armed PSO (12-Hour Shift)",           description: "Licensed firearms PSO assigned for 12 hours daily personal protection",         price: 8000  },
  { key: "conciergProtocol", title: "Arrival & Departure Concierge Protocol", description: "End-to-end concierge for both arrival and departure — no detail unattended", price: 20000 },
];

// ── 2. PACKAGE → SERVICE MAPPING ─────────────────────────────────────────────

const PACKAGE_SERVICE_MAP = {
  "touch-red-carpet": {
    chauffeur:       1,
    securityOfficer: 1,
    flightMonitor:   1,
    luggageAssist:   1,
    customerSupport: 1,
  },
  "comfortable-arrival": {
    chauffeur:       1,
    securityOfficer: 1,
    inCarWifi:       1,
    jetlagPill:      1,
    hygieneKit:      1,
    luggageAssist:   1,
  },
  "maharani-maharaja": {
    chauffeur:       1,
    cpo:             1,
    tajRefreshments: 1,
    darshan:         1,   // Siddhivinayak
    luggageAssist:   1,
    dedicatedRM:     1,
  },
  "arrive-in-style": {
    chauffeur:       1,
    securityOfficer: 1,
    flightMonitor:   1,
    jetlagPill:      1,
    inCarWifi:       1,
    hygieneKit:      1,
  },
  "arrival-in-grandeur": {
    chauffeur:        1,
    armedGuard:       3,   // 3 bodyguards
    vipEscortVehicle: 1,
    placardReceiving: 1,
    videoShoot:       1,
    jetlagPill:       1,
    inCarWifi:        1,
    hygieneKit:       1,
  },
  "ultimate-convoy-matrix": {
    chauffeur:        1,
    armedGuard:       1,   // armed + unarmed specialist team
    fullConvoy:       1,
    placardReceiving: 1,
    meetAndGreet:     1,
    inCarWifi:        1,
    hygieneKit:       1,
  },
  "end-to-end-concierge": {
    chauffeur:         1,
    armedPso12hr:      3,   // 3 days × 12-hr shift
    vipEscortVehicle:  1,
    conciergProtocol:  1,
    boardingEscort:    1,
    airportParking:    1,
  },
};

// ── 3. PACKAGE DEFINITIONS ───────────────────────────────────────────────────

const PACKAGE_DEFS = [
  {
    id_key:          "touch-red-carpet",
    name:            "Touch Red Carpet Voyage Mumbai/Delhi",
    regularPrice:    8999,
    discountedPrice: 5999,
    description:     "Seamless airport transfer with professional security assistance",
    vehicleType:     "SUV",
    bodyguardType:   "Security Officer",
    trips:           1,
    validity:        null,        // single trip — no time validity
    category:        "airport-transfer",
    tags:            "airport,transfer,suv,security",
    sequence:        6,
    isActive:        true,
  },
  {
    id_key:          "comfortable-arrival",
    name:            "Comfortable Arrival",
    regularPrice:    11999,
    discountedPrice: 8399,
    description:     "Your assured premium airport arrival experience",
    vehicleType:     "SUV",
    bodyguardType:   "Bodyguard",
    trips:           1,
    validity:        null,
    category:        "airport-transfer",
    tags:            "airport,arrival,suv,bodyguard",
    sequence:        7,
    isActive:        true,
  },
  {
    id_key:          "maharani-maharaja",
    name:            "Maharani / Maharaja Day",
    regularPrice:    29999,
    discountedPrice: 17999,
    description:     "Travel like a VIP with executive protection and premium hospitality",
    vehicleType:     "SUV",
    bodyguardType:   "Close Protection Officer",
    trips:           1,
    validity:        null,
    category:        "airport-transfer",
    tags:            "airport,vip,suv,cpo,taj,darshan",
    sequence:        8,
    isActive:        true,
  },
  {
    id_key:          "arrive-in-style",
    name:            "Arrive in Style with Mercedes",
    regularPrice:    19999,
    discountedPrice: 15749,
    description:     "Make your first impression unforgettable — Mercedes all the way",
    vehicleType:     "Luxury Sedan",
    bodyguardType:   "Bodyguard",
    trips:           1,
    validity:        null,
    category:        "airport-transfer",
    tags:            "airport,mercedes,luxury-sedan,bodyguard",
    sequence:        9,
    isActive:        true,
  },
  {
    id_key:          "arrival-in-grandeur",
    name:            "Arrival in Grandeur",
    regularPrice:    44999,
    discountedPrice: 36750,
    description:     "A grand entrance — luxury car, VIP escort & video shoot",
    vehicleType:     "Luxury Sedan",
    bodyguardType:   "Armed Bodyguard",
    trips:           1,
    validity:        null,
    category:        "airport-transfer",
    tags:            "airport,grandeur,luxury,escort,video,armed",
    sequence:        10,
    isActive:        true,
  },
  {
    id_key:          "ultimate-convoy-matrix",
    name:            "Ultimate Convoy Matrix",
    regularPrice:    109999,
    discountedPrice: 89250,
    description:     "The full executive treatment — convoy, concierge & complete security",
    vehicleType:     "Luxury SUV",
    bodyguardType:   "Armed Bodyguard",
    trips:           1,
    validity:        null,
    category:        "airport-transfer",
    tags:            "airport,convoy,luxury-suv,armed,concierge",
    sequence:        11,
    isActive:        true,
  },
  {
    id_key:          "end-to-end-concierge",
    name:            "End-to-End Concierge Service",
    regularPrice:    249999,
    discountedPrice: 210000,
    description:     "Complete 3-day VIP coverage — arrival to departure, nothing left to chance",
    vehicleType:     "Luxury Multi Seater Van",
    bodyguardType:   "Armed PSO",
    trips:           1,
    validity:        3,           // 3 days
    category:        "airport-transfer",
    tags:            "airport,end-to-end,3-day,armed-pso,concierge",
    sequence:        12,
    isActive:        true,
  },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting airport-transfer seed...\n");

  // ── Step 1: Upsert services ────────────────────────────────────────────────
  console.log("📦 Seeding services...");

  const serviceMap = {};

  for (const def of SERVICE_DEFS) {
    const existing = await prisma.service.findUnique({
      where: { title: def.title },
    });

    if (existing) {
      serviceMap[def.key] = existing.id;
      console.log(`  ↩  Service exists:  ${def.title}`);
    } else {
      const created = await prisma.service.create({
        data: {
          id:          generateId("service"),
          title:       def.title,
          description: def.description,
          price:       def.price,
          isActive:    true,
        },
      });
      serviceMap[def.key] = created.id;
      console.log(`  ✅ Created service:  ${def.title} (${created.id})`);
    }
  }

  console.log(`\n  Total services mapped: ${Object.keys(serviceMap).length}\n`);

  // ── Step 2: Upsert packages + package_services ─────────────────────────────
  console.log("📋 Seeding packages...");

  for (const pkg of PACKAGE_DEFS) {
    let packageRecord = await prisma.package.findUnique({
      where: { name: pkg.name },
    });

    if (!packageRecord) {
      packageRecord = await prisma.package.create({
        data: {
          id:              generateId("package"),
          name:            pkg.name,
          regularPrice:    pkg.regularPrice,
          discountedPrice: pkg.discountedPrice,
          description:     pkg.description,
          vehicleType:     pkg.vehicleType,
          bodyguardType:   pkg.bodyguardType,
          trips:           pkg.trips,
          validity:        pkg.validity,
          category:        pkg.category,
          tags:            pkg.tags,
          sequence:        pkg.sequence,
          isActive:        pkg.isActive,
        },
      });
      console.log(`  ✅ Created package: ${pkg.name} (${packageRecord.id})`);
    } else {
      console.log(`  ↩  Package exists:  ${pkg.name} (${packageRecord.id})`);
    }

    // Upsert package_services
    const serviceEntries = PACKAGE_SERVICE_MAP[pkg.id_key];

    for (const [serviceKey, count] of Object.entries(serviceEntries)) {
      const serviceId = serviceMap[serviceKey];
      if (!serviceId) {
        console.warn(`     ⚠️  No serviceId found for key: ${serviceKey}`);
        continue;
      }

      const existing = await prisma.packageService.findUnique({
        where: {
          packageId_serviceId: {
            packageId: packageRecord.id,
            serviceId,
          },
        },
      });

      if (!existing) {
        await prisma.packageService.create({
          data: {
            id:        generateId("packageService"),
            packageId: packageRecord.id,
            serviceId,
            count,
          },
        });
        console.log(`     → Linked:   ${serviceKey} × ${count === UNLIMITED ? "∞" : count}`);
      } else {
        await prisma.packageService.update({
          where: { id: existing.id },
          data:  { count },
        });
        console.log(`     → Updated:  ${serviceKey} × ${count === UNLIMITED ? "∞" : count}`);
      }
    }
  }

  console.log("\n✅ Airport-transfer seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });