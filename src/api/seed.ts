/**
 * src/api/seed.ts
 * تهيئة البيانات الأولية غير الحساسة لمنصة سوق الكل عند أول تشغيل.
 */

import type { DatabaseAdapter } from "./services";
import { Helpers } from "./classes/Helpers";

export async function seedInitialData(db: DatabaseAdapter): Promise<void> {
  const existingTenants = await db.query("tenants");
  if (existingTenants.length > 0) return;

  const ts = Helpers.nowIso();

  await db.insert("tenants", {
    id: "tnt_main",
    name: "سوق الكل الرئيسي",
    slug: "souqalkul-main",
    domain: "main.souqalkul.local",
    status: "active",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("tenants", {
    id: "tnt_gulf",
    name: "متجر الخليج للإلكترونيات",
    slug: "gulf-electronics",
    domain: "gulf.souqalkul.local",
    status: "active",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  const sampleProducts = [
    {
      id: "prd_101",
      slug: "arabic-coffee-maker-pro",
      title: "صانعة القهوة العربية الذكية",
      title_en: "Smart Arabic Coffee Maker",
      category: "الأجهزة المنزلية",
      price: 349,
      currency: "SAR",
      stock: 42,
      sku: "SQ-COF-101",
      status: "active",
      tenant_id: "tnt_main",
    },
    {
      id: "prd_102",
      slug: "oud-royal-perfume",
      title: "عطر العود الملكي الفاخر 100مل",
      title_en: "Royal Oud Perfume 100ml",
      category: "العطور",
      price: 480,
      currency: "SAR",
      stock: 28,
      sku: "SQ-OUD-102",
      status: "active",
      tenant_id: "tnt_main",
    },
    {
      id: "prd_103",
      slug: "wireless-noise-canceling-headset",
      title: "سماعة رأس لاسلكية عازلة للضوضاء",
      title_en: "Wireless ANC Headphones",
      category: "الإلكترونيات",
      price: 599,
      currency: "SAR",
      stock: 19,
      sku: "SQ-ANC-103",
      status: "active",
      tenant_id: "tnt_gulf",
    },
    {
      id: "prd_104",
      slug: "smart-fitness-watch-x2",
      title: "ساعة رياضية ذكية مقاومة للماء",
      title_en: "Smart Waterproof Watch X2",
      category: "الإلكترونيات",
      price: 279,
      currency: "SAR",
      stock: 64,
      sku: "SQ-WCH-104",
      status: "active",
      tenant_id: "tnt_gulf",
    },
  ];

  for (const p of sampleProducts) {
    await db.insert("products", { ...p, created_at: ts, updated_at: ts, deleted_at: null });
    await db.insert("inventory", {
      id: `inv_${p.id}`,
      product_id: p.id,
      sku: p.sku,
      title: p.title,
      stock: p.stock,
      last_delta: 0,
      tenant_id: p.tenant_id,
      created_at: ts,
      updated_at: ts,
      deleted_at: null,
    });
  }

  const sampleOrders = [
    {
      id: "ord_2001",
      order_number: "ORD-2026-2001",
      total_amount: 829,
      currency: "SAR",
      status: "processing",
      fulfillment_status: "picking",
      tenant_id: "tnt_main",
      items_count: 2,
    },
    {
      id: "ord_2002",
      order_number: "ORD-2026-2002",
      total_amount: 599,
      currency: "SAR",
      status: "shipped",
      fulfillment_status: "shipped",
      tenant_id: "tnt_gulf",
      items_count: 1,
    },
    {
      id: "ord_2003",
      order_number: "ORD-2026-2003",
      total_amount: 349,
      currency: "SAR",
      status: "delivered",
      fulfillment_status: "delivered",
      tenant_id: "tnt_main",
      items_count: 1,
    },
  ];

  for (const o of sampleOrders) {
    await db.insert("orders", { ...o, created_at: ts, updated_at: ts, deleted_at: null });
  }

  await db.insert("shipments", {
    id: "shp_3001",
    order_id: "ord_2002",
    tracking_number: "TRK-SQ-88412",
    carrier: "SMSA Express",
    status: "in_transit",
    tenant_id: "tnt_gulf",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("shipments", {
    id: "shp_3002",
    order_id: "ord_2003",
    tracking_number: "TRK-SQ-88401",
    carrier: "Aramex",
    status: "delivered",
    tenant_id: "tnt_main",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("staff_tasks", {
    id: "tsk_1",
    title: "تجهيز وتغليف طلب #ORD-2026-2001",
    priority: "high",
    status: "in_progress",
    tenant_id: "tnt_main",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("staff_tasks", {
    id: "tsk_2",
    title: "مراجعة جرد مستودع العطور الشهري",
    priority: "normal",
    status: "pending",
    tenant_id: "tnt_main",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("support_tickets", {
    id: "tkt_1",
    subject: "استفسار حول موعد توصيل الشحنة TRK-SQ-88412",
    priority: "normal",
    status: "open",
    message: "متى يصل الطلب إلى مدينة جدة؟",
    tenant_id: "tnt_gulf",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("moderation_tickets", {
    id: "mtkt_1",
    subject: "مراجعة تقييم منتج مخالف لسياسة النشر",
    status: "open",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("blog_posts", {
    id: "pst_1",
    slug: "ramadan-collection-2026",
    title_i18n: { ar: "تشكيلة العروض الموسمية في سوق الكل", en: "Seasonal Deals on Souq Al-Kul" },
    body_i18n: { ar: "اكتشف أفضل المنتجات والعروض من التجار المعتمدين.", en: "Discover top products from verified vendors." },
    status: "published",
    moderation_status: "approved",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("reviews", {
    id: "rev_1",
    product_id: "prd_101",
    rating: 5,
    comment: "جودة ممتازة وتوصيل سريع جداً!",
    status: "approved",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("reports", {
    id: "rpt_1",
    title: "تقرير المبيعات الأسبوعي",
    report_type: "sales_summary",
    format: "html",
    status: "pending",
    reason: "بلاغ تجريبي للمراجعة",
    printable: true,
    printable_html: "<article><h1>تقرير المبيعات الأسبوعي</h1><p>إجمالي الطلبات: 3</p></article>",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("admin_settings", {
    id: "settings_default",
    system_mode: "ready",
    default_locale: "ar",
    default_currency: "SAR",
    preferred_theme: "light",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("system_state", {
    id: "state_default",
    state: "ready",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  await db.insert("site_identity", {
    id: "identity_default",
    site_name: "سوق الكل",
    site_name_en: "Souq Al-Kul",
    official_url: "",
    favicon_url: "",
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  });

  const rolePolicies = [
    { id: "super_admin", role_key: "super_admin", redirect_url: "/ar/dashboard/admin", permissions: ["*"], active: true },
    { id: "moderator", role_key: "moderator", redirect_url: "/ar/dashboard/moderator", permissions: ["moderate:*"], active: true },
    { id: "staff", role_key: "staff", redirect_url: "/ar/dashboard/staff", permissions: ["fulfill:*"], active: true },
    { id: "vendor", role_key: "vendor", redirect_url: "/ar/dashboard/vendor", permissions: ["store:*"], active: true },
    { id: "customer", role_key: "customer", redirect_url: "/ar/dashboard/customer", permissions: ["self:*"], active: true },
  ];
  for (const r of rolePolicies) {
    await db.insert("roles_config", { ...r, created_at: ts, updated_at: ts, deleted_at: null });
  }
}
