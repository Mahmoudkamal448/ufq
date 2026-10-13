"use strict";

/*
 * Everything on the public site that the admin can edit.
 *
 * SCHEMA describes the admin form for each section. Field types:
 *   text      – one line, Arabic + English         -> { ar, en }
 *   textarea  – paragraph, Arabic + English        -> { ar, en }
 *   plain     – one line, same in both languages   -> "string"
 *   url       – a web link (https://…), optional   -> "string"
 *   image     – an uploaded image                   -> "/uploads/…" or "/assets/…"
 *   select    – one of `options`                    -> "string"
 *   list      – repeatable items made of `fields`   -> [ { … } ]
 *
 * DEFAULTS is the content the site starts with (and "Restore defaults" brings back).
 */

const t = (ar, en) => ({ ar, en });

const SCHEMA = [
  {
    key: "brand",
    label: "Logo & name",
    labelAr: "الشعار والاسم",
    fields: [
      { key: "logo", type: "image", label: "Logo", labelAr: "الشعار" },
      { key: "name", type: "plain", label: "Company name", labelAr: "اسم الشركة" },
      { key: "tagline", type: "text", label: "Name under the logo", labelAr: "الاسم تحت الشعار" },
      { key: "metaDescription", type: "textarea", label: "Description for Google", labelAr: "وصف الموقع لجوجل" }
    ]
  },
  {
    key: "nav",
    label: "Menu",
    labelAr: "القائمة",
    fields: [
      { key: "home", type: "text", label: "Home", labelAr: "الرئيسية" },
      { key: "services", type: "text", label: "Services", labelAr: "خدماتنا" },
      { key: "certificates", type: "text", label: "Certificates", labelAr: "الشهادات" },
      { key: "videos", type: "text", label: "Videos", labelAr: "فيديوهات" },
      { key: "about", type: "text", label: "About", labelAr: "من نحن" },
      { key: "contact", type: "text", label: "Contact", labelAr: "تواصل معنا" }
    ]
  },
  {
    key: "hero",
    label: "Home (top of page)",
    labelAr: "الرئيسية (أعلى الصفحة)",
    fields: [
      { key: "tag", type: "plain", label: "Hashtag", labelAr: "الهاشتاج" },
      { key: "title", type: "text", label: "Main title", labelAr: "العنوان الرئيسي" },
      { key: "lead", type: "textarea", label: "Intro text", labelAr: "النص التعريفي" },
      { key: "cta1", type: "text", label: "First button", labelAr: "الزر الأول" },
      { key: "cta2", type: "text", label: "Second button", labelAr: "الزر الثاني" },
      { key: "slogan", type: "text", label: "Slogan under the logo", labelAr: "الشعار النصي تحت اللوجو" }
    ]
  },
  {
    key: "services",
    label: "Our services",
    labelAr: "خدماتنا",
    fields: [
      { key: "title", type: "text", label: "Section title", labelAr: "عنوان القسم" },
      { key: "subtitle", type: "text", label: "Section subtitle", labelAr: "وصف القسم" },
      {
        key: "items", type: "list", label: "Services", labelAr: "الخدمات", itemLabel: "Service", itemLabelAr: "خدمة",
        fields: [
          { key: "title", type: "text", label: "Service name", labelAr: "اسم الخدمة" },
          {
            key: "points", type: "list", label: "Points", labelAr: "النقاط", itemLabel: "Point", itemLabelAr: "نقطة",
            fields: [{ key: "text", type: "textarea", label: "Text", labelAr: "النص" }]
          }
        ]
      }
    ]
  },
  {
    key: "certificates",
    label: "Certificates",
    labelAr: "الشهادات",
    fields: [
      { key: "title", type: "text", label: "Section title", labelAr: "عنوان القسم" },
      { key: "subtitle", type: "text", label: "Section subtitle", labelAr: "وصف القسم" },
      { key: "oursTitle", type: "text", label: "Title above uploaded certificates", labelAr: "عنوان الشهادات المرفوعة" },
      { key: "standardsTitle", type: "text", label: "Title above standards (when certificates are uploaded)", labelAr: "عنوان المعايير" },
      {
        key: "standards", type: "list", label: "Standards (badges)", labelAr: "المعايير (الشارات)", itemLabel: "Standard", itemLabelAr: "معيار",
        fields: [
          { key: "top", type: "plain", label: "Small text on badge (e.g. ISO)", labelAr: "النص الصغير على الشارة" },
          { key: "main", type: "text", label: "Big text on badge (e.g. 9001)", labelAr: "النص الكبير على الشارة" },
          { key: "caption", type: "text", label: "Name under badge", labelAr: "الاسم تحت الشارة" },
          { key: "color", type: "select", label: "Badge colour", labelAr: "لون الشارة", options: ["navy", "blue"] }
        ]
      }
    ]
  },
  {
    key: "videos",
    label: "Videos section",
    labelAr: "قسم الفيديوهات",
    fields: [
      { key: "title", type: "text", label: "Section title", labelAr: "عنوان القسم" },
      { key: "subtitle", type: "text", label: "Section subtitle", labelAr: "وصف القسم" }
    ]
  },
  {
    key: "about",
    label: "About us",
    labelAr: "من نحن",
    fields: [
      { key: "title", type: "text", label: "Section title", labelAr: "عنوان القسم" },
      {
        key: "paragraphs", type: "list", label: "Paragraphs", labelAr: "الفقرات", itemLabel: "Paragraph", itemLabelAr: "فقرة",
        fields: [{ key: "text", type: "textarea", label: "Text", labelAr: "النص" }]
      },
      { key: "statNumber", type: "plain", label: "Highlighted number (e.g. 2023)", labelAr: "الرقم المميز" },
      { key: "statLabel", type: "text", label: "Text next to the number", labelAr: "النص بجانب الرقم" },
      { key: "whyTitle", type: "text", label: "\"Why choose us\" title", labelAr: "عنوان ليه تختارنا" },
      {
        key: "why", type: "list", label: "Reasons", labelAr: "الأسباب", itemLabel: "Reason", itemLabelAr: "سبب",
        fields: [{ key: "text", type: "textarea", label: "Text", labelAr: "النص" }]
      }
    ]
  },
  {
    key: "contact",
    label: "Contact",
    labelAr: "تواصل معنا",
    fields: [
      { key: "title", type: "text", label: "Title", labelAr: "العنوان" },
      { key: "text", type: "textarea", label: "Text", labelAr: "النص" },
      { key: "phone", type: "plain", label: "Phone number (as shown)", labelAr: "رقم الهاتف (كما يظهر)" },
      { key: "callLabel", type: "text", label: "Call button", labelAr: "زر الاتصال" },
      { key: "whatsapp", type: "plain", label: "WhatsApp number with country code (e.g. 201127687519) – empty hides the button", labelAr: "رقم واتساب بكود الدولة" },
      { key: "whatsappLabel", type: "text", label: "WhatsApp button", labelAr: "زر واتساب" },
      { key: "email", type: "plain", label: "Email – empty hides it", labelAr: "البريد الإلكتروني" },
      { key: "facebook", type: "url", label: "Facebook page link – empty hides it", labelAr: "رابط صفحة فيسبوك" },
      { key: "instagram", type: "url", label: "Instagram link – empty hides it", labelAr: "رابط إنستجرام" },
      { key: "linkedin", type: "url", label: "LinkedIn link – empty hides it", labelAr: "رابط لينكدإن" },
      { key: "address", type: "textarea", label: "Address – empty hides it", labelAr: "العنوان" }
    ]
  },
  {
    key: "footer",
    label: "Footer",
    labelAr: "أسفل الصفحة",
    fields: [
      { key: "slogan", type: "text", label: "Slogan", labelAr: "الشعار النصي" },
      { key: "rights", type: "text", label: "Copyright text", labelAr: "نص الحقوق" }
    ]
  }
];

