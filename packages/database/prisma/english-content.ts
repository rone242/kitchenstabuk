import type { PrismaClient } from "../src/generated/prisma/client.js";

// Reviewed English development content, keyed by stable catalogue slugs.
const serviceContent: Record<
  string,
  {
    summaryEn: string;
    descriptionEn: string;
    benefitsEn: string[];
    processStepsEn: string[];
  }
> = {
  "water-leak-detection": {
    summaryEn: "Find the source of a water leak before choosing a repair.",
    descriptionEn:
      "An on-site inspection of water pipes, tanks, and bathrooms to locate signs of leakage, explain the problem, and discuss suitable repair options.",
    benefitsEn: [
      "Reduce unnecessary demolition",
      "Identify the cause",
      "Clear repair recommendations",
    ],
    processStepsEn: [
      "Receive the report details",
      "Inspect the site",
      "Locate the fault",
      "Provide a repair quotation",
    ],
  },
  "drain-unblocking": {
    summaryEn: "Clear blocked sinks, bathrooms, and drainage lines.",
    descriptionEn:
      "Inspect the blockage, choose the right clearing tool for the drain, and test water flow after the work is complete.",
    benefitsEn: [
      "Emergency response",
      "An appropriate treatment method",
      "Water flow tested after service",
    ],
    processStepsEn: [
      "Locate the blockage",
      "Inspect the cause",
      "Clear the drain",
      "Test the drainage system",
    ],
  },
  "home-electrician": {
    summaryEn:
      "Diagnose electrical faults and carry out installation and maintenance.",
    descriptionEn:
      "Help with household electrical faults, circuit breakers, switches, lighting, and wiring, starting with diagnosis before carrying out the agreed work.",
    benefitsEn: [
      "Systematic diagnosis",
      "Fault repair and installation",
      "A clearly defined scope of work",
    ],
    processStepsEn: [
      "Describe the fault",
      "Technician visits",
      "Inspect the circuit",
      "Carry out the work",
    ],
  },
  "lighting-installation": {
    summaryEn: "Install indoor and outdoor lighting fixtures and chandeliers.",
    descriptionEn:
      "Install or replace lighting fixtures, inspect connection points, and establish height and preparation requirements before the appointment.",
    benefitsEn: [
      "Convenient scheduling",
      "Connection points inspected",
      "Installation of different lighting types",
    ],
    processStepsEn: [
      "Confirm the number of fixtures",
      "Review photographs",
      "Prepare the tools",
      "Install and test",
    ],
  },
  "home-deep-cleaning": {
    summaryEn: "Thorough cleaning tailored to your home’s size and room count.",
    descriptionEn:
      "Detailed home cleaning covering the agreed areas. The team and duration are determined after assessing the floor area and condition of the property.",
    benefitsEn: [
      "Clear scope of work",
      "A plan based on home size",
      "Choose priority areas",
    ],
    processStepsEn: [
      "Confirm the floor area",
      "Choose the cleaning scope",
      "Confirm the appointment",
      "Clean and review the work",
    ],
  },
  "water-tank-cleaning": {
    summaryEn:
      "Tank cleaning arranged after confirming tank type and capacity.",
    descriptionEn:
      "Cleaning for underground and overhead water tanks, prepared according to tank capacity, accessibility, and condition.",
    benefitsEn: [
      "Preparation suited to the tank",
      "Requirements confirmed in advance",
      "Organized scheduling",
    ],
    processStepsEn: [
      "Identify the tank type",
      "Assess access",
      "Clean the tank",
      "Review the site",
    ],
  },
  "home-pest-control": {
    summaryEn: "Identify the pest and a suitable treatment plan for your home.",
    descriptionEn:
      "Identify the pest, affected areas, and the presence of children or pets to choose an appropriate treatment plan and instructions.",
    benefitsEn: [
      "A plan for the identified pest",
      "Instructions before and after the visit",
      "Defined treatment areas",
    ],
    processStepsEn: [
      "Collect case details",
      "Inspect the site",
      "Apply treatment",
      "Provide follow-up instructions",
    ],
  },
  "car-shade-installation": {
    summaryEn:
      "Design and install car shades to match the site and chosen material.",
    descriptionEn:
      "Inspect the parking area and fixing points, suggest suitable materials and designs, then prepare a quotation before installation.",
    benefitsEn: [
      "Site measurements",
      "Multiple material options",
      "A quotation before work starts",
    ],
    processStepsEn: [
      "Receive initial dimensions",
      "Inspect the site",
      "Approve the design",
      "Fabricate and install",
    ],
  },
  "iron-door-fabrication": {
    summaryEn:
      "Custom iron doors made to fit your dimensions, design, and site.",
    descriptionEn:
      "Measure the doorway and review the design, finish, and accessories, then provide an itemized quotation before fabrication.",
    benefitsEn: [
      "Made to measure",
      "Finish options",
      "Design review before fabrication",
    ],
    processStepsEn: [
      "Inspect and measure",
      "Approve the design",
      "Fabricate",
      "Install and hand over",
    ],
  },
  "furniture-moving": {
    summaryEn:
      "Coordinate furniture disassembly, packing, moving, and assembly.",
    descriptionEn:
      "Assess furniture volume, floors, lifts, and the distance between locations to determine the vehicles, team, and packing materials needed.",
    benefitsEn: [
      "Moving requirements assessed",
      "Disassembly and assembly options",
      "Team and vehicle coordination",
    ],
    processStepsEn: [
      "List the furniture",
      "Confirm both locations",
      "Pack and load",
      "Move and assemble",
    ],
  },
  "split-ac-maintenance": {
    summaryEn:
      "Diagnose cooling, leakage, and noise faults in split air conditioners.",
    descriptionEn:
      "Inspect indoor and outdoor units to identify the cause of weak cooling, leaks, or noise before agreeing on spare parts or repairs.",
    benefitsEn: [
      "Both units inspected",
      "Fault cause identified",
      "Repair approved before work",
    ],
    processStepsEn: [
      "Record the symptoms",
      "Inspect the air conditioner",
      "Provide a diagnosis",
      "Complete the approved repair",
    ],
  },
  "ac-cleaning": {
    summaryEn:
      "Clean air conditioners according to their type, quantity, and access.",
    descriptionEn:
      "Confirm the air conditioner type, number of units, and access arrangements to prepare the cleaning service and test operation afterward.",
    benefitsEn: [
      "Preparation for the appliance type",
      "Multiple units serviced",
      "Testing after cleaning",
    ],
    processStepsEn: [
      "Count the units",
      "Confirm access",
      "Clean",
      "Test operation",
    ],
  },
};
const categoryContent: Record<string, string> = {
  plumbing:
    "Household plumbing maintenance, water leak detection, and drainage services.",
  electrical:
    "Home electrical work and installation and maintenance of electrical systems.",
  cleaning: "Home, office, and tank cleaning tailored to the site.",
  "pest-control":
    "Inspect and treat insects and pests using methods suited to the property.",
  "shades-barriers":
    "Design and install shades and privacy barriers for homes and facilities.",
  metalwork:
    "Custom fabrication and installation of doors, structures, and ironwork.",
  moving:
    "Furniture disassembly, packing, moving, and assembly within Saudi cities.",
  "ac-maintenance":
    "Inspection, cleaning, repair, and installation of air conditioners.",
};
const labels: Record<string, string> = {
  "أين يظهر التسرب؟": "Where is the leak visible?",
  "هل توجد آثار رطوبة ظاهرة؟": "Are there visible signs of damp?",
  "نوع العقار": "Property type",
  "عدد الغرف": "Number of rooms",
  "أنواع الحشرات أو الآفات الموجودة": "Types of insects or pests present",
  "العطل الظاهر": "Observed fault",
  "أحتاج خدمة التغليف": "I need packing services",
  "دورة المياه": "Bathroom",
  المطبخ: "Kitchen",
  الخزان: "Tank",
  "المصدر غير معروف": "Unknown source",
  شقة: "Apartment",
  فيلا: "Villa",
  مكتب: "Office",
  صراصير: "Cockroaches",
  نمل: "Ants",
  "بق الفراش": "Bedbugs",
  قوارض: "Rodents",
  أخرى: "Other",
  "ضعف التبريد": "Weak cooling",
  "تسريب مياه": "Water leakage",
  "صوت غير طبيعي": "Unusual noise",
  "لا يعمل": "Not working",
};
export async function seedEnglishContent(prisma: PrismaClient) {
  for (const [slug, content] of Object.entries(serviceContent)) {
    const current = await prisma.service.findUnique({ where: { slug } });
    if (!current) continue;
    // Fill missing translations only, preserving translations edited by administrators.
    const missing = Object.fromEntries(
      Object.entries(content).filter(([key]) => {
        const value = current[key as keyof typeof content];
        return Array.isArray(value) ? value.length === 0 : !value?.trim();
      }),
    );
    if (Object.keys(missing).length)
      await prisma.service.update({ where: { id: current.id }, data: missing });
  }
  for (const [slug, description] of Object.entries(categoryContent)) {
    const current = await prisma.category.findUnique({ where: { slug } });
    if (current)
      await prisma.category.update({
        where: { id: current.id },
        data: {
          descriptionEn: current.descriptionEn || description,
          shortDescriptionEn: current.shortDescriptionEn || description,
        },
      });
  }
  const fields = await prisma.serviceField.findMany({
    where: { service: { slug: { in: Object.keys(serviceContent) } } },
    include: { options: true },
  });
  for (const field of fields) {
    if (!field.labelEn && labels[field.labelAr])
      await prisma.serviceField.update({
        where: { id: field.id },
        data: { labelEn: labels[field.labelAr] },
      });
    for (const option of field.options) {
      if (!option.labelEn && labels[option.labelAr])
        await prisma.serviceFieldOption.update({
          where: { id: option.id },
          data: { labelEn: labels[option.labelAr] },
        });
    }
  }
}
