import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";
import { config as loadEnvironment } from "dotenv";
import {
  ContentStatus,
  HomepageSectionType,
  PriceType,
  RequestPriority,
  RequestSource,
  ServiceFieldType,
  ServiceRequestStatus,
  SettingValueType,
} from "../src/generated/prisma/enums.js";

loadEnvironment({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const adminPhone = process.env.ADMIN_SEED_PHONE?.trim();
const adminPassword = process.env.ADMIN_SEED_PASSWORD;

if (!adminEmail || !adminPhone || !adminPassword) {
  throw new Error(
    "ADMIN_SEED_EMAIL, ADMIN_SEED_PHONE and ADMIN_SEED_PASSWORD are required",
  );
}

if (adminPassword.length < 12) {
  throw new Error("ADMIN_SEED_PASSWORD must contain at least 12 characters");
}

const permissions = [
  "category.read",
  "category.create",
  "category.update",
  "category.delete",
  "service.read",
  "service.create",
  "service.update",
  "service.delete",
  "request.read",
  "request.update",
  "request.assign",
  "content.manage",
  "settings.manage",
  "users.manage",
  "audit.read",
  "location.manage",
  "media.manage",
  "analytics.read",
] as const;

const roles = [
  {
    name: "SUPER_ADMIN",
    nameAr: "مدير النظام",
    description: "صلاحيات كاملة لإدارة المنصة",
    permissions: [...permissions],
  },
  {
    name: "ADMIN",
    nameAr: "مدير",
    description: "إدارة العمليات والمحتوى مع استثناء إدارة المستخدمين",
    permissions: permissions.filter((key) => key !== "users.manage"),
  },
  {
    name: "CONTENT_MANAGER",
    nameAr: "مدير المحتوى",
    description: "إدارة دليل الخدمات والمحتوى والوسائط",
    permissions: [
      "category.read",
      "category.create",
      "category.update",
      "service.read",
      "service.create",
      "service.update",
      "content.manage",
      "location.manage",
      "media.manage",
    ],
  },
  {
    name: "LEAD_MANAGER",
    nameAr: "مدير الطلبات",
    description: "متابعة طلبات العملاء وتحديث حالاتها",
    permissions: [
      "category.read",
      "service.read",
      "request.read",
      "request.update",
      "request.assign",
      "analytics.read",
    ],
  },
] as const;

const categories = [
  {
    slug: "plumbing",
    nameAr: "خدمات السباكة",
    nameEn: "Plumbing",
    icon: "wrench",
    description: "حلول السباكة المنزلية وفحص التسربات وصيانة شبكات المياه.",
  },
  {
    slug: "electrical",
    nameAr: "خدمات الكهرباء",
    nameEn: "Electrical",
    icon: "zap",
    description: "أعمال الكهرباء المنزلية وتركيب وصيانة الأنظمة الكهربائية.",
  },
  {
    slug: "cleaning",
    nameAr: "التنظيف",
    nameEn: "Cleaning",
    icon: "sparkles",
    description: "تنظيف المنازل والمكاتب والخزانات وفق احتياج الموقع.",
  },
  {
    slug: "pest-control",
    nameAr: "مكافحة الحشرات",
    nameEn: "Pest Control",
    icon: "bug",
    description: "فحص ومعالجة الحشرات والآفات بطرق مناسبة للمكان.",
  },
  {
    slug: "shades-barriers",
    nameAr: "المظلات والسواتر",
    nameEn: "Shades and Barriers",
    icon: "umbrella",
    description: "تصميم وتركيب المظلات والسواتر للمنازل والمنشآت.",
  },
  {
    slug: "metalwork",
    nameAr: "أعمال الحدادة",
    nameEn: "Metalwork",
    icon: "hammer",
    description: "تفصيل وتركيب الأبواب والهياكل والأعمال الحديدية.",
  },
  {
    slug: "moving",
    nameAr: "نقل الأثاث",
    nameEn: "Furniture Moving",
    icon: "truck",
    description: "فك وتغليف ونقل وتركيب الأثاث داخل المدن السعودية.",
  },
  {
    slug: "ac-maintenance",
    nameAr: "صيانة المكيفات",
    nameEn: "AC Maintenance",
    icon: "snowflake",
    description: "فحص وتنظيف وإصلاح وتركيب أجهزة التكييف.",
  },
] as const;

const services = [
  {
    category: "plumbing",
    slug: "water-leak-detection",
    nameAr: "كشف تسربات المياه",
    nameEn: "Water Leak Detection",
    summary: "فحص مصدر التسرب وتحديد موضع الخلل قبل اقتراح الإصلاح.",
    description:
      "خدمة ميدانية لفحص مؤشرات تسرب المياه في التمديدات والخزانات ودورات المياه، مع توضيح موضع المشكلة وخيارات المعالجة المناسبة.",
    benefits: [
      "تقليل أعمال التكسير غير الضرورية",
      "تحديد سبب المشكلة",
      "توصيات إصلاح واضحة",
    ],
    processSteps: [
      "استلام تفاصيل البلاغ",
      "فحص الموقع",
      "تحديد الخلل",
      "تقديم عرض المعالجة",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: true,
  },
  {
    category: "plumbing",
    slug: "drain-unblocking",
    nameAr: "تسليك المجاري",
    nameEn: "Drain Unblocking",
    summary: "معالجة انسداد الأحواض ودورات المياه وخطوط الصرف.",
    description:
      "فحص الانسداد واختيار أداة التسليك المناسبة لطبيعة خط الصرف، ثم اختبار تدفق المياه بعد إنجاز العمل.",
    benefits: [
      "استجابة للحالات الطارئة",
      "اختيار معالجة مناسبة",
      "اختبار التدفق بعد الخدمة",
    ],
    processSteps: [
      "تحديد موقع الانسداد",
      "فحص السبب",
      "تنفيذ التسليك",
      "اختبار الشبكة",
    ],
    priceType: PriceType.STARTING_FROM,
    startingPrice: 150,
    isEmergency: true,
  },
  {
    category: "electrical",
    slug: "home-electrician",
    nameAr: "كهربائي منازل",
    nameEn: "Home Electrician",
    summary: "تشخيص الأعطال الكهربائية وتنفيذ أعمال التركيب والصيانة.",
    description:
      "خدمة للأعطال المنزلية والقواطع والمفاتيح والإنارة والتمديدات، تبدأ بتشخيص المشكلة قبل تنفيذ العمل المتفق عليه.",
    benefits: ["تشخيص منظم", "خدمة للأعطال والتركيبات", "توضيح نطاق العمل"],
    processSteps: ["وصف العطل", "زيارة الفني", "فحص الدائرة", "تنفيذ العمل"],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: true,
  },
  {
    category: "electrical",
    slug: "lighting-installation",
    nameAr: "تركيب الإنارة",
    nameEn: "Lighting Installation",
    summary: "تركيب وحدات الإنارة الداخلية والخارجية والثريات.",
    description:
      "تركيب واستبدال وحدات الإنارة مع فحص نقاط التوصيل وتحديد متطلبات الارتفاع أو التجهيز قبل الموعد.",
    benefits: [
      "تنسيق موعد مناسب",
      "فحص نقاط التوصيل",
      "تركيب لمختلف أنواع الإنارة",
    ],
    processSteps: [
      "تحديد عدد الوحدات",
      "مراجعة الصور",
      "تجهيز الأدوات",
      "التركيب والاختبار",
    ],
    priceType: PriceType.STARTING_FROM,
    startingPrice: 80,
    isEmergency: false,
  },
  {
    category: "cleaning",
    slug: "home-deep-cleaning",
    nameAr: "تنظيف المنازل العميق",
    nameEn: "Home Deep Cleaning",
    summary: "تنظيف شامل يتم تحديده بحسب مساحة المنزل وعدد الغرف.",
    description:
      "خدمة تنظيف تفصيلية للمنازل تشمل المناطق المتفق عليها، مع تحديد الفريق والمدة بعد معرفة المساحة وحالة الموقع.",
    benefits: [
      "نطاق عمل واضح",
      "خطة حسب مساحة المنزل",
      "إمكانية تحديد مناطق الأولوية",
    ],
    processSteps: [
      "تحديد المساحة",
      "اختيار نطاق التنظيف",
      "تأكيد الموعد",
      "تنفيذ ومراجعة العمل",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: false,
  },
  {
    category: "cleaning",
    slug: "water-tank-cleaning",
    nameAr: "تنظيف خزانات المياه",
    nameEn: "Water Tank Cleaning",
    summary: "تنظيف الخزانات مع تحديد نوع الخزان وسعته قبل الزيارة.",
    description:
      "خدمة تنظيف للخزانات الأرضية والعلوية، يتم تجهيزها بعد معرفة السعة وسهولة الوصول وحالة الخزان.",
    benefits: [
      "تجهيز مناسب لنوع الخزان",
      "تحديد المتطلبات مسبقاً",
      "تنظيم موعد الخدمة",
    ],
    processSteps: [
      "تحديد نوع الخزان",
      "تقييم الوصول",
      "تنفيذ التنظيف",
      "مراجعة الموقع",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: false,
  },
  {
    category: "pest-control",
    slug: "home-pest-control",
    nameAr: "مكافحة حشرات المنازل",
    nameEn: "Home Pest Control",
    summary: "تحديد نوع الآفة وخطة المعالجة المناسبة للمنزل.",
    description:
      "تبدأ الخدمة بتحديد نوع الحشرة ومناطق ظهورها ووجود أطفال أو حيوانات أليفة لاختيار خطة المعالجة والتعليمات الملائمة.",
    benefits: [
      "خطة حسب نوع الآفة",
      "تعليمات قبل وبعد الزيارة",
      "تحديد مناطق المعالجة",
    ],
    processSteps: [
      "جمع معلومات الحالة",
      "فحص الموقع",
      "تنفيذ المعالجة",
      "تقديم تعليمات المتابعة",
    ],
    priceType: PriceType.STARTING_FROM,
    startingPrice: 180,
    isEmergency: false,
  },
  {
    category: "shades-barriers",
    slug: "car-shade-installation",
    nameAr: "تركيب مظلات سيارات",
    nameEn: "Car Shade Installation",
    summary: "تصميم وتنفيذ مظلات سيارات وفق أبعاد الموقع والخامة المطلوبة.",
    description:
      "معاينة مساحة الموقف ومواقع التثبيت ثم اقتراح الخامة والشكل المناسبين قبل إعداد عرض السعر والتنفيذ.",
    benefits: ["قياس الموقع", "خيارات خامات متعددة", "عرض سعر قبل التنفيذ"],
    processSteps: [
      "استلام الأبعاد الأولية",
      "معاينة الموقع",
      "اعتماد التصميم",
      "التصنيع والتركيب",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: false,
  },
  {
    category: "metalwork",
    slug: "iron-door-fabrication",
    nameAr: "تفصيل أبواب حديد",
    nameEn: "Iron Door Fabrication",
    summary: "تفصيل أبواب حديد حسب المقاس والتصميم ومتطلبات الموقع.",
    description:
      "قياس فتحة الباب ومراجعة التصميم ونوع التشطيب والإكسسوارات المطلوبة، ثم تقديم عرض تفصيلي قبل التصنيع.",
    benefits: [
      "تفصيل حسب القياس",
      "خيارات تشطيب",
      "مراجعة التصميم قبل التصنيع",
    ],
    processSteps: [
      "معاينة وقياس",
      "اعتماد التصميم",
      "التصنيع",
      "التركيب والاستلام",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: false,
  },
  {
    category: "moving",
    slug: "furniture-moving",
    nameAr: "نقل الأثاث المنزلي",
    nameEn: "Home Furniture Moving",
    summary: "تنسيق فك وتغليف ونقل وتركيب الأثاث بين المواقع.",
    description:
      "تقييم كمية الأثاث والطوابق والمصاعد والمسافة بين الموقعين لتحديد المركبات والفريق ومواد التغليف المناسبة.",
    benefits: [
      "تقييم متطلبات النقل",
      "خيارات فك وتركيب",
      "تنسيق الفريق والمركبة",
    ],
    processSteps: [
      "حصر الأثاث",
      "تأكيد الموقعين",
      "التغليف والتحميل",
      "النقل والتركيب",
    ],
    priceType: PriceType.QUOTE_REQUIRED,
    isEmergency: false,
  },
  {
    category: "ac-maintenance",
    slug: "split-ac-maintenance",
    nameAr: "صيانة مكيف سبليت",
    nameEn: "Split AC Maintenance",
    summary: "تشخيص أعطال التبريد والتسريب والصوت في مكيفات السبليت.",
    description:
      "فحص الوحدة الداخلية والخارجية وتحديد سبب ضعف التبريد أو التسريب أو الضوضاء قبل اعتماد قطع الغيار أو الإصلاح.",
    benefits: ["فحص الوحدتين", "تحديد سبب العطل", "اعتماد الإصلاح قبل التنفيذ"],
    processSteps: [
      "تسجيل أعراض العطل",
      "فحص المكيف",
      "تقديم التشخيص",
      "تنفيذ الإصلاح المعتمد",
    ],
    priceType: PriceType.STARTING_FROM,
    startingPrice: 120,
    isEmergency: true,
  },
  {
    category: "ac-maintenance",
    slug: "ac-cleaning",
    nameAr: "تنظيف المكيفات",
    nameEn: "AC Cleaning",
    summary: "تنظيف وحدات التكييف بحسب النوع والعدد وحالة الوصول.",
    description:
      "تحديد نوع المكيف وعدد الوحدات وطريقة الوصول إليها لتجهيز خدمة التنظيف واختبار التشغيل بعد الانتهاء.",
    benefits: ["تجهيز حسب نوع الجهاز", "خدمة لعدة وحدات", "اختبار بعد التنظيف"],
    processSteps: ["حصر الأجهزة", "تأكيد الوصول", "التنظيف", "اختبار التشغيل"],
    priceType: PriceType.STARTING_FROM,
    startingPrice: 90,
    isEmergency: false,
  },
] as const;

const regions = [
  { slug: "riyadh-region", nameAr: "منطقة الرياض", nameEn: "Riyadh Region" },
  {
    slug: "makkah-region",
    nameAr: "منطقة مكة المكرمة",
    nameEn: "Makkah Region",
  },
  {
    slug: "madinah-region",
    nameAr: "منطقة المدينة المنورة",
    nameEn: "Madinah Region",
  },
  {
    slug: "eastern-region",
    nameAr: "المنطقة الشرقية",
    nameEn: "Eastern Province",
  },
  { slug: "asir-region", nameAr: "منطقة عسير", nameEn: "Asir Region" },
] as const;

const cities = [
  {
    slug: "riyadh",
    nameAr: "الرياض",
    nameEn: "Riyadh",
    region: "riyadh-region",
  },
  { slug: "jeddah", nameAr: "جدة", nameEn: "Jeddah", region: "makkah-region" },
  {
    slug: "makkah",
    nameAr: "مكة المكرمة",
    nameEn: "Makkah",
    region: "makkah-region",
  },
  {
    slug: "madinah",
    nameAr: "المدينة المنورة",
    nameEn: "Madinah",
    region: "madinah-region",
  },
  {
    slug: "dammam",
    nameAr: "الدمام",
    nameEn: "Dammam",
    region: "eastern-region",
  },
  {
    slug: "khobar",
    nameAr: "الخبر",
    nameEn: "Khobar",
    region: "eastern-region",
  },
  { slug: "taif", nameAr: "الطائف", nameEn: "Taif", region: "makkah-region" },
  { slug: "abha", nameAr: "أبها", nameEn: "Abha", region: "asir-region" },
] as const;

const districts: Record<string, readonly [string, string, string][]> = {
  riyadh: [
    ["al-malqa", "الملقا", "Al Malqa"],
    ["al-yasmin", "الياسمين", "Al Yasmin"],
    ["al-rawabi", "الروابي", "Al Rawabi"],
  ],
  jeddah: [
    ["al-zahra", "الزهراء", "Al Zahra"],
    ["al-safa", "الصفا", "Al Safa"],
    ["al-nahdah", "النهضة", "Al Nahdah"],
  ],
  makkah: [
    ["al-awali", "العوالي", "Al Awali"],
    ["al-shawqiyyah", "الشوقية", "Al Shawqiyyah"],
    ["al-naseem", "النسيم", "Al Naseem"],
  ],
  madinah: [
    ["qurban", "قربان", "Qurban"],
    ["al-aziziyah", "العزيزية", "Al Aziziyah"],
    ["al-jumuah", "الجمعة", "Al Jumuah"],
  ],
  dammam: [
    ["al-faisaliyah", "الفيصلية", "Al Faisaliyah"],
    ["al-shati", "الشاطئ", "Al Shati"],
    ["al-manar", "المنار", "Al Manar"],
  ],
  khobar: [
    ["al-olaya", "العليا", "Al Olaya"],
    ["al-aqrabiyah", "العقربية", "Al Aqrabiyah"],
    ["al-hizam-al-akhdar", "الحزام الأخضر", "Al Hizam Al Akhdar"],
  ],
  taif: [
    ["al-hawiyah", "الحوية", "Al Hawiyah"],
    ["al-shuhada", "الشهداء", "Al Shuhada"],
    ["al-salamah", "السلامة", "Al Salamah"],
  ],
  abha: [
    ["al-mansak", "المنسك", "Al Mansak"],
    ["al-mahalah", "المحالة", "Al Mahalah"],
    ["al-rabwa", "الربوة", "Al Rabwa"],
  ],
};

const dynamicFields = [
  {
    service: "water-leak-detection",
    key: "leak-location",
    type: ServiceFieldType.SELECT,
    labelAr: "أين يظهر التسرب؟",
    required: true,
    options: [
      ["bathroom", "دورة المياه"],
      ["kitchen", "المطبخ"],
      ["tank", "الخزان"],
      ["unknown", "المصدر غير معروف"],
    ],
  },
  {
    service: "water-leak-detection",
    key: "visible-damage",
    type: ServiceFieldType.BOOLEAN,
    labelAr: "هل توجد آثار رطوبة ظاهرة؟",
    required: true,
  },
  {
    service: "home-deep-cleaning",
    key: "property-type",
    type: ServiceFieldType.RADIO,
    labelAr: "نوع العقار",
    required: true,
    options: [
      ["apartment", "شقة"],
      ["villa", "فيلا"],
      ["office", "مكتب"],
    ],
  },
  {
    service: "home-deep-cleaning",
    key: "room-count",
    type: ServiceFieldType.NUMBER,
    labelAr: "عدد الغرف",
    required: true,
    validationRules: { min: 1, max: 30 },
  },
  {
    service: "home-pest-control",
    key: "pest-types",
    type: ServiceFieldType.MULTISELECT,
    labelAr: "أنواع الحشرات أو الآفات الموجودة",
    required: true,
    options: [
      ["cockroaches", "صراصير"],
      ["ants", "نمل"],
      ["bedbugs", "بق الفراش"],
      ["rodents", "قوارض"],
      ["other", "أخرى"],
    ],
  },
  {
    service: "split-ac-maintenance",
    key: "issue-type",
    type: ServiceFieldType.SELECT,
    labelAr: "العطل الظاهر",
    required: true,
    options: [
      ["weak-cooling", "ضعف التبريد"],
      ["water-leak", "تسريب مياه"],
      ["noise", "صوت غير طبيعي"],
      ["not-working", "لا يعمل"],
    ],
  },
  {
    service: "furniture-moving",
    key: "requires-packing",
    type: ServiceFieldType.CHECKBOX,
    labelAr: "أحتاج خدمة التغليف",
    required: false,
  },
] as const;

function trackingCode(requestNumber: string): string {
  return createHash("sha256")
    .update(`kitchenstabuk-development-${requestNumber}`)
    .digest("base64url")
    .slice(0, 32);
}

async function main(): Promise<void> {
  const { getPrismaClient } = await import("../src/client.js");
  const prisma = getPrismaClient();

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        nameAr: roleData.nameAr,
        description: roleData.description,
        isSystem: true,
      },
      create: {
        name: roleData.name,
        nameAr: roleData.nameAr,
        description: roleData.description,
        isSystem: true,
      },
    });
    const rolePermissions = await prisma.permission.findMany({
      where: { key: { in: [...roleData.permissions] } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  const passwordHash = await hash(adminPassword, 12);
  const matchingAdmins = await prisma.user.findMany({
    where: {
      OR: [{ emailNormalized: adminEmail }, { phoneNormalized: adminPhone }],
    },
  });
  if (matchingAdmins.length > 1) {
    throw new Error(
      "Seed admin email and phone belong to different existing accounts",
    );
  }
  const adminData = {
    email: adminEmail,
    emailNormalized: adminEmail,
    phone: adminPhone,
    phoneNormalized: adminPhone,
    passwordHash,
    name: "مدير النظام",
    status: "ACTIVE" as const,
    deletedAt: null,
  };
  const admin = matchingAdmins[0]
    ? await prisma.user.update({
        where: { id: matchingAdmins[0].id },
        data: adminData,
      })
    : await prisma.user.create({
        data: {
          ...adminData,
          status: undefined,
        },
      });
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  const country = await prisma.country.upsert({
    where: { isoCode: "SA" },
    update: { nameAr: "المملكة العربية السعودية", isActive: true },
    create: {
      isoCode: "SA",
      slug: "saudi-arabia",
      nameAr: "المملكة العربية السعودية",
      nameEn: "Saudi Arabia",
    },
  });

  const regionBySlug = new Map<string, { id: string }>();
  for (const [sortOrder, data] of regions.entries()) {
    const region = await prisma.region.upsert({
      where: { countryId_slug: { countryId: country.id, slug: data.slug } },
      update: { ...data, isActive: true, sortOrder },
      create: { ...data, countryId: country.id, sortOrder },
    });
    regionBySlug.set(data.slug, region);
  }

  const cityBySlug = new Map<string, { id: string; nameAr: string }>();
  for (const [sortOrder, data] of cities.entries()) {
    const region = regionBySlug.get(data.region);
    if (!region) throw new Error(`Missing region ${data.region}`);
    const city = await prisma.city.upsert({
      where: { slug: data.slug },
      update: {
        regionId: region.id,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        isActive: true,
        sortOrder,
      },
      create: {
        regionId: region.id,
        slug: data.slug,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        sortOrder,
        shortDescription: `خدمات منزلية ومحلية متاحة في ${data.nameAr} حسب نطاق التغطية.`,
      },
    });
    cityBySlug.set(data.slug, city);

    for (const [districtOrder, [slug, nameAr, nameEn]] of (
      districts[data.slug] ?? []
    ).entries()) {
      await prisma.district.upsert({
        where: { cityId_slug: { cityId: city.id, slug } },
        update: { nameAr, nameEn, isActive: true, sortOrder: districtOrder },
        create: {
          cityId: city.id,
          slug,
          nameAr,
          nameEn,
          sortOrder: districtOrder,
        },
      });
    }
  }

  const categoryBySlug = new Map<string, { id: string }>();
  for (const [sortOrder, data] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: data.slug },
      update: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        icon: data.icon,
        shortDescription: data.description,
        description: data.description,
        sortOrder,
        isFeatured: sortOrder < 6,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...data,
        shortDescription: data.description,
        sortOrder,
        isFeatured: sortOrder < 6,
      },
    });
    categoryBySlug.set(data.slug, category);
  }

  const serviceBySlug = new Map<string, { id: string; nameAr: string }>();
  for (const [sortOrder, data] of services.entries()) {
    const category = categoryBySlug.get(data.category);
    if (!category) throw new Error(`Missing category ${data.category}`);
    const { category: _category, ...serviceData } = data;
    const service = await prisma.service.upsert({
      where: { slug: data.slug },
      update: {
        ...serviceData,
        categoryId: category.id,
        sortOrder,
        isFeatured: sortOrder < 6,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...serviceData,
        categoryId: category.id,
        sortOrder,
        isFeatured: sortOrder < 6,
      },
    });
    serviceBySlug.set(data.slug, service);

    for (const city of cityBySlug.values()) {
      await prisma.serviceLocation.upsert({
        where: {
          serviceId_cityId_scopeKey: {
            serviceId: service.id,
            cityId: city.id,
            scopeKey: "*",
          },
        },
        update: { isActive: true },
        create: {
          serviceId: service.id,
          cityId: city.id,
          scopeKey: "*",
          isActive: true,
        },
      });
    }
  }

  for (const [sortOrder, fieldData] of dynamicFields.entries()) {
    const service = serviceBySlug.get(fieldData.service);
    if (!service) throw new Error(`Missing service ${fieldData.service}`);
    const field = await prisma.serviceField.upsert({
      where: {
        serviceId_key: { serviceId: service.id, key: fieldData.key },
      },
      update: {
        type: fieldData.type,
        labelAr: fieldData.labelAr,
        isRequired: fieldData.required,
        validationRules:
          "validationRules" in fieldData
            ? fieldData.validationRules
            : undefined,
        sortOrder,
        isActive: true,
      },
      create: {
        serviceId: service.id,
        key: fieldData.key,
        type: fieldData.type,
        labelAr: fieldData.labelAr,
        isRequired: fieldData.required,
        validationRules:
          "validationRules" in fieldData
            ? fieldData.validationRules
            : undefined,
        sortOrder,
      },
    });
    if ("options" in fieldData && fieldData.options) {
      for (const [
        optionOrder,
        [value, labelAr],
      ] of fieldData.options.entries()) {
        await prisma.serviceFieldOption.upsert({
          where: { fieldId_value: { fieldId: field.id, value } },
          update: { labelAr, sortOrder: optionOrder, isActive: true },
          create: {
            fieldId: field.id,
            value,
            labelAr,
            sortOrder: optionOrder,
          },
        });
      }
    }
  }

  const faqData = [
    [
      "كيف أطلب خدمة؟",
      "اختر الخدمة والمدينة، أجب عن الأسئلة المطلوبة، ثم راجع بياناتك وأرسل الطلب.",
    ],
    [
      "هل السعر المعروض نهائي؟",
      "يعتمد ذلك على نوع الخدمة. الخدمات التي تحتاج معاينة تعرض كسعر تقديري أو كطلب عرض سعر.",
    ],
    [
      "كيف أتابع طلبي؟",
      "بعد الإرسال تحصل على رمز تتبع آمن يمكنك استخدامه في صفحة متابعة الطلب.",
    ],
    [
      "هل تتوفر خدمات طارئة؟",
      "نعم لبعض الخدمات فقط، ويظهر خيار الطوارئ عندما تكون الخدمة مفعلة للحالات العاجلة.",
    ],
  ] as const;
  for (const [sortOrder, [questionAr, answerAr]] of faqData.entries()) {
    const existing = await prisma.faq.findFirst({ where: { questionAr } });
    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: { answerAr, sortOrder, isActive: true },
      });
    } else {
      await prisma.faq.create({
        data: { questionAr, answerAr, sortOrder },
      });
    }
  }

  const homepageSections = [
    ["hero", HomepageSectionType.HERO, "اطلب خدمتك بثقة"],
    [
      "popular-categories",
      HomepageSectionType.POPULAR_CATEGORIES,
      "الخدمات الأكثر طلباً",
    ],
    [
      "nearby-services",
      HomepageSectionType.NEARBY_SERVICES,
      "خدمات متاحة بالقرب منك",
    ],
    ["how-it-works", HomepageSectionType.HOW_IT_WORKS, "كيف تعمل المنصة؟"],
    [
      "featured-services",
      HomepageSectionType.FEATURED_SERVICES,
      "خدمات مختارة",
    ],
    [
      "trust",
      HomepageSectionType.TRUST_INDICATORS,
      "خدمة واضحة من الطلب إلى المتابعة",
    ],
    ["reviews", HomepageSectionType.REVIEWS, "آراء العملاء"],
    ["covered-cities", HomepageSectionType.COVERED_CITIES, "المدن التي نخدمها"],
    ["faqs", HomepageSectionType.FAQS, "الأسئلة الشائعة"],
    ["final-cta", HomepageSectionType.FINAL_CTA, "جاهز لطلب عرض سعر؟"],
  ] as const;
  for (const [sortOrder, [key, type, titleAr]] of homepageSections.entries()) {
    await prisma.homepageSection.upsert({
      where: { key },
      update: { type, titleAr, sortOrder, isEnabled: true },
      create: { key, type, titleAr, sortOrder },
    });
  }

  const settings = [
    ["site.name", "خدماتك", SettingValueType.TEXT, true],
    ["site.locale", "ar-SA", SettingValueType.TEXT, true],
    ["site.timezone", "Asia/Riyadh", SettingValueType.TEXT, true],
    ["site.currency", "SAR", SettingValueType.TEXT, true],
    [
      "contact.phone",
      process.env.SITE_PHONE ?? "+966500000000",
      SettingValueType.PHONE,
      true,
    ],
    [
      "contact.whatsapp",
      process.env.SITE_WHATSAPP ?? "+966500000000",
      SettingValueType.PHONE,
      true,
    ],
    [
      "contact.workingHours",
      "الأحد إلى الخميس، 8 صباحاً - 8 مساءً",
      SettingValueType.TEXT,
      true,
    ],
  ] as const;
  for (const [key, value, valueType, isPublic] of settings) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value, valueType, isPublic },
      create: { key, value, valueType, isPublic },
    });
  }

  const pages = [
    [
      "about",
      "من نحن",
      "منصة سعودية تسهّل الوصول إلى الخدمات المحلية وطلب عروض الأسعار بوضوح.",
    ],
    [
      "privacy",
      "سياسة الخصوصية",
      "نلتزم بجمع البيانات اللازمة لمعالجة الطلبات وحمايتها وفق السياسات المعلنة.",
    ],
    [
      "terms",
      "الشروط والأحكام",
      "توضح هذه الصفحة ضوابط استخدام المنصة وآلية إرسال ومتابعة طلبات الخدمة.",
    ],
  ] as const;
  for (const [slug, titleAr, content] of pages) {
    await prisma.page.upsert({
      where: { slug },
      update: { titleAr, content, status: ContentStatus.PUBLISHED },
      create: {
        slug,
        titleAr,
        content,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  const reviews = [
    [
      "سارة",
      "الرياض",
      5,
      "كان تقديم الطلب واضحاً وتم التواصل لتأكيد التفاصيل قبل الموعد.",
    ],
    [
      "عبدالله",
      "جدة",
      5,
      "أعجبني وضوح خطوات المتابعة وسهولة إرسال صور المشكلة.",
    ],
    [
      "نورة",
      "الدمام",
      4,
      "تم تحديد نطاق الخدمة والموعد بسرعة وكانت المتابعة منظمة.",
    ],
  ] as const;
  for (const [
    sortOrder,
    [customerName, cityName, rating, body],
  ] of reviews.entries()) {
    const existing = await prisma.customerReview.findFirst({
      where: { customerName, body },
    });
    if (existing) {
      await prisma.customerReview.update({
        where: { id: existing.id },
        data: { cityName, rating, isActive: true, isFeatured: true, sortOrder },
      });
    } else {
      await prisma.customerReview.create({
        data: {
          customerName,
          cityName,
          rating,
          body,
          isFeatured: true,
          sortOrder,
        },
      });
    }
  }

  const sampleRequests = [
    {
      requestNumber: "REQ-DEMO-001",
      customerName: "محمد العتيبي",
      phone: "+966501111111",
      service: "water-leak-detection",
      city: "riyadh",
      description: "تظهر رطوبة في الجدار المجاور لدورة المياه منذ يومين.",
      status: ServiceRequestStatus.NEW,
      priority: RequestPriority.HIGH,
    },
    {
      requestNumber: "REQ-DEMO-002",
      customerName: "ريم الحربي",
      phone: "+966502222222",
      service: "home-deep-cleaning",
      city: "jeddah",
      description: "تنظيف عميق لشقة قبل الانتقال إليها.",
      status: ServiceRequestStatus.CONTACTED,
      priority: RequestPriority.NORMAL,
    },
    {
      requestNumber: "REQ-DEMO-003",
      customerName: "خالد القحطاني",
      phone: "+966503333333",
      service: "split-ac-maintenance",
      city: "dammam",
      description: "المكيف يعمل لكن التبريد ضعيف مع صوت في الوحدة الخارجية.",
      status: ServiceRequestStatus.SCHEDULED,
      priority: RequestPriority.NORMAL,
    },
  ] as const;

  async function seedAnswer(
    serviceRequestId: string,
    serviceId: string,
    fieldKey: string,
    value: { text?: string; number?: number; boolean?: boolean },
    selectedValues: readonly string[] = [],
  ): Promise<void> {
    const field = await prisma.serviceField.findUniqueOrThrow({
      where: { serviceId_key: { serviceId, key: fieldKey } },
    });
    const answer = await prisma.serviceRequestAnswer.upsert({
      where: {
        serviceRequestId_serviceFieldId: {
          serviceRequestId,
          serviceFieldId: field.id,
        },
      },
      update: {
        valueText: value.text,
        valueNumber: value.number,
        valueBoolean: value.boolean,
      },
      create: {
        serviceRequestId,
        serviceFieldId: field.id,
        valueText: value.text,
        valueNumber: value.number,
        valueBoolean: value.boolean,
      },
    });
    if (selectedValues.length > 0) {
      const options = await prisma.serviceFieldOption.findMany({
        where: { fieldId: field.id, value: { in: [...selectedValues] } },
      });
      for (const option of options) {
        await prisma.serviceRequestAnswerOption.upsert({
          where: {
            answerId_optionId: { answerId: answer.id, optionId: option.id },
          },
          update: {},
          create: { answerId: answer.id, optionId: option.id },
        });
      }
    }
  }

  for (const requestData of sampleRequests) {
    const service = serviceBySlug.get(requestData.service);
    const city = cityBySlug.get(requestData.city);
    if (!service || !city) throw new Error("Missing request seed relation");
    let customer = await prisma.customer.findFirst({
      where: { phoneNormalized: requestData.phone },
    });
    customer ??= await prisma.customer.create({
      data: {
        name: requestData.customerName,
        phone: requestData.phone,
        phoneNormalized: requestData.phone,
      },
    });
    const request = await prisma.serviceRequest.upsert({
      where: { requestNumber: requestData.requestNumber },
      update: {
        description: requestData.description,
        status: requestData.status,
        priority: requestData.priority,
      },
      create: {
        requestNumber: requestData.requestNumber,
        trackingCode: trackingCode(requestData.requestNumber),
        customerId: customer.id,
        serviceId: service.id,
        cityId: city.id,
        description: requestData.description,
        status: requestData.status,
        priority: requestData.priority,
        source: RequestSource.WEBSITE,
        consentAt: new Date(),
      },
    });
    const historyCount = await prisma.requestStatusHistory.count({
      where: { serviceRequestId: request.id },
    });
    if (historyCount === 0) {
      await prisma.requestStatusHistory.create({
        data: {
          serviceRequestId: request.id,
          previousStatus: null,
          newStatus: requestData.status,
          note: "تم إنشاء الطلب ضمن بيانات التطوير",
        },
      });
    }

    if (requestData.requestNumber === "REQ-DEMO-001") {
      await seedAnswer(request.id, service.id, "leak-location", {}, [
        "unknown",
      ]);
      await seedAnswer(request.id, service.id, "visible-damage", {
        boolean: true,
      });
    }
    if (requestData.requestNumber === "REQ-DEMO-002") {
      await seedAnswer(request.id, service.id, "property-type", {}, [
        "apartment",
      ]);
      await seedAnswer(request.id, service.id, "room-count", { number: 4 });
    }
    if (requestData.requestNumber === "REQ-DEMO-003") {
      await seedAnswer(request.id, service.id, "issue-type", {}, [
        "weak-cooling",
      ]);
    }
  }

  console.info(
    `Seed complete: ${categories.length} categories, ${services.length} services, ${cities.length} cities`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error("Database seed failed", error);
  process.exitCode = 1;
});
