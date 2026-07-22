import { prisma } from "./src/lib/prisma.js";
import { plans } from "../../package_wensforce/src/app/data/welcomeIndia.js";

function convertTermsToTipTapJson(terms) {
  if (!terms || !terms.length) return null;
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: terms.map(term => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: term
                }
              ]
            }
          ]
        }))
      }
    ]
  };
}

async function main() {
  console.log("Starting raw SQL database seeding for welcome_india category...");

  // Delete existing packages under welcome_india category
  // First, find existing packages under welcome_india to clean up their relations
  const existingWelcomePackages = await prisma.$queryRawUnsafe(
    `SELECT id FROM \`packages\` WHERE \`category\` = 'welcome_india'`
  );
  
  for (const pkg of existingWelcomePackages) {
    console.log(`Cleaning up relations for existing package: ${pkg.id}`);
    await prisma.$executeRawUnsafe(`DELETE FROM \`package_services\` WHERE \`packageId\` = ?`, pkg.id);
    await prisma.$executeRawUnsafe(`DELETE FROM \`package_media\` WHERE \`packageId\` = ?`, pkg.id);
    await prisma.$executeRawUnsafe(`DELETE FROM \`packages\` WHERE \`id\` = ?`, pkg.id);
  }

  // Find max numeric ID currently in packages table to increment from
  const pkgs = await prisma.$queryRawUnsafe(`SELECT id FROM \`packages\``);
  const existingIds = pkgs.map(p => parseInt(p.id)).filter(id => !isNaN(id));
  let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 100;
  console.log(`Starting package ID assignment from: ${nextId}`);

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const packageId = String(nextId + i);
    console.log(`\n--- Seeding plan: ${plan.name} (ID: ${packageId}) ---`);

    // Create the package row using raw SQL
    const vehicleModelJson = JSON.stringify(plan.vehicle ? [plan.vehicle] : []);
    const termsJson = JSON.stringify(convertTermsToTipTapJson(plan.termsAndConditions));

    await prisma.$executeRawUnsafe(`
      INSERT INTO \`packages\` (
        \`id\`, \`name\`, \`regularPrice\`, \`discountedPrice\`, \`description\`, 
        \`tags\`, \`vehicleType\`, \`vehicleModel\`, \`bodyguardType\`, \`trips\`, 
        \`category\`, \`gst\`, \`validity\`, \`thumbnailUrlKey\`, \`isActive\`, 
        \`termsAndConditions\`, \`sequence\`, \`updatedAt\`, \`createdAt\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, 
      packageId,
      plan.name,
      plan.anchorPrice || plan.price,
      plan.price,
      plan.tagline || "",
      plan.tag || "welcome_india, luxury",
      plan.vehicleType || "SUV",
      vehicleModelJson,
      plan.bodyguard || "Not Included",
      plan.trips || 1,
      "welcome_india",
      18.0,
      12, // validity months
      plan.image,
      1, // isActive: true
      termsJson,
      i + 1
    );

    console.log(`Created package row in \`packages\``);

    // Create services and package_services relations
    if (plan.privileges && plan.privileges.length > 0) {
      for (const privilege of plan.privileges) {
        let count = 1;
        let serviceTitle = privilege.title;

        const countMatch = privilege.title.match(/^(\d+)[×x]\s*(.*)$/i);
        if (countMatch) {
          count = parseInt(countMatch[1]);
          serviceTitle = countMatch[2].trim();
        }

        // Find or create service in DB
        let services = await prisma.$queryRawUnsafe(
          `SELECT id FROM \`services\` WHERE \`title\` = ?`, serviceTitle
        );
        let serviceId;

        if (services.length > 0) {
          serviceId = services[0].id;
        } else {
          // Create service using raw SQL
          await prisma.$executeRawUnsafe(`
            INSERT INTO \`services\` (
              \`title\`, \`description\`, \`thumbnailUrlKey\`, \`isActive\`, \`price\`, \`updatedAt\`, \`createdAt\`
            ) VALUES (?, ?, ?, 1, 100, NOW(), NOW())
          `,
            serviceTitle,
            privilege.desc || "",
            privilege.icon || "CheckCircle"
          );
          
          const newServices = await prisma.$queryRawUnsafe(
            `SELECT id FROM \`services\` WHERE \`title\` = ?`, serviceTitle
          );
          serviceId = newServices[0].id;
          console.log(`Created service: "${serviceTitle}" (ID: ${serviceId})`);
        }

        // Insert relation
        await prisma.$executeRawUnsafe(`
          INSERT INTO \`package_services\` (
            \`packageId\`, \`serviceId\`, \`count\`, \`updatedAt\`, \`createdAt\`
          ) VALUES (?, ?, ?, NOW(), NOW())
        `,
          packageId,
          serviceId,
          count
        );
      }
      console.log(`Created service links in \`package_services\``);
    }

    // Create package_media relation if video exists
    if (plan.video) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO \`package_media\` (
          \`packageId\`, \`type\`, \`urlKey\`, \`order\`, \`createdAt\`
        ) VALUES (?, 'VIDEO', ?, 0, NOW())
      `,
        packageId,
        plan.video
      );
      console.log(`Created video link in \`package_media\``);
    }
  }

  console.log("Database raw seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