const DEFAULTS = {
  brand: {
    logo: "/assets/img/logo.png",
    name: "UFQ",
    tagline: t("United For Quality", "United For Quality"),
    metaDescription: t(
      "UFQ – United For Quality: استشارات وتدريب وحلول متكاملة في إدارة الجودة وسلامة الغذاء والسلامة والصحة المهنية.",
      "UFQ – United For Quality: consulting, training and integrated solutions in quality management, food safety and occupational health & safety."
    )
  },
  nav: {
    home: t("الرئيسية", "Home"),
    services: t("خدماتنا", "Our Services"),
    certificates: t("الشهادات", "Certificates"),
    videos: t("فيديوهات", "Videos"),
    about: t("من نحن", "About Us"),
    contact: t("تواصل معنا", "Contact")
  },
  hero: {
    tag: "#UFQ_UNITED_For_Quality",
    title: t("شركتك المتخصصة في الجودة وسلامة الغذاء", "Your specialist partner in quality and food safety"),
    lead: t(
      "استشارات وتدريب وحلول متكاملة بنساعدك ترفع مستوى إدارة الجودة وسلامة الغذاء وتطور نظم شركتك باحترافية.",
      "Consulting, training and integrated solutions that help you raise your quality and food safety management and develop your company's systems professionally."
    ),
    cta1: t("اكتشف خدماتنا", "Explore our services"),
    cta2: t("كلمنا دلوقتي", "Contact us now"),
    slogan: t("النجاح يبدأ عندما تصبح الجودة أسلوب حياة!", "Success begins when quality becomes a way of life!")
  },
  services: {
    title: t("إزاي نقدر نساعدك؟", "How can we help you?"),
    subtitle: t("خدمات متكاملة مصممة خصيصًا لاحتياجات شركتك", "Integrated services tailored to your company's needs"),
    items: [
      {
        title: t("استشارات الجودة وسلامة الغذاء", "Quality & Food Safety Consulting"),
        points: [
          { text: t("هنساعدك تطبق نظم إدارة الجودة وسلامة الغذاء على أعلى مستوى وفقًا للمعايير الدولية.", "We help you implement quality and food safety management systems at the highest level, in line with international standards.") },
          { text: t("تدريب احترافي لفريقك لضمان تنفيذ الأنظمة بكفاءة وتحقيق الامتثال التام.", "Professional training for your team so the systems are applied efficiently and full compliance is achieved.") }
        ]
      },
      {
        title: t("دعم هيئة سلامة الغذاء (مصر والسعودية)", "Food Safety Authority Support (Egypt & Saudi Arabia)"),
        points: [
          { text: t("لو عايز تدخل القائمة البيضاء لسلامة الغذاء في مصر أو السعودية، إحنا هنا نوفر لك كل الدعم والاستشارات اللازمة لتسهيل العملية والحصول على الشهادات المطلوبة بسرعة واحترافية.", "Want to join the food safety white list in Egypt or Saudi Arabia? We provide all the support and consulting you need to simplify the process and obtain the required certificates quickly and professionally.") }
        ]
      },
      {
        title: t("استشارات السلامة والصحة المهنية والبيئة", "Occupational Health, Safety & Environment Consulting"),
        points: [
          { text: t("تطوير نظم السلامة والصحة المهنية والبيئية وفق معايير ISO 45001 وISO 14001.", "Developing occupational health, safety and environmental systems according to ISO 45001 and ISO 14001.") },
          { text: t("تدريب فريق العمل لضمان بيئة عمل آمنة ومستدامة بدون أي مخاطر.", "Training your workforce to ensure a safe, sustainable, risk-free workplace.") }
        ]
      },
      {
        title: t("خدمات التدريب", "Training Services"),
        points: [
          { text: t("بنوفر برامج تدريبية معتمدة في الجودة، سلامة الغذاء، السلامة المهنية وغيرها.", "Accredited training programs in quality, food safety, occupational safety and more.") },
          { text: t("تدريب عملي يرفع كفاءة فريقك، ويجهزه لاجتياز أي مراجعات خارجية بسهولة.", "Hands-on training that raises your team's competence and prepares them to pass any external audit with ease.") },
          { text: t("توفير فرص العمل للمتدربين وتوفير قنوات للتدريب داخل الشركات والمصانع.", "Providing job opportunities for trainees and internship channels inside companies and factories.") }
        ]
      },
      {
        title: t("التدقيق والتقييم الداخلي", "Internal Auditing & Assessment"),
        points: [
          { text: t("مراجعات دقيقة ومستقلة لكل عمليات شركتك عشان تضمن الالتزام بأعلى معايير الجودة.", "Accurate, independent reviews of all your company's operations to ensure compliance with the highest quality standards.") },
          { text: t("هنقدم لك توصيات عملية للتحسين المستمر وضمان التفوق في السوق.", "Practical recommendations for continual improvement and a lasting market edge.") }
        ]
      },
      {
        title: t("الفحص قبل التصدير", "Pre-Export Inspection"),
        points: [
          { text: t("بنتأكد إن شحنتك متوافقة مع المعايير العالمية قبل التصدير، عشان توصل لعملائك بجودة مضمونة.", "We make sure your shipment complies with international standards before export, so it reaches your customers with guaranteed quality.") }
        ]
      },
      {
        title: t("استشارات التنظيم الإداري وقياس الأداء", "Organizational Structure & Performance Measurement"),
        points: [
          { text: t("هنساعدك تبني هيكل إداري قوي وفعال يضمن لك سهولة الإدارة وتحقيق أعلى إنتاجية.", "We help you build a strong, effective management structure for easier management and maximum productivity.") },
          { text: t("تطوير مؤشرات الأداء الرئيسية (KPIs) لمتابعة تقدم شركتك وتحقيق أهدافك بوضوح.", "Developing Key Performance Indicators (KPIs) to track your company's progress and reach your goals clearly.") }
        ]
      },
      {
        title: t("شراكاتنا المميزة لخدمات إضافية", "Partnerships for Additional Services"),
        points: [
          { text: t("المعايرة – للتأكد من دقة الأجهزة والمعدات.", "Calibration – ensuring the accuracy of instruments and equipment.") },
          { text: t("مكافحة الآفات – لحماية بيئة العمل والمنتجات من أي مخاطر.", "Pest control – protecting your workplace and products from any risk.") },
          { text: t("القياسات البيئية – لتحليل جودة الهواء والمياه والتربة والتأكد من مطابقتها للمعايير، إعداد الدراسات البيئية، إعداد الملف البيئي.", "Environmental measurements – analysing air, water and soil quality for compliance, preparing environmental studies and the environmental register.") },
          { text: t("التحاليل المعملية – فحوصات متخصصة لضمان سلامة الأغذية والمياه والتربة.", "Laboratory testing – specialised tests to ensure the safety of food, water and soil.") }
        ]
      }
    ]
  },
  certificates: {
    title: t("الشهادات والمعايير", "Certificates & Standards"),
    subtitle: t("المعايير الدولية والمحلية اللي بنساعدك تطبقها وتحصل على شهادتها", "International and local standards we help you implement and get certified for"),
    oursTitle: t("شهاداتنا", "Our certificates"),
    standardsTitle: t("المعايير اللي بنساعدك فيها", "Standards we help you achieve"),
    standards: [
      { top: "ISO", main: t("9001", "9001"), caption: t("نظام إدارة الجودة", "Quality Management System"), color: "navy" },
      { top: "ISO", main: t("22000", "22000"), caption: t("نظام إدارة سلامة الغذاء", "Food Safety Management System"), color: "navy" },
      { top: "FSSC", main: t("22000", "22000"), caption: t("شهادة نظام سلامة الغذاء", "Food Safety System Certification"), color: "navy" },
      { top: "", main: t("HACCP", "HACCP"), caption: t("تحليل المخاطر ونقاط التحكم الحرجة", "Hazard Analysis & Critical Control Points"), color: "navy" },
      { top: "ISO", main: t("45001", "45001"), caption: t("نظام إدارة السلامة والصحة المهنية", "Occupational Health & Safety Management"), color: "navy" },
      { top: "ISO", main: t("14001", "14001"), caption: t("نظام الإدارة البيئية", "Environmental Management System"), color: "navy" },
      { top: "NFSA", main: t("مصر", "Egypt"), caption: t("القائمة البيضاء – الهيئة القومية لسلامة الغذاء", "White List – Egyptian National Food Safety Authority"), color: "blue" },
      { top: "SFDA", main: t("السعودية", "KSA"), caption: t("الهيئة العامة للغذاء والدواء", "Saudi Food & Drug Authority"), color: "blue" }
    ]
  },
  videos: {
    title: t("فيديوهات", "Videos"),
    subtitle: t("شوف شغلنا وتدريباتنا", "See our work and training")
  },
  about: {
    title: t("من نحن", "About Us"),
    paragraphs: [
      { text: t("UFQ شركتك المتخصصة في الاستشارات والتدريب والحلول المتكاملة، بنساعدك ترفع مستوى إدارة الجودة وسلامة الغذاء وتطور نظم شركتك باحترافية!", "UFQ is your specialist company for consulting, training and integrated solutions. We help you raise the level of your quality and food safety management and develop your company's systems professionally!") },
      { text: t("من 2023 وإحنا بنشتغل بمرونة وإبداع عشان نقدر نرفع مستوى شركاء النجاح معانا على الحصول على أعلى معايير نظم إدارة الجودة، ووضع حلول ذكية ومبتكرة تخدم قطاع التصنيع الغذائي وغيره، مع التزام كامل بأعلى معايير الجودة.", "Since 2023 we have worked with flexibility and creativity to help our success partners achieve the highest quality management standards, delivering smart, innovative solutions for the food manufacturing sector and beyond, with full commitment to the highest quality standards.") }
    ],
    statNumber: "2023",
    statLabel: t("بداية رحلتنا", "The start of our journey"),
    whyTitle: t("ليه تختار UFQ؟", "Why choose UFQ?"),
    why: [
      { text: t("فريق كبير عنده خبرة كبيرة في مجال الجودة وسلامة الغذاء.", "A large team with extensive experience in quality and food safety.") },
      { text: t("حلول مصممة خصيصًا لاحتياجات شركتك، مش مجرد خدمات عامة.", "Solutions tailored to your company's needs, not generic services.") },
      { text: t("دعم مستمر لضمان أعلى مستويات الجودة والتطوير المستمر.", "Ongoing support to ensure the highest quality levels and continual improvement.") },
      { text: t("أسعار تنافسية تناسب جميع الشركات وتضمن لك أعلى قيمة مقابل السعر.", "Competitive prices that suit every company and give you the best value for money.") }
    ]
  },
  contact: {
    title: t("كلمنا دلوقتي وابدأ رحلة النجاح مع UFQ!", "Call us now and start your success journey with UFQ!"),
    text: t("أو تواصل معانا عبر رسائل الصفحة، وإحنا هنرد عليك فورًا!", "Or message us on our page, and we'll get back to you right away!"),
    phone: "011 27687519",
    callLabel: t("اتصل بنا", "Call us"),
    whatsapp: "201127687519",
    whatsappLabel: t("واتساب", "WhatsApp"),
    email: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    address: t("", "")
  },
  footer: {
    slogan: t("🚀 UFQ… النجاح يبدأ عندما تصبح الجودة أسلوب حياة! 🌟", "🚀 UFQ… Success begins when quality becomes a way of life! 🌟"),
    rights: t("جميع الحقوق محفوظة.", "All rights reserved.")
  }
};

module.exports = { SCHEMA, DEFAULTS };
