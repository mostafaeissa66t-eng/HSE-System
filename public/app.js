// =================================== */
// CLIENT-SIDE LOGIC (app.js - Secured V8)
// =================================== */

// --- التعريفات العالمية (Global Scope) ---
let initialData = null;
let evaluatedEmpIds = [];
let currentUser = null;
const API_URL = "/api";

// 1. جعل دوال اللودر عالمية ومستقلة (عشان متعملش إيرور قبل التحميل)
window.showLoader = function (message = "جاري التحميل...") {
  const loaderEl = document.getElementById("loader-overlay");
  if (loaderEl) {
    const loaderText = loaderEl.querySelector("p");
    if (loaderText) loaderText.textContent = message;
    loaderEl.style.display = "flex";
  }
};
// =================================================================
// --- وحدة الحماية العالمية: تعقيم البيانات (Global XSS Sanitizer) ---
// =================================================================

// دالة لتحويل الرموز الخطيرة إلى نصوص آمنة
window.escapeHTML = function (str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>'"]/g, function (match) {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return escapeMap[match];
  });
};

// دالة ذكية تلف على كل الداتا (مهما كان حجمها أو تعقيدها) وتعقمها
window.sanitizeData = function (data) {
  if (typeof data === "string") {
    return window.escapeHTML(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => window.sanitizeData(item));
  }
  if (data !== null && typeof data === "object") {
    const sanitizedObj = {};
    for (const key in data) {
      sanitizedObj[key] = window.sanitizeData(data[key]);
    }
    return sanitizedObj;
  }
  return data; // الأرقام والبيانات الفارغة ترجع كما هي
};

window.hideLoader = function () {
  const loaderEl = document.getElementById("loader-overlay");
  if (loaderEl) {
    setTimeout(() => {
      loaderEl.style.display = "none";
    }, 100);
  }
};

window.showMessage = function (element, text, isSuccess) {
  if (element) {
    element.textContent = text;
    element.className = isSuccess ? "success-message" : "error-message";
    element.style.display = "block";
    setTimeout(() => {
      element.style.display = "none";
    }, 5000);
  }
};

// جعل دالة تعبئة القوائم مرئية للجميع
window.fillSelect = function (element, dataArray) {
  if (!element) return;
  element.innerHTML = '<option value="">-- اختر --</option>';
  if (dataArray && Array.isArray(dataArray)) {
    dataArray.forEach((item) => {
      if (typeof item === "string" || typeof item === "number") {
        element.add(new Option(item, item));
      } else if (item.id && item.name) {
        element.add(new Option(item.name, item.id));
      }
    });
  }
};

// متغير عالمي لتخزين اللوكيشن الحي (Live GPS)
window.liveGPS = { lat: null, lng: null };

// الدالة الأهم: جعل callApi عالمية وتأمينها (مع دعم الوضع الصامت للنبضات)
window.callApi = async function (action, payload = {}, isSilent = false) {
  let loaderMessage = `جاري ${action}...`;
  if (action === "checkLogin") loaderMessage = "جاري تسجيل الدخول...";
  if (action === "getInitialData") loaderMessage = "جاري تحميل البيانات...";
  if (action === "verifySession") loaderMessage = "جاري التحقق من الأمان...";

  // إظهار اللودر فقط لو مش وضع صامت
  if (!isSilent) window.showLoader(loaderMessage);

  // إرفاق التوكن والـ GPS مع كل طلب
  if (action !== "checkLogin") {
    const token = localStorage.getItem("hse_user_token");
    if (token) payload.token = token;
    payload.liveGPS = window.liveGPS;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, payload: payload }),
    });

    const responseText = await response.text();
    if (!isSilent) window.hideLoader();

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const result = JSON.parse(responseText);

    if (result && result.status === "error") {
      if (result.message.includes("Access Denied")) {
        localStorage.removeItem("hse_user_token");
        if (action !== "verifySession" && !isSilent) {
          alert(
            "انتهت الجلسة أو تم تغيير الصلاحيات. يرجى تسجيل الدخول من جديد.",
          );
          location.reload();
        }
      }
      throw new Error(result.message);
    }
    return window.sanitizeData(result);
  } catch (error) {
    if (!isSilent) window.hideLoader();
    console.error(`API Error (${action}):`, error);
    throw error;
  }
};
// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
  // --- GLOBAL STATE ---
  // 1. تعريف العناصر أولاً (SELECTORS) عشان ميعملش خطأ TDZ
  const loader = document.getElementById("loader-overlay");
  const loginScreen = document.getElementById("login-screen");
  const appWrapper = document.getElementById("app-wrapper");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const content = document.getElementById("content");
  const sidebarMenu = document.getElementById("sidebar-menu");
  const logoutBtn = document.getElementById("logout-btn");

  // ============================================================
  // 2. (التحديث الأمني) التحقق من وجود توكن صالح من السيرفر
  // ============================================================
  const savedToken = localStorage.getItem("hse_user_token");
  if (savedToken) {
    // نطلب من السيرفر يتأكد من التوكن ويرجع بيانات المستخدم الموثوقة
    window
      .callApi("verifySession", {})
      .then((res) => {
        if (res.status === "success") {
          console.log(
            "تم استعادة الجلسة بأمان للمستخدم:",
            res.userInfo.username,
          );
          onLoginSuccess({ userInfo: res.userInfo, isRestore: true });
        }
      })
      .catch((e) => {
        console.error("فشل التحقق من الجلسة:", e);
        localStorage.removeItem("hse_user_token");
        // إظهار شاشة الدخول لو التوكن غير صالح
        if (loginScreen) loginScreen.style.display = "flex";
        if (appWrapper) appWrapper.style.display = "none";
      });
  } else {
    // إظهار شاشة الدخول لو مفيش توكن خالص
    if (loginScreen) loginScreen.style.display = "flex";
    if (appWrapper) appWrapper.style.display = "none";
  }

  // Form & Message Selectors
  const permitForm = document.getElementById("permit-form");
  const permitMsg = document.getElementById("permit-message");
  const obsMsg = document.getElementById("obs-message");
  const closePermitMsg = document.getElementById("close-permit-message");
  const monNcrVioProject = document.getElementById("mon-ncrvio-project");
  const monNcrVioFrom = document.getElementById("mon-ncrvio-from");
  const monNcrVioTo = document.getElementById("mon-ncrvio-to");
  const monNcrVioBtn = document.getElementById("mon-ncrvio-btn");
  const monNcrVioTable = document.getElementById("mon-ncrvio-table");

  // Monitor Section Selectors
  const monitorProjectFilter = document.getElementById(
    "monitor-project-filter",
  );
  const monitorRequesterFilter = document.getElementById(
    "monitor-requester-filter",
  );
  const monitorFromDate = document.getElementById("monitor-from-date");
  const monitorToDate = document.getElementById("monitor-to-date");
  const monitorOpenOnly = document.getElementById("monitor-open-only");
  const monitorSearchBtn = document.getElementById("monitor-search-btn");
  const monitorResultsTable = document.getElementById("monitor-results-table");
  const monitorMessage = document.getElementById("monitor-message");

  // KPI Evaluation Selectors
  const kpiEmployeeSelect = document.getElementById("kpi-employee-select");
  const kpiPeriodSelect = document.getElementById("kpi-period-select");
  const kpiEmployeeJobTitle = document.getElementById("kpi-employee-jobtitle");
  const kpiMessageArea = document.getElementById("kpi-message-area");
  const kpiFormArea = document.getElementById("kpi-form-area");
  const kpiListContainer = document.getElementById("kpi-list-container");
  const kpiSaveBtn = document.getElementById("kpi-save-btn");
  const kpiSaveMessage = document.getElementById("kpi-save-message");

  // (جديد) PPE Section Selectors
  const ppeTransactionType = document.getElementById("ppe-transaction-type");
  const ppeForm = document.getElementById("ppe-form");
  const ppeSupplierGroup = document.getElementById("ppe-supplier-group");
  const ppeTransferGroup = document.getElementById("ppe-transfer-group");
  const ppeRecipientGroup = document.getElementById("ppe-recipient-group");
  const ppeItemsGroup = document.getElementById("ppe-items-group");
  const ppeSupplierName = document.getElementById("ppe-supplier-name");
  const ppeSupplierDate = document.getElementById("ppe-supplier-date");
  const ppeSupplierDest = document.getElementById("ppe-supplier-destination");
  const ppeTransferSource = document.getElementById("ppe-transfer-source");
  const ppeTransferDest = document.getElementById("ppe-transfer-destination");
  const ppeRecipientLocationLabel = document.getElementById(
    "ppe-recipient-location-label",
  );
  const ppeRecipientLocation = document.getElementById(
    "ppe-recipient-location",
  );
  const ppeRecipientType = document.getElementById("ppe-recipient-type");
  const ppeRecipientEmployeeGroup = document.getElementById(
    "ppe-recipient-employee-group",
  );
  const ppeRecipientEmployee = document.getElementById(
    "ppe-recipient-employee",
  );
  const ppeRecipientContractorGroup = document.getElementById(
    "ppe-recipient-contractor-group",
  );
  const ppeRecipientContractorCompany = document.getElementById(
    "ppe-recipient-contractor-company",
  );
  const ppeRecipientNid = document.getElementById("ppe-recipient-nid");
  const ppeNidSearchBtn = document.getElementById("ppe-nid-search-btn");
  const ppeRecipientName = document.getElementById("ppe-recipient-name");
  const ppeItemSelect = document.getElementById("ppe-item-select");
  const ppeItemQty = document.getElementById("ppe-item-qty");
  const ppeAddItemBtn = document.getElementById("ppe-add-item-btn");
  const ppeItemBalance = document.getElementById("ppe-item-balance");
  const ppeCartContainer = document.getElementById("ppe-cart-container");
  const ppeNotes = document.getElementById("ppe-notes");
  const ppeSaveBtn = document.getElementById("ppe-save-btn");
  const ppeMainMessage = document.getElementById("ppe-main-message");
  const ppeShowAllEmp = document.getElementById("ppe-show-all-emp"); // (جديد)
  const ppeSaveMessage = document.getElementById("ppe-save-message");

  // (جديد) Stock Report Selectors
  const stockReportProjectSelect = document.getElementById(
    "stock-report-project",
  );
  const stockReportSearchBtn = document.getElementById(
    "stock-report-search-btn",
  );
  const stockReportResultsTable = document.getElementById(
    "stock-report-results-table",
  );
  const stockReportMessage = document.getElementById("stock-report-message");

  // --- Mappings for Sections ---
  const sectionIcons = {
    Dashboard: "fas fa-tachometer-alt",
    NewPermit: "fas fa-file-signature",
    ClosePermit: "fas fa-clipboard-check",
    NewObservation: "fas fa-eye",
    MyObservations: "fas fa-list-check",
    // تقارير الخطر (Hazards)
    NewHazard: "fas fa-exclamation-circle",
    MyHazards: "fas fa-list-alt",
    MonitorPermits: "fas fa-tasks",
    KpiEvaluation: "fas fa-chart-line",
    ContractorEvaluation: "fas fa-hard-hat",
    PpeTransactions: "fas fa-boxes", // (جديد)
    ProjectStockReport: "fas fa-chart-pie", // (جديد)
    NewTraining: "fas fa-chalkboard-teacher",
    TrainingLog: "fas fa-clipboard-list", // <--- (جديد) أيقونة سجل التدريب
    MonitorObservations: "fas fa-search",
    MonitorHazards: "fas fa-search-location",
    NewNcrViolation: "fas fa-exclamation-triangle",
    MyNCRs: "fas fa-clipboard-check",
    MonitorNcrViolations: "fas fa-folder-open",
    NewContractor: "fas fa-file-upload", // أيقونة رفع ملف
    ContractorAnalytics: "fas fa-chart-pie",
    EmployeeReports: "fas fa-id-card", // (جديد)
    NewNearMiss: "fas fa-exclamation-triangle", // Example
    AccidentReport: "fas fa-car-crash",
    MonitorAccidents: "fas fa-file-medical-alt",
    MYAccidents: "fas fa-folder-open",
    DailyHseReport: "fas fa-calendar-check",
    DailyApprovals: "fas fa-check-double",
    MonitorDailyReports: "fas fa-file-archive",
    MonitorKPIs: "fas fa-chart-bar",
    UserTracking: "fas fa-satellite-dish",
    VehicleRegistration: "fas fa-truck-pickup",
    VehicleInspection: "fas fa-clipboard-check",
    ManageVehicles: "fas fa-car-side",
    NewEquipment: "fas fa-snowplow",
    EquipmentInspection: "fas fa-clipboard-check",
    ManageEquipment: "fas fa-toolbox",
    ProjectsLeaderboard: "fas fa-trophy", // الأيقونة
  };
  const sectionNames = {
    Dashboard: "لوحة التحكم",
    NewPermit: "تصريح جديد",
    ClosePermit: "إغلاق التصاريح",
    NewObservation: "تسجيل ملاحظة",
    MyObservations: "متابعة ملاحظاتي",
    NewHazard: "تسجيل خطر (Hazard)",
    MyHazards: "تقارير الخطر المفتوحة",
    MonitorPermits: "سجل التصاريح",
    KpiEvaluation: "تقييم الموظفين",
    ContractorEvaluation: "تقييم المقاولين", // (جديد)
    PpeTransactions: "حركات المخزن", // (جديد)
    ProjectStockReport: "سجل أرصدة المخازن", // (جديد)
    NewTraining: "تسجيل تدريب", // (*** جديد ***) اسم القسم
    TrainingLog: "سجل التدريب", // <--- (جديد) الاسم الظاهر
    MonitorObservations: "سجل الملاحظات",
    MonitorHazards: "سجل المخاطر",
    NewNcrViolation: "تسجيل NCR / مخالفة",
    MyNCRs: "متابعة NCR", // (جديد)
    MonitorNcrViolations: "سجل المخالفات و NCR",
    NewContractor: "تسجيل مقاولين (اشتراطات)",
    ContractorAnalytics: "تحليلات أداء المقاولين",
    EmployeeReports: "تقارير الموظفين", // (جديد)
    AccidentReport: "تسجيل حادث",
    MonitorAccidents: "تقارير مفتوحة",
    NewNearMiss: "Near Miss", // Example
    MYAccidents: "سجل الحوادث",
    DailyHseReport: "تسجيل التقارير اليومية",
    DailyApprovals: "اعتماد التقارير اليومية",
    MonitorDailyReports: "سجل التقارير اليومية",
    MonitorKPIs: "سجل التقييمات", // <--- أضف هذا السطر
    UserTracking: "تتبع المستخدمين (GPS)",
    VehicleRegistration: "تسجيل السيارات",
    VehicleInspection: "فحص السيارات",
    ManageVehicles: "إدارة ومتابعة السيارات",
    NewEquipment: "تسجيل معدة",
    EquipmentInspection: "فحص المعدات",
    ManageEquipment: "إدارة ومتابعة المعدات",
    ProjectsLeaderboard: "لوحة شرف المشاريع", // الاسم
  };

  // (معدل) هيكل القائمة الجانبية (روابط مباشرة للفردي، وقوائم للمجموعات)
  const sidebarStructure = [
    // 1. الرئيسية (رابط مباشر)
    { type: "link", id: "Dashboard" },

    // 2. مجموعة التصاريح (قائمة منسدلة - لأن تحتها 3 حاجات)
    {
      type: "group",
      title: "نظام التصاريح",
      icon: "fas fa-file-contract",
      children: ["NewPermit", "ClosePermit", "MonitorPermits"],
    },

    // 3. مجموعة الملاحظات (قائمة منسدلة - تحتها 2)
    {
      type: "group",
      title: "الملاحظات",
      icon: "fas fa-eye",
      children: ["NewObservation", "MyObservations", "MonitorObservations"], // أفناها هنا
    },

    // 4. مجموعة الهازارد (قائمة منسدلة - تحتها 2)
    {
      type: "group",
      title: "تقارير الخطر",
      icon: "fas fa-exclamation-circle",
      children: ["NewHazard", "MyHazards", "MonitorHazards"], // أضفناها هنا
    },

    // 5. مجموعة المخازن (قائمة منسدلة - تحتها 2)
    {
      type: "group",
      title: "المخازن والمهمات",
      icon: "fas fa-boxes",
      children: ["PpeTransactions", "ProjectStockReport"],
    },

    // 6. نظام التدريب (رابط مباشر - لأنه حاجة واحدة)
    {
      type: "group",
      title: "إدارة التدريب", // غيرنا العنوان ليكون أشمل
      icon: "fas fa-chalkboard-teacher",
      children: ["NewTraining", "TrainingLog"], // <--- (تم دمج القسمين هنا)
    },

    // 7. تقييم الموظفين (رابط مباشر - لأنه حاجة واحدة)
    {
      type: "group",
      title: "نظام التقييم (KPIs)",
      icon: "fas fa-chart-line",
      children: ["KpiEvaluation", "MonitorKPIs", "ContractorEvaluation"],
    },
    {
      type: "group",
      title: "إدارة المقاولين",
      icon: "fas fa-hard-hat",
      children: ["NewContractor", "ContractorAnalytics"],
    },
    {
      type: "group",
      title: "إدارة السيارات",
      icon: "fas fa-truck-pickup",
      children: ["VehicleRegistration", "VehicleInspection", "ManageVehicles"],
    },
    {
      type: "group",
      title: "إدارة المعدات",
      icon: "fas fa-snowplow",
      children: ["NewEquipment", "EquipmentInspection", "ManageEquipment"],
    },
    // 8. أخرى (رابط مباشر)
    { type: "link", id: "NewNearMiss" },
    {
      type: "group",
      title: "المخالفات و NCR",
      icon: "fas fa-exclamation-triangle",
      children: ["NewNcrViolation", "MyNCRs", "MonitorNcrViolations"],
    },
    {
      type: "group",
      title: "إدارة الموظفين",
      icon: "fas fa-users",
      children: ["EmployeeReports"], // "EmployeeReports" هو id السكشن
    },
    {
      type: "group",
      title: "إدارة الحوادث",
      icon: "fas fa-ambulance", // أيقونة المجموعة
      children: ["AccidentReport", "MonitorAccidents", "MYAccidents"],
    },
    {
      type: "group",
      title: "إدارة التقارير اليومية",
      icon: "fas fa-chart-line",
      children: ["DailyHseReport", "DailyApprovals", "MonitorDailyReports"], // سنضيف قسم الاعتماد والسجل لاحقاً هنا
    },
    { type: "link", id: "ProjectsLeaderboard" }, // <--- أضف هذا السطر
    {
      type: "group",
      title: "لوحة تحكم الإدارة",
      icon: "fas fa-cogs",
      children: ["UserTracking"], // ضفنا التتبع هنا
    },
  ];

  // --- === UTILITY FUNCTIONS (Defined FIRST!) === ---
  function showLoader(message = "جاري التحميل...") {
    const loaderText = loader ? loader.querySelector("p") : null;
    if (loaderText) loaderText.textContent = message;
    if (loader) loader.style.display = "flex";
  }
  function hideLoader() {
    setTimeout(() => {
      if (loader) loader.style.display = "none";
    }, 100);
  }

  // --- (جديد) دالة عامة لتعبئة القوائم المنسدلة ---
  function fillSelect(element, dataArray) {
    if (!element) return;
    element.innerHTML = '<option value="">-- اختر --</option>';
    if (dataArray && Array.isArray(dataArray)) {
      dataArray.forEach((item) => {
        // لو العنصر نص عادي
        if (typeof item === "string" || typeof item === "number") {
          element.add(new Option(item, item));
        }
        // لو العنصر كائن (له id و name) زي الموظفين
        else if (item.id && item.name) {
          element.add(new Option(item.name, item.id));
        }
      });
    }
  }

  // --- =================================== ---
  // --- START APPLICATION LOGIC (Defined AFTER helpers)
  // --- =================================== ---
  // 1. الدالة المساعدة لمعرفة الجهاز (نحطها فوق عشان المتصفح يشوفها الأول)
  function getSimpleDeviceInfo() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android Device";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS Device";
    if (/Windows/.test(ua)) return "Windows PC";
    if (/Mac/.test(ua)) return "Mac";
    return "جهاز غير معروف";
  }

  // 2. كود تسجيل الدخول الصارم (يطلب GPS دقيق فقط ويرفض الدخول بدونه)
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const u = document.getElementById("username");
      const p = document.getElementById("password");
      if (!u || !p) return;
      if (loginError) loginError.style.display = "none";

      const deviceInfo = getSimpleDeviceInfo();
      showLoader("جاري تحديد الموقع الدقيق...");

      if (!navigator.geolocation) {
        hideLoader();
        onLoginFailure({ message: "متصفحك لا يدعم تحديد الموقع." });
        return;
      }

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      function onGeoSuccess(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        showLoader("جاري تسجيل الدخول...");

        // تحديث اللوكيشن العالمي فوراً
        window.liveGPS.lat = lat;
        window.liveGPS.lng = lng;

        callApi(
          "checkLogin",
          {
            username: u.value,
            password: p.value,
            trackingData: { lat: lat, lng: lng, device: deviceInfo },
          },
          false,
        )
          .then((r) => onLoginSuccess(r))
          .catch((err) => onLoginFailure(err));
      }

      function onGeoError(error) {
        hideLoader();
        let errorMsg =
          "يجب تفعيل (الموقع/GPS) والموافقة على الصلاحية لتتمكن من الدخول.";

        if (error.code === 1) {
          errorMsg =
            "⛔ تم رفض صلاحية الموقع.\n\nللسماح للدخول:\n1. اذهب لإعدادات الهاتف.\n2. ابحث عن إعدادات المتصفح أو التطبيق.\n3. قم بتفعيل إذن (الموقع / Location) واجعله (سماح دائماً).";
        } else if (error.code === 2) {
          errorMsg =
            "⚠️ الـ GPS مغلق في جهازك. يرجى تشغيل (الموقع/Location) من ستارة الهاتف والمحاولة.";
        } else if (error.code === 3) {
          errorMsg =
            "⏳ انتهى وقت البحث عن الموقع. تأكد أنك في مكان مفتوح لتلقط إشارة الـ GPS.";
        }

        onLoginFailure({ message: errorMsg });
      }

      navigator.geolocation.getCurrentPosition(
        onGeoSuccess,
        onGeoError,
        geoOptions,
      );
    });
  }

  function onLoginSuccess(response) {
    // 1. حفظ التوكن السري فقط (لو الدخول جديد)
    if (!response.isRestore && response.token) {
      localStorage.setItem("hse_user_token", response.token);
    }

    // 2. تحديث بيانات المستخدم في النظام
    currentUser = response.userInfo;
    window.currentUser = response.userInfo;

    // 3. إخفاء شاشة اللوجن وإظهار التطبيق
    if (loginScreen) loginScreen.style.display = "none";
    if (appWrapper) appWrapper.style.display = "flex";

    // 4. تحديث واجهة المستخدم (الاسم، الصلاحيات، والتاريخ)
    const wu = document.getElementById("welcome-user");
    const ur = document.getElementById("user-role");
    if (wu) wu.textContent = `أهلاً، ${currentUser.username}`;
    if (ur) ur.textContent = currentUser.role;

    const dashWelcome = document.getElementById("dash-welcome");
    const dashRoleVal = document.getElementById("dash-role-val");
    const dashDateVal = document.getElementById("dash-date-val");

    if (dashWelcome)
      dashWelcome.textContent = `مرحباً بك، ${currentUser.username}`;
    if (dashRoleVal) dashRoleVal.textContent = currentUser.role;

    if (dashDateVal) {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      dashDateVal.textContent = new Date().toLocaleDateString("ar-EG", options);
    }

    // 5. بناء القائمة الجانبية وتحميل البيانات
    buildSidebar(currentUser.sections);
    loadInitialData();
    showSection("Dashboard");

    // ==============================================================
    // 🚨 المراقبة المستمرة الصارمة للـ GPS (Strict Tracking & Auto Logout)
    // ==============================================================
    if (navigator.geolocation) {
      window.gpsWatcher = navigator.geolocation.watchPosition(
        (pos) => {
          // تحديث اللوكيشن طول ما الموقع مفتوح والـ GPS شغال
          window.liveGPS.lat = pos.coords.latitude;
          window.liveGPS.lng = pos.coords.longitude;
        },
        (err) => {
          // لو قفل الـ GPS من الستارة (Code 2) أو سحب الصلاحية (Code 1) يطرده فوراً
          if (err.code === 1 || err.code === 2) {
            console.warn("GPS Lost or Disabled. Forcing Logout.");
            alert(
              "تنبيه أمني صارم ⛔\nتم إيقاف خدمة الموقع (GPS) أو سحب الصلاحية.\nسيتم تسجيل خروجك فوراً من النظام للحماية.",
            );

            // مسح التوكن وتسجيل الخروج الإجباري
            localStorage.removeItem("hse_user_token");
            location.reload();
          } else {
            // لو الإشارة ضعيفة بس (Code 3) بنصبر عليه ومبنطردوش
            console.warn(
              "GPS signal is weak (Code: " + err.code + "). Waiting...",
            );
          }
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
      );

      // نبض القلب (Heartbeat): إرسال الإحداثيات للسيرفر كل 3 دقائق
      if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
      window.heartbeatInterval = setInterval(() => {
        if (window.liveGPS.lat && window.liveGPS.lng) {
          callApi("heartbeat", { liveGPS: window.liveGPS }, true);
        }
      }, 180000);
    }
  }
  function onLoginFailure(error) {
    const errorMessage =
      error && error.message
        ? error.message
        : "فشل تسجيل الدخول. خطأ غير معروف.";
    if (loginError) {
      loginError.textContent = errorMessage;
      loginError.style.display = "block";
    } else {
      alert(errorMessage);
    }
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("hse_user_token"); // مسح التوكن
      showLoader("تسجيل الخروج...");
      location.reload();
    });
  } else {
    console.error("#logout-btn not found.");
  }
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });
  } else {
    console.error("#sidebar-toggle or #sidebar not found.");
  }
  if (content && sidebar) {
    content.addEventListener("click", function (e) {
      if (
        sidebar.classList.contains("active") &&
        sidebarToggle &&
        !sidebarToggle.contains(e.target)
      ) {
        sidebar.classList.remove("active");
      }
    });
  }

  // (دالة بناء السايد بار الجديدة - تدعم القوائم المنسدلة)
  function buildSidebar(sectionsString) {
    if (!sidebarMenu) return;
    sidebarMenu.innerHTML = "";

    // 1. تحديد صلاحيات المستخدم
    if (!sectionsString) return;
    let userSections = [];
    if (sectionsString.toUpperCase() === "ALL") {
      userSections = Object.keys(sectionNames);
    } else {
      userSections = sectionsString.split(",").map((s) => s.trim());
    }

    // 2. اللف على الهيكل المحدد (sidebarStructure)
    sidebarStructure.forEach((item) => {
      // حالة أ: رابط عادي (ليس مجموعة)
      if (item.type === "link") {
        if (userSections.includes(item.id)) {
          createSingleLink(item.id, sidebarMenu);
        }
      }

      // حالة ب: مجموعة منسدلة
      else if (item.type === "group") {
        // فلترة الأبناء: هل المستخدم لديه صلاحية لأي من أبناء هذه المجموعة؟
        const allowedChildren = item.children.filter((childId) =>
          userSections.includes(childId),
        );

        // إذا كان لديه صلاحية لواحد على الأقل، اعرض المجموعة
        if (allowedChildren.length > 0) {
          createGroupMenu(item.title, item.icon, allowedChildren, sidebarMenu);
        }
      }
    });
  }

  // دالة مساعدة لإنشاء رابط عادي
  function createSingleLink(sectionId, parentContainer) {
    if (!sectionNames[sectionId]) return;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.section = sectionId;
    a.innerHTML = `<i class="${sectionIcons[sectionId]}"></i> ${sectionNames[sectionId]}`;

    a.addEventListener("click", function (e) {
      e.preventDefault();
      handleMenuClick(this);
    });

    li.appendChild(a);
    parentContainer.appendChild(li);
  }

  // دالة مساعدة لإنشاء قائة منسدلة
  function createGroupMenu(title, iconClass, childrenIds, parentContainer) {
    const li = document.createElement("li");

    // 1. رأس لقائمة (العنوان)
    const aToggle = document.createElement("a");
    aToggle.href = "#";
    aToggle.className = "menu-toggle";
    aToggle.innerHTML = `<span><i class="${iconClass}"></i> ${title}</span> <i class="fas fa-chevron-down"></i>`;

    // 2. حاوية الأبناء (Submenu)
    const ulSub = document.createElement("ul");
    ulSub.className = "submenu";

    // إضافة الأبناء
    childrenIds.forEach((childId) => {
      createSingleLink(childId, ulSub);
    });

    // 3. حدث الضغط (فتح/غلق)
    aToggle.addEventListener("click", function (e) {
      e.preventDefault();
      this.classList.toggle("expanded"); // لتدوير السهم
      ulSub.classList.toggle("show"); // لإظهار القائمة
    });

    li.appendChild(aToggle);
    li.appendChild(ulSub);
    parentContainer.appendChild(li);
  }

  // دالة التعامل مع الضغط على الرابط النهائي
  function handleMenuClick(linkElement) {
    const targetId = linkElement.dataset.section;
    showSection(targetId);

    // إزالة Active من الكل
    document
      .querySelectorAll("#sidebar-menu a")
      .forEach((l) => l.classList.remove("active"));
    linkElement.classList.add("active");

    // في الموبايل، اغلق السايد بار
    if (window.innerWidth <= 768 && sidebar) {
      sidebar.classList.remove("active");
    }
  }

  // (*** هذه هي الدالة المُعدلة ***)
  function showSection(sectionId) {
    if (!sectionId) {
      console.error("showSection: no id.");
      return;
    }
    document.querySelectorAll(".page-section").forEach((section) => {
      if (section) section.style.display = "none";
    });
    const target = document.getElementById(sectionId);
    if (target) {
      target.style.display = "block";
      if (sectionId === "NewPermit") resetPermitForm();
      if (sectionId === "NewObservation") {
        // resetObservationForm(); // <-- امسح القيمة دي لو موجودة
        initObservationPage(); // <-- واستدم الجديدة د
      }
      if (sectionId === "MyObservations") loadMyOpenObservations();
      if (sectionId === "ClosePermit") loadOpenPermits();
      if (sectionId === "MonitorPermits") {
        populateMonitorProjects();
        if (monitorResultsTable)
          monitorResultsTable.innerHTML = "<p>حدد معايير البحث...</p>";
        if (monitorMessage) monitorMessage.style.display = "none";
      }
      if (sectionId === "KpiEvaluation") {
        initKpiPage();
      }

      if (sectionId === "PpeTransactions") {
        initPpePage(); // (*** هذا هو السطر الجديد ***)
      }
      if (sectionId === "NewTraining") {
        initTrainingPage();
      }
      // ضف الكود هنا
      if (sectionId === "TrainingLog") {
        initTrainingLogPage();
      }
      if (sectionId === "ProjectStockReport") {
        initStockReportPage(); // (*** هذا هو السطر الجديد ***)
      }
      if (sectionId === "NewHazard") initHazardPage();
      if (sectionId === "MyHazards") loadMyOpenHazards();
      if (sectionId === "MonitorObservations")
        populateMonitorDropdowns(monObsProject);
      if (sectionId === "MonitorHazards")
        populateMonitorDropdowns(monHazProject);
      if (sectionId === "ContractorEvaluation") initContractorEvalPage();
      if (sectionId === "NewNcrViolation") {
        initNcrPage(); // تشغيل الـ NCR
        initViolationPage(); // (nهم) تشغيل المخالفات <-- ده اللي هينشط الكود الرمادي
      }
      if (sectionId === "MyNCRs") loadMyOpenNCRs();
      if (sectionId === "MonitorNcrViolations")
        populateMonitorDropdowns(monNcrVioProject);
      if (sectionId === "NewContractor") initContractorPage();
      if (sectionId === "ContractorAnalytics") {
        // دي الدالة اللي كتبناها في الرد السابق
        if (typeof initContractorAnalyticsPage === "function") {
          initContractorAnalyticsPage();
        }
      }
      if (sectionId === "EmployeeReports") initEmployeeReports();
      if (sectionId === "AccidentReport") initAccidentPage();
      if (sectionId === "MonitorAccidents") loadUserOpenAccidents();
      if (sectionId === "MYAccidents") initMonitorAccidentsPage();
      if (sectionId === "DailyHseReport") {
        initDailyHseReportPage(); // استدعاء دالة التهيئة التي برمجناها في الرد السابق
      }
      if (sectionId === "DailyApprovals") {
        initDailyApprovalsPage();
      }
      if (sectionId === "MonitorKPIs") {
        window.initMonitorKpiPage();
      }
      if (sectionId === "ManageVehicles") window.initManageVehiclesPage();
      if (sectionId === "VehicleInspection") window.initVehicleInspectionPage();
      if (sectionId === "VehicleRegistration") window.initVehiclePage();
      if (sectionId === "UserTracking") window.initUserTrackingPage();
      if (sectionId === "ManageEquipment") window.initManageEquipmentPage();
      if (sectionId === "NewEquipment") window.initNewEquipmentPage();
      if (sectionId === "EquipmentInspection")
        window.initEquipmentInspectionPage();
      if (sectionId === "ProjectsLeaderboard") window.initLeaderboardPage();
      if (sectionId === "MonitorDailyReports")
        window.initMonitorDailyReportsPage();
    } else {
      console.error(`Section "#${sectionId}" not found.`);
      const db = document.getElementById("Dashboard");
      if (db) db.style.display = "block"; // Fallback
      const dbl = sidebarMenu
        ? sidebarMenu.querySelector('a[data-section="Dashboard"]')
        : null;
      if (dbl) {
        sidebarMenu
          .querySelectorAll("a")
          .forEach((a) => a.classList.remove("active"));
        dbl.classList.add("active");
      }
    }
  }
  async function loadInitialData() {
    if (!currentUser) {
      console.error("Cannot load initial data: User not set.");
      return;
    }
    try {
      const r = await callApi("getInitialData", {
        userInfo: currentUser,
      });
      onDataLoaded(r);
    } catch (e) {
      onDataLoadFailure(e);
    }
  }
  function onDataLoaded(response) {
    if (response && response.status === "success") {
      initialData = response;
      populateDropdowns(initialData);
      const ms = document.getElementById("MonitorPermits");
      if (ms && ms.style.display !== "none") populateMonitorProjects();
    } else {
      alert("Failed config: " + (response ? response.message : "?"));
    }
  }
  function onDataLoadFailure(error) {
    alert("Failed config connect: " + error.message);
  }
  // ابحث عن الدالة واستبدلها أو عدلها
  function populateDropdowns(data) {
    if (!data) return;
    const fill = (id, key, defaultOption = "اختر...") => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = `<option value="">${defaultOption}</option>`;
        if (data[key] && Array.isArray(data[key])) {
          data[key].forEach(
            (o) => (select.innerHTML += `<option value="${o}">${o}</option>`),
          );
        } else {
          console.warn(`Data key '${key}' missing/not array for #${id}`);
        }
      } else {
        console.warn(`Select element #${id} not found.`);
      }
    };

    // تعبئة القوائم الأساسية
    fill("permit-project", "projects");
    fill("permit-type", "permitTypes");
    fill("permit-requester", "requesters");
    fill("obs-project", "projects");
    fill("monitor-requester-filter", "requesters", "الكل");

    // (جديد) تعبئة أسباب التأخير
    fill("permit-delay-reason", "delayReasons", "-- اختر السبب --");
  }

  /**
   * (جديد) تفحص الوقت الحالي، لو عدى 8 صباحاً تظهر حقول التأخير
   */
  function checkPermitDelay() {
    const delayGroup = document.getElementById("permit-delay-group");
    const delayReason = document.getElementById("permit-delay-reason");
    const delayDesc = document.getElementById("permit-delay-desc");

    if (!delayGroup) return;

    const now = new Date();
    const currentHour = now.getHours();

    // الشرط: لو الساعة كبر من أو تساوي 8 (يعني من 8:00 وأنت طالع)
    // يمكنك تعديل ا شرط لو عايزها بعد 8:30 مثلاً
    if (currentHour >= 8) {
      delayGroup.style.display = "block";
      delayReason.required = true; // اجباري
      delayDesc.required = true; // اجباري
    } else {
      delayGroup.style.display = "none";
      delayReason.required = false;
      delayDesc.required = false;
      delayReason.value = "";
      delayDesc.value = "";
    }
  }

  function resetPermitForm() {
    if (!permitForm || !currentUser) return;
    permitForm.reset();

    // تعبئة البيانات الافتراضية (المشرف، الوقت، التاريخ)
    const i = document.getElementById("permit-issuer");
    const ts = document.getElementById("permit-timestamp");
    const dt = document.getElementById("permit-date");
    if (i) i.value = currentUser.username;
    if (ts)
      ts.value = new Date().toLocaleString("ar-EG", {
        dateStyle: "short",
        timeStyle: "short",
      });
    if (dt) dt.valueAsDate = new Date();

    // (هام) إخفاء حقل المقاول عند الريسيت
    const subcontractorGroup = document.getElementById(
      "permit-subcontractor-group",
    );
    if (subcontractorGroup) subcontractorGroup.style.display = "none";

    // (هام) فحص الوقت لإظهار/إخفاء أسباب التأخير
    if (typeof checkPermitDelay === "function") {
      checkPermitDelay();
    }
  }

  // --- كود حفظ التصريح (المصحح والآمن) ---
  if (permitForm) {
    permitForm.addEventListener("submit", async function (e) {
      // 1. أهم سطر: منع تحديث الصفحة
      e.preventDefault();

      if (!currentUser) return;

      // 2. تجميع البيانات (باستخدام ?.value لمنع الأخطاء لو العنصر مش oوجود)
      const d = {
        projectName: document.getElementById("permit-project")?.value,
        permitDate: document.getElementById("permit-date")?.value,
        shift: document.getElementById("permit-shift")?.value,
        permitType: document.getElementById("permit-type")?.value,
        requester: document.getElementById("permit-requester")?.value,
        siteEngineer: document.getElementById("permit-engineer")?.value,
        // المقاول
        subcontractor: document.getElementById("permit-subcontractor")?.value,
        location: document.getElementById("permit-location")?.value,
        startTime: document.getElementById("permit-starttime")?.value,
        workersCount: document.getElementById("permit-workers")?.value,
        description: document.getElementById("permit-description")?.value,
        // أسباب التأخير
        delayReason: document.getElementById("permit-delay-reason")?.value,
        delayDescription: document.getElementById("permit-delay-desc")?.value,
      };

      // 3. التحقق من الحقول الأساسية
      if (
        !d.projectName ||
        !d.permitDate ||
        !d.shift ||
        !d.permitType ||
        !d.location ||
        !d.startTime ||
        !d.workersCount ||
        !d.description
      ) {
        showMessage(permitMsg, "الرجاء إكمال الحقول الأساسية.", false);
        return;
      }

      // 4. التحقق من سبب التأخير (فقط لو الحقل ظاهر)
      const delayGroup = document.getElementById("permit-delay-group");
      // نتأكد إن العنصر موجود (مش null) وإن الـ display مش none
      if (
        delayGroup &&
        delayGroup.style.display !== "none" &&
        delayGroup.style.display !== ""
      ) {
        if (!d.delayReason || !d.delayDescription) {
          showMessage(
            permitMsg,
            "عفواً، الوقت تجاوز 8 صباحاً. يجب ذكر سبب التأخير وتفاصيله.",
            false,
          );
          return;
        }
      }

      // 5. الإرسال للسيaفر
      try {
        const r = await callApi("savePermit", {
          permitObject: d,
          userInfo: currentUser,
        });
        onPermitSaveSuccess(r);
      } catch (err) {
        onPermitSaveFailure(err);
      }
    });
  }

  function onPermitSaveSuccess(r) {
    // إظهار رسالة النجاح
    showMessage(permitMsg, r ? r.message : "تم.", true);

    // تصفير الفورم
    resetPermitForm();

    // التكد من إخفاء المقاول
    const subcontractorGroup = document.getElementById(
      "permit-subcontractor-group",
    );
    if (subcontractorGroup) subcontractorGroup.style.display = "none";
  }

  function onPermitSaveFailure(e) {
    // إظهار رسالة الخطأ
    showMessage(permitMsg, e.message, false);
  }

  // =================================== */
  // --- منطق إظهار المقاولين الديناميكي ---
  // =================================== */
  const permitProjectSelect = document.getElementById("permit-project");
  const permitRequesterSelect = document.getElementById("permit-requester");
  const subcontractorGroup = document.getElementById(
    "permit-subcontractor-group",
  );
  const subcontractorSelect = document.getElementById("permit-subcontractor");

  async function checkContractorVisibility() {
    if (!permitProjectSelect || !permitRequesterSelect || !subcontractorGroup)
      return;

    const selectedProject = permitProjectSelect.value;
    const selectedRequester = permitRequesterSelect.value;

    const contractorRequesterName = "المقاول";

    if (selectedProject && selectedRequester === contractorRequesterName) {
      subcontractorGroup.style.display = "block";
      subcontractorSelect.innerHTML =
        '<option value="">جاري التحميل...</option>';
      subcontractorSelect.disabled = true;

      try {
        const response = await callApi("getContractorsForProject", {
          projectName: selectedProject,
        });

        if (response.contractors && response.contractors.length > 0) {
          subcontractorSelect.innerHTML =
            '<option value="">-- اختر المقاول --</option>';
          response.contractors.forEach((name) => {
            subcontractorSelect.options.add(new Option(name, name));
          });
          subcontractorSelect.disabled = false;
          subcontractorSelect.required = true;
        } else {
          subcontractorSelect.innerHTML =
            '<option value="">لا يوجد مقاولين لهذا المشروع</option>';
          subcontractorSelect.disabled = true;
          subcontractorSelect.required = false;
        }
      } catch (error) {
        subcontractorSelect.innerHTML = `<option value="">خطأ: ${error.message}</option>`;
        subcontractorSelect.disabled = true;
      }
    } else {
      subcontractorGroup.style.display = "none";
      subcontractorSelect.innerHTML = "";
      subcontractorSelect.required = false;
    }
  }
  if (permitProjectSelect && permitRequesterSelect) {
    permitProjectSelect.addEventListener("change", checkContractorVisibility);
    permitRequesterSelect.addEventListener("change", checkContractorVisibility);
  }
  // --- نهاية منطق المقاولين ---

  async function loadOpenPermits() {
    if (!currentUser) return;
    const lc = document.getElementById("open-permits-list");
    if (lc) lc.innerHTML = "<p>تحميل...</p>";
    try {
      const r = await callApi("getOpenPermits", {
        userInfo: currentUser,
      });
      onOpenPermitsLoaded(r);
    } catch (e) {
      onOpenPermitsLoadFailure(e);
    }
  }
  function onOpenPermitsLoaded(response) {
    const lc = document.getElementById("open-permits-list");
    if (!lc) return;

    if (response.permits && response.permits.length === 0) {
      lc.innerHTML =
        "<p style='text-align:center; padding:20px; color:#666;'>لا توجد تصاريح مفتوحة.</p>";
      return;
    }

    if (response.permits) {
      lc.innerHTML = "";
      response.permits.forEach((p) => {
        const card = document.createElement("div");
        card.className = "permit-card";
        card.innerHTML = `
          <div class="permit-info">
            <p><strong>المشروع:</strong> ${p.project || "-"}</p>
            <p><strong>النوع:</strong> ${p.type || "-"}</p>
            <p><strong>التاريخ:</strong> ${p.date || "-"}</p>
            <p><strong>الوصف:</strong> ${p.description || "-"}</p>
            <p><strong>ID:</strong> ${p.id || "-"}</p>
          </div>
          <button class="btn-close" data-id="${p.id}">
            <i class="fas fa-check-circle"></i> إغلاق
          </button>
        `;

        const btn = card.querySelector(".btn-close");
        if (btn) {
          btn.addEventListener("click", function () {
            // شيلنا الـ confirm المزعج من هنا، وبنستدعي النافذة المنبثقة فوراً
            window.handleClosePermit(this.dataset.id);
          });
        }
        lc.appendChild(card);
      });
    } else {
      lc.innerHTML = `<p class="error-message" style="display:block;">${(response && response.message) || "فشل تحميل."}</p>`;
    }
  }

  function onOpenPermitsLoadFailure(e) {
    const lc = document.getElementById("open-permits-list");
    if (lc)
      lc.innerHTML = `<p class="error-message" style="display:block;">${e.message}</p>`;
  }
  // =================================================================
  // دالة إغلاق التصريح مع النافذة المنبثقة الاحترافية (Custom Modal)
  // =================================================================
  let currentClosingPermitId = null;

  window.handleClosePermit = function (id) {
    if (!id) return;
    currentClosingPermitId = id; // حفظ الـ ID عشان نستخدمه وقت الحفظ

    // 1. البحث عن النافذة، لو مش موجودة نصنعها
    let closeModal = document.getElementById("custom-close-permit-modal");

    if (!closeModal) {
      closeModal = document.createElement("div");
      closeModal.id = "custom-close-permit-modal";
      closeModal.className = "modal";
      // تنسيق النافذة (خلفية شفافة وتوسيط)
      closeModal.style.cssText =
        "display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center; backdrop-filter: blur(4px);";

      closeModal.innerHTML = `
              <div class="modal-content" style="background: #fff; padding: 25px; border-radius: 12px; max-width: 450px; width: 90%; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out;">

                  <button onclick="document.getElementById('custom-close-permit-modal').style.display='none'" style="position: absolute; top: 15px; left: 15px; background: transparent; border: none; font-size: 1.8rem; color: #aaa; cursor: pointer; line-height: 1;">&times;</button>

                  <h3 style="color: #c8102e; margin-top: 0; margin-bottom: 15px; font-size: 1.4rem; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                      <i class="fas fa-clipboard-check"></i> إغلاق التصريح
                  </h3>

                  <p style="font-size: 1rem; color: #444; margin-bottom: 20px;">
                      تصريح رقم: <strong id="modal-permit-id-display" style="color: #0056b3; font-size: 1.1rem;"></strong><br>
                      هل ترغب في تحديث عدد العمال الفعلي قبل الإغلاق؟
                  </p>

                  <div class="form-group" style="text-align: right; margin-bottom: 25px;">
                      <label style="font-weight: 600; color: #555; margin-bottom: 8px; display: block;">العدد الفعلي للعمال (اختياري):</label>
                      <input type="number" id="custom-close-workers-input" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 1.1rem; text-align: center; outline: none; transition: 0.3s;" placeholder="اكتب العدد الجديد هنا..." min="1" onfocus="this.style.borderColor='#c8102e'" onblur="this.style.borderColor='#ddd'">
                  </div>

                  <div style="display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap;">
                      <button onclick="window.executeClosePermit(true)" class="btn" style="flex: 1; background: #28a745; color: #fff; padding: 12px; font-size: 1rem; border: none; border-radius: 6px; cursor: pointer;">
                          <i class="fas fa-check-circle"></i> تحديث وإغلاق
                      </button>
                      <button onclick="window.executeClosePermit(false)" class="btn" style="flex: 1; background: #6c757d; color: #fff; padding: 12px; font-size: 1rem; border: none; border-radius: 6px; cursor: pointer;">
                          <i class="fas fa-times-circle"></i> إغلاق كما هو
                      </button>
                  </div>
              </div>
          `;
      document.body.appendChild(closeModal);
    }

    // 2. تصفير الحقل ووضع رقم التصريح
    document.getElementById("modal-permit-id-display").textContent = id;
    document.getElementById("custom-close-workers-input").value = "";

    // 3. إظهار النافذة
    closeModal.style.display = "flex";
  };

  // دالة التنفيذ التي يتم استدعاؤها من أزرار النافذة المنبثقة
  window.executeClosePermit = async function (withUpdate) {
    const id = currentClosingPermitId;
    if (!id) return;

    let newWorkersCount = null;

    // لو المستخدم اختار "تحديث وإغلاق"
    if (withUpdate) {
      const inputVal = document.getElementById(
        "custom-close-workers-input",
      ).value;
      const parsedCount = parseInt(inputVal, 10);

      if (isNaN(parsedCount) || parsedCount <= 0) {
        alert("الرجاء إدخال رقم صحيح لعدد العمال، أو اختر 'إغلاق كما هو'.");
        document.getElementById("custom-close-workers-input").focus();
        return; // نوقفه عشان ميكملش
      }
      newWorkersCount = parsedCount;
    }

    // إخفاء النافذة المنبثقة
    document.getElementById("custom-close-permit-modal").style.display = "none";

    // تشغيل اللودر وإرسال الطلب للسيرفر
    if (typeof showLoader === "function") showLoader("جاري إغلاق التصريح...");

    try {
      const r = await callApi("closePermit", {
        permitId: id,
        updatedWorkers: newWorkersCount,
      });

      // استدعاء دالة النجاح لتحديث القائمة وإظهار الرسالة
      if (typeof onPermitClosed === "function") {
        onPermitClosed(r);
      } else {
        alert(r.message);
        if (typeof loadOpenPermits === "function") loadOpenPermits();
      }
    } catch (e) {
      if (typeof onPermitCloseFailure === "function") {
        onPermitCloseFailure(e);
      } else {
        alert("خطأ: " + e.message);
      }
    } finally {
      if (typeof hideLoader === "function") hideLoader();
    }
  };

  function onPermitClosed(r) {
    showMessage(closePermitMsg, r ? r.message : "تم.", true);
    loadOpenPermits();
  }
  function onPermitCloseFailure(e) {
    showMessage(closePermitMsg, e.message, false);
  }
  function populateMonitorProjects() {
    if (
      !monitorProjectFilter ||
      !currentUser ||
      !initialData ||
      !initialData.projects
    ) {
      if (monitorProjectFilter)
        monitorProjectFilter.innerHTML =
          '<option value="ALL_ACCESSIBLE">All</option><option disabled>Err</option>';
      return;
    }
    monitorProjectFilter.innerHTML =
      '<option value="ALL_ACCESSIBLE">All Accessible</option>';
    initialData.projects.forEach(
      (p) =>
        (monitorProjectFilter.innerHTML += `<option value="${p}">${p}</option>`),
    );
  }
  // تحديث جدول المتابعة (Monitor Observations Table)
  // 1. تحديث جدول المتابعة (Monitor Observations Table) - تأكيد وجود المصدر
  function renderMonitorTable(data, container) {
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="text-align:center;">لا توجد نتائج.</p>';
      return;
    }

    let html = `<table class="results-table">
          <thead>
              <tr>
                  <th>الكود</th>
                  <th>التاريخ</th>
                  <th>المسجل</th>
                  <th>المشروع</th>
                  <th>مصدر الملاحظة</th> <th>الوصف</th>
                  <th>الحالة</th>
              </tr>
          </thead>
          <tbody>`;

    data.forEach((row) => {
      let dateDisplay = row.date;
      try {
        const d = new Date(row.date);
        if (!isNaN(d.getTime())) {
          dateDisplay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      } catch (e) {}

      html += `<tr>
              <td style="white-space:nowrap;"><strong>${row.id}</strong></td>
              <td style="white-space:nowrap;">${dateDisplay}</td>
              <td style="color:#0056b3; font-weight:500;">${row.issuer || "-"}</td>
              <td>${row.project}</td>

              <td style="font-weight:bold;">${row.source || "-"}</td> <td class="desc-cell">${row.desc}</td>
              <td><span class="badge ${row.status === "Open" ? "bg-danger" : "bg-success"}">${row.status}</span></td>
          </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }
  async function performSearch() {
    if (!currentUser || !monitorProjectFilter /*...etc*/) return;
    const f = {
      selectedProject: monitorProjectFilter.value,
      selectedRequester: monitorRequesterFilter.value || null,
      fromDate: monitorFromDate.value || null,
      toDate: monitorToDate.value || null,
      showOpenOnly: monitorOpenOnly.checked,
    };
    if (f.fromDate && f.toDate && new Date(f.fromDate) > new Date(f.toDate)) {
      showMessage(monitorMessage, "'From' before 'To'.", false);
      return;
    }
    if (monitorMessage) monitorMessage.style.display = "none";
    if (monitorResultsTable)
      monitorResultsTable.innerHTML = "<p>Searching...</p>";
    try {
      const r = await callApi("searchPermits", {
        filters: f,
        userInfo: currentUser,
      });
      onSearchSuccess(r);
    } catch (e) {
      onSearchFailure(e);
    }
  }
  function onSearchSuccess(response) {
    const countBadge = document.getElementById("monitor-count-badge");
    const countSpan = document.getElementById("permits-total-count");
    const permits = response.permits || [];

    // تحديث العداد
    if (countBadge && countSpan) {
      if (permits.length > 0) {
        countSpan.textContent = permits.length;
        countBadge.style.display = "block"; // إظهار العداد
      } else {
        countBadge.style.display = "none"; // إخفاء لو مفيش نتائج
      }
    }

    buildResultsTable(permits);
  }
  function onSearchFailure(error) {
    const countBadge = document.getElementById("monitor-count-badge");
    if (countBadge) countBadge.style.display = "none"; // إخفاء العداد في حالة الخطأ

    showMessage(monitorMessage, error.message, false);
    if (monitorResultsTable) monitorResultsTable.innerHTML = "";
  }
  if (monitorSearchBtn) {
    monitorSearchBtn.addEventListener("click", performSearch);
  } else {
    console.error("#monitor-search-btn not found.");
  }
  // =================================================================
  // --- دالة رسم جدول نتائج البحث للتصاريح (Updated Colors) ---
  // =================================================================

  function buildResultsTable(data) {
    const container = document.getElementById("monitor-results-table");
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; padding:20px; color:#666;">لا توجد تصاريح مطابقة للشروط.</p>';
      return;
    }

    // بناء الجدول
    let html = `
        <table class="results-table" style="width:100%; font-size:0.9rem;">
            <thead>
                <tr>
                    <th>رقم التصريح</th>
                    <th>التاريخ</th>
                    <th>المشروع</th>
                    <th>النوع</th>
                    <th style="width:30%;">الوصف</th>
                    <th>المصدر</th>
                    <th>الحالة</th>
                    <th>عرض</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((row) => {
      let dateDisplay = row.permitDate || "-";

      // تنسيق لون الحالة (التعديل هنا)
      const status = String(row.status || "").trim();
      let badgeClass = "bg-secondary";
      let statusText = status;

      if (status.toLowerCase() === "open") {
        // (*** تعديل: المفتوح أصبح أحمر ***)
        badgeClass = "bg-danger";
        statusText = "مفتوح";
      } else if (
        status.toLowerCase() === "closed" ||
        status.toLowerCase() === "close"
      ) {
        // (*** تعديل: المغلق أصبح أخضر ***)
        badgeClass = "bg-success";
        statusText = "مغلق";
      }

      html += `
                <tr>
                    <td style="font-weight:bold;">${row.id}</td>

                    <td style="white-space:nowrap;">${dateDisplay}</td>

                    <td>${row.projectName || "-"}</td>

                    <td>${row.permitType || "-"}</td>

                    <td style="text-align:right; white-space: pre-wrap;">${row.description || "-"}</td>
                    <td style="color:#0056b3; font-weight:bold;">${row.issuer || "-"}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td>
                        <button type="button" class="btn-small btn-secondary" onclick="alert('تفاصيل إضافية:\\nالطالب: ${row.requester || "غير محدد"}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
  }
  // --- =================================== ---
  // --- KPI EVALUATION LOGIC (V2.1 Module) ---
  // --- =================================== ---

  // 1. تهيئة الصفحة (تستدعى عند فتح قسم التقييم)
  window.initKpiPage = async function () {
    console.log("تحديث صفحة التقييم...");

    // جلب العناصر
    const empNameDisplay = document.getElementById("kpi-emp-name-display");
    const empIdHidden = document.getElementById("kpi-emp-id-hidden");
    const kpiPeriodSelect = document.getElementById("kpi-period-select");
    const jobTitleEl = document.getElementById("kpi-employee-jobtitle");
    const guidelines = document.getElementById("kpi-guidelines-container");
    const listContainer = document.getElementById("kpi-list-container");
    const saveBtn = document.getElementById("kpi-save-btn");

    // ريست للواجهة
    if (empNameDisplay) empNameDisplay.value = "";
    if (empIdHidden) empIdHidden.value = "";
    if (jobTitleEl) {
      jobTitleEl.innerHTML = "";
      jobTitleEl.style.display = "none";
    }
    if (guidelines) guidelines.style.display = "block"; // إظهار الإرشادات مرة أخرى
    if (listContainer)
      listContainer.innerHTML =
        "<p style='text-align:center; padding:20px; color:#777;'>الرجاء اختيار الموظف وفترة التقييم لبدء التقييم...</p>";
    if (saveBtn) saveBtn.style.display = "none";

    // ضبط الشهر الحالي تلقائياً لو فاضي
    if (kpiPeriodSelect && !kpiPeriodSelect.value) {
      const now = new Date();
      kpiPeriodSelect.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    try {
      const r = await callApi("getKpiInitData", {
        userInfo: currentUser,
        selectedPeriod: kpiPeriodSelect.value,
      });
      if (r.status === "success") {
        window.ppeEmployees = r.employees;
        evaluatedEmpIds = r.evaluatedIds;
      }
    } catch (e) {
      console.error("Error updating KPI data:", e);
    }
  };

  async function loadKpiEmployees() {
    if (!currentUser) return;
    if (kpiEmployeeSelect.options.length > 1) {
      console.log("Employees already loaded.");
      kpiEmployeeSelect.disabled = false;
      return;
    }
    kpiEmployeeSelect.innerHTML = '<option value="">جاري تحميل...</option>';
    kpiEmployeeSelect.disabled = true;
    try {
      const response = await callApi("getEmployeesToEvaluate", {
        userInfo: currentUser,
      });
      if (response.status === "success" && response.employees) {
        kpiEmployeeSelect.innerHTML =
          '<option value="">-- اختر موظفاً --</option>';
        if (response.employees.length === 0) {
          kpiEmployeeSelect.innerHTML =
            '<option value="">لا يوجد موظفين</option>';
          showMessage(
            kpiMessageArea,
            "لا يوجد موظفين مسجلين تحت إدارتك.",
            false,
          );
        } else {
          response.employees.forEach((emp) => {
            const option = new Option(`${emp.name} (${emp.id})`, emp.id);

            // (*** التعديل هنا ***)
            option.dataset.jobtitle = emp.jobTitle;
            option.dataset.project = emp.project; // تخزين اسم المشروع
            // (*** نهاية التعديل ***)

            kpiEmployeeSelect.options.add(option);
          });
        }
        kpiEmployeeSelect.disabled = false;
      } else {
        throw new Error(response.message || "Failed to load employees.");
      }
    } catch (error) {
      showMessage(kpiMessageArea, error.message, false);
      kpiEmployeeSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
    }
  }
  function handleKpiSelectionChange() {
    const employeeId = kpiEmployeeSelect.value;
    const periodValue = kpiPeriodSelect.value; // "YYYY-MM"
    kpiEmployeeJobTitle.textContent = "";
    kpiListContainer.innerHTML =
      "<p> الرجاء اختيار الموظف وفترة التقييم...</p>";
    kpiSaveBtn.style.display = "none";
    showMessage(kpiMessageArea, "", true);
    showMessage(kpiSaveMessage, "", true);
    if (employeeId && periodValue) {
      const period = `${periodValue}-01`;

      // (*** التعديل هنا ***)
      const selectedOption =
        kpiEmployeeSelect.options[kpiEmployeeSelect.selectedIndex];
      const jobTitle = selectedOption.dataset.jobtitle;
      const project = selectedOption.dataset.project || "غير محدد"; // جلب اسم المشروع

      // عرض الوظيفة والمشروع معاً
      kpiEmployeeJobTitle.textContent = `المسمى الوظيفي: ${jobTitle} | المشروع: ${project}`;
      // (*** نهاية التعديل ***)

      kpiEmployeeJobTitle.style.display = "block";
      loadKpisForEmployee(employeeId, period);
    }
  }

  // --- نهاية كود KPIs ---

  // =================================================================
  // --- (*** هذا هو الكود الجديد بالكامل ***) ---
  // --- (جديد) وحدة حركات المخزن (PPE) ---
  // =================================================================

  // متغيرات لحفظ البيانات (عشان منطلبهاش كل مرة)
  let ppeLocations = [];
  let ppeEmployees = [];
  let ppeContractors = [];
  let ppeItems = [];
  let ppeCart = []; // (جديد) سلة المهمات

  /**
   * دالة بدء تشغيل صفحة المخزن (يتم استدعاؤها من showSection)
   */
  /**
   * دالة بدء تشغيل صفحة المخزن
   */
  async function initPpePage() {
    console.log("بدء تشغيل صفحة المخزن...");
    ppeForm.reset();
    updatePpeFormUI();
    ppeCart = [];
    updatePpeCartUI();

    try {
      // نستخدم البيانات المحملة مسبقاً إذا وجدت، أو نحمها
      if (typeof ppeLocations === "undefined" || ppeLocations.length === 0) {
        const data = await callApi("getInventoryInitData", {
          userInfo: currentUser,
        });
        if (data.status === "success") {
          ppeLocations = data.locations;
          window.ppeEmployees = data.employees;
          ppeContractors = data.contractors;
          ppeItems = data.ppeItems;
        }
      }

      // (*** التعديل الهام ***) ملء جميع قوائم المخازن
      // فلترة المشاريع المتاحة للمستخدم
      const userProj = (currentUser.projects || "").toString();
      const availableLocs =
        userProj === "ALL"
          ? ppeLocations
          : ppeLocations.filter((p) => userProj.includes(p));

      populateSelect(ppeRecipientLocation, availableLocs);
      populateSelect(ppeTransferSource, availableLocs); // "من مخزن" يظهر مشروعاتي فقط

      // ب) القوائم التي تظهر كل مشاريع الشركة (إلى أين أورد أو أحول)
      populateSelect(ppeSupplierDest, ppeLocations); // التوريد قد يكون لأي مشروع
      populateSelect(ppeTransferDest, ppeLocations); // "إلى مخزن" يظهر كل المشاريع

      if (ppeContractors)
        populateSelect(ppeRecipientContractorCompany, ppeContractors);
    } catch (e) {
      showMessage(ppeMainMessage, `خطأ في تحميل البيانات: ${e.message}`, false);
    }
  }

  /**
   * (مهم) الدالة اللي بتخفي وتظهر الحقول بناءً على نوs الحركة
   */
  function updatePpeFormUI() {
    const type = ppeTransactionType.value;

    // إخفاء كل الأجزاء أولاً
    ppeSupplierGroup.style.display = "none";
    ppeTransferGroup.style.display = "none";
    ppeRecipientGroup.style.display = "none";
    ppeItemsGroup.style.display = "none";
    ppeSaveBtn.disabled = true;

    // مس كل اtرسائل
    showMessage(ppeMainMessage, "", true);
    showMessage(ppeSaveMessage, "", true);

    if (!type) return; // لو مفيش اختيار

    // إظهار الأجزاء المطلوبة
    ppeItemsGroup.style.display = "block"; // سلة المهمات ظاهرة دايماً
    ppeSaveBtn.disabled = false;

    switch (type) {
      case "صرف":
        ppeRecipientGroup.style.display = "block";
        ppeRecipientLocationLabel.textContent = "الصرف من مخزن:";
        checkRecipientTypeUI(); // إظهار الموظف أو المقاول
        break;
      case "مرتجع":
        ppeRecipientGroup.style.display = "block";
        ppeRecipientLocationLabel.textContent = "الاستلام في مخزن:";
        checkRecipientTypeUI(); // إظهار الموظف أو المقاول
        break;
      case "تحويل":
        ppeTransferGroup.style.display = "block";
        break;
      case "توريد":
        ppeSupplierGroup.style.display = "block";
        // ضبط تاريخ التوريد لليوم
        if (ppeSupplierDate) ppeSupplierDate.valueAsDate = new Date();
        break;
    }

    // (*** السطر الجديد: أضفه هنا ***)
    // بعد ما تخفي وتظهر الحقول، حدث قايمة المهمات
    refreshPpeItemsDropdown();
  }

  /**
   * (معدل) دالة مساعدة لإظهار/إخفاء حقول الموظف/المقاول
   */
  window.checkRecipientTypeUI = function () {
    const type = document.getElementById("ppe-recipient-type").value;

    // إظهار وإخفاء المجموعات
    document.getElementById("ppe-recipient-employee-group").style.display =
      type === "موظف" ? "block" : "none";
    document.getElementById("ppe-recipient-contractor-group").style.display =
      type === "مقاول" ? "block" : "none";

    if (type === "موظف") {
      // حذفنo استدعاء updateEmployeeDropdown() لأنه لم يعد هناك قائمة منسدلة
      console.log(
        "تم اختيار نوع المستلم: موظف. بانتظار فتح النافذة المنبثقة للاختيار.",
      );
    } else if (type === "مقاول") {
      if (typeof updatePpeContractorDropdown === "function")
        updatePpeContractorDropdown();
    }
  };

  // --- دوال اختيار الموظف في المخزن (PPE Selector) ---

  window.openPpeEmpSelector = function () {
    const selectedProject = document.getElementById(
      "ppe-recipient-location",
    ).value;
    const showAll = document.getElementById("ppe-show-all-emp").checked;

    // التحقق من اختيار المخزن/المشروع أولاً
    if (!selectedProject && !showAll) {
      alert("الرجاء اختيار المخزن أولاً أو تفعيل خيار 'عرض الكل'");
      return;
    }

    if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
      alert("جاري تحميل بيانات الموظفين... انتظر ثانية وجرب مرة أخرى.");
      return;
    }

    document.getElementById("ppe-emp-modal").style.display = "flex";
    document.getElementById("ppe-emp-search-box").value = "";
    document.getElementById("ppe-emp-search-box").focus();

    // فلترة القائمة الأولية
    const list = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === selectedProject);
    renderPpeEmpsInModal(list);
  };

  window.closePpeEmpSelector = function () {
    document.getElementById("ppe-emp-modal").style.display = "none";
  };

  // رسم الأسماء داخل المودال
  function renderPpeEmpsInModal(list) {
    const container = document.getElementById("ppe-emp-list-container");
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; padding:20px;">لا توجد نتائج</p>';
      return;
    }

    container.innerHTML = list
      .map(
        (e) => `
          <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:8px;" 
               onclick="window.selectPpeEmployee('${e.id}', '${e.name}')">
              <div style="text-align:right;">
                  <span style="display:block; font-weight:700;">${e.name}</span>
                  <small style="color:#666;">ID: ${e.id} | Project: ${e.project}</small>
              </div>
              <i class="fas fa-hand-pointer" style="color:#ccc;"></i>
          </div>
      `,
      )
      .join("");
  }

  // بحث مباشر داخل المودال
  window.filterPpeEmpList = function () {
    const query = document
      .getElementById("ppe-emp-search-box")
      .value.toLowerCase();
    const selectedProject = document.getElementById(
      "ppe-recipient-location",
    ).value;
    const showAll = document.getElementById("ppe-show-all-emp").checked;

    // التأكد من وجود بيانات للبحث فيها
    if (!window.ppeEmployees) return;

    const baseList = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === selectedProject);

    const filtered = baseList.filter(
      (e) =>
        (e.name && e.name.toLowerCase().includes(query)) ||
        (e.id && e.id.toString().includes(query)),
    );
    renderPpeEmpsInModal(filtered);
  };

  // عند اختيار الموظف
  window.selectPpeEmployee = function (id, name) {
    document.getElementById("ppe-emp-name-display").value = name;
    document.getElementById("ppe-emp-id-hidden").value = id;
    window.closePpeEmpSelector();
  };
  /**
   * (جديد) دالة فلترة قايمة الموظفين بناءً على المشروع المختار
   */
  /**
   * (معدل) دالة فلترة قايمة الموظفين بناءً على المشروع أو عرض الكل
   */
  /*
  function updateEmployeeDropdown() {
    // 1. هات اسم المشروع المختار
    const selectedProject = ppeRecipientLocation.value;
    const showAll = ppeShowAllEmp.checked; // هل الزرار متعلم؟

    // 2. تفريغ القائمة
    ppeRecipientEmployee.innerHTML = '<option value="">-- اختر --</option>';

    // لو مفيش مشروع ومفيش عرض للكل، نخرج
    if (!selectedProject && !showAll) {
      ppeRecipientEmployee.innerHTML =
        '<option value="">-- اختر المشروع أولاً --</option>';
      return;
    }

    // 3. تحديد القائمة (إما الكل أو المفلترة)
    let list = [];
    if (showAll) {
      list = ppeEmployees; // كل الموظفين
    } else {
      // فلترة حسب المشروع فقط
      list = ppeEmployees.filter((emp) => emp.project === selectedProject);
    }

    // 4. العرض
    if (list.length === 0) {
      ppeRecipientEmployee.innerHTML =
        '<option value="">-- لا يوجد موظفين --</option>';
      return;
    }

    // 5. ملء القائمة
    list.forEach((emp) => {
      // لو بنعرض الكل، بنكتب اسم المشروع جنب اسمه للتوضيح
      const displayText = showAll ? `${emp.name} (${emp.project})` : emp.name;

      const opt = new Option(displayText, emp.id);
      // بننقل ال٨يانات الإضافية عشان لو احتاجناها في الحفظ
      opt.dataset.company = emp.company;
      opt.dataset.project = emp.project;

      ppeRecipientEmployee.add(opt);
    });
  }
*/
  /**
   * (جديد) تحديث قائمة المقاولين بناءً على المشروع المختار
   */
  async function updatePpeContractorDropdown() {
    const selectedProject = ppeRecipientLocation.value;

    // لو Tفيش مشروع أو النوع مش مقاول، مفيش داعي نحمل
    if (!selectedProject || ppeRecipientType.value !== "مقاول") {
      return;
    }

    ppeRecipientContractorCompany.innerHTML =
      '<option value="">جاري التحميل...</option>';
    ppeRecipientContractorCompany.disabled = true;

    try {
      // استدعاء نفس الدالة الموجودة في السيرفر
      const response = await callApi("getContractorsForProject", {
        projectName: selectedProject,
      });

      ppeRecipientContractorCompany.innerHTML =
        '<option value="">-- اختر شركة المقاول --</option>';

      if (response.contractors && response.contractors.length > 0) {
        response.contractors.forEach((name) => {
          ppeRecipientContractorCompany.add(new Option(name, name));
        });
        ppeRecipientContractorCompany.disabled = false;
      } else {
        ppeRecipientContractorCompany.innerHTML =
          '<option value="">-- لا يوجد مقاولين --</option>';
      }
    } catch (e) {
      console.error(e);
      ppeRecipientContractorCompany.innerHTML =
        '<option value="">خطأ في التحميل</option>';
    }
  }
  /**
   * (جديد) الدالة الذكية لفلترة قايمة المهمات حسب نوع الحركة والمخزن
   */
  /**
   * (تحديث) الدالة الذكية لفلترة قايمة المهمات
   * تعالج مشكلة التعليق وتظهر حالة التحميل بوضوح
   */
  async function refreshPpeItemsDropdown() {
    const type = ppeTransactionType.value;
    let sourceLocation = null;

    // تحديد المخزن المصدر بناءً على العملية
    if (type === "صرف") {
      sourceLocation = ppeRecipientLocation.value;
    } else if (type === "تحويل") {
      sourceLocation = ppeTransferSource.value;
    }

    // تنظيف القائمة فوراً قبل أي حاجة
    ppeItemSelect.innerHTML = '<option value="">-- اختر --</option>';
    ppeItemSelect.disabled = true;

    // (الحالة 1: مرتجع أو توريد) - اعرض كل حاجة من القائمة المحملة مسبقاً
    if (type === "مرتجع" || type === "توريد") {
      if (ppeItems && ppeItems.length > 0) {
        populateSelect(ppeItemSelect, ppeItems, "id", "name");
        ppeItemSelect.disabled = false;
      } else {
        ppeItemSelect.innerHTML =
          '<option value="">جاري تحميل القائمة الرئيسية...</option>';
        // محاولة إعادة تحميل اليانات لو مش موجودة
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          ppeItems = r.ppeItems; // تحديث المتغير العام
          populateSelect(ppeItemSelect, ppeItems, "id", "name");
          ppeItemSelect.disabled = false;
        } catch (e) {
          ppeItemSelect.innerHTML =
            '<option value="">فشل تحميل المهمات</option>';
        }
      }
      return;
    }

    // (الحالة 2: صرف أو تحويل) - لازم نفلتر
    if (!sourceLocation) {
      ppeItemSelect.innerHTML =
        '<option value="">-- اختر المخزن أولاً --</option>';
      return;
    }

    // (الحالة 3: صرف/تحويل + تم اختيار مخزن) -> هنا المشكلة كانت بتحصل
    ppeItemSelect.innerHTML =
      '<option value="">⏳ جاري جلب الرصيد من المخزن...</option>';

    try {
      const response = await callApi("getAvailableItemsForLocation", {
        locationName: sourceLocation,
      });
      const availableIds = response.availableItemIds;

      if (!availableIds || availableIds.length === 0) {
        ppeItemSelect.innerHTML = '<option value="">🚫 المخزن فارغ</option>';
        return;
      }

      // فلترة القايمة الرئيسية
      const availableItems = ppeItems.filter((item) =>
        availableIds.includes(item.id),
      );

      // تعبئة القائمة
      populateSelect(ppeItemSelect, availableItems, "id", "name");

      // (إضافة) عرض عدد الأصناف المتاحة في أول خير كنوع من التأكيد
      ppeItemSelect.options[0].text = `-- اختر المهمة (${availableItems.length} صنف متاح) --`;

      ppeItemSelect.disabled = false;
    } catch (e) {
      console.error(e);
      ppeItemSelect.innerHTML = ppeItemSelect.innerHTML =
        '<option value="">⚠️ خطاء فى الاتصال</option>';
      showMessage(
        ppeMainMessage,
        "فشل جلب محتويات المخزن. حاول تغيير المشروع واختياره مرة أخرى.",
        false,
      );
    }
  }

  /**
   * (جديد) دالة البحث بالرقم القومي
   */
  async function searchByNID() {
    const nid = ppeRecipientNid.value;
    if (!nid || nid.length < 5) {
      showMessage(ppeMainMessage, "الرجاء إدخال رقم قومي/ID صحيح.", false);
      return;
    }

    showMessage(ppeMainMessage, "", true); // إخفاء الرسالة
    ppeRecipientName.value = "جاري البحث...";
    ppeRecipientName.disabled = true;

    try {
      const response = await callApi("getRecipientByNID", {
        nationalId: nid,
      });
      if (response.status === "found") {
        ppeRecipientName.value = response.name;
        ppeRecipientName.disabled = true; // موجود، اقفل الخانة
        ppeRecipientContractorCompany.value = response.contractor;
      } else if (response.status === "not_found") {
        ppeRecipientName.value = "";
        ppeRecipientName.placeholder = "مستلم جديد، الرجاء إدخال الاسم بالكامل";
        ppeRecipientName.disabled = false; // اسم جديد، افتح الخانة
        ppeRecipientName.focus();
      }
    } catch (e) {
      showMessage(ppeMainMessage, e.message, false);
      ppeRecipientName.value = "";
    }
  }

  /**
   * (معدل) دالة إضافة مهمة "لسلة التسوق"
   * (تتأكد من الرصيد أولاً قبل الإضافة)
   */
  async function addItemToCart() {
    const itemId = ppeItemSelect.value;
    const qty = parseInt(ppeItemQty.value);
    const type = ppeTransactionType.value;

    showMessage(ppeMainMessage, "", true); // إخفاء أي خطأ قديم
    const originalButtonHtml = ppeAddItemBtn.innerHTML; // حفظ شكل الزرار
    ppeAddItemBtn.disabled = true;
    ppeAddItemBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // إظهار لودر

    try {
      if (!itemId || !qty || qty <= 0) {
        throw new Error("الرجاء اختيار مهمة وكمية صحيحة.");
      }

      // (*** هذا هو المنطق الجديد  لتحق من الرصيد ***)
      // (التحقق من الرصيد مطلوب فقط في "الصرف" و "التحويل")
      if (type === "صرف" || type === "تحويل") {
        let sourceLocation = null;
        if (type === "صرف") sourceLocation = ppeRecipientLocation.value;
        if (type === "تحويل") sourceLocation = ppeTransferSource.value;

        if (!sourceLocation) {
          throw new Error(
            "الرجاء اختيار المخزن المصدر (الصرف من / من مخزن) أولاً.",
          );
        }

        // فحص الرصيد الحالي + ما تم إضافته للسلة
        const existingItem = ppeCart.find((item) => item.id === itemId);
        const qtyInCart = existingItem ? existingItem.qty : 0;
        const totalQtyNeeded = qty + qtyInCart; // الكمية المطل بة = (اللي في السلة + اللي هتضيفه)

        // استدعاء الـ API للتحقق
        const response = await callApi("checkStockBalance", {
          location: sourceLocation,
          itemId: itemId,
        });
        const availableBalance = parseFloat(response.balance) || 0;

        // المقارنة
        if (totalQtyNeeded > availableBalance) {
          throw new Error(
            `الرصيد غير كاف! المتاح: ${availableBalance}. الكمية المطلوبة (بالسلة): ${totalQtyNeeded}.`,
          );
        }
      }
      // (*** نهاية منطق التحقق من الرصيد ***)

      const itemName = ppeItemSelect.options[ppeItemSelect.selectedIndex].text;

      // إضافة الصنف للسلة (المنطق القديم)
      const existingItem = ppeCart.find((item) => item.id === itemId);
      if (existingItem) {
        existingItem.qty += qty;
      } else {
        ppeCart.push({ id: itemId, name: itemName, qty: qty });
      }

      // تحديث عرض السلة (وهذا سيحدث الرصيد المعروض أيضاً)
      updatePpeCartUI();

      // ريسيت لحقول الإضافة
      ppeItemSelect.value = "";
      ppeItemQty.value = 1;
    } catch (e) {
      showMessage(ppeMainMessage, e.message, false);
    } finally {
      // إرجاع الزرار لحالته الطبيعية
      ppeAddItemBtn.disabled = false;
      ppeAddItemBtn.innerHTML = originalButtonHtml;
    }
  }

  /**
   * (معدل) دالة تحديث عرض "سلة التسوق" + عرض الرصيد
   */
  async function updatePpeCartUI() {
    if (ppeCart.length === 0) {
      ppeCartContainer.innerHTML = "<p>لم يتم إضافة أي مهمات...</p>";
    } else {
      ppeCartContainer.innerHTML = ""; // ت ريغ
      ppeCart.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "ppe-cart-item";
        itemDiv.innerHTML = `
<span>${item.name} (<strong>الكمية: ${item.qty}</strong>)</span>
<button type="button" class="btn-small btn-danger" data-index="${index}">
<i class="fas fa-trash"></i>
</button>
`;
        itemDiv.querySelector("button").addEventListener("click", () => {
          ppeCart.splice(index, 1);
          updatePpeCartUI();
        });
        ppeCartContainer.appendChild(itemDiv);
      });
    }

    // (جديد) تحدث الرصيد المروض
    const itemId = ppeItemSelect.value;
    const type = ppeTransactionType.value;
    let location = "";

    if (type === "صرف") location = ppeRecipientLocation.value;
    if (type === "تحويل") location = ppeTransferSource.value;

    if (itemId && (type === "صرف" || type === "تحويل")) {
      ppeItemBalance.textContent = "جاري فحص الرصيد...";
      try {
        // (مهم) فحص الرصيد المتبقي فعلياً
        const existingItem = ppeCart.find((item) => item.id === itemId);
        const qtyInCart = existingItem ? existingItem.qty : 0;

        const res = await callApi("checkStockBalance", {
          location: location,
          itemId: itemId,
        });
        const availableBalance = parseFloat(res.balance) || 0;
        const remainingBalance = availableBalance - qtyInCart;

        ppeItemBalance.textContent = `الرصيد المتاح في [${location}]: ${remainingBalance} (من أصل ${availableBalance})`;
      } catch (e) {
        ppeItemBalance.textContent = `خطأ في جلب الرصيد.`;
      }
    } else {
      ppeItemBalance.textContent = ""; // إخفاء الرصيد لو مرتجع أو توريد
    }
  }

  /**
   * (جديد) دالة حفظ الحركة بالكامل
   */
  /**
   * دالة حفظ الحركة (معدلة لتقرأ الحقول الصحيحة حسب النوع)
   */
  async function handlePpeSave(event) {
    event.preventDefault();

    ppeSaveBtn.disabled = true;
    ppeSaveBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    showMessage(ppeMainMessage, "", true);
    showMessage(ppeSaveMessage, "", true);

    try {
      const type = ppeTransactionType.value; // القيمة من القائمة الجديدة

      const transactionData = {
        transactionType: type,
        notes: ppeNotes ? ppeNotes.value : "",
        items: ppeCart,
        locations: {},
        recipient: {},
        supplier: {},
      };

      // 1. التحقق من السلة
      if (ppeCart.length === 0)
        throw new Error("يجب إضافة مهمة واحدة على الأقل.");

      // 2. تجميع البيانات حسب النوع

      // --- حالة: صرف أو مرتجع ---
      if (type === "صرف" || type === "مرتجع") {
        // (*** هنا كان الخطأ: لازم نقرأ من ppeRecipientLocation ***)
        const loc = ppeRecipientLocation.value;

        if (!loc)
          throw new Error(
            type === "صرف"
              ? "يجب اختيار المخزن (الصرف من)."
              : "يجب اختيار المخزن (الاستلام في).",
          );

        if (type === "صرف") transactionData.locations.source = loc;
        else transactionData.locations.destination = loc;

        // بيانات المستلم
        const recType = ppeRecipientType.value;
        transactionData.recipient.type = recType;

        if (recType === "موظف") {
          const empId = document.getElementById("ppe-emp-id-hidden").value;
          const empName = document.getElementById("ppe-emp-name-display").value;
          if (!empId || !empName) {
            throw new Error("يجب اختيار اسم الموظف من القائمة.");
          }

          transactionData.recipient.id = empId;
          transactionData.recipient.name = empName;
          transactionData.recipient.company = "السويدي"; // القيمة الافتراضية لموظفي الشركة
        } else if (recType === "مقاول") {
          const comp = ppeRecipientContractorCompany.value;
          const nid = ppeRecipientNid.value;
          const name = ppeRecipientName.value;

          if (!comp || !nid || !name)
            throw new Error(
              "بيانات المقاول ناقصة (الشركة، الرقم القومي، الاسم).",
            );

          transactionData.recipient.id = nid;
          transactionData.recipient.name = name;
          transactionData.recipient.company = comp;
          // هل الاسم كان مفتوح للكتابة؟ يبقى جديد
          transactionData.recipient.isNew = !ppeRecipientName.disabled;
        } else {
          throw new Error("يجب اختيار نوع المستلم.");
        }
      }

      // --- حالة: توريد ---
      else if (type === "توريد") {
        const loc = ppeSupplierDest.value;
        const suppName = ppeSupplierName.value;

        if (!loc) throw new Error("يجب اختيار المخزن المستلم للتوريد.");
        if (!suppName) throw new Error("يجب كتابة اسم المورد.");

        transactionData.locations.destination = loc;
        transactionData.supplier.name = suppName;
      }

      // --- حالة: تحويل ---
      else if (type === "تحويل") {
        const src = ppeTransferSource.value;
        const dst = ppeTransferDest.value;

        if (!src || !dst)
          throw new Error("يجب اختيار المخزن المحول منه والمحول إليه.");
        if (src === dst) throw new Error("لا يمكن التحويل لنفس المخزن.");

        transactionData.locations.source = src;
        transactionData.locations.destination = dst;
      }

      // 3. الإرسال
      const response = await callApi("savePpeTransaction", {
        trx: transactionData, // تأكد ان الاسم في السيرفر هو trx او transactionData
        userInfo: currentUser,
      });

      showMessage(ppeSaveMessage, response.message, true);

      // تنظيف بعد النجاح
      setTimeout(() => {
        ppeSaveMessage.style.display = "none";
        initPpePage(); // إعادة تهيئة الصفحة بالكامل
      }, 2000);
    } catch (e) {
      showMessage(ppeMainMessage, e.message, false);
    } finally {
      ppeSaveBtn.disabled = false;
      ppeSaveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الحركة';
    }
  }

  /**
   * (جديد) دالة مساعدة للتحقق من المدخلات قبل الإرسال
   */
  function validateTransaction(data) {
    if (data.items.length === 0) {
      throw new Error("يجب إضافة مهمات.");
    }

    if (data.transactionType === "صرف") {
      if (!data.locations.source)
        throw new Error("يجب اختيار المخزن الذي سيتم الصرف منه.");
      if (!data.recipient.type) throw new Error("يجب اختيار نوع المستلم.");
      if (data.recipient.type === "موظف" && !data.recipient.id)
        throw new Error("يجب اختيار الموظف.");
      if (
        data.recipient.type === "مقاول" &&
        (!data.recipient.id || !data.recipient.name || !data.recipient.company)
      ) {
        throw new Error(
          "بيانات المقاول غير كاملة (الرقم القومي، الاسم، الشركة).",
        );
      }
    } else if (data.transactionType === "مرتجع") {
      if (!data.locations.destination)
        throw new Error("يSجب اختيار المخزن الذي سيتم الاستلام فيه.");
      if (!data.recipient.type) throw new Error("يجب اختيار نوع المستلم."); // نفس التحقق
    } else if (data.transactionType === "تحويل") {
      if (!data.locations.source || !data.locations.destination)
        throw new Error("يجب اختيار المخزن المصدر والمستلم.");
    } else if (data.transactionType === "توريد") {
      if (!data.supplier.name || !data.locations.destination)
        throw new Error("بيانات التوريد غير كاملة (المورد، ومخزن الاستلام).");
    }
    return true;
  }

  /**
   * (جديد) دالة مساعدة لتعبئة القوائم المنسدلة
   */
  function populateSelect(
    selectElement,
    data,
    valueKey = null,
    textKey = null,
  ) {
    if (!selectElement) return;
    const currentVal = selectElement.value; // حفظ الاختيار الحالي
    selectElement.innerHTML = `<option value="">-- اختر --</option>`;
    if (valueKey && textKey) {
      data.forEach((item) => {
        selectElement.options.add(new Option(item[textKey], item[valueKey]));
      });
    } else {
      data.forEach((item) => {
        selectElement.options.add(new Option(item, item));
      });
    }
    selectElement.value = currentVal; // محاولة إرجاع الاختيار القديم
  }

  // --- ربط كل الأحداث (مرة واحدة) ---
  if (ppeTransactionType) {
    ppeTransactionType.addEventListener("change", updatePpeFormUI);
  }

  // (*** تعديل ***) ربط الدالة الجديدة
  // (معدل) عند تغيير موقع الصرف/الاستلام
  if (ppeRecipientLocation) {
    ppeRecipientLocation.addEventListener("change", () => {
      document.getElementById("ppe-emp-name-display").value = "";
      document.getElementById("ppe-emp-id-hidden").value = "";
      updatePpeContractorDropdown(); // (جديد) فلترة المقاولين
      refreshPpeItemsDropdown(); // فلترة المهمات (الرصيد)
    });
  }
  if (ppeTransferSource) {
    ppeTransferSource.addEventListener("change", refreshPpeItemsDropdown);
  }
  if (ppeRecipientType) {
    ppeRecipientType.addEventListener("change", checkRecipientTypeUI);
  }
  if (ppeNidSearchBtn) {
    ppeNidSearchBtn.addEventListener("click", searchByNID);
  }
  if (ppeAddItemBtn) {
    ppeAddItemBtn.addEventListener("click", addItemToCart);
  }
  if (ppeItemSelect) {
    // (*** جديد ***) ربط قايمة المهمات
    ppeItemSelect.addEventListener("change", updatePpeCartUI); // عشان الرصيد يتحدث
  }
  if (ppeForm) {
    ppeForm.addEventListener("submit", handlePpeSave);
  }

  // --- نهاية وحدة المخازن ---

  // =================================================================
  // --- (*** جديد***) وحدة تقرير أرصدة المخازن ---
  // =================================================================

  /**
   * دالة بدء تشغيل صفحة تقرير المخزن
   */
  async function initStockReportPage() {
    console.log("بدء تشغيل صفحة تقرير الارصدة...");
    stockReportResultsTable.innerHTML = "";
    showMessage(
      stockReportMessage,
      "الرجاء اختيار الموقع والضغط على بحث",
      true,
    ); // Reset message

    // جلب البيانات الأولية (لو مش وجودة)
    // (هذه الدالة هتستخدم نفس البيانات اللي جابتها صفحة المخزن)
    if (ppeLocations.length === 0) {
      try {
        // (مهم) هنستدعي نفس الدالة بتاعة المخزن عشان نملى المتغيرات
        const data = await callApi("getInventoryInitData", {
          userInfo: currentUser,
        });
        if (data.status === "success") {
          ppeLocations = data.locations;
          ppeEmployees = data.employees;
          ppeContractors = data.contractors;
          ppeItems = data.ppeItems;
        }
      } catch (e) {
        showMessage(
          stockReportMessage,
          `خطأ فادح في تحميل البيانات: ${e.message}`,
          false,
        );
        return;
      }
    }

    // (*** فلترة القائمة  على صلاحيات المستخدم ***)
    const userProjects = (currentUser.projects || "").toString().trim();
    let accessibleLocations = [];

    if (userProjects === "ALL") {
      accessibleLocations = ppeLocations; // متاح له كل حاجة
    } else {
      const userProjectList = userProjects.split(",");
      // فلترة قائمة المخازن بناء على صلاحيات المستخدم
      accessibleLocations = ppeLocations.filter((loc) =>
        userProjectList.includes(loc),
      );
    }

    // تعبئة قائمة المشاريع (المفلترة)
    populateSelect(stockReportProjectSelect, accessibleLocations);
  }

  /**
   * عند الضغط على زر "بحث"
   */
  /**
   * دالة البحث في أرصدة المخازن مع ميزة الطباعة الاحترافية المنفصلة
   */
  async function handleStockReportSearch() {
    const locationName = stockReportProjectSelect.value;
    const printBtn = document.getElementById("stock-report-print-btn");

    // 1. التحقق من اختيار الموقع
    if (!locationName) {
      showMessage(stockReportMessage, "الرجاء اختيار الموقع أولاً.", false);
      return;
    }

    // 2. تجهيز الواجهة (إخفاء زر الطباعة ومسح الرسائل)
    if (printBtn) printBtn.style.display = "none";
    showMessage(stockReportMessage, "", true);
    stockReportResultsTable.innerHTML =
      "<p><i class='fas fa-spinner fa-spin'></i> جاري تحميل التقرير...</p>";

    try {
      // 3. استدعاء البيانات من السيرفر
      const response = await callApi("getProjectStockReport", {
        locationName: locationName,
        userInfo: currentUser,
      });

      // 4. التحقق من وجود بيانات ورسم الجدول
      if (response.report && response.report.length > 0) {
        buildStockReportTable(response.report, locationName);

        // 5. تفعيل زر الطباعة بالنظام الجديد (النافذة المنفصلة)
        if (printBtn) {
          printBtn.style.setProperty("display", "inline-flex", "important");

          printBtn.onclick = function () {
            // نأخذ المحتوى الذي تم إنشاؤ؇ داخل حاوة النتائج فقط
            const tableHtml = stockReportResultsTable.innerHTML;

            // استدعاء دالة التوليد الاحترافية (تأكد أنها معرفة في app.js)
            window.generateProfessionalPDF(
              `تقرير رصيد مخزن: ${locationName}`,
              tableHtml,
            );
          };
        }
      } else {
        stockReportResultsTable.innerHTML = `<p style='text-align:center; padding:20px;'>المخزن [${locationName}] فارغ حالياً أو لا توجد به بيانات.</p>`;
      }
    } catch (e) {
      console.error("Stock Report Error:", e);
      showMessage(
        stockReportMessage,
        "حدث خطأ أثناء جلب البيانات: " + e.message,
        false,
      );
      stockReportResultsTable.innerHTML = "";
    }
  }
  /**
   * دالة بناء جدول النتائج
   */
  function buildStockReportTable(reportData, locationName) {
    let table = `<h3 style="text-align:center;">رصيد: ${locationName}</h3>
<table class="results-table">
<thead>
<tr>
<th>التصنيف (Category)</th>
<th>كود المهمة (Item ID)</th>
<th>اسم المهمة</th>
<th>الكمية المتاحة</th>
</tr>
</thead>
<tbody>`;

    reportData.forEach((item) => {
      table += `<tr>
<td>${item.category || "غير مصنف"}</td>
<td>${item.itemId}</td>
<td>${item.itemName}</td>
<td style="font-weight:bold; text-align:center;">${item.balance}</td>
</tr>`;
    });

    table += `</tbody></table>`;
    stockReportResultsTable.innerHTML = table;
  }

  // --- ربط الأحداث ---
  if (stockReportSearchBtn) {
    stockReportSearchBtn.addEventListener("click", handleStockReportSearch);
  }

  // --- نهاية وحدة تقرير المخازن ---
  // =================================================================
  // --- (جديد) وحدة التدريب (Training Module) ---
  // =================================================================

  // Selectors
  const trnDate = document.getElementById("trn-date");
  const trnTime = document.getElementById("trn-time");
  const trnTrainer = document.getElementById("trn-trainer");
  const trnProject = document.getElementById("trn-project");
  const trnTopic = document.getElementById("trn-topic");
  const trnAttendeeType = document.getElementById("trn-attendee-type");
  const trnEmpGroup = document.getElementById("trn-emp-group");
  const trnContGroup = document.getElementById("trn-cont-group");
  const trnEmpSelect = document.getElementById("trn-emp-select");
  const trnShowAllEmp = document.getElementById("trn-show-all-emp");
  const trnContCompany = document.getElementById("trn-cont-company");
  const trnContNid = document.getElementById("trn-cont-nid");
  const trnContSearchBtn = document.getElementById("trn-cont-search-btn");
  const trnContName = document.getElementById("trn-cont-name");
  const trnAddBtn = document.getElementById("trn-add-btn");
  const trnAddMsg = document.getElementById("trn-add-msg");
  const trnListContainer = document.getElementById("trn-list-container");
  const trnCount = document.getElementById("trn-count");
  const trnForm = document.getElementById("training-form");
  const trnSaveBtn = document.getElementById("trn-save-btn");
  const trnSaveMsg = document.getElementById("trn-save-msg");
  const trnNotes = document.getElementById("trn-notes");

  // Data
  // --- متغيرات الحالة (تأكد من وجودها في أعلى الملف أو بداية سكشن التديب) ---
  let trainingDataLoaded = false;

  async function initTrainingPage() {
    console.log("بدء تشغيل صفحة التدريب (المطورة)...");

    // 1. إعدادات التاريخ والوقت والمدرب
    const now = new Date();
    if (document.getElementById("trn-date"))
      document.getElementById("trn-date").value =
        now.toLocaleDateString("en-CA");
    if (document.getElementById("trn-time")) {
      document.getElementById("trn-time").value = now.toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        },
      );
    }
    if (document.getElementById("trn-trainer") && currentUser)
      document.getElementById("trn-trainer").value = currentUser.username;

    // 2. تحميل البيانات الأساسية (المشاريع، المواضيع، والموظفين)
    try {
      const r = await callApi("getTrainingInitData", { userInfo: currentUser });

      if (r.status === "success") {
        // (هام جداً) تعبئة المصفوفة العالمية للموظفن ليراها المودال
        window.ppeEmployees = r.employees;

        // تعبئة  oشاريع والمواضيع والمقاولين في القوائم المنسدلة
        const userProj = (currentUser.projects || "").toString();
        let accProj =
          userProj === "ALL"
            ? r.projects
            : r.projects.filter((p) => userProj.includes(p));

        fillSelect(document.getElementById("trn-project"), accProj);
        fillSelect(document.getElementById("trn-topic"), r.topics);
        document.getElementById("trn-cont-company").innerHTML =
          '<option value="">-- اختر المشروع أولاً --</option>';

        trainingDataLoaded = true;
      }
    } catch (e) {
      console.error("فشل تحميل بيانات التدريب:", e);
    }
  }

  // دالة اختيار الموظف المحدثة (إصلاح ReferenceError)
  window.openEmpSelector = function () {
    const proj = document.getElementById("trn-project").value;
    const showAll = document.getElementById("trn-show-all-emp").checked;

    // التأكد من تحميل البيانات أولاً
    if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
      alert("جاري تحميل بيانات الموظفين، يرجى الانتظار ثانية...");
      return;
    }

    if (!proj && !showAll) {
      alert("الرجاء اختيار المشروع أولاً أو تفعيل خيار 'عرض كل الموظفين'");
      return;
    }

    document.getElementById("emp-selector-modal").style.display = "flex";
    document.getElementById("emp-search-box").value = "";

    const list = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === proj);
    renderEmployeesInModal(list);
  };

  // فلترة الموظفين والمقاولين حسب المشروع
  window.handleTrnProjectChange = async function () {
    const proj = document.getElementById("trn-project").value;
    const contSelect = document.getElementById("trn-cont-company");
    const workerNameInput = document.getElementById("trn-cont-name");
    const workerNidInput = document.getElementById("trn-cont-nid");

    // تصفير حقول الموظف والمقاول عند تغيير المشروع لضمان الدقة
    if (workerNameInput) workerNameInput.value = "";
    if (workerNidInput) workerNidInput.value = "";
    if (typeof window.resetEmpSelector === "function")
      window.resetEmpSelector();

    if (!proj) {
      contSelect.innerHTML =
        '<option value="">-- اختر المشروع أولاً --</option>';
      return;
    }

    contSelect.innerHTML = "<option>جاري تحميل مقاولي المشروع...</option>";

    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      if (r.status === "success") {
        fillSelect(contSelect, r.contractors);
      } else {
        contSelect.innerHTML =
          '<option value="">لا يوجد مقاولين لهذا المشروع</option>';
      }
    } catch (e) {
      console.error("خطأ في جلب مقاولي المشروع:", e);
      contSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
    }
  };

  // منطق فلترة الموظفين (بالزرار)
  function filterTrnEmployees() {
    const proj = trnProject.value;
    const showAll = trnShowAllEmp.checked;

    trnEmpSelect.innerHTML = '<option value="">-- اختر --</option>';

    if (!proj && !showAll) return;

    let list = [];
    if (showAll) {
      list = ppeEmployees; // الكل
    } else {
      list = ppeEmployees.filter((e) => e.project === proj); // المشروع فقط
    }

    list.forEach((e) => {
      const opt = new Option(`${e.name} (${showAll ? e.project : ""})`, e.id);
      opt.dataset.name = e.name;
      opt.dataset.company = e.company || "الشركة";
      trnEmpSelect.add(opt);
    });
  }

  async function addTrnAttendee() {
    const type = document.getElementById("trn-attendee-type").value;
    let att = { type: type };

    if (type === "موظف") {
      // منطق الموظفين (يبقى كما هو)
      const empName = document.getElementById("trn-emp-name-display").value;
      const empId = document.getElementById("trn-emp-id-hidden").value;
      if (!empName) {
        alert("الرجاء اختيار الموظف من القائمة أولاً");
        return;
      }
      att.id = empId;
      att.name = empName;
      att.company = "السويدي";
    } else {
      // منطق العمال (المقاولين)
      const nid = trnContNid.value;
      const name = trnContName.value;
      const comp = trnContCompany.value;

      if (!nid || !name || !comp) {
        showMessage(trnAddMsg, "بيانات المقاول ناقصة", false);
        return;
      }

      // --- التعديل الجوهري هنا ---
      // نعتبر العامل "موجود مسبقاً" إذا كان حقل الاسم مُعطلاً (بعد البحث)
      // أو إذا كان حقل الرقم القومي "للقراءة فقط" (بعد الاختيار من القائمة أو المودال)
      const isExistingWorker =
        trnContName.disabled === true || trnContNid.readOnly === true;

      if (!isExistingWorker) {
        // فقط إذا كان المستخدم يكتب يدوياً (تسجيل جديد)، نقوم بالفحص
        try {
          const checkResult = await callApi("getRecipientByNID", {
            nationalId: nid,
          });
          if (checkResult && checkResult.status === "found") {
            alert(
              `عفواً! الرقم القومي (${nid}) مسجل بالفعل باسم: [${checkResult.name}]\nالرجاء مسح الاسم المكتوب والبحث بالرقم القومي مرة أخرى لاستدعاء البيانات الصحيحة.`,
            );
            return; // منع الإضافة لأنه سجل جديد برقم موجود فعلياً
          }
        } catch (e) {
          console.error("خطأ في فحص الرقم القومي:", e);
        }
      }

      // إذا وصلنا هنا، يعني إما العامل موجود مسبقاً (وتم تخطي الفحص)
      // أو هو عامل جديد فعلاً ورقمه القومي غير مكرر
      att.id = nid;
      att.name = name;
      att.company = comp;
      att.isNew = !isExistingWorker;
    }

    // منع التكرار في القائمة الحالية (السلة)
    if (trnAttendeesCart.find((x) => x.id === att.id)) {
      showMessage(trnAddMsg, "هذا الشخص مضاف بالفعل في القائمة", false);
      return;
    }

    trnAttendeesCart.push(att);
    updateTrnCartUI();

    // ريسيت للخانات بعد الإضافة
    if (type === "مقاول") {
      trnContNid.value = "";
      trnContName.value = "";
      trnContName.disabled = false;
      trnContNid.readOnly = false; // إعادة ا fقل قابلاً للكتابة
      trnContNid.style.backgroundColor = "#fff";
    }
  }

  function updateTrnCartUI() {
    if (trnCount) trnCount.textContent = trnAttendeesCart.length;
    if (trnAttendeesCart.length === 0) {
      trnListContainer.innerHTML =
        '<p style="text-align: center; color: #777;">القائمة فارغة...</p>';
    } else {
      trnListContainer.innerHTML = "";
      trnAttendeesCart.forEach((att, idx) => {
        const div = document.createElement("div");
        div.className = "ppe-cart-item";
        div.innerHTML = `
                  <span><small>[${att.type}]</small> <strong>${att.name}</strong> (${att.company})</span>
                  <button type="button" class="btn-small btn-danger" onclick="removeTrnItem(${idx})">X</button>
              `;
        trnListContainer.appendChild(div);
      });
    }
  }
  window.removeTrnItem = (idx) => {
    trnAttendeesCart.splice(idx, 1);
    updateTrnCartUI();
  };

  // بحث مقاول
  // بحث مقاول في قسم التدريب
  async function searchTrnCont() {
    const nid = trnContNid.value;
    if (!nid) return;

    trnContName.value = "بحث...";
    trnContName.disabled = true;

    try {
      const r = await callApi("getRecipientByNID", { nationalId: nid });

      if (r.status === "found") {
        // الرقم موجود بالفعل
        trnContName.value = r.name;
        trnContName.disabled = true;
        trnContCompany.value = r.contractor;

        // إظهار الرسالة المطلوبة
        showMessage(
          trnAddMsg,
          "الرقم القومى مسجل بالفعل الرجاء البحث فى قائمة الاسماء",
          false,
        );

        // تنبيه إضافي لضمان اانتباه
        alert(
          "تنبيه: الرقم القومى مسجل بالفعل باسم ( " +
            r.name +
            " ). الرجاء استخدامه مباشرة.",
        );
      } else {
        // الرقم جديد
        trnContName.value = "";
        trnContName.placeholder = "اسم جديد...";
        trnContName.disabled = false;
        trnContName.focus();
        showMessage(
          trnAddMsg,
          "هذا الرقم غير مسجل، يمكنك إضافة الاسم الآن.",
          true,
        );
      }
    } catch (e) {
      trnContName.value = "";
      trnContName.disabled = false;
      showMessage(trnAddMsg, "خطأ في الاتصال بقاعدة البيانات", false);
    }
  }

  // حفظ الجلسة
  if (trnForm) {
    trnForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (trnAttendeesCart.length === 0) {
        showMessage(trnAddMsg, "أضف حضور أولاً", false);
        return;
      }

      const data = {
        project: trnProject.value,
        topic: trnTopic.value,
        attendees: trnAttendeesCart,
        notes: trnNotes.value,
      };

      if (!data.project || !data.topic) {
        showMessage(trnAddMsg, "اختر المشروع والموضوع", false);
        return;
      }

      trnSaveBtn.disabled = true;
      trnSaveBtn.textContent = "جاري الحفظ...";
      try {
        const r = await callApi("saveTrainingSession", {
          sessionData: data,
          userInfo: currentUser,
        });
        showMessage(trnSaveMsg, r.message, true);
        if (trnSaveMsg) trnSaveMsg.style.whiteSpace = "pre-wrap";
        // تفريغ
        trnAttendeesCart = [];
        updateTrnCartUI();
        trnForm.reset();
        // إعادة تعيين القيم الثابتة
        if (trnTrainer) trnTrainer.value = currentUser.username;
        const now = new Date();
        if (trnDate) trnDate.value = now.toLocaleDateString("en-CA");
        if (trnTime)
          trnTime.value = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
      } catch (err) {
        showMessage(trnSaveMsg, err.message, false);
      } finally {
        trnSaveBtn.disabled = false;
        trnSaveBtn.textContent = "حفظ جلسة التدريب";
      }
    });
  }

  // Events
  if (trnProject) trnProject.addEventListener("change", handleTrnProjectChange);
  if (trnShowAllEmp)
    trnShowAllEmp.addEventListener("change", filterTrnEmployees);
  if (trnAttendeeType)
    trnAttendeeType.addEventListener("change", () => {
      const isEmp = trnAttendeeType.value === "موظف";
      if (trnEmpGroup) trnEmpGroup.style.display = isEmp ? "block" : "none";
      if (trnContGroup) trnContGroup.style.display = isEmp ? "none" : "block";
    });
  if (trnAddBtn) trnAddBtn.addEventListener("click", addTrnAttendee);
  if (trnContSearchBtn)
    trnContSearchBtn.addEventListener("click", searchTrnCont);
  // =================================================================
  // --- (جديد ومعدل) وحدة الملاحظات (Observations V2) ---
  // =================================================================

  // Selectors
  const obsForm = document.getElementById("obs-form");
  const obsViewDate = document.getElementById("obs-view-date");
  const obsViewTime = document.getElementById("obs-view-time");
  const obsProject = document.getElementById("obs-project");
  const obsHazard = document.getElementById("obs-hazard");
  const obsRespRadios = document.getElementsByName("obs-resp");
  const obsContractorDiv = document.getElementById("obs-contractor-div");
  const obsContractorSelect = document.getElementById("obs-contractor-select");
  const obsActionText = document.getElementById("obs-action-text");
  const obsActionDate = document.getElementById("obs-action-date");
  const obsAddActionBtn = document.getElementById("obs-add-action-btn");
  const obsActionsList = document.getElementById("obs-actions-list");
  const obsSaveBtn = document.getElementById("obs-save-btn");
  const obsSaveMsg = document.getElementById("obs-save-msg");
  const monObsProject = document.getElementById("mon-obs-project");
  const monObsFrom = document.getElementById("mon-obs-from");
  const monObsTo = document.getElementById("mon-obs-to");
  const monObsOpen = document.getElementById("mon-obs-open");
  const monObsBtn = document.getElementById("mon-obs-btn");
  const monObsTable = document.getElementById("mon-obs-table");

  let obsActionsCart = []; // سلة iلإجراءات

  async function initObservationPage() {
    console.log("بدء تشغيل صفحة الملاحظات...");

    // 1. ضبط التاريخ والاسم (يدا- لضمان الشكل الصحيح)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // شهر 1 يبقى 01
    const day = String(now.getDate()).padStart(2, "0"); // يوم 5 يبقى 05
    const dateString = `${year}-${month}-${day}`; // النتيجة: 2025-11-30

    // تعيين التاريخ
    if (obsViewDate) obsViewDate.value = dateString;

    // تعيين اسم المستخدم (المصدر)
    const obsIssuerField = document.getElementById("obs-issuer"); // تأكدنا من الـ Selector
    if (obsIssuerField && currentUser) {
      obsIssuerField.value = currentUser.username;
    }

    // 2. تعبئة المشاريع
    if (obsProject && obsProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        const userProj = (currentUser.projects || "").toString();
        let accProj = ppeLocations;
        if (userProj !== "ALL") {
          accProj = ppeLocations.filter((p) => userProj.includes(p));
        }
        fillSelect(obsProject, accProj);
      } else {
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          if (r.status === "success") {
            ppeLocations = r.locations;
            const userProj = (currentUser.projects || "").toString();
            let accProj = r.locations;
            if (userProj !== "ALL") {
              accProj = r.locations.filter((p) => userProj.includes(p));
            }
            fillSelect(obsProject, accProj);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 3. تعبئة المخاطر
    if (obsHazard && obsHazard.options.length <= 1) {
      obsHazard.innerHTML = "<option>جاري التحميل...</option>";
      try {
        const r = await callApi("getHazardsList", {});
        if (r.status === "success") {
          fillSelect(obsHazard, r.hazards);
        } else {
          obsHazard.innerHTML = '<option value="">فشل التحميل</option>';
        }
      } catch (e) {
        obsHazard.innerHTML = '<option value="">خطأ اتصال</option>';
      }
    }

    // تصفير
    obsActionsCart = [];
    if (typeof renderObsActions === "function") renderObsActions();
    if (document.getElementById("resp-elsewedy"))
      document.getElementById("resp-elsewedy").checked = true;
    if (typeof toggleObsContractor === "function") toggleObsContractor();
  }
  // إظهار/إخفاl المقاول حسب الراديو
  // إظهار/إخفاء المقاول (تم تصحيح الخطأ الإملائي)
  function toggleObsContractor() {
    let isCont = false;

    // البحث عن الراديو المختار
    const checkedRadio = document.querySelector(
      'input[name="obs-resp"]:checked',
    );

    // (تصحيح هام): الكلمة كانت مكتوبةeأ "مDاول"
    if (checkedRadio && checkedRadio.value === "مقاول") {
      isCont = true;
    }

    // إظهار أو إخفاء القائمة
    if (obsContractorDiv) {
      obsContractorDiv.style.display = isCont ? "block" : "none";
    }

    // لو اخترنا مقاول، لازم نحمل القائمة بناءً على المشروع المختار حالياً
    if (isCont) {
      const currentProj = obsProject.value;
      if (currentProj) {
        loadObsContractors(currentProj);
      } else {
        obsContractorSelect.innerHTML =
          '<option value="">-- اختر المشروع أولاً --</option>';
        obsContractorSelect.disabled = true;
      }
    } else {
      // لو رجعنا للسويدي، نريست القائمة
      obsContractorSelect.innerHTML = '<option value="">-- اختر --</option>';
      obsContractorSelect.value = "";
    }
  }

  // تحميل المقاولين
  async function loadObsContractors(proj) {
    obsContractorSelect.innerHTML = "<option>جاري التحميل...</option>";
    obsContractorSelect.disabled = true;
    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });

      if (r.contractors && r.contractors.length > 0) {
        fillSelect(obsContractorSelect, r.contractors);
        obsContractorSelect.disabled = false;
      } else {
        obsContractorSelect.innerHTML =
          '<option value="">لا يوجد مقاولين</option>';
      }
    } catch (e) {
      obsContractorSelect.innerHTML = '<option value="">خطأ</option>';
      console.error(e);
    }
  }

  // إضافة إجراء للسلة
  function addObsAction() {
    const txt = obsActionText.value;
    const date = obsActionDate.value;
    if (!txt || !date) {
      alert("أدخل الإجراء والتاريخ");
      return;
    }

    obsActionsCart.push({ text: txt, targetDate: date });
    renderObsActions();
    obsActionText.value = "";
    obsActionDate.value = "";
  }

  function renderObsActions() {
    if (obsActionsList) {
      if (obsActionsCart.length === 0) {
        obsActionsList.innerHTML =
          '<p style="color:#777; font-size:0.9em;">لا توجد إجراءات مضافة.</p>';
      } else {
        obsActionsList.innerHTML = "";
        obsActionsCart.forEach((act, i) => {
          const div = document.createElement("div");
          div.className = "ppe-cart-item"; // نفس ستايل الكارت
          div.innerHTML = `<span>${act.text} <small>(${act.targetDate})</small></span> <button type="button" class="btn-small btn-danger" onclick="remObsAction(${i})">X</button>`;
          obsActionsList.appendChild(div);
        });
      }
    }
  }
  window.remObsAction = (i) => {
    obsActionsCart.splice(i, 1);
    renderObsActions();
  };

  // حفظ الملاحظة
  if (obsForm) {
    obsForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // تجميع البيانات
      const data = {
        project: obsProject.value,
        locationDetail: document.getElementById("obs-location-detail").value,
        source: document.getElementById("obs-source").value,
        type: document.getElementById("obs-type").value,
        hazard: obsHazard.value,
        description: document.getElementById("obs-desc").value,
        responsibility: document.querySelector('input[name="obs-resp"]:checked')
          .value,
        actions: obsActionsCart,
      };

      // اسم الشركة
      if (data.responsibility === "مقاول") {
        data.companyName = obsContractorSelect.value;
        if (!data.companyName) {
          alert("اختر المقاول");
          return;
        }
      } else {
        data.companyName = "السويدي";
      }

      if (data.actions.length === 0) {
        if (!confirm("لم تضف أي إجراءات تصحيحية. هل تريد الحفظ بدون إجراءات؟"))
          return;
      }

      obsSaveBtn.disabled = true;
      obsSaveBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
      try {
        const r = await callApi("saveObservationFull", {
          obsData: data,
          userInfo: currentUser,
        });
        showMessage(obsSaveMsg, r.message, true);
        obsForm.reset();
        initObservationPage(); // إعادة تهيئة
      } catch (err) {
        alert("خطأ: " + err.message);
      } finally {
        obsSaveBtn.disabled = false;
        obsSaveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الملاحظة';
      }
    });
  }

  // Events
  if (obsProject)
    obsProject.addEventListener("change", () => {
      toggleObsContractor();
    });
  if (obsRespRadios) {
    obsRespRadios.forEach((r) =>
      r.addEventListener("change", toggleObsContractor),
    );
  }
  if (obsAddActionBtn) obsAddActionBtn.addEventListener("click", addObsAction);
  // =================================================================
  // --- (جديد) وحدة متابعة وإغلاق الملاحظات ---
  // =================================================================

  const myObsList = document.getElementById("my-obs-list");
  const refreshObsBtn = document.getElementById("refresh-obs-btn");

  async function loadMyOpenObservations() {
    if (!myObsList) return;
    myObsList.innerHTML =
      '<div class="loader-small">جاري البحث عن ملاحظاتك المفتوحة...</div>';

    try {
      const r = await callApi("getUserOpenObservations", {
        userInfo: currentUser,
      });
      if (r.status === "success") {
        renderMyObsTable(r.observations);
      } else {
        myObsList.innerHTML = `<p class="error-message">${r.message}</p>`;
      }
    } catch (e) {
      myObsList.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  // 2. تحديث جدول "ملاحظاتي" (My Observations Table) - إضافة التاريخ والمصدر
  function renderMyObsTable(obsArray) {
    if (obsArray.length === 0) {
      myObsList.innerHTML =
        '<p style="text-align:center; padding:20px;">🎉 لا توجد ملاحظات مفتوحة، كله تمام!</p>';
      return;
    }

    let html = `
      <table class="results-table">
        <thead>
            <tr>
                <th>الكود</th>
                <th>التاريخ</th> <th>المشروع</th>
                <th>مصدر الملاحظة</th>
                <th>الوصف</th>
                <th>إجراء</th>
            </tr>
        </thead>
        <tbody>`;

    obsArray.forEach((obs) => {
      let dateDisplay = obs.date;
      try {
        // محاولة تنسيق التاريخ
        const d = new Date(obs.date);
        if (!isNaN(d.getTime())) {
          dateDisplay = d.toLocaleDateString("en-GB"); // DD/MM/YYYY
        }
      } catch (e) {}

      html += `
        <tr>
            <td style="font-weight:bold;">${obs.id}</td>
            <td>${dateDisplay}</td> <td>${obs.project}<br><small style="color:#666;">${obs.type}</small></td>

            <td style="color:#0056b3;">${obs.source || "-"}</td>

            <td title="${obs.desc}">${obs.desc.substring(0, 50)}${obs.desc.length > 50 ? "..." : ""}</td>
            <td>
                <button class="btn-small btn-danger" onclick="handleCloseObs('${obs.id}')">
                    إغلاق
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    myObsList.innerHTML = html;
  }
  // دالة الإغلاق (Global عشان تتقري من الـ HTML)
  window.handleCloseObs = async function (obsId) {
    const note = prompt("الرجاء إدخال ملاحظات الإغلاق (أو ما تم تنفيذه):");

    if (note === null) return; // داس Cancel
    if (note.trim() === "") {
      alert("يجب كتابة ملاحظة للإغلاق.");
      return;
    }

    // إظهار لط
    showLoader("جاري إغلاق الملاحظة...");

    try {
      const r = await callApi("closeObservation", {
        obsId: obsId,
        closingNote: note,
      });
      alert(r.message);
      loadMyOpenObservations(); // تحديث القائمة
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      hideLoader();
    }
  };

  if (refreshObsBtn)
    refreshObsBtn.addEventListener("click", loadMyOpenObservations);

  // =================================================================
  // --- (جديد) وحدة Hazard Report ---
  // =================================================================

  // Selectors
  const hazForm = document.getElementById("haz-form");
  const hazViewDate = document.getElementById("haz-view-date");
  const hazViewTime = document.getElementById("haz-view-time");
  const hazIssuer = document.getElementById("haz-issuer");
  const hazProject = document.getElementById("haz-project");
  const hazReporterType = document.getElementById("haz-reporter-type");
  const hazEmpGroup = document.getElementById("haz-emp-group");
  const hazContGroup = document.getElementById("haz-cont-group");
  const hazReporterEmp = document.getElementById("haz-reporter-emp");
  const hazReporterCompany = document.getElementById("haz-reporter-company");
  const hazReporterNid = document.getElementById("haz-reporter-nid");
  const hazNidSearchBtn = document.getElementById("haz-nid-search-btn");
  const hazReporterName = document.getElementById("haz-reporter-name");
  const hazResult = document.getElementById("haz-result"); // oلقائمة المنسدلة للهازارد
  const hazActionText = document.getElementById("haz-action-text");
  const hazActionDate = document.getElementById("haz-action-date");
  const hazAddActionBtn = document.getElementById("haz-add-action-btn");
  const hazActionsList = document.getElementById("haz-actions-list");
  const hazSaveBtn = document.getElementById("haz-save-btn");
  const hazSaveMsg = document.getElementById("haz-save-msg");
  const monHazProject = document.getElementById("mon-haz-project");
  const monHazFrom = document.getElementById("mon-haz-from");
  const monHazTo = document.getElementById("mon-haz-to");
  const monHazOpen = document.getElementById("mon-haz-open");
  const monHazBtn = document.getElementById("mon-haz-btn");
  const monHazTable = document.getElementById("mon-haz-table");
  // My Hazards Selectors
  const myHazList = document.getElementById("my-haz-list");
  const refreshHazBtn = document.getElementById("refresh-haz-btn");

  let hazActionsCart = [];

  async function initHazardPage() {
    console.log("بدء تشغيل صفحة تقارير الخطر...");
    // --- إضافة: تفريغ حقول البوب أب الجديدة لضمان نظافة التقرير ---
    if (document.getElementById("haz-emp-name-display"))
      document.getElementById("haz-emp-name-display").value = "";
    if (document.getElementById("haz-emp-id-hidden"))
      document.getElementById("haz-emp-id-hidden").value = "";
    // 1. ضبط التاريخ والاسم (يدوياً)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`; // النتيجة: 2025-11-30

    // تعيين التريخ
    if (document.getElementById("haz-view-date")) {
      document.getElementById("haz-view-date").value = dateString;
    }
    if (hazProject && hazProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? ppeLocations
            : ppeLocations.filter((p) => userProj.includes(p));
        fillSelect(hazProject, acc);
      } else {
        callApi("getInventoryInitData", { userInfo: currentUser }).then((r) => {
          if (r.status === "success") {
            ppeLocations = r.locations;
            ppeEmployees = r.employees;
            ppeContractors = r.contractors;

            const userProj = (currentUser.projects || "").toString();
            const acc =
              userProj === "ALL"
                ? r.locations
                : r.locations.filter((p) => userProj.includes(p));
            fillSelect(hazProject, acc);
          }
        });
      }
    }
    // تع ين اسم مستخدم (المصدر)
    if (document.getElementById("haz-issuer") && currentUser) {
      document.getElementById("haz-issuer").value = currentUser.username;
    }
    if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
      try {
        const r = await callApi("getInventoryInitData", {
          userInfo: currentUser,
        });
        if (r.status === "success") {
          window.ppeEmployees = r.employees;
        }
      } catch (e) {
        console.error("Error loading employees for Hazard:", e);
      }
    }
    // 2. تعبئة المشاريع

    // 3. تعبئة قائمة المخاطر
    if (hazResult && hazResult.options.length <= 1) {
      hazResult.innerHTML = "<option>جاري التحميل...</option>";
      callApi("getHazardsList", {}).then((r) => {
        if (r.status === "success") fillSelect(hazResult, r.hazards);
        else hazResult.innerHTML = '<option value="">فشل</option>';
      });
    }

    // 4. تصفير
    hazActionsCart = [];
    if (typeof renderHazActions === "function") renderHazActions();
    if (hazReporterType) {
      hazReporterType.value = "موظف";
      if (typeof checkHazReporterType === "function") checkHazReporterType();
    }
  }
  function checkHazReporterType() {
    const type = hazReporterType.value;
    hazEmpGroup.style.display = type === "موظف" ? "block" : "none";
    hazContGroup.style.display = type === "مقاول" ? "block" : "none";

    if (type === "مقاول") updateHazContractors();
  }
  // --- دوال اختيار الموظف في تقارير الخطر (Hazard Popup) ---

  window.openHazEmpSelector = function () {
    const proj = document.getElementById("haz-project").value;
    const showAll = document.getElementById("haz-show-all-emp").checked;

    if (!proj && !showAll) {
      alert("الرجاء اختيار المشروع أولاً");
      return;
    }

    if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
      alert("جاري تحميل البيانات... حاول مرة أخرى");
      return;
    }

    document.getElementById("haz-emp-modal").style.display = "flex";
    document.getElementById("haz-emp-search-box").value = "";
    document.getElementById("haz-emp-search-box").focus();

    const list = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === proj);
    renderHazEmpsInModal(list);
  };

  window.closeHazEmpSelector = function () {
    document.getElementById("haz-emp-modal").style.display = "none";
  };

  function renderHazEmpsInModal(list) {
    const container = document.getElementById("haz-emp-list-container");
    container.innerHTML =
      list.length === 0
        ? '<p style="text-align:center; padding:20px;">لا توجد نتائج</p>'
        : list
            .map(
              (e) => `
              <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:8px;" 
                   onclick="window.selectHazEmployee('${e.id}', '${e.name}')">
                  <div style="text-align:right;">
                      <span style="display:block; font-weight:700;">${e.name}</span>
                      <small style="color:#666;">ID: ${e.id} | Project: ${e.project}</small>
                  </div>
                  <i class="fas fa-search-location" style="color:#ccc;"></i>
              </div>`,
            )
            .join("");
  }

  window.filterHazEmpList = function () {
    const query = document
      .getElementById("haz-emp-search-box")
      .value.toLowerCase();
    const proj = document.getElementById("haz-project").value;
    const showAll = document.getElementById("haz-show-all-emp").checked;

    const baseList = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === proj);
    const filtered = baseList.filter(
      (e) =>
        e.name.toLowerCase().includes(query) || e.id.toString().includes(query),
    );
    renderHazEmpsInModal(filtered);
  };

  window.selectHazEmployee = function (id, name) {
    document.getElementById("haz-emp-name-display").value = name;
    document.getElementById("haz-emp-id-hidden").value = id;
    window.closeHazEmpSelector();
  };
  async function updateHazContractors() {
    const proj = hazProject.value;
    if (!proj) return;
    hazReporterCompany.innerHTML = "<option>جاري التحميل...</option>";
    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      fillSelect(hazReporterCompany, r.contractors);
    } catch (e) {}
  }

  async function searchHazNid() {
    const nid = hazReporterNid.value;
    if (!nid) return;
    hazReporterName.value = "بحث...";
    hazReporterName.disabled = true;
    try {
      const r = await callApi("getRecipientByNID", { nationalId: nid });
      if (r.status === "found") {
        hazReporterName.value = r.name;
        hazReporterCompany.value = r.contractor;
        hazReporterName.disabled = true;
      } else {
        hazReporterName.value = "";
        hazReporterName.disabled = false;
        hazReporterName.focus();
      }
    } catch (e) {
      hazReporterName.value = "";
      hazReporterName.disabled = false;
    }
  }

  function addHazAction() {
    if (!hazActionText.value || !hazActionDate.value) return;
    hazActionsCart.push({
      text: hazActionText.value,
      targetDate: hazActionDate.value,
    });
    renderHazActions();
    hazActionText.value = "";
    hazActionDate.value = "";
  }
  function renderHazActions() {
    if (hazActionsList)
      hazActionsList.innerHTML = hazActionsCart
        .map(
          (a, i) =>
            `<div>${a.text} (${a.targetDate}) <button onclick="remHazAct(${i})">X</button></div>`,
        )
        .join("");
  }
  window.remHazAct = (i) => {
    hazActionsCart.splice(i, 1);
    renderHazActions();
  };

  if (hazForm) {
    hazForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        project: hazProject.value,
        description: document.getElementById("haz-desc").value,
        hazardResult: hazResult.value,
        reporter: { type: hazReporterType.value },
        actions: hazActionsCart,
      };

      if (data.reporter.type === "موظف") {
        const empId = document.getElementById("haz-emp-id-hidden").value;
        const empName = document.getElementById("haz-emp-name-display").value;

        // اrتحقق من أن المستخدم اختار موظفاً بالفعل من البوب أب
        if (!empId || !empName) {
          alert("الرجاء الضغط على خانة الاسم واختيار الموظف من القائمة");
          return;
        }

        // استخدام window.ppeEmployees لضمان الوصول للبيانات
        const emp = window.ppeEmployees.find((x) => x.id == empId);

        data.reporter.id = empId;
        data.reporter.name = empName;
        data.reporter.company = "السويدي";
      } else {
        data.reporter.id = hazReporterNid.value;
        data.reporter.name = hazReporterName.value;
        data.reporter.company = hazReporterCompany.value;
        data.reporter.isNew = !hazReporterName.disabled;
        if (
          !data.reporter.id ||
          !data.reporter.name ||
          !data.reporter.company
        ) {
          alert("بيانات المقاول ناقصة");
          return;
        }
      }

      hazSaveBtn.disabled = true;
      hazSaveBtn.textContent = "جاري الحفظ...";
      try {
        const r = await callApi("saveHazardFull", {
          hazData: data,
          userInfo: currentUser,
        });
        showMessage(hazSaveMsg, r.message, true);
        hazForm.reset();
        initHazardPage();
      } catch (err) {
        alert(err.message);
      } finally {
        hazSaveBtn.disabled = false;
        hazSaveBtn.textContent = "حفظ التقرير";
      }
    });
  }

  // Events
  if (hazProject)
    hazProject.addEventListener("change", () => {
      updateHazContractors();
    });
  if (hazReporterType)
    hazReporterType.addEventListener("change", checkHazReporterType);
  if (hazNidSearchBtn) hazNidSearchBtn.addEventListener("click", searchHazNid);
  if (hazAddActionBtn) hazAddActionBtn.addEventListener("click", addHazAction);

  // --- My Hazards Logic ---
  async function loadMyOpenHazards() {
    if (!myHazList) return;
    myHazList.innerHTML = "جاري التحميل...";
    try {
      const r = await callApi("getUserOpenHazards", { userInfo: currentUser });
      let h = `<table class="results-table"><thead><tr><th>ID</th><th>Project</th><th>Desc</th><th>Action</th></tr></thead><tbody>`;
      if (r.hazards && r.hazards.length > 0) {
        r.hazards.forEach((hz) => {
          h += `<tr><td>${hz.id}</td><td>${hz.project}</td><td title="${hz.desc}">${hz.desc.substring(0, 30)}...</td>
                  <td><button class="btn-small btn-danger" onclick="handleCloseHaz('${hz.id}')">إغلاق</button></td></tr>`;
        });
        h += "</tbody></table>";
        myHazList.innerHTML = h;
      } else {
        myHazList.innerHTML = "لا توجد تقارير مفتوحة.";
      }
    } catch (e) {
      myHazList.innerHTML = e.message;
    }
  }

  window.handleCloseHaz = async function (id) {
    const note = prompt("ملاحظات الإغلاق:");
    if (note === null) return;
    try {
      const r = await callApi("closeHazard", { hazId: id, closingNote: note });
      alert(r.message);
      loadMyOpenHazards();
    } catch (e) {
      alert(e.message);
    }
  };

  if (refreshHazBtn) refreshHazBtn.addEventListener("click", loadMyOpenHazards);

  // =================================================================
  // --- (جديد) وحدة متابعة الملاحظات والمخاطر (MONITORING V2) ---
  // =================================================================

  // دالة عامة لتعبئة مشاريع البحث
  function populateMonitorDropdowns(selectEl) {
    if (!selectEl || !initialData) return;
    selectEl.innerHTML = '<option value="ALL_ACCESSIBLE">الكل</option>';
    if (initialData.projects) {
      initialData.projects.forEach((p) => selectEl.add(new Option(p, p)));
    }
  }

  // 1. منطق بحث الملاحظات
  async function searchObservations() {
    monObsTable.innerHTML = "جاري البحث...";
    // تصفير الإحصائيات قبل البحث
    document.getElementById("obs-stats-summary").style.display = "none";

    const filters = {
      project: monObsProject.value,
      fromDate: monObsFrom.value,
      toDate: monObsTo.value,
      openOnly: monObsOpen.checked,
    };

    try {
      const r = await callApi("searchObservations", {
        filters: filters,
        userInfo: currentUser,
      });

      // رسم الجدول
      renderMonitorTable(r.data, monObsTable);

      // حساب الإحصائيات (السطر الجديد)
      if (r.data && r.data.length > 0) {
        window.calculateObservationStats(r.data);
      }
    } catch (e) {
      monObsTable.innerHTML = e.message;
    }
  }

  // 2. منطق بحث المخ طر
  async function searchHazards() {
    monHazTable.innerHTML = "جاري البحث...";
    const filters = {
      project: monHazProject.value,
      fromDate: monHazFrom.value,
      toDate: monHazTo.value,
      openOnly: monHazOpen.checked,
    };

    try {
      const r = await callApi("searchHazards", {
        filters: filters,
        userInfo: currentUser,
      });
      renderMonitorTable(r.data, monHazTable);
    } catch (e) {
      monHazTable.innerHTML = e.message;
    }
  }

  // دالة عامة لرسم الجدول (لأنهم شبه بعض)
  // 1. تحديث جدول المتابعة (Monitor Observations Table) - تأكيد وجود المصدر
  function renderMonitorTable(data, container) {
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="text-align:center;">لا توجد نتائج.</p>';
      return;
    }

    let html = `<table class="results-table">
          <thead>
              <tr>
                  <th>الكود</th>
                  <th>التاريخ</th>
                  <th>المسجل</th>
                  <th>المشروع</th>
                  <th>مصدر الملاحظة</th>
                  <th>الوصف</th>
                  <th>الحالة</th>
              </tr>
          </thead>
          <tbody>`;

    data.forEach((row) => {
      let dateDisplay = row.date;
      try {
        const d = new Date(row.date);
        if (!isNaN(d.getTime())) {
          dateDisplay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      } catch (e) {}

      html += `<tr>
              <td style="white-space:nowrap;"><strong>${row.id}</strong></td>
              <td style="white-space:nowrap;">${dateDisplay}</td>
              <td style="color:#0056b3; font-weight:500;">${row.issuer || "-"}</td>
              <td>${row.project}</td>

              <td style="font-weight:bold;">${row.source || "-"}</td> <td class="desc-cell">${row.desc}</td>
              <td><span class="badge ${row.status === "Open" ? "bg-danger" : "bg-success"}">${row.status}</span></td>
          </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  // Events
  if (monObsBtn) monObsBtn.addEventListener("click", searchObservations);
  if (monHazBtn) monHazBtn.addEventListener("click", searchHazards);

  // =================================================================
  // --- (جديد) وحدة تقييم المقاولي ---
  // =================================================================

  const contEvalProject = document.getElementById("cont-eval-project");
  const contEvalMonth = document.getElementById("cont-eval-month");
  const contEvalContractor = document.getElementById("cont-eval-contractor");
  const contEvalLoadBtn = document.getElementById("cont-eval-load-btn");
  const contKpiContainer = document.getElementById("cont-kpi-container");
  const contEvalFooter = document.getElementById("cont-eval-footer");
  const contTotalScoreEl = document.getElementById("cont-total-score");
  const contMaxScoreEl = document.getElementById("cont-max-score");
  const contEvalForm = document.getElementById("cont-eval-form");

  let currentContKPIs = [];

  function initContractorEvalPage() {
    // 1. ضبط الشهر الحالي
    if (!contEvalMonth.value) {
      const d = new Date();
      contEvalMonth.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    // 2. تعبئة المشاريع (نفس منطق الصلاحيات)
    if (contEvalProject.options.length <= 1) {
      const userProj = (currentUser.projects || "").toString();
      let acc = [];
      if (initialData && initialData.projects) {
        acc =
          userProj === "ALL"
            ? initialData.projects
            : initialData.projects.filter((p) => userProj.includes(p));
        fillSelect(contEvalProject, acc);
      }
    }

    // تصفير
    contKpiContainer.innerHTML =
      '<p style="text-align:center; color:#777;">اختر البيانات واضغط "بدء التقييم"</p>';
    contEvalFooter.style.display = "none";
    contEvalContractor.innerHTML =
      '<option value="">-- اختر المشروع أولاً --</option>';
    contEvalContractor.disabled = true;
  }

  // عند تغيير المشروع -> هات المقاولين
  async function updateContEvalContractors() {
    const proj = contEvalProject.value;
    if (!proj) return;

    contEvalContractor.innerHTML = "<option>جاري التحميل...</option>";
    contEvalContractor.disabled = true;

    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      if (r.contractors && r.contractors.length > 0) {
        fillSelect(contEvalContractor, r.contractors);
        contEvalContractor.disabled = false;
      } else {
        contEvalContractor.innerHTML =
          '<option value="">لا يوجد مقاولين</option>';
      }
    } catch (e) {
      contEvalContractor.innerHTML = "<option>خطأ</option>";
    }
  }

  // عند الضغط على "بدء التقييم" -> هات البنود
  async function loadContractorKPIs() {
    const proj = contEvalProject.value;
    const cont = contEvalContractor.value;
    const month = contEvalMonth.value;

    if (!proj || !cont || !month) {
      alert("الرجاء اختيار المشروع والمقاول والشهر.");
      return;
    }

    contKpiContainer.innerHTML =
      '<div class="loader-small">جاري جلب بنود التقييم...</div>';
    contEvalFooter.style.display = "none";

    try {
      const r = await callApi("getContractorKPIs", { month: month });
      if (r.status === "success" && r.kpis.length > 0) {
        renderContKPIs(r.kpis);
      } else {
        contKpiContainer.innerHTML = "<p>لا توجد بنود تقييم لهذا الشهر.</p>";
      }
    } catch (e) {
      contKpiContainer.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  // رسم البنود
  function renderContKPIs(kpis) {
    currentContKPIs = kpis;
    contKpiContainer.innerHTML = "";
    let totalMax = 0;

    kpis.forEach((k) => {
      totalMax += parseFloat(k.max);

      const div = document.createElement("div");
      div.className = "kpi-card"; // نفس ستايل كروت الموظفين
      div.innerHTML = `
              <div class="kpi-card-info">
                  <h4>${k.desc}</h4>
                  <p><small>${k.freq}</small> | الدرجة القصوى: <span>${k.max}</span></p>
              </div>
              <div class="kpi-card-input">
                  <input type="number" class="kpi-score-input cont-score" 
                         data-id="${k.id}" data-max="${k.max}"
                         min="0" max="${k.max}" step="any" placeholder="0">
              </div>
          `;
      contKpiContainer.appendChild(div);
    });

    // تحديث الفوتر
    contMaxScoreEl.textContent = totalMax;
    contTotalScoreEl.textContent = "0";
    contEvalFooter.style.display = "block";

    // تفعيل الحساب التلقائي للمجموع
    document.querySelectorAll(".cont-score").forEach((inp) => {
      inp.addEventListener("input", calculateContTotal);
    });
  }

  function calculateContTotal() {
    let total = 0;
    document.querySelectorAll(".cont-score").forEach((inp) => {
      let val = parseFloat(inp.value);
      if (isNaN(val)) val = 0;
      total += val;
    });
    contTotalScoreEl.textContent = total;
  }

  // حفظ التقييم
  if (contEvalForm) {
    contEvalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!confirm("هل أنت متأكد من حفظ التقييم؟")) return;

      // تجميع الدرجات
      const scores = [];
      let validationErr = false;
      let totalScore = 0;

      document.querySelectorAll(".cont-score").forEach((inp) => {
        const val = parseFloat(inp.value);
        const max = parseFloat(inp.dataset.max);

        if (val < 0 || val > max) {
          inp.style.borderColor = "red";
          validationErr = true;
        } else {
          inp.style.borderColor = "";
          scores.push({ id: inp.dataset.id, score: val || 0 });
          totalScore += val || 0;
        }
      });

      if (validationErr) {
        alert("تأكد من صحة الدرجات (لا تتجاوز الحد الأقصى).");
        return;
      }

      const data = {
        project: contEvalProject.value,
        contractor: contEvalContractor.value,
        month: contEvalMonth.value,
        totalScore: totalScore,
        maxScore: parseFloat(contMaxScoreEl.textContent),
        scores: scores,
      };

      const btn = contEvalForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "جاري الحفظ...";

      try {
        const r = await callApi("saveContractorEval", {
          evalData: data,
          userInfo: currentUser,
        });
        alert(r.message);
        contKpiContainer.innerHTML = "";
        contEvalFooter.style.display = "none";
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "حفظ التقييم";
      }
    });
  }

  if (contEvalProject)
    contEvalProject.addEventListener("change", updateContEvalContractors);
  if (contEvalLoadBtn)
    contEvalLoadBtn.addEventListener("click", loadContractorKPIs);
  // =================================================================
  // --- (جديد) وحدة NCR & Violations ---
  // =================================================================

  // Selectors
  const ncrForm = document.getElementById("ncr-form");
  const ncrTypeRadios = document.getElementsByName("report-type");
  const ncrFieldsDiv = document.getElementById("ncr-fields-container");

  // NCR Fields
  const ncrDate = document.getElementById("ncr-date");
  const ncrTime = document.getElementById("ncr-time");
  const ncrIssuer = document.getElementById("ncr-issuer");
  const ncrProject = document.getElementById("ncr-project");
  const ncrObserverType = document.getElementById("ncr-observer-type");
  const ncrEmpGroup = document.getElementById("ncr-emp-group");
  const ncrContGroup = document.getElementById("ncr-cont-group");
  const ncrObserverEmp = document.getElementById("ncr-observer-emp");
  const ncrShowAllEmp = document.getElementById("ncr-show-all-emp");
  const ncrObserverCompany = document.getElementById("ncr-observer-company");
  const ncrObserverNid = document.getElementById("ncr-observer-nid");
  const ncrNidSearchBtn = document.getElementById("ncr-nid-search-btn");
  const ncrObserverName = document.getElementById("ncr-observer-name");
  const ncrReportedTo = document.getElementById("ncr-reported-to");
  const ncrMethod = document.getElementById("ncr-method");
  const ncrDesc = document.getElementById("ncr-desc");
  const ncrRoot = document.getElementById("ncr-root");
  // Actions
  const ncrActText = document.getElementById("ncr-act-text");
  const ncrActResp = document.getElementById("ncr-act-resp");
  const ncrActDate = document.getElementById("ncr-act-date");
  const ncrAddActBtn = document.getElementById("ncr-add-act-btn");
  const ncrActionsList = document.getElementById("ncr-actions-list");
  const ncrSaveBtn = document.getElementById("ncr-save-btn");
  const ncrSaveMsg = document.getElementById("ncr-save-msg");

  let ncrActionsCart = [];
  function setContainerState(container, isEnabled) {
    if (!container) return;
    const elements = container.querySelectorAll(
      "input, select, textarea, button",
    );
    elements.forEach((el) => {
      // لا نعطل أزرار الراديو الخاصة باختيار النوع
      if (el.name !== "report-type" && el.name !== "vio-level") {
        el.disabled = !isEnabled;
      }
    });
  }
  async function initNcrPage() {
    console.log("بدء تشغيل صفحة NCR والمخالفات (النسخة المطورة)...");

    // 1. تصفير حقول الاختيار الجديدة (Popup Inputs) لضمان نظافة السجل
    if (document.getElementById("ncr-emp-name-display"))
      document.getElementById("ncr-emp-name-display").value = "";
    if (document.getElementById("ncr-emp-id-hidden"))
      document.getElementById("ncr-emp-id-hidden").value = "";
    if (document.getElementById("vio-emp-name-display"))
      document.getElementById("vio-emp-name-display").value = "";
    if (document.getElementById("vio-emp-id-hidden"))
      document.getElementById("vio-emp-id-hidden").value = "";

    // 2. ضبط الوقت والتاريخ واسم المصدر
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-CA");
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (document.getElementById("ncr-date"))
      document.getElementById("ncr-date").value = dateStr;
    if (document.getElementById("ncr-time"))
      document.getElementById("ncr-time").value = timeStr;
    if (document.getElementById("ncr-issuer") && currentUser)
      document.getElementById("ncr-issuer").value = currentUser.username;

    // 3. التأكد من جلب يانات الموظفين وتخزينها في window لكي يراها المودال
    if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
      try {
        const r = await callApi("getInventoryInitData", {
          userInfo: currentUser,
        });
        if (r.status === "success") {
          window.ppeEmployees = r.employees;
          console.log("تم تحميل بيانات الموظفين بنجاح.");
        }
      } catch (e) {
        console.error("Error loading employees for NCR:", e);
      }
    }

    // 4. تحميل المشاريع في القائمة المنسدلة
    if (ncrProject && ncrProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        fillSelect(ncrProject, ppeLocations);
      } else {
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          if (r.status === "success") {
            ppeLocations = r.locations;
            // تحديث القوائم
            fillSelect(ncrProject, r.locations);
            // تعبئة المشاريع في قسم المخالفات أيضاً لو كان له سلكتور مختلف
            if (document.getElementById("vio-project"))
              fillSelect(document.getElementById("vio-project"), r.locations);
          }
        } catch (e) {
          console.error("Error loading projects:", e);
        }
      }
    }

    // 5. تصفير سلة الإجراءات ورسمها فارغة
    ncrActionsCart = [];
    renderNcrActions();

    // 6. ضبط الحالة الأولية للفورم (إظهار NCR أو Violation بناءً على المختار)
    toggleReportType();
  }

  function toggleReportType() {
    const type = document.querySelector(
      'input[name="report-type"]:checked',
    ).value;

    if (type === "NCR") {
      ncrFieldsDiv.style.display = "block";
      vioFieldsDiv.style.display = "none";

      // تفعيل حقول NCR وتعطيل حقول Violation (لح  مشكلة الـ Submit)
      setContainerState(ncrFieldsDiv, true);
      setContainerState(vioFieldsDiv, false);

      toggleNcrObserver(); // ضبط الحقول الفرعية للـ NCR
    } else {
      ncrFieldsDiv.style.display = "none";
      vioFieldsDiv.style.display = "block";

      // تفعيل حقول Violation وتعطيل حقول NCR
      setContainerState(ncrFieldsDiv, false);
      setContainerState(vioFieldsDiv, true);

      // تهSئة صفحة المخالفات (التاريخ والوقت)
      initViolationPage();
    }
  }

  function toggleNcrObserver() {
    const type = ncrObserverType.value;

    if (type === "السويدي") {
      ncrEmpGroup.style.display = "block";
      ncrContGroup.style.display = "none";
      setContainerState(ncrEmpGroup, true);
      setContainerState(ncrContGroup, false);
    } else {
      ncrEmpGroup.style.display = "none";
      ncrContGroup.style.display = "block";
      setContainerState(ncrEmpGroup, false);
      setContainerState(ncrContGroup, true);
      updateNcrContractors();
    }
  }

  // متغير لتحديد أي حقل سيتم ملؤه (NCR أم Violation)
  let currentNcrVioContext = "";

  // دالة فتح المودال لقسم NCR
  window.openNcrEmpSelector = function () {
    const proj = document.getElementById("ncr-project").value;
    const showAll = document.getElementById("ncr-show-all-emp").checked;
    if (!proj && !showAll) {
      alert("الرجاء اختيار المشروع أولاً");
      return;
    }

    currentNcrVioContext = "NCR";
    document.getElementById("ncrvio-modal-title").innerText =
      "اختيار المُبلغ (NCR)";
    openNcrVioModalBase(proj, showAll);
  };

  // دالة فتح المودال  قس  المخالفات
  window.openVioEmpSelector = function () {
    const proj = document.getElementById("vio-project").value;
    const showAll = document.getElementById("vio-show-all-emp").checked;
    if (!proj && !showAll) {
      alert("الرجاء اختيار المشروع أولاً");
      return;
    }

    currentNcrVioContext = "VIO";
    document.getElementById("ncrvio-modal-title").innerText =
      "اختيار الموظف المخالف";
    openNcrVioModalBase(proj, showAll);
  };

  function openNcrVioModalBase(proj, showAll) {
    document.getElementById("ncrvio-emp-modal").style.display = "flex";
    document.getElementById("ncrvio-emp-search-box").value = "";
    document.getElementById("ncrvio-emp-search-box").focus();

    const list = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === proj);
    renderNcrVioEmpsInModal(list);
  }

  window.closeNcrVioEmpSelector = function () {
    document.getElementById("ncrvio-emp-modal").style.display = "none";
  };

  function renderNcrVioEmpsInModal(list) {
    const container = document.getElementById("ncrvio-emp-list-container");
    container.innerHTML =
      list.length === 0
        ? '<p style="text-align:center; padding:20px;">لا توجد نتائج</p>'
        : list
            .map(
              (e) => `
              <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:8px;" 
                   onclick="window.selectNcrVioEmployee('${e.id}', '${e.name}')">
                  <div style="text-align:right;">
                      <span style="display:block; font-weight:700;">${e.name}</span>
                      <small style="color:#666;">ID: ${e.id} | Project: ${e.project}</small>
                  </div>
              </div>`,
            )
            .join("");
  }

  window.filterNcrVioEmpList = function () {
    const query = document
      .getElementById("ncrvio-emp-search-box")
      .value.toLowerCase();
    const proj =
      currentNcrVioContext === "NCR"
        ? document.getElementById("ncr-project").value
        : document.getElementById("vio-project").value;
    const showAll =
      currentNcrVioContext === "NCR"
        ? document.getElementById("ncr-show-all-emp").checked
        : document.getElementById("vio-show-all-emp").checked;

    const baseList = showAll
      ? window.ppeEmployees
      : window.ppeEmployees.filter((e) => e.project === proj);
    const filtered = baseList.filter(
      (e) =>
        e.name.toLowerCase().includes(query) || e.id.toString().includes(query),
    );
    renderNcrVioEmpsInModal(filtered);
  };

  window.selectNcrVioEmployee = function (id, name) {
    if (currentNcrVioContext === "NCR") {
      document.getElementById("ncr-emp-name-display").value = name;
      document.getElementById("ncr-emp-id-hidden").value = id;
    } else {
      document.getElementById("vio-emp-name-display").value = name;
      document.getElementById("vio-emp-id-hidden").value = id;
    }
    window.closeNcrVioEmpSelector();
  };

  async function updateNcrContractors() {
    const proj = ncrProject.value;
    if (!proj) return;
    ncrObserverCompany.innerHTML = "<option>جاري التحميل...</option>";
    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      fillSelect(ncrObserverCompany, r.contractors);
    } catch (e) {}
  }

  async function searchNcrNid() {
    const nid = ncrObserverNid.value;
    if (!nid) return;
    ncrObserverName.value = "بحث...";
    ncrObserverName.disabled = true;
    try {
      const r = await callApi("getRecipientByNID", { nationalId: nid });
      if (r.status === "found") {
        ncrObserverName.value = r.name;
        ncrObserverCompany.value = r.contractor;
        ncrObserverName.disabled = true;
      } else {
        ncrObserverName.value = "";
        ncrObserverName.disabled = false;
        ncrObserverName.focus();
      }
    } catch (e) {
      ncrObserverName.value = "";
      ncrObserverName.disabled = false;
    }
  }

  function addNcrAction() {
    const txt = ncrActText.value;
    const resp = ncrActResp.value;
    const date = ncrActDate.value;
    if (!txt || !resp || !date) {
      alert("أكمل بيانات الإجراء");
      return;
    }

    ncrActionsCart.push({ text: txt, resp: resp, date: date });
    renderNcrActions();
    ncrActText.value = "";
    ncrActResp.value = "";
    ncrActDate.value = "";
  }

  function renderNcrActions() {
    if (ncrActionsList) {
      ncrActionsList.innerHTML = ncrActionsCart.length
        ? ncrActionsCart
            .map(
              (a, i) =>
                `<div class="ppe-cart-item">
                  <span>${a.text} <small>(${a.resp} - ${a.date})</small></span>
                  <button type="button" class="btn-small btn-danger" onclick="remNcrAct(${i})">X</button>
              </div>`,
            )
            .join("")
        : '<p style="text-align:center; color:#777;">لا توجد إجراءات</p>';
    }
  }
  window.remNcrAct = (i) => {
    ncrActionsCart.splice(i, 1);
    renderNcrActions();
  };

  if (ncrForm) {
    ncrForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // منع تحديث الصفحة

      // معرفة نوع التقرير المختار (NCR أم Violation)
      const reportTypeElement = document.querySelector(
        'input[name="report-type"]:checked',
      );
      const reportType = reportTypeElement ? reportTypeElement.value : "NCR";

      // ============================================================
      // --- الحالة 1: NCR (عدم مطابقة) ---
      // ============================================================
      if (reportType === "NCR") {
        const data = {
          project: ncrProject.value,
          reportedTo: ncrReportedTo.value,
          method: ncrMethod.value,
          description: ncrDesc.value,
          rootCauses: ncrRoot.value,
          observer: { type: ncrObserverType.value },
          actions: ncrActionsCart,
        };

        // 1. التحقق من الحقول الأساسية
        if (
          !data.project ||
          !data.reportedTo ||
          !data.method ||
          !data.description ||
          !data.rootCauses
        ) {
          showMessage(
            ncrSaveMsg,
            "الرجاء إكمال جميع الحقول الأساسية للـ NCR.",
            false,
          );
          return;
        }

        // 2. تجهيز بيانات المُبلغ (Observer)
        if (data.observer.type === "السويدي") {
          const empId = document.getElementById("ncr-emp-id-hidden").value;
          // البحث في مصفوفة الوظفين المحملة
          const emp = ppeEmployees.find((x) => x.id == empId);
          if (!emp) {
            showMessage(
              ncrSaveMsg,
              "الرجاء اختيار اسم الموظف (المُبلغ).",
              false,
            );
            return;
          }
          data.observer.id = emp.id;
          data.observer.name = emp.name;
          data.observer.company = "السويدي";
        } else {
          // مقاول
          data.observer.id = ncrObserverNid.value;
          data.observer.name = ncrObserverName.value;
          data.observer.company = ncrObserverCompany.value;
          // هل هو جديد؟ (لو الخانة مفتوحة يبقى جديد)
          data.observer.isNew = !ncrObserverName.disabled;

          if (
            !data.observer.id ||
            !data.observer.name ||
            !data.observer.company
          ) {
            showMessage(
              ncrSaveMsg,
              "بيانات المقاول ناقصة (الرقم القومي، الاسم، الشركة).",
              false,
            );
            return;
          }
        }

        // 3. التحقق من الإجراءات
        if (data.actions.length === 0) {
          if (
            !confirm("لم تضف أي إجراءات تصحيحية. هل تريد الحفظ بدون إجراءات؟")
          )
            return;
        }

        // 4. إرسال NCR
        ncrSaveBtn.disabled = true;
        ncrSaveBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
          const r = await callApi("saveNCR", {
            ncrData: data,
            userInfo: currentUser,
          });
          showMessage(ncrSaveMsg, r.message, true);

          // إعادة تعيين الصفحة
          ncrForm.reset();
          initNcrPage();
        } catch (err) {
          showMessage(ncrSaveMsg, err.message, false);
        } finally {
          ncrSaveBtn.disabled = false;
          ncrSaveBtn.innerHTML = "حفظ NCR"; // إعادة نص الزر
        }
      }
      // ============================================================
      // --- لحالة 2: Violation (مخالفة) ---
      // ============================================================
      else {
        const levelEl = document.querySelector(
          'input[name="vio-level"]:checked',
        );
        const level = levelEl ? levelEl.value : "Level 1";
        const violatorType = vioType.value;

        const data = {
          project: vioProject.value,
          desc: vioDesc.value,
          hseStatement: vioHseStmt.value,
          violatorStatement: vioViolatorStmt.value,
          actionTaken: vioActionTaken.value,
          level: level,
          // بيانات الجزاءات (فقط لو Level 3)
          totalValue:
            level === "Level 3" ? parseFloat(vioTotalDisplay.textContent) : 0,
          items: level === "Level 3" ? vioCart : [],
          detailsText:
            level === "Level 3"
              ? vioCart.map((x) => x.appliedText).join(", ")
              : "N/A",
          violator: { type: violatorType },
        };

        // 1. التحقق من الحقول الأساسية
        if (
          !data.project ||
          !data.desc ||
          !data.actionTaken ||
          !data.hseStatement
        ) {
          showMessage(
            ncrSaveMsg,
            "يرجى ملء البيانات الأساسية للمخالفة (المشروع، الوصف، الأقوال، الإجراء).",
            false,
          );
          return;
        }

        // 2. تحديد بيانات المخالف
        if (violatorType === "موظف") {
          const empId = document.getElementById("vio-emp-id-hidden").value;
          const emp = ppeEmployees.find((x) => x.id == empId);
          if (!emp) {
            showMessage(ncrSaveMsg, "الرجاء اختيار الموظف المخالف.", false);
            return;
          }

          data.violator.id = emp.id;
          data.violator.name = emp.name;
          data.violator.company = "السويدي";
        } else {
          // مقاول
          data.violator.company = vioContSelect.value;
          if (!data.violator.company) {
            showMessage(ncrSaveMsg, "الرجاء اختيار شركة المقاول.", false);
            return;
          }

          // اسم العامل ورقم بطاقته (اختياري في المخالفة لو على الشركة، بس يفضل وجوده)
          data.violator.name =
            document.getElementById("vio-cont-worker-name").value ||
            data.violator.company;
          data.violator.id =
            document.getElementById("vio-cont-nid").value || "N/A";
          data.violator.isNew = false; // لا نسجل عمال مخالفين كجدد
        }

        // 3. إرسال Violation
        ncrSaveBtn.disabled = true;
        ncrSaveBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
          const r = await callApi("saveViolation", {
            vioData: data,
            userInfo: currentUser,
          });
          showMessage(ncrSaveMsg, r.message, true);

          // إعادة تعيين الصفحة
          ncrForm.reset();
          initNcrPage(); // يعيد ضبط الصفحة والوقت
          vioCart = [];
          updateVioCartUI(); // تصفير سلة الجزاءrت
        } catch (err) {
          showMessage(ncrSaveMsg, err.message, false);
        } finally {
          ncrSaveBtn.disabled = false;
          ncrSaveBtn.innerHTML = "حفظ المخالفة";
        }
      }
    });
  }

  // Events
  if (ncrProject) {
    ncrProject.addEventListener("change", () => {
      document.getElementById("ncr-emp-name-display").value = "";
      document.getElementById("ncr-emp-id-hidden").value = "";
    });
  }
  ncrTypeRadios.forEach((r) => r.addEventListener("change", toggleReportType));
  if (ncrObserverType)
    ncrObserverType.addEventListener("change", toggleNcrObserver);

  if (ncrNidSearchBtn) ncrNidSearchBtn.addEventListener("click", searchNcrNid);
  if (ncrAddActBtn) ncrAddActBtn.addEventListener("click", addNcrAction);
  // =================================================================
  // --- (جديد) وحدة متابعة NCR ---
  // =================================================================
  const myNcrList = document.getElementById("my-ncr-list");
  const refreshNcrBtn = document.getElementById("refresh-ncr-btn");

  async function loadMyOpenNCRs() {
    if (!myNcrList) return;
    myNcrList.innerHTML = '<div class="loader-small">جاري البحث...</div>';
    try {
      const r = await callApi("getUserOpenNCRs", { userInfo: currentUser });
      if (r.status === "success") {
        renderMyNcrTable(r.ncrs);
      } else {
        myNcrList.innerHTML = `<p class="error-message">${r.message}</p>`;
      }
    } catch (e) {
      myNcrList.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  function renderMyNcrTable(data) {
    if (!data || data.length === 0) {
      myNcrList.innerHTML =
        '<p style="text-align:center; padding:20px;">لا توجد حالات مفتوحة.</p>';
      return;
    }

    let html = `<table class="results-table">
          <thead><tr><th>الكود</th><th>التاريخ</th><th>المشروع</th><th>الوصف</th><th>إجراء</th></tr></thead>
          <tbody>`;

    data.forEach((row) => {
      // تنسيق التاريخ
      let dateDisplay = row.date;
      try {
        const d = new Date(row.date);
        dateDisplay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } catch (e) {}

      html += `<tr>
              <td><strong>${row.id}</strong></td>
              <td style="white-space:nowrap;">${dateDisplay}</td>
              <td>${row.project}</td>
              <td class="desc-cell">${row.desc}</td>
              <td>
                  <button class="btn-small btn-danger" onclick="handleCloseNCR('${row.id}')">
                      إغلاق
                  </button>
              </td>
          </tr>`;
    });
    html += `</tbody></table>`;
    myNcrList.innerHTML = html;
  }

  window.handleCloseNCR = async function (id) {
    const note = prompt("ملاحظات الإغلاق (Corrective Action Taken):");
    if (note === null) return;
    if (note.trim() === "") {
      alert("يجب كتابة ملاحظة.");
      return;
    }

    showLoader("جاري الإغلاق...");
    try {
      const r = await callApi("closeNCR", { ncrId: id, closingNote: note });
      alert(r.message);
      loadMyOpenNCRs();
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      hideLoader();
    }
  };

  if (refreshNcrBtn) refreshNcrBtn.addEventListener("click", loadMyOpenNCRs);

  // =================================================================
  // --- (جديد) منطق المخالفات (Violation Logic) ---
  // =================================================================

  // Selectors
  const vioFieldsDiv = document.getElementById("violation-fields-container"); // الـ Container
  const vioDate = document.getElementById("vio-date");
  const vioTime = document.getElementById("vio-time");
  const vioIssuer = document.getElementById("vio-issuer");
  const vioProject = document.getElementById("vio-project");
  const vioType = document.getElementById("vio-type");
  const vioEmpGroup = document.getElementById("vio-emp-group");
  const vioContGroup = document.getElementById("vio-cont-group");
  const vioEmpSelect = document.getElementById("vio-emp-select");
  const vioShowAllEmp = document.getElementById("vio-show-all-emp");
  const vioContSelect = document.getElementById("vio-cont-select");
  const vioContWorker = document.getElementById("vio-cont-worker-name");
  const vioContNid = document.getElementById("vio-cont-nid");
  // Text Areas
  const vioDesc = document.getElementById("vio-desc");
  const vioHseStmt = document.getElementById("vio-hse-stmt");
  const vioViolatorStmt = document.getElementById("vio-violator-stmt");
  const vioActionTaken = document.getElementById("vio-action-taken");
  // Level & Penalty
  const vioLevelRadios = document.getElementsByName("vio-level");
  const vioPenaltyDiv = document.getElementById("vio-penalty-div");
  const vioItemSelect = document.getElementById("vio-item-select");
  const vioRepeatSelect = document.getElementById("vio-repeat-select");
  const vioQtyGroup = document.getElementById("vio-qty-group");
  const vioQtyInput = document.getElementById("vio-qty-input");
  const vioAddBtn = document.getElementById("vio-add-btn");
  const vioListContainer = document.getElementById("vio-list-container");
  const vioTotalDisplay = document.getElementById("vio-total-display");
  const vioSaveBtn = document.getElementById("vio-save-btn");

  let vioCart = [];
  let penaltyList = []; // القائمة الخام

  // =================================================================
  // --- (ناقص) دالة تهيئة صفحة المخالفات ---
  // =================================================================
  function initViolationPage() {
    // 1. التاريخ والوقت (تنسيق يدوي)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const strHours = String(hours % 12 || 12).padStart(2, "0");
    const timeStr = `${strHours}:${minutes} ${ampm}`;

    if (vioDate) vioDate.value = dateStr;
    if (vioTime) vioTime.value = timeStr;
    if (vioIssuer && currentUser) vioIssuer.value = currentUser.username;

    // 2. المشاريع (إعادة استخدام المخز
    if (vioProject && vioProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? ppeLocations
            : ppeLocations.filter((p) => userProj.includes(p));
        fillSelect(vioProject, acc);
      } else {
        // تحميل احتياي
        callApi("getInventoryInitData", { userInfo: currentUser }).then((r) => {
          if (r.status === "success") {
            ppeLocations = r.locations;
            ppeEmployees = r.employees;
            ppeContractors = r.contractors;
            const userProj = (currentUser.projects || "").toString();
            const acc =
              userProj === "ALL"
                ? r.locations
                : r.locations.filter((p) => userProj.includes(p));
            fillSelect(vioProject, acc);
          }
        });
      }
    }

    toggleVioType();
    vioCart = [];
    updateVioCartUI();
  }

  function toggleVioType() {
    const type = vioType.value;

    if (type === "موظف") {
      vioEmpGroup.style.display = "block";
      vioContGroup.style.display = "none";
      setContainerState(vioEmpGroup, true);
      setContainerState(vioContGroup, false);
    } else {
      vioEmpGroup.style.display = "none";
      vioContGroup.style.display = "block";
      setContainerState(vioEmpGroup, false);
      setContainerState(vioContGroup, true);
      updateVioContractors();
    }
    updateVioItemDropdown();
  }

  async function updateVioContractors() {
    const proj = vioProject.value;
    if (!proj) return;
    vioContSelect.innerHTML = "<option>جاري التحميل...</option>";
    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      fillSelect(vioContSelect, r.contractors);
    } catch (e) {}
  }

  // --- منطق الجزاءات (The Penalty Logic) ---

  // مراقبة الـ Radio Buttons
  vioLevelRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.value === "Level 3") {
        vioPenaltyDiv.style.display = "block";
        loadPenaltyList();
      } else {
        vioPenaltyDiv.style.display = "none";
        vioCart = [];
        updateVioCartUI(); // تصفير السلة لو نزلنا لـ Level 2
      }
    });
  });

  async function loadPenaltyList() {
    if (penaltyList.length > 0) return; // محملة مسبقاً
    vioItemSelect.innerHTML = "<option>جاري التحميل...</option>";
    try {
      const r = await callApi("getPenaltyList", {});
      if (r.status === "success") {
        penaltyList = r.list;
        updateVioItemDropdown();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function updateVioItemDropdown() {
    const target = vioType.value; // موظف / مقاول
    vioItemSelect.innerHTML = '<option value="">-- اختر المخالفة --</option>';

    if (penaltyList.length > 0) {
      // فلترة القائمة حسب الهدف (موظف ولا مقاول)
      const filtered = penaltyList.filter((p) => p.target === target);
      filtered.forEach((p, index) => {
        // (مهم) نخزن الـ index الأصلي في القائمة الكاملة أو نستخدم الـ ID
        // هنا هنخزن الـ index في المصفوفة المفلترة ونجيبها منها
        const opt = document.createElement("option");
        opt.text = p.desc;
        opt.value = index; // index في المصفوفة المفلترة
        // نخزن نوع الحساب (Fixed/Multiply) في الـ option
        opt.dataset.calc = p.calcType;
        vioItemSelect.add(opt);
      });

      // حفظ المصفوفة المفلترة الحالية لاستخدامها عند الإضافة
      vioItemSelect.dataset.currentList = JSON.stringify(filtered);
    }
  }

  // إظهار خانة العدد لو النوع Multiply
  if (vioItemSelect) {
    vioItemSelect.addEventListener("change", () => {
      const opt = vioItemSelect.selectedOptions[0];
      if (opt && opt.dataset.calc === "Multiply") {
        vioQtyGroup.style.display = "block";
      } else {
        vioQtyGroup.style.display = "none";
        vioQtyInput.value = 1;
      }
    });
  }

  // 4. إضافة بند للسلة (معدل)
  // 4. إضافة بند للسلة (معدل لضمان الحساب)
  if (vioAddBtn) {
    vioAddBtn.addEventListener("click", () => {
      const idx = vioItemSelect.value;
      if (idx === "") return;

      const currentList = JSON.parse(vioItemSelect.dataset.currentList);
      const item = currentList[idx];

      const type = vioRepeatSelect.value; // First / Repeat
      let qty = parseFloat(vioQtyInput.value) || 1;
      if (item.calcType === "Fixed") qty = 1;

      let appliedText = "";
      let unitValue = 0;
      let category = "";

      // جلب القيم (مع التأكد إنها أرقام)
      if (type === "First") {
        appliedText = item.firstTxt;
        unitValue = Number(item.firstVal) || 0; // تحويل لرقم
        category = item.firstCat;
      } else {
        appliedText = item.repTxt;
        unitValue = Number(item.repVal) || 0; // تحويل لرقم
        category = item.repCat;
      }

      // الحساب
      const totalValue = unitValue * qty;

      let finalText = `${item.desc} - ${appliedText}`;
      if (qty > 1) finalText += ` (عدد: ${qty})`;

      vioCart.push({
        desc: item.desc,
        type: type,
        appliedText: finalText,
        appliedValue: totalValue, // دي القيمة اللي هتتجمع
        qty: qty,
      });

      updateVioCartUI();

      // Reset
      vioItemSelect.value = "";
      vioQtyInput.value = 1;
      if (vioQtyGroup) vioQtyGroup.style.display = "none";
    });
  }

  // 5. تحديث واجهة ا؄سلة والحسابات (معدل لتميoز العملة/الأيام)
  function updateVioCartUI() {
    vioListContainer.innerHTML = "";
    let total = 0;
    let adminNotes = [];

    // معرفة نوع المخالف (موظف ولا مقاول) عشان نحدد التمييز
    const violatorType = document.getElementById("vio-type").value;
    const unitLabel = violatorType === "موظف" ? "يوم" : "جم";

    vioCart.forEach((item, i) => {
      total += item.appliedValue;
      adminNotes.push(item.appliedText);

      // عرض القيمة (لو أكبر من صفر بنكتبها، لو صفر بنكتب إجراء إداري)
      const valueDisplay =
        item.appliedValue > 0
          ? `${item.appliedValue} ${unitLabel}`
          : "إجراء إداري";

      const div = document.createElement("div");
      div.className = "ppe-cart-item";
      div.innerHTML = `
              <div style="flex-grow:1;">
                  <span style="font-weight:bold; display:block;">${item.desc}</span>
                  <small style="color:#666;">${item.appliedText}</small>
              </div>
              <span style="font-weight:bold; color:#C8102E; white-space:nowrap; margin:0 10px;">${valueDisplay}</span>
              <button type="button" class="btn-small btn-danger" onclick="remVioItem(${i})">X</button>
          `;
      vioListContainer.appendChild(div);
    });

    // عرض الإجمالي النهائي بالتمييز
    vioTotalDisplay.textContent = `${total} ${unitLabel}`;

    // تجميع النصوص للحفظ
    if (typeof vioAdminTextDisplay !== "undefined" && vioAdminTextDisplay) {
      vioAdminTextDisplay.value = adminNotes.join(" + ");
    }
  }
  window.remVioItem = (i) => {
    vioCart.splice(i, 1);
    updateVioCartUI();
  };

  // حفظ المخالفة
  if (ncrForm) {
    // نستخدم نفس الفورم الكبير
    // (تعديل) استمع للحدث داخل الـ Listener الموجود أصلاً في قسم NCR
    // بما أنهم في فورم واحد، سنعدل دالة الـ submit في قسم NCR
  }

  // Events
  if (vioProject) {
    vioProject.addEventListener("change", () => {
      document.getElementById("vio-emp-name-display").value = "";
      document.getElementById("vio-emp-id-hidden").value = "";
    });
  }
  if (vioType) vioType.addEventListener("change", toggleVioType);

  // =================================================================
  // --- (جديد) بحث NCR والمخالفات ---
  // =================================================================
  async function searchNcrViolations() {
    monNcrVioTable.innerHTML = "جاري البحث...";
    const filters = {
      project: monNcrVioProject.value,
      fromDate: monNcrVioFrom.value,
      toDate: monNcrVioTo.value,
    };

    try {
      const r = await callApi("searchNcrViolations", {
        filters: filters,
        userInfo: currentUser,
      });
      renderNcrVioTable(r.data);
    } catch (e) {
      monNcrVioTable.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  function renderNcrVioTable(data) {
    if (!data || data.length === 0) {
      monNcrVioTable.innerHTML =
        '<p style="text-align:center; padding:20px;">لا توجد نتائج.</p>';
      return;
    }

    let html = `<table class="results-table">
          <thead>
              <tr>
                  <th>النوع</th>
                  <th>الكود</th>
                  <th>التاريخ</th>
                  <th>المشروع</th>
                  <th>المصدر</th> 
                  <th style="width:30%;">الوصف</th>
                  <th>إجراء / طباعة</th>
              </tr>
          </thead>
          <tbody>`;

    data.forEach((row) => {
      const isNCR = row.type === "NCR";
      const typeBadge = isNCR
        ? '<span class="badge bg-warning" style="color:#856404; background:#fff3cd;">NCR</span>'
        : '<span class="badge bg-danger" style="color:#fff; background:#dc3545;">Violation</span>';

      let dateDisplay = row.date;
      try {
        const d = new Date(row.date);
        dateDisplay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } catch (e) {}

      // تحديد الزر المناسب (لو NCR هيجيب إغلاق أو حالته، لو مخالفة هيجيب زرار طباعة PDF)
      let actionCell = `<span class="badge ${row.status === "Open" ? "bg-danger" : "bg-success"}">${row.status}</span>`;
      if (!isNCR) {
        actionCell = `<button class="btn-small btn-secondary" style="background:#C8102E; border:none;" onclick="window.printViolationPDF('${row.id}')">
                              <i class="fas fa-file-pdf"></i> استخراج التقرير
                            </button>`;
      }

      html += `<tr>
              <td>${typeBadge}</td>
              <td style="font-weight:bold;">${row.id}</td>
              <td style="white-space:nowrap;">${dateDisplay}</td>
              <td>${row.project}</td>
              <td style="color:#0056b3; font-weight:600;">${row.issuer || "-"}</td> 
              <td class="desc-cell">${row.desc}</td>
              <td style="text-align:center;">${actionCell}</td>
          </tr>`;
    });
    html += `</tbody></table>`;
    monNcrVioTable.innerHTML = html;
  }

  if (monNcrVioBtn) monNcrVioBtn.addEventListener("click", searchNcrViolations);

  // =================================================================
  // --- (معدل) حدة المقاولين والرفع (Contractors Upload) ---
  // =================================================================

  const contForm = document.getElementById("contractor-form");
  const contDate = document.getElementById("cont-date");
  const contTime = document.getElementById("cont-time");
  const contIssuer = document.getElementById("cont-issuer");
  const contProject = document.getElementById("cont-project");
  const contContractor = document.getElementById("cont-contractor"); // (جديد)
  const contFile = document.getElementById("cont-file");
  const fileNameDisplay = document.getElementById("file-name-display");
  const contSaveBtn = document.getElementById("cont-save-btn");
  const contSaveMsg = document.getElementById("cont-save-msg");

  function initContractorPage() {
    const now = new Date();
    //
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    if (contDate) contDate.value = `${year}-${month}-${day}`;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const strHours = String(hours % 12 || 12).padStart(2, "0");
    if (contTime) contTime.value = `${strHours}:${minutes} ${ampm}`;

    if (contIssuer) contIssuer.value = currentUser.username;

    // تعبئة المشاريع
    if (contProject && contProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? ppeLocations
            : ppeLocations.filter((p) => userProj.includes(p));
        fillSelect(contProject, acc);
      } else {
        callApi("getInventoryInitData", { userInfo: currentUser }).then((r) => {
          if (r.status === "success") fillSelect(contProject, r.locations);
        });
      }
    }

    // تصفير قائمة المقاول
    if (contContractor) {
      contContractor.innerHTML =
        '<option value="">-- اختر المشروع أولاً --</option>';
      contContractor.disabled = true;
    }
  }

  // (جديد) دالة جلب امقاولين ند تغيير اiمشروع
  async function updateContUploadContractors() {
    const proj = contProject.value;
    if (!proj) return;

    contContractor.innerHTML = "<option>جاري التحميل...</option>";
    contContractor.disabled = true;

    try {
      // نستخدم نفس الدالة الموجودة في السيرفر
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      if (r.contractors && r.contractors.length > 0) {
        fillSelect(contContractor, r.contractors);
        contContractor.disabled = false;
      } else {
        contContractor.innerHTML = '<option value="">لا يوجد مقاولين</option>';
      }
    } catch (e) {
      contContractor.innerHTML = "<option>خطأ</option>";
    }
  }

  // عر  اسم الملف
  if (contFile) {
    contFile.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        fileNameDisplay.textContent = this.files[0].name;
        fileNameDisplay.style.color = "#28a745";
      } else {
        fileNameDisplay.textContent = "لم يتم اختيار ملف";
        fileNameDisplay.style.color = "#555";
      }
    });
  }

  // الحفظ
  if (contForm) {
    contForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const file = contFile.files[0];
      if (!contProject.value) {
        alert("اختر المشروع");
        return;
      }
      if (!contContractor.value) {
        alert("اختر المقاول");
        return;
      }
      if (!file) {
        alert("الرجاء اختيار ملف.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("حجم الملف كبير جداً (الحد الأقصى 5 ميجا).");
        return;
      }

      contSaveBtn.disabled = true;
      contSaveBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async function () {
        try {
          const base64Data = reader.result.split(",")[1];

          const data = {
            project: contProject.value,
            contractor: contContractor.value, // (جديد) إرسال اسم المقاول
            fileName: file.name,
            mimeType: file.type,
            fileData: base64Data,
          };

          const r = await callApi("saveContractorUpload", {
            data: data,
            userInfo: currentUser,
          });
          showMessage(contSaveMsg, r.message, true);
          contForm.reset();
          fileNameDisplay.textContent = "لم يتم اختيار ملف";
          initContractorPage(); // إعادة تهيئة
        } catch (err) {
          alert("خطأ في الرفع: " + err.message);
        } finally {
          contSaveBtn.disabled = false;
          contSaveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ ورفع الملف';
        }
      };
      reader.onerror = function (error) {
        alert("خطأ في قراءة الملف: " + error);
        contSaveBtn.disabled = false;
      };
    });
  }

  // (جديد) ربط حدث غيير المشروع
  if (contProject) {
    contProject.addEventListener("change", updateContUploadContractors);
  }

  // =================================================================
  // (app.js) منطق صفحة تحليلات المقاولين
  // =================================================================

  // Selectors
  const anaProject = document.getElementById("ana-project");
  const anaContractor = document.getElementById("ana-contractor");
  const anaMonth = document.getElementById("ana-month");
  const anaCumulative = document.getElementById("ana-cumulative");
  const anaSortKpi = document.getElementById("ana-sort-kpi");
  const anaMergeProj = document.getElementById("ana-merge-proj");
  const anaSearchBtn = document.getElementById("ana-search-btn");
  const anaResultsContainer = document.getElementById("ana-results-container");
  const anaPrintBtn = document.getElementById("ana-print-btn");

  // =================================================================
  // (app.js) إصلاح القائمة المنسدAة مشاريع + رسم الجدول
  // =================================================================

  async function initContractorAnalyticsPage() {
    console.log("Analytics Page Init...");

    // 1. ضبط الشهر احالي
    if (anaMonth && !anaMonth.value) {
      const d = new Date();
      anaMonth.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    // 2. تعبئة قائمة المشاريع (إصلاح المشكلة)
    // نتأكد إن القائمة لسه فاضية (فيها خيار واحد بس)
    if (anaProject && anaProject.options.length <= 1) {
      anaProject.innerHTML =
        '<option value="ALL_ACCESSIBLE">كل المشاريع</option>';

      // محاولة استخدام البيانات المحلة سبقاً
      let projectsSource = [];
      if (
        initialData &&
        initialData.projects &&
        initialData.projects.length > 0
      ) {
        projectsSource = initialData.projects;
      } else if (
        typeof ppeLocations !== "undefined" &&
        ppeLocations.length > 0
      ) {
        // لو initialData مش موجودة، نجرب ppeLocations
        projectsSource = ppeLocations;
      } else {
        // لو مفيش حاجة خالص، نطلب البيانات من السيرفر
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          if (r.status === "success") {
            projectsSource = r.locations;
            // تحديث المتغيرات العامة بالمرة
            ppeLocations = r.locations;
            initialData = { projects: r.locations };
          }
        } catch (e) {
          console.error("Failed to load projects for analytics:", e);
        }
      }

      // الملء الفعلي
      if (projectsSource.length > 0) {
        projectsSource.forEach((p) => anaProject.add(new Option(p, p)));
      }
    }
  }

  // جلب المقاولين عند تغيير المشروع
  async function updateAnaContractors() {
    const proj = anaProject.value;
    anaContractor.innerHTML = '<option value="ALL">جاري التحميل...</option>';

    if (proj === "ALL_ACCESSIBLE") {
      anaContractor.innerHTML = '<option value="ALL">كل المقاولين</option>';
      return;
    }

    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      anaContractor.innerHTML = '<option value="ALL">كل المقاولين</option>';
      if (r.contractors) {
        r.contractors.forEach((c) => anaContractor.add(new Option(c, c)));
      }
    } catch (e) {
      anaContractor.innerHTML = '<option value="ALL">خطأ في التحميل</option>';
    }
  }

  // تنفيذ البحث
  async function performAnaSearch() {
    anaResultsContainer.innerHTML =
      '<div class="loader-small">جاري حساب الإحصائيات...</div>';

    const filters = {
      project: anaProject.value,
      contractor: anaContractor.value,
      month: anaMonth.value,
      isCumulative: anaCumulative.checked,
      sortKpi: anaSortKpi.checked,
      mergeProjects: anaMergeProj.checked,
    };

    try {
      const r = await callApi("getContractorAnalytics", { filters: filters });
      renderAnalyticsTable(r.data);
    } catch (e) {
      anaResultsContainer.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  // رسم الجدوr (V4: PPE Details with Badges)
  function renderAnalyticsTable(data) {
    if (!data || data.length === 0) {
      anaResultsContainer.innerHTML =
        '<p style="text-align:center;">لا توجد بيانات لهذه الفترة.</p>';
      return;
    }

    const isKpiView = document.getElementById("ana-sort-kpi").checked;
    let html = "";

    // ======================================================
    // الوضع 1: عرض مختصر (KPI View)
    // ======================================================
    if (isKpiView) {
      html = `
        <table class="results-table" id="analytics-table">
          <thead>
              <tr>
                  <th style="background:#333; color:#fff; width:50px;">#</th>
                  <th>المقاول</th>
                  <th>المشروع</th>
                  <th>التقييم (KPI)</th>
              </tr>
          </thead>
          <tbody>`;

      data.forEach((row, index) => {
        let scoreVal = parseFloat(row.kpi_score).toFixed(1);
        let kpiClass = "bg-secondary";
        let scoreText = "غير مقيم";

        if (row.has_eval) {
          if (row.kpi_score < 70) kpiClass = "bg-danger";
          else if (row.kpi_score < 90) kpiClass = "bg-warning";
          else kpiClass = "bg-success";
          scoreText = `${scoreVal}%`;
        } else {
          scoreText = `0% <small>(غير مقيم)</small>`;
        }

        let rankIcon = `#${index + 1}`;
        if (index === 0 && row.kpi_score > 0) rankIcon = "🥇";
        if (index === 1 && row.kpi_score > 0) rankIcon = "🥈";
        if (index === 2 && row.kpi_score > 0) rankIcon = "🥉";

        html += `
              <tr>
                  <td style="text-align:center; font-weight:bold;">${rankIcon}</td>
                  <td style="font-weight:bold;">${row.contractor}</td>
                  <td>${row.project}</td>
                  <td style="text-align:center;">
                      <span class="badge ${kpiClass}" style="font-size:1em; padding:6px 10px;">
                          ${scoreText}
                      </span>
                  </td>
              </tr>`;
      });
      html += `</tbody></table>`;
    }
    // ======================================================
    // الوضع 2: العرض التفصيلي (Full View - with detailed PPE)
    // ======================================================
    else {
      html = `
        <table class="results-table" id="analytics-table" style="font-size:0.85rem;">
          <thead>
              <tr>
                  <th class="col-0">المقاول</th>
                  <th class="col-1">المشروع</th>
                  <th class="col-2">تصاريح</th>
                  <th class="col-3">تدريب</th>
                  <th class="col-4">Induction</th>
                  <th class="col-5">ملاحظات</th>
                  <th class="col-6">Hazards</th>
                  <th class="col-7" style="min-width:180px;">مهمات (PPE)</th>
                  <th class="col-8">مخالفات</th>
                  <th class="col-9">NCR</th>
                  <th class="col-10">KPI %</th>
                  <th class="col-11 no-print">ملف</th>
              </tr>
          </thead>
          <tbody>`;

      data.forEach((row) => {
        let scoreVal = parseFloat(row.kpi_score).toFixed(1);
        let kpiClass = "bg-secondary";
        let scoreText = "0%";

        if (row.has_eval) {
          if (row.kpi_score < 70) kpiClass = "bg-danger";
          else if (row.kpi_score < 90) kpiClass = "bg-warning";
          else kpiClass = "bg-success";
          scoreText = `${scoreVal}%`;
        }

        // عرض تفاصيل المهمات بشكل أنيق (Badges)
        let ppeDisplay = "0";
        if (row.ppe_details_text && row.ppe_details_text !== "0") {
          // الفاصل هو " | "
          const items = row.ppe_details_text.split(" | ");
          ppeDisplay = items
            .map((item) => {
              const parts = item.split(": ");
              // parts[0] = اسم المهمة، parts[1] = الكمية
              return `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:2px 0;">
                                <span>${parts[0]}</span>
                                <span style="font-weight:bold; color:#0056b3;">${parts[1]}</span>
                            </div>`;
            })
            .join("");
        }

        html += `
              <tr>
                  <td class="col-0" style="font-weight:bold;">${row.contractor}</td>
                  <td class="col-1">${row.project}</td>
                  <td class="col-2" style="text-align:center;">${row.permits}</td>
                  <td class="col-3" style="text-align:center;">${row.training_regular}</td>
                  <td class="col-4" style="text-align:center;">${row.training_induction}</td>
                  <td class="col-5" style="text-align:center;">${row.observations}</td>
                  <td class="col-6" style="text-align:center;">${row.hazards}</td>

                  <td class="col-7">${ppeDisplay}</td>

                  <td class="col-8" style="text-align:center; color:${row.violations > 0 ? "red" : "inherit"}; font-weight:${row.violations > 0 ? "bold" : "normal"};">${row.violations}</td>
                  <td class="col-9" style="text-align:center; color:${row.ncr > 0 ? "red" : "inherit"}; font-weight:${row.ncr > 0 ? "bold" : "normal"};">${row.ncr}</td>

                  <td class="col-10" style="text-align:center;">
                      <span class="badge ${kpiClass}">
                          ${scoreText}
                      </span>
                  </td>

                  <td class="col-11 no-print">
                      ${row.req_url ? `<a href="${row.req_url}" target="_blank" class="btn-small btn-secondary"><i class="fas fa-file-pdf"></i></a>` : "-"}
                  </td>
              </tr>`;
      });
      html += `</tbody></table>`;
    }

    anaResultsContainer.innerHTML = html;
  }

  // دالة الطباعة (PDF)
  function handlePrintPDF() {
    // 1. معرفة الeعمدة المختارة
    const checkboxes = document.querySelectorAll(
      '.columns-selector input[type="checkbox"]',
    );

    // 2. إخفاء الأعمدة غير المختارة
    checkboxes.forEach((chk) => {
      const colClass = `col-${chk.dataset.col}`;
      const cells = document.querySelectorAll(`.${colClass}`);
      cells.forEach((cell) => {
        if (chk.checked)
          cell.style.display = ""; // إظهار
        else cell.style.display = "none"; // إخفاء
      });
    });

    // 3. تحديث تاريخ الطباعة
    const printDateEl = document.getElementById("print-date-display");
    if (printDateEl) {
      printDateEl.textContent = `تقرير شهر: ${anaMonth.value} | تم الاستخراج في: ${new Date().toLocaleString("ar-EG")}`;
    }

    // 4. أمر الطباعة
    window.print();

    // 5. (اختياري) إعادة إظهار كل الأعمدة بعد لطباعة (عشان لو اليوزر كنسل متب الصفحة بايظة)
    // ممكن نعمها بـ setTimeout عشان تلحق تظهر  الطباعة الأول
    setTimeout(() => {
      checkboxes.forEach((chk) => {
        const colClass = `col-${chk.dataset.col}`;
        document
          .querySelectorAll(`.${colClass}`)
          .forEach((c) => (c.style.display = ""));
      });
    }, 1000);
  }

  // Events
  if (anaProject) anaProject.addEventListener("change", updateAnaContractors);
  if (anaSearchBtn) anaSearchBtn.addEventListener("click", performAnaSearch);
  if (anaPrintBtn) anaPrintBtn.addEventListener("click", handlePrintPDF);

  // =================================================================
  // --- منطق تقارير الموظفين (Employee Reports) ---
  // =================================================================

  const empSearchInput = document.getElementById("emp-search-input");
  const empSearchResults = document.getElementById("emp-search-results");
  const empReportContainer = document.getElementById("emp-report-container");
  const empPrintBtn = document.getElementById("emp-print-btn");

  let allEmployeesCache = []; // لتخزين ا محلياً

  // دالة التهيئة (تستدعى من showSection)
  function initEmployeeReports() {
    // تحميل القائمة ل مش موجودة
    if (allEmployeesCache.length === 0) {
      callApi("getAllEmployeesForSearch", {}).then((r) => {
        if (r.status === "success") allEmployeesCache = r.list;
      });
    }
    // تصفي البحث
    if (empSearchInput) empSearchInput.value = "";
    if (empReportContainer) empReportContainer.style.display = "none";
    if (empPrintBtn) empPrintBtn.style.display = "none";
  }

  // حدث البحث (Live Search)
  if (empSearchInput) {
    empSearchInput.addEventListener("input", function () {
      const val = this.value.toLowerCase().trim();
      empSearchResults.innerHTML = "";

      if (val.length < 1) {
        empSearchResults.style.display = "none";
        return;
      }

      const filtered = allEmployeesCache.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(val)) ||
          (e.id && String(e.id).includes(val)),
      );

      if (filtered.length > 0) {
        empSearchResults.style.display = "block";
        filtered.forEach((e) => {
          const div = document.createElement("div");
          div.className = "search-item";
          div.innerHTML = `<strong>${e.name}</strong> <small>(${e.project}) - ID: ${e.id}</small>`;
          div.addEventListener("click", () => {
            empSearchInput.value = e.name;
            empSearchResults.style.display = "none";
            loadEmployeeReport(e.id);
          });
          empSearchResults.appendChild(div);
        });
      } else {
        empSearchResults.style.display = "none";
      }
    });
  }

  // دالة تحميل التقرير
  async function loadEmployeeReport(empId) {
    showLoader("جاري جلب ملف الموظف...");
    try {
      const r = await callApi("getEmployeeFullReport", { empId: empId });
      if (r.status === "success") {
        renderEmployeeData(r);
      } else {
        alert(r.message);
      }
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      hideLoader();
    }
  }

  // دالة عرض البيانات
  function renderEmployeeData(data) {
    const info = data.info;

    // 1. البيانات الأساسية
    document.getElementById("r-emp-name").textContent = info.name;
    document.getElementById("r-emp-id").textContent = info.id;
    document.getElementById("r-emp-job").textContent = info.job;
    document.getElementById("r-emp-dept").textContent = info.dept;
    document.getElementById("r-emp-type").textContent = info.type;
    document.getElementById("r-emp-proj").textContent = info.proj;
    document.getElementById("r-emp-join").textContent = info.join;

    // 2. KPI
    const kpiVal = parseFloat(data.kpi);
    const kpiEl = document.getElementById("r-emp-kpi-val");
    const kpiCircle = document.getElementById("r-emp-kpi-circle");
    kpiEl.textContent = kpiVal + "%";

    if (kpiVal >= 90)
      kpiCircle.style.borderColor = "#28a745"; // Green
    else if (kpiVal >= 70)
      kpiCircle.style.borderColor = "#ffc107"; // Yellow
    else kpiCircle.style.borderColor = "#dc3545"; // Red

    // 3. الجداول (دالة مساعدة صغيرة للرسم)
    drawSimpleTable(
      "r-training-table",
      ["التاريخ", "الموضوع", "المشروع"],
      data.training,
      ["date", "topic", "project"],
    );
    drawSimpleTable(
      "r-ppe-table",
      ["التاريخ", "الصنف", "الكمية", "المشروع"],
      data.ppe,
      ["date", "item", "qty", "project"],
    );
    drawSimpleTable(
      "r-violations-table",
      ["التاريخ", "الوصف", "الجزاء", "المشروع"],
      data.violations,
      ["date", "desc", "penalty", "project"],
    );

    // إظهار المحتوى
    empReportContainer.style.display = "block";
    empPrintBtn.style.display = "block";
  }

  function drawSimpleTable(containerId, headers, data, keys) {
    const cont = document.getElementById(containerId);
    if (data.length === 0) {
      cont.innerHTML = `<p style="color:#777; text-align:center; padding:10px;">لا توجد بيانات.</p>`;
      return;
    }
    let html = `<table class="results-table" style="width:100%"><thead><tr>`;
    headers.forEach((h) => (html += `<th>${h}</th>`));
    html += `</tr></thead><tbody>`;

    data.forEach((row) => {
      html += `<tr>`;
      keys.forEach((k) => (html += `<td>${row[k] || "-"}</td>`));
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    cont.innerHTML = html;
  }

  // الطباعة
  if (empPrintBtn) {
    empPrintBtn.addEventListener("click", () => {
      // 1. تميع بيانات الموظف من العناصر الموجودة في الصفحة
      const empData = {
        name: document.getElementById("r-emp-name").textContent,
        id: document.getElementById("r-emp-id").textContent,
        job: document.getElementById("r-emp-job").textContent,
        dept: document.getElementById("r-emp-dept").textContent,
        proj: document.getElementById("r-emp-proj").textContent,
        join: document.getElementById("r-emp-join").textContent,
        kpi: document.getElementById("r-emp-kpi-val").textContent,
      };

      // 2. بناء محتوى الجداول بشكل منظم للـ PDF
      const tablesHtml = `
              <div class="section-title"><i class="fas fa-chalkboard-teacher"></i> سجل التدريب</div>
              ${document.getElementById("r-training-table").innerHTML}

              <div class="section-title"><i class="fas fa-hard-hat"></i> سجل العهدة والمهمات (PPE)</div>
              ${document.getElementById("r-ppe-table").innerHTML}

              <div class="section-title"><i class="fas fa-exclamation-triangle"></i> سجل المخالفات والجزاءات</div>
              ${document.getElementById("r-violations-table").innerHTML}
          `;

      // 3. استدعاء الدالة المخصصة الجديدة
      window.generateEmployeeProfilePDF(empData, tablesHtml);
    });
  }

  // (مهم) أضف استدعاء initEmployeeReports في دالة showSection
  // ابحث عن showSection وعدل الشرط:
  // if (sectionId === "EmployeeReports") initEmployeeReports();
  // =================================================================
  // --- (جديد)دة  ومتابعة الحوادث (Accident Module) ---
  // =================================================================

  // Selectors
  const accForm = document.getElementById("accident-form");
  const accReporter = document.getElementById("acc-reporter");
  const accDate = document.getElementById("acc-date");
  const accTime = document.getElementById("acc-time");
  const accProject = document.getElementById("acc-project");
  const accClass = document.getElementById("acc-class");
  const accInjuriesGroup = document.getElementById("acc-injuries-count-group");
  const accInjuriesCount = document.getElementById("acc-injuries-count");
  // Text Areas
  const accRoutine = document.getElementById("acc-routine");
  const accWhatHappened = document.getElementById("acc-what-happened");
  const accNotification = document.getElementById("acc-notification");
  const accDamageDesc = document.getElementById("acc-damage-desc");
  // Victim Selectors
  const accVicType = document.getElementById("acc-vic-type");
  const accVicEmpSelect = document.getElementById("acc-vic-emp-select");
  const accVicEmpAll = document.getElementById("acc-vic-emp-all");
  const accVicContSelect = document.getElementById("acc-vic-cont-select");
  const accVicNid = document.getElementById("acc-vic-nid");
  const accVicContName = document.getElementById("acc-vic-cont-name");
  const accVicVisNid = document.getElementById("acc-vic-vis-nid");
  const accVicVisName = document.getElementById("acc-vic-vis-name");
  // Lists Containers
  const accInvolvedList = document.getElementById("acc-involved-list");
  const accWitnessList = document.getElementById("acc-witness-list");
  const accDirectList = document.getElementById("acc-direct-list");
  const accIndirectList = document.getElementById("acc-indirect-list");
  const accRootList = document.getElementById("acc-root-list");
  const accImmList = document.getElementById("acc-imm-list");
  const accShortList = document.getElementById("acc-short-list");
  const accLongList = document.getElementById("acc-long-list");
  const accPlanBody = document.getElementById("acc-plan-body");

  // Modal Selectors
  const personModal = document.getElementById("person-modal");
  const modalType = document.getElementById("modal-type");
  const modalEmpSelect = document.getElementById("modal-emp-select");
  const modalEmpAll = document.getElementById("modal-emp-all");
  const modalContSelect = document.getElementById("modal-cont-select");
  const modalNid = document.getElementById("modal-nid");
  const modalContName = document.getElementById("modal-cont-name");
  const modalVisNid = document.getElementById("modal-vis-nid");
  const modalVisName = document.getElementById("modal-vis-name");

  // Data
  let accInvolvedData = [];
  let accWitnessData = [];
  let accActionPlanData = [];
  let currentModalContext = ""; // 'involved' or 'witness'

  // --- 1. التهيئة (Init) ---
  async function initAccidentPage() {
    console.log("Accident Page Init...");

    // ضبط الوقت والتاريخ والمبلغ
    const now = new Date();
    if (accDate) accDate.value = now.toLocaleDateString("en-CA");

    // ضبط الوقت (HH:MM)
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    if (accTime) accTime.value = `${hh}:${mm}`;

    if (accReporter && currentUser) accReporter.value = currentUser.username;

    // تحميل المشاريع
    if (accProject && accProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        // استخدام الكاش الموجود
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? ppeLocations
            : ppeLocations.filter((p) => userProj.includes(p));
        fillSelect(accProject, acc);
      } else {
        // طلب جديد
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          if (r.status === "success") {
            ppeLocations = r.locations;
            ppeEmployees = r.employees;
            ppeContractors = r.contractors;
            const userProj = (currentUser.projects || "").toString();
            const acc =
              userProj === "ALL"
                ? r.locations
                : r.locations.filter((p) => userProj.includes(p));
            fillSelect(accProject, acc);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // تصفير القوائم
    accInvolvedData = [];
    accWitnessData = [];
    accActionPlanData = [];
    renderSimplePersonList("acc-involved-list", []);
    renderSimplePersonList("acc-witness-list", []);
    renderActionPlan();

    // تصفير قوائم النصوص
    document
      .querySelectorAll(".simple-list")
      .forEach((ul) => (ul.innerHTML = ""));
    toggleInjuryCount();
  }

  // --- 2. تحميل بيانات المشروع (للمقاولين والموظفين) ---
  window.loadProjectDataForAccident = async function () {
    const proj = accProject.value;
    if (!proj) return;

    // تحديث قائمة الموظفين (للضحية)
    updateAccEmployeeSelect(accVicEmpSelect, accVicEmpAll.checked, proj);

    // تحديث قائمة المقاولين (للضحية)
    accVicContSelect.innerHTML = "<option>جاري التحميل...</option>";
    try {
      const r = await callApi("getContractorsForProject", {
        projectName: proj,
      });
      if (r.contractors) {
        fillSelect(accVicContSelect, r.contractors);
        fillSelect(modalContSelect, r.contractors); // نملأ المودال بالمرة
      }
    } catch (e) {
      accVicContSelect.innerHTML = "<option>خطأ</option>";
    }
  };

  // دالة تحديث قائمة الموظفين (عامة)
  function updateAccEmployeeSelect(selectEl, showAll, projName) {
    selectEl.innerHTML = '<option value="">-- اختر --</option>';
    if (typeof ppeEmployees === "undefined") return;

    const list = showAll
      ? ppeEmployees
      : ppeEmployees.filter((e) => e.project === projName);

    list.forEach((e) => {
      const opt = new Option(`${e.name} (${showAll ? e.project : ""})`, e.name); // Value is Name
      opt.dataset.id = e.id;
      opt.dataset.company = "السويدي";
      selectEl.add(opt);
    });
  }

  window.toggleInjuryCount = function () {
    const val = accClass.value;
    const victimSection = document.getElementById("acc-victim-section");
    const injuriesInput = document.getElementById("acc-injuries-count"); // الحقل المسبب للمشكلة

    if (
      val === "Property Damage" ||
      val === "Nearmiss" ||
      val === "Environmental Incident"
    ) {
      // 1. إخفاء الحقل وتصفير القيمة
      accInjuriesGroup.style.display = "none";
      injuriesInput.value = "0";

      // 2. الحل الجذري: إزالة قيود التحقق عند الإخفاء لمنع تعليق الحفظ
      injuriesInput.removeAttribute("required");
      injuriesInput.setAttribute("min", "0"); // تغيير الحد الأدنى لـ 0 مؤقتاً

      if (victimSection) victimSection.style.display = "none";
    } else {
      // 1. إظهار الحقل وضبط القيمة الافتراضية لـ 1
      accInjuriesGroup.style.display = "block";
      if (injuriesInput.value == "0" || injuriesInput.value == "") {
        injuriesInput.value = "1";
      }

      // 2. إعادة قيود التحقق عند الإظهار
      injuriesInput.setAttribute("required", "required");
      injuriesInput.setAttribute("min", "1");

      if (victimSection) victimSection.style.display = "block";
    }
  };

  window.updatePersonInputs = function (prefix) {
    const typeEl = document.getElementById(`${prefix}-type`);
    const type = typeEl.value;

    document.getElementById(`${prefix}-emp-group`).style.display =
      type === "Employee" ? "block" : "none";
    document.getElementById(`${prefix}-cont-group`).style.display =
      type === "Contractor" ? "block" : "none";
    document.getElementById(`${prefix}-vis-group`).style.display =
      type === "Visitor" || type === "Public" ? "block" : "none";

    // لو اخترنا موظف، نحدث القائمة فوراً
    if (type === "Employee") {
      const isModal = prefix === "modal";
      const proj = accProject.value;
      const selectEl = document.getElementById(`${prefix}-emp-select`);
      const checkEl = document.getElementById(`${prefix}-emp-all`);
      updateAccEmployeeSelect(selectEl, checkEl.checked, proj);
    }
  };

  window.toggleAllEmployees = function (prefix) {
    const proj = accProject.value;
    const selectEl = document.getElementById(`${prefix}-emp-select`);
    const checkEl = document.getElementById(`${prefix}-emp-all`);
    updateAccEmployeeSelect(selectEl, checkEl.checked, proj);
  };

  // --- 4. البحث عن مقاول ---
  window.searchPersonByNID = async function (prefix) {
    const nidEl = document.getElementById(`${prefix}-nid`);
    const nameEl = document.getElementById(`${prefix}-cont-name`);
    const compEl = document.getElementById(`${prefix}-cont-select`); // Select element

    if (!nidEl.value) {
      alert("أدخل الرقم القومي");
      return;
    }

    nameEl.value = "جاري البحث...";
    nameEl.readOnly = true;

    try {
      const r = await callApi("getRecipientByNID", { nationalId: nidEl.value });
      if (r.status === "found") {
        nameEl.value = r.name;
        compEl.value = r.contractor;
        nameEl.readOnly = true;
        alert("تم العثور عليه.");
      } else {
        nameEl.value = "";
        nameEl.placeholder = "اسم جديد... أدخله يدوياً";
        nameEl.readOnly = false;
        alert("غير مسجل، يرجى كتابة الاسم.");
      }
    } catch (e) {
      nameEl.value = "";
      nameEl.readOnly = false;
    }
  };

  // --- 5. Modal Logic (Add Person) ---
  window.openPersonModal = function (context) {
    currentModalContext = context;
    document.getElementById("person-modal-title").textContent =
      context === "involved" ? "إضافة شخص متداخل" : "إضافة شاهد";
    personModal.style.display = "block";

    // Reset Modal Fields
    modalType.value = "";
    updatePersonInputs("modal"); // Hide all inputs
    modalNid.value = "";
    modalContName.value = "";
    modalVisNid.value = "";
    modalVisName.value = "";
  };

  window.closePersonModal = function () {
    personModal.style.display = "none";
  };

  window.confirmAddPerson = function () {
    const type = modalType.value;
    if (!type) return;

    let p = { type: type, isNew: false };

    if (type === "Employee") {
      const sel = modalEmpSelect;
      p.name = sel.value;
      p.id = sel.options[sel.selectedIndex]?.dataset.id || "N/A";
      p.company = "السويدي";
    } else if (type === "Contractor") {
      p.company = modalContSelect.value;
      p.id = modalNid.value;
      p.name = modalContName.value;
      p.isNew = !modalContName.readOnly;
    } else {
      p.id = modalVisNid.value;
      p.name = modalVisName.value;
      p.company = "Visitor/Public";
      p.isNew = true;
    }

    if (!p.name) {
      alert("الاسم مطلوب");
      return;
    }

    if (currentModalContext === "involved") {
      accInvolvedData.push(p);
      renderSimplePersonList("acc-involved-list", accInvolvedData);
    } else {
      accWitnessData.push(p);
      renderSimplePersonList("acc-witness-list", accWitnessData);
    }
    closePersonModal();
  };

  function renderSimplePersonList(containerId, list) {
    const ul = document.getElementById(containerId);
    ul.innerHTML = "";

    // تحديد رسالة "فارغ" المناسبة بناءً على ID القائمة
    let emptyMsgId = "";
    if (containerId === "acc-involved-list") emptyMsgId = "involved-empty-msg";
    else if (containerId === "acc-witness-list")
      emptyMsgId = "witness-empty-msg";

    const emptyMsgEl = document.getElementById(emptyMsgId);

    if (list.length === 0) {
      if (emptyMsgEl) emptyMsgEl.style.display = "block"; // أظهر الرسالة
    } else {
      if (emptyMsgEl) emptyMsgEl.style.display = "none"; // أخفِ الرسا

      list.forEach((p, idx) => {
        const li = document.createElement("li");
        // تنسيق جميل للاسم والنوع والشركة
        li.innerHTML = `
                <div>
                    <span>${p.name}</span>
                    <br>
                    <small><i class="fas fa-id-badge"></i> ${p.type}</small> 
                    ${p.company ? `<small>| <i class="fas fa-building"></i> ${p.company}</small>` : ""}
                </div>
                <button type="button" class="btn-small btn-danger" onclick="removeAccPerson('${containerId}', ${idx})">
                    <i class="fas fa-trash"></i>
                </button>`;
        ul.appendChild(li);
      });
    }
  }
  window.removeAccPerson = function (containerId, idx) {
    if (containerId === "acc-involved-list") {
      accInvolvedData.splice(idx, 1);
      renderSimplePersonList(containerId, accInvolvedData);
    } else {
      accWitnessData.splice(idx, 1);
      renderSimplePersonList(containerId, accWitnessData);
    }
  };

  // --- 6. List Helper (Causes & Actions) ---
  window.addToList = function (inputId, listId) {
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (!val) return;

    const ul = document.getElementById(listId);
    const li = document.createElement("li");
    li.innerHTML = `<span>${val}</span> <button type="button" class="btn-small btn-danger" onclick="this.parentElement.remove()">x</button>`;
    ul.appendChild(li);
    input.value = "";
  };

  // --- 7. Action Plan Table ---
  window.addActionPlanRow = function () {
    const act = document.getElementById("plan-action").value;
    const resp = document.getElementById("plan-resp").value;
    const date = document.getElementById("plan-date").value;

    if (!act || !resp) {
      alert("أكمل البيانات");
      return;
    }

    accActionPlanData.push({ action: act, resp: resp, date: date });
    renderActionPlan();

    document.getElementById("plan-action").value = "";
    document.getElementById("plan-resp").value = "";
    document.getElementById("plan-date").value = "";
  };

  function renderActionPlan() {
    accPlanBody.innerHTML = "";
    accActionPlanData.forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.action}</td><td>${row.resp}</td><td>${row.date}</td><td><button type="button" class="btn-small btn-danger" onclick="remAccPlan(${i})">x</button></td>`;
      accPlanBody.appendChild(tr);
    });
  }
  window.remAccPlan = function (i) {
    accActionPlanData.splice(i, 1);
    renderActionPlan();
  };

  // --- 8. Save Accident ---
  if (accForm) {
    accForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!confirm("هل أنت متأكد من حفظ التقرير؟")) return;

      // 1. تحديد نوع ال ادث أولاً لمعرفة هل نحتاج bيانات ضحية أم لا
      const classification = accClass.value;
      const noVictimTypes = [
        "Property Damage",
        "Environmental Incident",
        "Nearmiss",
      ];
      const isVictimRequired = !noVictimTypes.includes(classification);

      // تجميع القوائم النصية
      const getList = (id) =>
        Array.from(document.querySelectorAll(`#${id} li span`)).map(
          (el) => el.textContent,
        );

      // 2. تجميع بيانات الضحية (بشروط)
      let victim = {
        type: "N/A",
        name: "N/A",
        id: "N/A",
        company: "N/A",
        isNew: false,
      };

      if (isVictimRequired) {
        const vType = accVicType.value;
        victim.type = vType;

        if (vType === "Employee") {
          const sel = accVicEmpSelect;
          victim.name = sel.value;
          victim.id = sel.options[sel.selectedIndex]?.dataset.id || "";
          victim.company = "السويدي";
        } else if (vType === "Contractor") {
          victim.company = accVicContSelect.value;
          victim.id = accVicNid.value;
          victim.name = accVicContName.value;
          victim.isNew = !accVicContName.readOnly;
        } else if (vType === "Visitor") {
          victim.id = accVicVisNid.value;
          victim.name = accVicVisName.value;
          victim.company = "Visitor/Public";
          victim.isNew = true;
        }

        // تفعيل التنبيه فقط إذا كان نوع الحادث يتطلب ضحية
        if (!victim.name || victim.name === "N/A") {
          alert("بيانات الشخص المعني بالحادث (المصاب) ناقصة");
          return;
        }
      }

      // 3. بناء كائن البيانات النهائي
      const data = {
        date: accDate.value,
        time: accTime.value,
        project: accProject.value,
        classification: classification,
        injuriesCount: accInjuriesCount.value,
        routineActivity: accRoutine.value,
        whatHappened: accWhatHappened.value,
        notificationInfo: accNotification.value,
        injuriesDesc: accDamageDesc.value,
        victim: victim, // ستحتوي على N/A في الحوادث غير البشرية
        involved: accInvolvedData,
        witnesses: accWitnessData,
        directCauses: getList("acc-direct-list"),
        indirectCauses: getList("acc-indirect-list"),
        rootCauses: getList("acc-root-list"),
        immediateActions: getList("acc-imm-list"),
        shortTermActions: getList("acc-short-list"),
        longTermActions: getList("acc-long-list"),
        actionPlan: accActionPlanData,
      };

      const btn = accForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "جاري الحفظ...";

      try {
        const r = await callApi("saveAccident", {
          accidentData: data,
          userInfo: currentUser,
        });
        alert(r.message);
        // Reset
        accForm.reset();
        initAccidentPage();
      } catch (err) {
        alert("خطأ: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "حفظ التقرير";
      }
    });
  }

  // --- 9. Monitor Open Accidents ---
  window.loadUserOpenAccidents = async function () {
    const container = document.getElementById("open-accidents-list");
    if (!container) return;

    container.innerHTML = '<div class="loader-small">جاري التحميل...</div>';

    try {
      const r = await callApi("getUserOpenAccidents", {
        userInfo: currentUser,
      });
      if (r.status === "success" && r.accidents.length > 0) {
        let html = "";
        r.accidents.forEach((acc) => {
          html += `
                  <div class="permit-card" style="border-left: 5px solid #ff9800;">
                      <div class="permit-info">
                          <p><strong>المشروع:</strong> ${acc.project}</p>
                          <p><strong>التصنيف:</strong> ${acc.class}</p>
                          <p><strong>التاريخ:</strong> ${acc.date ? new Date(acc.date).toLocaleDateString("en-GB") : "-"}</p>
                          <p><strong>الوصف:</strong> ${acc.desc.substring(0, 60)}...</p>
                      </div>
                      <button class="btn-danger" onclick="closeAccidentPrompt('${acc.id}')">إغلاق الحادث</button>
                  </div>`;
        });
        container.innerHTML = html;
      } else {
        container.innerHTML = "<p>لا توجد حوادث مفتوحة.</p>";
      }
    } catch (e) {
      container.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  };

  window.closeAccidentPrompt = async function (id) {
    const note = prompt("ملاحظات الإغلاق (تم تنفيذ الخطة بالكامل):");
    if (note) {
      showLoader("جاري الإغلاق...");
      try {
        const r = await callApi("closeAccident", {
          accId: id,
          closingNote: note,
        });
        alert(r.message);
        loadUserOpenAccidents();
      } catch (e) {
        alert(e.message);
      } finally {
        hideLoader();
      }
    }
  };

  // =================================================================
  // --- (جديد) وحدة سجل الحوادث والطباعة (Monitor Accidents) ---
  // =================================================================

  const monAccProject = document.getElementById("mon-acc-project");
  const monAccFrom = document.getElementById("mon-acc-from");
  const monAccTo = document.getElementById("mon-acc-to");
  const monAccOpen = document.getElementById("mon-acc-open");
  const monAccBtn = document.getElementById("mon-acc-btn");
  const monAccResults = document.getElementById("mon-acc-results");
  const monAccPrintBtn = document.getElementById("mon-acc-print-btn");
  const accPrintDate = document.getElementById("acc-print-date");

  // 1. دالة التحميل الأولية (تعبئة المشاريع)
  function initMonitorAccidentsPage() {
    if (monAccProject && monAccProject.options.length <= 1) {
      populateMonitorDropdowns(monAccProject); // استخدام الدالة العامة الموجودة مسبقاً
    }
    monAccResults.innerHTML =
      '<p style="text-align:center; padding:20px; color:#666;">حدد معايير البحث...</p>';
    monAccPrintBtn.style.display = "none";
  }

  // 2. دالة البحث
  async function searchAccidents() {
    monAccResults.innerHTML = '<div class="loader-small">جاري البحث...</div>';
    monAccPrintBtn.style.display = "none";

    const filters = {
      project: monAccProject.value,
      fromDate: monAccFrom.value,
      toDate: monAccTo.value,
      openOnly: monAccOpen.checked,
    };

    try {
      // استدعاء الباك اند (اللي ضفناه في الخطوة السابقة)
      const r = await callApi("searchAccidents", {
        filters: filters,
        userInfo: currentUser,
      });
      renderAccidentTable(r.data);
    } catch (e) {
      monAccResults.innerHTML = `<p class="error-message">${e.message}</p>`;
    }
  }

  // 3. رسم الجدول (مع التشيك بوكس)
  function renderAccidentTable(data) {
    if (!data || data.length === 0) {
      monAccResults.innerHTML =
        '<p style="text-align:center;">لا توجد حوادث مطابقة.</p>';
      return;
    }

    let html = `
      <table class="results-table" id="acc-print-table">
        <thead>
            <tr>
                <th class="print-select-col" style="width:40px; text-align:center;">
                    <input type="checkbox" onchange="toggleAllAccidents(this)">
                </th>
                <th>الكود</th>
                <th>التاريخ</th>
                <th>المشروع</th>
                <th>التصنيف</th>
                <th>الوصف</th>
                <th>الحالة</th>
            </tr>
        </thead>
        <tbody>`;

    data.forEach((row) => {
      html += `
          <tr class="acc-row">
              <td class="print-select-col" style="text-align:center;">
                  <input type="checkbox" class="acc-print-check" checked> 
              </td>
              <td style="font-weight:bold;">${row.id}</td>
              <td style="white-space:nowrap;">${row.date}</td>
              <td>${row.project}</td>
              <td style="color:#C8102E; font-weight:600;">${row.classification}</td>
              <td class="desc-cell">${row.description}</td>
              <td>
                  <span class="badge ${row.status === "Open" ? "bg-danger" : "bg-success"}">
                    ${row.status}
                  </span>
              </td>
          </tr>`;
    });

    html += `</tbody></table>`;
    monAccResults.innerHTML = html;
    monAccPrintBtn.style.display = "block"; // إظهار زر الطباعة
  }

  // دالة تحديد الكل
  window.toggleAllAccidents = function (source) {
    const checkboxes = document.querySelectorAll(".acc-print-check");
    checkboxes.forEach((cb) => (cb.checked = source.checked));
  };

  // 4. منطق الطباعة الذكي
  function handlePrintSelectedAccidents() {
    const rows = document.querySelectorAll(".acc-row");
    let hasSelection = false;

    // أضف كلاس إخفاء للصفوف غير المحددة
    rows.forEach((row) => {
      const checkbox = row.querySelector(".acc-print-check");
      if (checkbox && !checkbox.checked) {
        row.classList.add("hide-on-print");
      } else {
        row.classList.remove("hide-on-print");
        hasSelection = true;
      }
    });

    if (!hasSelection) {
      alert("الرجاء تحديد حادث واحد على الأقل للطباعة.");
      return;
    }

    // تحديث تاريخ الطباعة في الهيدر
    if (accPrintDate) {
      accPrintDate.textContent = `تاريخ التقرير: ${new Date().toLocaleDateString("ar-EG")}`;
    }

    // طباعة
    window.print();

    // تنظيف (إزالة كلاس الإخفاء بعد الطباعة)
    // نستخدم timeout بسيط لضمان أن أمر الطباعة وصل للمتصفح
    setTimeout(() => {
      rows.forEach((row) => row.classList.remove("hide-on-print"));
    }, 1000);
  }

  // Events
  if (monAccBtn) monAccBtn.addEventListener("click", searchAccidents);
  if (monAccPrintBtn)
    monAccPrintBtn.addEventListener("click", handlePrintSelectedAccidents);

  // تهيئة الصفحة
  // --- تهيئة صفحة سجل التدريب ---
  window.initTrainingLogPage = function () {
    const filterSelect = document.getElementById("train-project-filter");
    if (filterSelect && initialData && initialData.projects) {
      fillSelect(filterSelect, initialData.projects);
    }
    document.getElementById("training-table-body").innerHTML =
      '<tr><td colspan="6" style="text-align:center; padding:20px;">حدد معايير البحث واضغط على زر بحث...</td></tr>';
  };

  // --- جلب السجلات ---
  window.fetchTrainingLogs = async function () {
    const startDate = document.getElementById("train-start-date").value;
    const endDate = document.getElementById("train-end-date").value;
    const project = document.getElementById("train-project-filter").value;

    // تصفير وإخفاء الإحصائيات قبل البحث الجديد
    const statsBox = document.getElementById("training-stats-summary");
    if (statsBox) statsBox.style.display = "none";

    showLoader("جاري جلب سجل التدريب...");
    try {
      const response = await callApi("getTrainingLogs", {
        startDate: startDate,
        endDate: endDate,
        filterProject: project || "all",
        userInfo: currentUser,
      });

      if (response.status === "success") {
        currentTrainingData = response.data.reverse();
        renderTrainingTable(response.data);

        // تشغيل الحساب فوراً بعد ظهور الجدو
        if (typeof window.calculateTrainingStats === "function") {
          window.calculateTrainingStats(response.data);
        }
      } else {
        alert("خطأ: " + response.message);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      hideLoader();
    }
  };

  function renderTrainingTable(data) {
    const tbody = document.getElementById("training-table-body");
    tbody.innerHTML =
      data.length === 0
        ? "<tr><td colspan='6' style='text-align:center;'>لا توجد بيانات</td></tr>"
        : "";
    data.forEach((session, index) => {
      tbody.insertAdjacentHTML(
        "beforeend",
        `
        <tr>
          <td>${session.date}</td>
          <td>${session.project}</td>
          <td style="font-weight:bold; color:var(--primary-color)">${session.topic}</td>
          <td>${session.trainer}</td>
          <td style="text-align:center;"><span class="badge bg-danger">${session.attendees.length}</span></td>
          <td style="text-align:center;"><button class="btn-small btn-secondary" onclick="window.openAttendeesModal(${index})"><i class="fas fa-eye"></i></button></td>
        </tr>`,
      );
    });
  }

  // --- منطق المقاولين والـ Datalist ---
  // متغير عام لحفظ عمال المقاول المختار حالياً
  let currentContractorWorkers = [];
  let currentTrainingData = [];
  let trnAttendeesCart = [];
  // 1. تحميل العمال عند تغيير الشركة
  window.loadContractorWorkers = async function () {
    const contractorName = document.getElementById("trn-cont-company").value;
    const dataList = document.getElementById("trn-workers-list");
    const nameInput = document.getElementById("trn-cont-name");
    const nidInput = document.getElementById("trn-cont-nid");

    if (!contractorName) {
      dataList.innerHTML = "";
      return;
    }

    try {
      const response = await callApi("getContractorWorkers", {
        contractorName: contractorName,
      });
      if (response.status === "success") {
        currentContractorWorkers = response.workers; // حظ في المتغير العام

        // تحديث الـ Datalist
        dataList.innerHTML = response.workers
          .map((w) => `<option value="${w.name}">${w.id}</option>`)
          .join("");
        console.log(
          `تم تحميل ${response.workers.length} عامل لشركة ${contractorName}`,
        );

        nameInput.value = "";
        nidInput.value = "";
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. الربط التلقائي بين الاسم والرقم القومي
  window.handleTrnNameInput = function () {
    const nameInput = document.getElementById("trn-cont-name");
    const nidInput = document.getElementById("trn-cont-nid");
    const nameVal = nameInput.value;

    // البحث في القائمة المحملة
    const worker = currentContractorWorkers.find((w) => w.name === nameVal);

    if (worker) {
      nidInput.value = worker.id;
      nidInput.readOnly = true;
      nidInput.style.backgroundColor = "#f0f0f0";
    } else {
      // لو بيكتب اسم جديد، نفتح خانة الرقم القومي
      nidInput.readOnly = false;
      nidInput.style.backgroundColor = "#fff";
    }
  };

  // --- التحكم في النافذة المنبثقة (المودال) ---
  window.openAttendeesModal = function (index) {
    const session = currentTrainingData[index];
    if (!session) return;
    document.getElementById("modal-session-title").innerText =
      `حضور: ${session.topic}`;
    document.getElementById("attendees-list-body").innerHTML = session.attendees
      .map(
        (p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td style="font-weight:600">${p.name}</td>
            <td>${p.company}</td>
            <td><span class="badge">${p.type}</span></td>
        </tr>`,
      )
      .join("");
    document.getElementById("attendees-modal").style.display = "flex";
  };

  window.closeAttendeesModal = function () {
    document.getElementById("attendees-modal").style.display = "none";
  };

  // إغلاق عند الضغط خارج المودال
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("attendees-modal");
    if (e.target === modal) window.closeAttendeesModal();
  });

  // --- دوال محرك اختيار عمال المقاولين ---

  window.openWorkerSelector = function () {
    const contractorName = document.getElementById("trn-cont-company").value;
    if (!contractorName) {
      alert("الرجاء اختيار شركة المقاول أولاً");
      return;
    }

    document.getElementById("worker-selector-modal").style.display = "flex";
    document.getElementById("worker-search-box").value = "";
    document.getElementById("worker-search-box").focus();

    renderWorkersInModal(currentContractorWorkers); // عرض القائمة المحملة مسبقاً
  };

  window.closeWorkerSelector = function () {
    document.getElementById("worker-selector-modal").style.display = "none";
  };

  // رسم قائمة العمال داخل النافذة
  function renderWorkersInModal(workers) {
    const container = document.getElementById("worker-list-container");
    if (!workers || workers.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; padding:20px; color:#999;">لا يوجد عمال مسجلين لهذه الشركة</p>';
      return;
    }

    container.innerHTML = workers
      .map(
        (w) => `
          <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:5px;" onclick="window.selectWorker('${w.id}', '${w.name}')">
              <div style="text-align:right;">
                  <span style="display:block; font-weight:700;">${w.name}</span>
                  <small style="color:#666;">ID: ${w.id}</small>
              </div>
              <i class="fas fa-chevron-left" style="color:#ccc;"></i>
          </div>
      `,
      )
      .join("");
  }

  // تصفية القائمة أثناء الكتابة (البحث)
  window.filterWorkerList = function () {
    const query = document
      .getElementById("worker-search-box")
      .value.toLowerCase();
    const filtered = currentContractorWorkers.filter(
      (w) => w.name.toLowerCase().includes(query) || w.id.includes(query),
    );
    renderWorkersInModal(filtered);
  };

  // عند اختيار عامل من القائمة
  window.selectWorker = function (id, name) {
    document.getElementById("trn-cont-name").value = name;
    document.getElementById("trn-cont-nid").value = id;
    document.getElementById("trn-cont-nid").readOnly = true;
    document.getElementById("trn-cont-nid").style.backgroundColor = "#f0f0f0";
    window.closeWorkerSelector();
  };

  // في حالة الرغبة في إضافة اسم غير موجود
  window.addNewWorkerManually = function () {
    const query = document.getElementById("worker-search-box").value;
    document.getElementById("trn-cont-name").value = query;
    document.getElementById("trn-cont-nid").value = "";
    document.getElementById("trn-cont-nid").readOnly = false;
    document.getElementById("trn-cont-nid").style.backgroundColor = "#fff";
    document.getElementById("trn-cont-nid").focus();
    window.closeWorkerSelector();
  };
});
// --- دوال محرك اختيار الموظفين (Employees Selector) ---

// دالة اختيار الموظف المحدثة (إصلاح ReferenceError)
window.openEmpSelector = function () {
  const proj = document.getElementById("trn-project").value;
  const showAll = document.getElementById("trn-show-all-emp").checked;

  // التأكد من تحميل البيانات أولاً
  if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
    alert("جاري تحميل بيانات الموظفين، يرجى الانتظار ثانية...");
    return;
  }

  if (!proj && !showAll) {
    alert("الرجاء اختيار المشروع أولاً أو تفعيل خيار 'عرض كل الموظفين'");
    return;
  }

  document.getElementById("emp-selector-modal").style.display = "flex";
  document.getElementById("emp-search-box").value = "";

  const list = showAll
    ? window.ppeEmployees
    : window.ppeEmployees.filter((e) => e.project === proj);
  renderEmployeesInModal(list);
};

window.closeEmpSelector = function () {
  document.getElementById("emp-selector-modal").style.display = "none";
};

// رسم قائمة الموظفين داخل المودال
function renderEmployeesInModal(list) {
  const container = document.getElementById("emp-list-container");
  if (!list || list.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding:20px; color:#999;">لا يوجد موظفين مطابقين للبحث</p>';
    return;
  }

  container.innerHTML = list
    .map(
      (e) => `
        <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:8px;" onclick="window.selectEmployee('${e.id}', '${e.name}', '${e.company}')">
            <div style="text-align:right;">
                <span style="display:block; font-weight:700;">${e.name}</span>
                <small style="color:#666;">ID: ${e.id} | ${e.project}</small>
            </div>
            <i class="fas fa-chevron-left" style="color:#ccc;"></i>
        </div>
    `,
    )
    .join("");
}

// تصفية القائمة أثناء الكتابة
window.filterEmpList = function () {
  const query = document.getElementById("emp-search-box").value.toLowerCase();
  const proj = document.getElementById("trn-project").value;
  const showAll = document.getElementById("trn-show-all-emp").checked;

  // الفلترة بناءً على المشروع + كلمة البحث
  const baseList = showAll
    ? ppeEmployees
    : ppeEmployees.filter((e) => e.project === proj);

  const filtered = baseList.filter(
    (e) =>
      e.name.toLowerCase().includes(query) || e.id.toString().includes(query),
  );

  renderEmployeesInModal(filtered);
};

// عند اختيار موظف من القائمة
window.selectEmployee = function (id, name, company) {
  document.getElementById("trn-emp-name-display").value = name;
  document.getElementById("trn-emp-id-hidden").value = id;

  // حفظ البيانات في الحقول التي تستخدمها دالة trnAddBtn
  // (لأن دالة addTrnAttendee عندك تعتمد على trnEmpSelect)
  // سنقوم بتعديل بسيط في trnAddBtn لاحقاً

  window.closeEmpSelector();
  if (kpiPeriodSelect) {
    kpiPeriodSelect.addEventListener("change", () => {
      // عند تغيير الشهر، نفرغ القائمة المعروضة حالياً لأن علامات الصح ستتغير
      kpiListContainer.innerHTML =
        "<p>الرجاء اختيار الموظف لبدء التقييم للفترة الجديدة...</p>";
      // تصفير معرفات الموظف المختار
      document.getElementById("kpi-emp-name-display").value = "";
      document.getElementById("kpi-emp-id-hidden").value = "";
    });
  }
  window.calculateTrainingStats = function (sessions) {
    let stats = {
      sewTrn: 0,
      sewInd: 0,
      subTrn: 0,
      subInd: 0,
    };

    sessions.forEach((session) => {
      // التحقق هل المحاضرة هي Induction أم تدريب عادي
      const isInduction = session.topic.toLowerCase().includes("induction");

      session.attendees.forEach((att) => {
        // التحقق هل الشخص موظف سويدي أم مقاول
        // نعتمد على النوع (موظف) أو اسم الشركة (السويدي)
        const isSewedy = att.type === "موظف" || att.company === "السويدي";

        if (isSewedy) {
          if (isInduction) stats.sewInd++;
          else stats.sewTrn++;
        } else {
          if (isInduction) stats.subInd++;
          else stats.subTrn++;
        }
      });
    });

    // تحديث الأرقام في الواجهة
    document.getElementById("count-sewedy-trn").textContent = stats.sewTrn;
    document.getElementById("count-sewedy-ind").textContent = stats.sewInd;
    document.getElementById("count-sub-trn").textContent = stats.subTrn;
    document.getElementById("count-sub-ind").textContent = stats.subInd;

    // إظهار اللوحة
    document.getElementById("training-stats-summary").style.display = "grid";
  };
};

////////////////////////////////////////////////////////////واحد
// --- END DOMContentLoaded ---

// =================================================================
// دالة بناء فورم التقييم (مع إضافة زر لم يتواجد N/A)
// =================================================================
window.buildKpiForm = function (kpis) {
  const listContainer = document.getElementById("kpi-list-container");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  // 1. إضافة بوكس "لم يتواجد (N/A)"
  const naDiv = document.createElement("div");
  naDiv.style.cssText =
    "background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeeba; display: flex; align-items: center; gap: 10px; font-weight: bold;";
  naDiv.innerHTML = `
      <input type="checkbox" id="kpi-na-checkbox" style="width: 22px; height: 22px; cursor: pointer;">
      <label for="kpi-na-checkbox" style="cursor: pointer; font-size: 1.1rem;">الموظف لم يتواجد في موقعي خلال هذه الفترة (N/A)</label>
  `;
  listContainer.appendChild(naDiv);

  // 2. حاوية للكروت عشان نقدر نخفيها ونظهرها مع بعض
  const cardsContainer = document.createElement("div");
  cardsContainer.id = "kpi-cards-wrapper";
  listContainer.appendChild(cardsContainer);

  // 3. رسم الكروت
  kpis.forEach((kpi, index) => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.dataset.kpiId = kpi.kpiId;
    card.dataset.maxScore = kpi.maxScore;
    card.innerHTML = `
            <div class="kpi-card-info">
                <h4>${index + 1}. ${kpi.description || "N/A"}</h4>
                <p>التكرار: <span>${kpi.frequency || "-"}</span> | الدرجة القصوى: <span>${kpi.maxScore || 0}</span></p>
            </div>
            <div class="kpi-card-input">
                <div class="score-group">
                    <label>الدرجة:</label>
                    <input type="number" class="kpi-score-input" 
                           value="${kpi.scoreAchieved && kpi.scoreAchieved !== "N/A" ? kpi.scoreAchieved : ""}" 
                           min="0" max="${kpi.maxScore || 0}" step="0.5" placeholder="0">
                </div>
                <input type="text" class="kpi-notes-input" 
                       value="${kpi.notes || ""}" placeholder="ملاحظات (اختياري)...">
            </div>`;
    cardsContainer.appendChild(card);
  });

  // 4. برمجة البوكس (لو علم صح، يخفي الكروت)
  const naCheckbox = document.getElementById("kpi-na-checkbox");
  naCheckbox.addEventListener("change", function () {
    if (this.checked) {
      cardsContainer.style.display = "none";
    } else {
      cardsContainer.style.display = "block";
    }
  });
};

// 3. دالة تحميل البنود (إخاء الإرشاد ت وإظهار الورم)
window.loadKpisForEmployee = async function (employeeId, period) {
  const listContainer = document.getElementById("kpi-list-container");
  const guidelines = document.getElementById("kpi-guidelines-container");
  const saveBtn = document.getElementById("kpi-save-btn");
  const msgArea = document.getElementById("kpi-message-area");

  // إخفاء صندوق الإرشادات فوراً
  if (guidelines) guidelines.style.display = "none";

  if (listContainer)
    listContainer.innerHTML =
      "<div class='loader-small'>جاري جلب بنود التقييم...</div>";
  if (saveBtn) saveBtn.style.display = "none";
  if (msgArea) msgArea.style.display = "none";

  try {
    const response = await callApi("getKPIsForEmployee", {
      employeeId: employeeId,
      period: period,
      userInfo: currentUser,
    });

    if (response.status === "success" && response.kpis) {
      if (response.kpis.length > 0) {
        window.buildKpiForm(response.kpis);
        if (saveBtn) saveBtn.style.display = "block";
      } else {
        listContainer.innerHTML =
          "<p class='error-message' style='display:block'>لا توجد بنود تقييم مسجلة لهذه الوظيفة.</p>";
      }
    }
  } catch (error) {
    listContainer.innerHTML =
      "<p class='error-message' style='display:block'>حدث خطأ أثناء تحميل البيانات.</p>";
  }
};
// --- دوال النافذة امنبثقة (خارج أي نطاق مغلق لضمان العمل) ---
// --- دوال محرك تقييم الموظفين (KPI Popup Engine) ---

window.openKpiEmpSelector = async function () {
  const periodSelect = document.getElementById("kpi-period-select");
  const selectedPeriod = periodSelect ? periodSelect.value : "";

  if (!selectedPeriod) {
    alert("الرجاء اختيار فترة التقييم أولاً");
    return;
  }

  // إظهار لودر بسيط داخل الزر أو الصفحة
  showLoader("جاري تحديث قائمة الموظفين...");

  try {
    // نطلب البيانات المفلترة بهذا الشهر تحديداً
    const r = await callApi("getKpiInitData", {
      userInfo: currentUser,
      selectedPeriod: selectedPeriod,
    });

    if (r.status === "success") {
      window.ppeEmployees = r.employees;
      evaluatedEmpIds = r.evaluatedIds; // تحديث المصفوفة العالمية

      // فتح المودال ورسم القائمة بعد التحديث
      document.getElementById("kpi-emp-modal").style.display = "flex";
      document.getElementById("kpi-emp-search-box").value = "";
      renderKpiEmpsInModal(window.ppeEmployees);
    }
  } catch (e) {
    alert("خطأ في جلب البيانات: " + e.message);
  } finally {
    hideLoader();
  }
};

/**
 * رسم قائمة الموظفين داخل نافذة اختيار التقييم (KPI Modal)
 * تشمل الفلترة المسبقة من السيرفر، علامات التقييم المكتمل، والترتيب بالمشروع.
 */
function renderKpiEmpsInModal(list) {
  const container = document.getElementById("kpi-emp-list-container");
  if (!container) return;

  // 1. ترتيب القائمة حسب اسم المشروع (Current_Project) لسهولة التقييم المتتالي
  const sortedList = [...list].sort((a, b) =>
    (a.project || "").localeCompare(b.project || ""),
  );

  // 2. التحقق من وجود بيانات (بعد فلترة السيرفر للمشاريع المسموحة)
  if (sortedList.length === 0) {
    container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#666;">
                <i class="fas fa-users-slash fa-3x" style="margin-bottom:15px; color:#ccc;"></i>
                <p>لا يوجد موظفين مسجلين في مشاريعك الحالية.</p>
            </div>`;
    return;
  }

  // 3. بناء واجهة القائمة
  container.innerHTML = sortedList
    .map((e) => {
      // (هام) تنظيف الكود لمطابقة البيانات المستلمة من السيرفر (Evaluated IDs)
      const currentEmpId = String(e.id).trim();
      const isDone = (evaluatedEmpIds || []).some(
        (id) => String(id).trim() === currentEmpId,
      );

      return `
        <div class="ppe-cart-item ${isDone ? "evaluated-row" : ""}" 
             style="cursor:pointer; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; transition: 0.2s;" 
             onclick="window.selectKpiEmployee('${e.id}', '${e.name}', '${e.jobTitle}', '${e.project}')">

            <div style="text-align:right; flex-grow:1;">
                <span style="display:block; font-weight:700; color:#333;">
                    ${e.name} 
                    ${isDone ? '<i class="fas fa-check-circle" style="color:#28a745; margin-right:5px;" title="تم التقييم"></i>' : ""}
                </span>
                <small style="color:#666;">
                    <i class="fas fa-id-card-alt"></i> ${e.id} | 
                    <i class="fas fa-project-diagram"></i> ${e.project}
                </small>
            </div>

            <div style="margin-right:10px;">
                ${
                  isDone
                    ? '<span class="badge bg-success" style="font-size:0.75em; color:white; padding:5px 10px; border-radius:12px;">مـكتمل</span>'
                    : '<i class="fas fa-chevron-left" style="color:#ddd;"></i>'
                }
            </div>
        </div>`;
    })
    .join("");
}

window.filterKpiEmpList = function () {
  const query = document
    .getElementById("kpi-emp-search-box")
    .value.toLowerCase();
  const filtered = window.ppeEmployees
    .filter(
      (e) =>
        e.name.toLowerCase().includes(query) || e.id.toString().includes(query),
    )
    .sort((a, b) => (a.project || "").localeCompare(b.project || ""));
  renderKpiEmpsInModal(filtered);
};

// 2. دالة اختيار الموف من البوب أب (تعديل الربط مع التصميم اoجديد)
window.selectKpiEmployee = function (id, name, job, project) {
  // تعبئة الحقول الظاهرة والمخفية
  const nameInput = document.getElementById("kpi-emp-name-display");
  const idInput = document.getElementById("kpi-emp-id-hidden");
  const jobTitleEl = document.getElementById("kpi-employee-jobtitle");

  if (nameInput) nameInput.value = name;
  if (idInput) idInput.value = id;

  // إظهار المسمى  والمشروع في " ريط المعلومات" الجديد
  if (jobTitleEl) {
    jobTitleEl.innerHTML = `
            <span><i class="fas fa-briefcase"></i> ${job || "موظف"}</span> | 
            <span><i class="fas fa-map-marker-alt"></i> المشروع: ${project || "غير محدد"}</span>
        `;
    jobTitleEl.style.display = "block";
  }

  // الانتقال للتحميل
  const periodSelect = document.getElementById("kpi-period-select");
  if (periodSelect && periodSelect.value && id) {
    const period = `${periodSelect.value}-01`;
    window.loadKpisForEmployee(id, period);
  } else {
    alert("الرجاء اختيار فترة التقييم أولاً");
  }

  window.closeKpiEmpSelector();
};

window.closeKpiEmpSelector = function () {
  document.getElementById("kpi-emp-modal").style.display = "none";
};
// --- دالة حفظ التقييم العالمية (تمنع إعادة التحميل وتؤمن البيانات) ---
// --- دالة حفظ التقييم العالمية (تمنع إعادة التحميل وتضمن استقرار البيانات) ---
// =================================================================
// دالة حفظ التقييم (تدعم حالة N/A)
// =================================================================
window.handleKpiSave = async function (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const saveBtn = document.getElementById("kpi-save-btn");
  const kpiListContainer = document.getElementById("kpi-list-container");
  const empIdInput = document.getElementById("kpi-emp-id-hidden");
  const periodSelect = document.getElementById("kpi-period-select");

  if (!currentUser || !currentUser.username) {
    alert("انتهت الجلسة، يرجى إعادة تسجيل الدخول.");
    return;
  }

  const employeeId = empIdInput ? empIdInput.value : "";
  const period = periodSelect ? `${periodSelect.value}-01` : "";

  if (!employeeId || !period) {
    alert("الرجاء اختيار الموظف وفترة التقييم أولاً.");
    return;
  }

  const scoresToSave = [];

  // (*** التعديل هنا: فحص زر N/A ***)
  const isNaChecked = document.getElementById("kpi-na-checkbox")?.checked;

  if (isNaChecked) {
    // لو الموظف لم يحضر، نرسل سجل واحد يخبر السيرفر بذلك
    scoresToSave.push({
      kpiId: "N/A",
      score: "N/A",
      maxScore: 0,
      notes: "لم يتواجد بالمشروع",
    });
  } else {
    // القييم العادي (لو لم يتم تفعيل N/A)
    let validationError = false;
    const kpiCards = kpiListContainer.querySelectorAll(".kpi-card");

    kpiCards.forEach((card) => {
      const kpiId = card.dataset.kpiId;
      const maxScore = parseFloat(card.dataset.maxScore);
      const scoreInput = card.querySelector(".kpi-score-input");
      const score = scoreInput.value;
      const scoreNum = parseFloat(score);

      if (score !== "" && (scoreNum < 0 || scoreNum > maxScore)) {
        scoreInput.style.borderColor = "red";
        validationError = true;
      } else {
        scoreInput.style.borderColor = "";
      }

      scoresToSave.push({
        kpiId: kpiId,
        score: score === "" ? null : scoreNum,
        maxScore: maxScore,
        notes: card.querySelector(".kpi-notes-input")?.value || "",
      });
    });

    if (validationError) {
      alert("الدرجات المدخلة غير صحيحة، يرجى مراجعة الحقول الحمراء.");
      return;
    }
  }

  if (!confirm("هل أنت متأكد من حفظ هذا التقييم؟")) return;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  }

  try {
    const response = await callApi("saveEvaluations", {
      evaluationsData: { employeeId, period, scores: scoresToSave },
      userInfo: currentUser,
    });

    window.onSaveEvaluationSuccess(response);
  } catch (error) {
    alert("خطأ أثناء الحفظ: " + error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التقييمات';
    }
  }
};
window.onSaveEvaluationSuccess = async function (response) {
  const kpiSaveMessage = document.getElementById("kpi-save-message");
  const kpiListContainer = document.getElementById("kpi-list-container");
  const jobTitleEl = document.getElementById("kpi-employee-jobtitle");
  const guidelines = document.getElementById("kpi-guidelines-container");

  // إظهار رسالة النجاح
  showMessage(kpiSaveMessage, response.message || "تم الحفظ بنجاح!", true);

  // تنظيف الواجهة للتقييم القادم
  if (kpiListContainer) {
    kpiListContainer.innerHTML =
      "<p class='success-message'>✅ تم حفظ التقييم بنجاح. يمكنك اختيار موظف آخر الآن.</p>";
  }

  document.getElementById("kpi-emp-name-display").value = "";
  document.getElementById("kpi-emp-id-hidden").value = "";
  if (jobTitleEl) jobTitleEl.style.display = "none";
  if (guidelines) guidelines.style.display = "block"; // إعادة إظهار الإرشادات

  // تحديث علامات الصح ✅
  await window.initKpiPage();
};
window.calculateTrainingStats = function (sessions) {
  console.log("جاري حساب إحصائيات التدريب..."); // للتأكد في الـ Console

  let stats = {
    sewTrn: 0,
    sewInd: 0,
    subTrn: 0,
    subInd: 0,
  };

  if (!sessions || !Array.isArray(sessions)) return;

  sessions.forEach((session) => {
    // فحص نوع المحاضرة (بالإنجليزي أو العربي)
    const topic = (session.topic || "").toLowerCase();
    const isInduction = topic.includes("induction") || topic.includes("اندكشن");

    if (session.attendees && Array.isArray(session.attendees)) {
      session.attendees.forEach((att) => {
        // فحص هل هو سويدي (موظف) أم مقاول
        const isSewedy =
          att.type === "موظف" ||
          att.company === "السويدي" ||
          att.company === "Elsewedy";

        if (isSewedy) {
          if (isInduction) stats.sewInd++;
          else stats.sewTrn++;
        } else {
          if (isInduction) stats.subInd++;
          else stats.subTrn++;
        }
      });
    }
  });

  // تحديث الأرقام في المربعات الملونة
  const updateEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  updateEl("count-sewedy-trn", stats.sewTrn);
  updateEl("count-sewedy-ind", stats.sewInd);
  updateEl("count-sub-trn", stats.subTrn);
  updateEl("count-sub-ind", stats.subInd);

  // إظهار اللوحة
  const summaryBox = document.getElementById("training-stats-summary");
  if (summaryBox) {
    summaryBox.style.display = "grid";
  }
};

window.calculateObservationStats = function (data) {
  let stats = { sewOpen: 0, sewClosed: 0, subOpen: 0, subClosed: 0 };

  data.forEach((row) => {
    // تنظيف النص من المسافات الزائدة
    const responsibility = String(row.resp || "").trim();
    const isSewedy =
      responsibility === "السويدي" || responsibility === "Elsewedy";
    const isOpen =
      String(row.status || "")
        .trim()
        .toLowerCase() === "open";

    if (isSewedy) {
      if (isOpen) stats.sewOpen++;
      else stats.sewClosed++;
    } else {
      if (isOpen) stats.subOpen++;
      else stats.subClosed++;
    }
  });

  document.getElementById("count-sewedy-open-obs").textContent = stats.sewOpen;
  document.getElementById("count-sewedy-closed-obs").textContent =
    stats.sewClosed;
  document.getElementById("count-contractor-open-obs").textContent =
    stats.subOpen;
  document.getElementById("count-contractor-closed-obs").textContent =
    stats.subClosed;
  document.getElementById("obs-stats-summary").style.display = "grid";
};
// دالة الطباعة الشاملة
// =================================================================
// نظام توليد PDF الاحترافي المنفصؽؽٽؽ (V2.0)
// =================================================================
window.generateProfessionalPDF = function (title, contentHtml) {
  const printWindow = window.open("", "_blank", "width=1000,height=800");

  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page {
                size: A4;
                margin: 1.5cm;
            }
            body { 
                font-family: 'Cairo', sans-serif; 
                margin: 0;
                padding: 0;
                color: #2C2A29;
                line-height: 1.4;
                background-color: #fff;
            }
            /* حاوية التقرير */
            .report-wrapper {
                width: 100%;
            }
            /* الهيدر الاحترافي */
            .pdf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 4px solid #C8102E;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header-info {
                text-align: right;
            }
            .header-info h1 { 
                color: #C8102E; 
                margin: 0; 
                font-size: 26px; 
                font-weight: 800;
            }
            .header-info p {
                margin: 5px 0 0 0;
                font-size: 14px;
                color: #555;
                font-weight: 600;
            }
            .logo-container img {
                height: 60px;
                width: auto;
            }

            /* شريط تفاصيل المشروع */
            .project-bar {
                background-color: #f8f9fa;
                padding: 12px 20px;
                border-radius: 8px;
                border-right: 6px solid #C8102E;
                margin-bottom: 25px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .project-bar span {
                font-weight: 700;
                font-size: 15px;
            }
            .project-bar strong {
                color: #C8102E;
            }

            /* تنسيق الجدول */
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }
            th { 
                background-color: #2C2A29 !important; /* أسود تيرنكي */
                color: #ffffff !important; 
                font-weight: 700; 
                border: 1px solid #2C2A29; 
                padding: 14px 10px;
                font-size: 14px;
                -webkit-print-color-adjust: exact; 
            }
            td { 
                border: 1px solid #dee2e6; 
                padding: 12px 10px;
                text-align: center; 
                font-size: 13px;
                font-weight: 600;
            }
            /* تلوين الصفوف */
            tr:nth-child(even) { background-color: #fcfcfc; }

            /* تمييز عمود الكمية */
            td:last-child {
                color: #C8102E;
                font-weight: 800;
                font-size: 16px;
                background-color: rgba(200, 16, 46, 0.03);
            }

            /* فوتر التقرير */
            .pdf-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                font-size: 11px;
                color: #888;
                border-top: 1px solid #eee;
                padding-top: 10px;
                display: flex;
                justify-content: space-between;
            }

            /* منع كسر الجداول في منتصف الصف */
            tr { page-break-inside: avoid; }
        </style>
    </head>
    <body>
        <div class="report-wrapper">
            <div class="pdf-header">
                <div class="header-info">
                    <h1>تقرير أرصدة المخازن</h1>
                    <p>ELSEWEDY TURNKEY | HSE DEPARTMENT</p>
                    <p>قسم السلامة والصحة المهنية والبيئة</p>
                </div>
                <div class="logo-container">
                    <img src="../turnkey.png" alt="Company Logo">
                </div>
            </div>

            <div class="project-bar">
                <span>الموقع: <strong>${title.replace("تقرير مخزن: ", "")}</strong></span>
                <span>تاريخ التقرير: <strong>${new Date().toLocaleDateString("ar-EG")}</strong></span>
            </div>

            <div class="pdf-content">
                ${contentHtml}
            </div>

            <div class="pdf-footer">
                <span>نظام الأرشفة الرقمي - قطاع المشروعات</span>
                <span>تم الاستخراج بواسطة: ${currentUser.username}</span>
                <span>الصفحة 1 من 1</span>
            </div>
        </div>

        <script>
            window.onload = function() {
                setTimeout(() => {
                    window.print();
                }, 500);
            };
        <\/script>
    </body>
    </html>
    `;

  printWindow.document.open();
  printWindow.document.write(htmlTemplate);
  printWindow.document.close();
};

// =================================================================
// دالة طباعة ملف الموظف الشامل (Professional Employee PDF)
// =================================================================
window.generateEmployeeProfilePDF = function (empData, tablesHtml) {
  const printWindow = window.open("", "_blank", "width=1000,height=800");

  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>ملف الموظف: ${empData.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 1.2cm; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; color: #2C2A29; line-height: 1.4; }

            /* الهيدر الرسمي بلون السويدي */
            .pdf-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #C8102E; padding-bottom: 15px; margin-bottom: 25px; }
            .header-info h1 { color: #C8102E; margin: 0; font-size: 24px; font-weight: 800; }
            .header-info p { margin: 3px 0; font-size: 13px; color: #555; font-weight: 600; }
            .logo-container img { height: 75px; }

            /* كارت بيانات الموظف المطور */
            .emp-profile-box { background: #fdfdfd; border: 1px solid #dee2e6; border-right: 6px solid #C8102E; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .emp-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex-grow: 1; }
            .detail-item { font-size: 14px; color: #444; }
            .detail-item strong { color: #2C2A29; margin-left: 5px; }

            /* دائرة KPI */
            .kpi-summary { text-align: center; border-right: 1px solid #eee; padding-right: 25px; margin-right: 20px; min-width: 130px; }
            .kpi-val { font-size: 28px; font-weight: 800; color: #C8102E; display: block; }
            .kpi-label { font-size: 11px; color: #777; font-weight: 700; text-transform: uppercase; }

            /* تنسيق الأقسام والجداول */
            .section-title { background: #2C2A29; color: #fff; padding: 8px 15px; font-size: 15px; border-radius: 4px; margin: 25px 0 10px 0; display: inline-block; -webkit-print-color-adjust: exact; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th { background-color: #f2f2f2 !important; color: #333; font-weight: 700; border: 1px solid #ccc; padding: 10px; font-size: 13px; -webkit-print-color-adjust: exact; }
            td { border: 1px solid #eee; padding: 8px 10px; text-align: center; font-size: 12px; }
            tr:nth-child(even) { background-color: #fafafa; }

            .pdf-footer { position: fixed; bottom: 0; left: 0; width: 100%; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="pdf-header">
            <div class="header-info">
                <h1>سجل الموظف الشامل</h1>
                <p>ELSEWEDY ELECTRIC | HSE DEPARTMENT</p>
                <p>Digital HSE Management System</p>
            </div>
            <div class="logo-container"><img src="../turnkey.png"></div>
        </div>

        <div class="emp-profile-box">
            <div class="emp-details">
                <div class="detail-item"><strong>الاسم:</strong> ${empData.name}</div>
                <div class="detail-item"><strong>الكود:</strong> ${empData.id}</div>
                <div class="detail-item"><strong>الوظيفة:</strong> ${empData.job}</div>
                <div class="detail-item"><strong>القسم:</strong> ${empData.dept}</div>
                <div class="detail-item"><strong>المشروع الحالي:</strong> ${empData.proj}</div>
                <div class="detail-item"><strong>تاريخ التعيين:</strong> ${empData.join}</div>
            </div>
            <div class="kpi-summary">
                <span class="kpi-val">${empData.kpi}</span>
                <span class="kpi-label">معدل الأداء العام</span>
            </div>
        </div>

        ${tablesHtml}

        <div class="pdf-footer">
            <span>تم استخراج هذا التقرير بواسطة نظام الأرشفة الرقمي لقطاع المشروعات</span>
            <span>تاريخ الطباعة: ${new Date().toLocaleString("ar-EG")}</span>
        </div>

        <script>
            window.onload = function() { setTimeout(() => { window.print(); }, 500); };
        <\/script>
    </body>
    </html>`;

  printWindow.document.open();
  printWindow.document.write(htmlTemplate);
  printWindow.document.close();
};

/* =================================================================
   وحدة التقارير اليومية (Daily HSE Report Module)
   ================================================================= */

/* --- كود وحدة التقرير اليومي --- */
let drAddedEntities = [];

window.initDailyHseReportPage = async function () {
  const drForm = document.getElementById("daily-report-form");
  if (document.getElementById("dr-date")) {
    document.getElementById("dr-date").valueAsDate = new Date();
  }

  // --- التعديل الجذري لتحميل المشاريع ---
  const drProjectSelect = document.getElementById("dr-project");
  if (drProjectSelect && drProjectSelect.options.length <= 1) {
    drProjectSelect.innerHTML = '<option value="">جاري التحميل...</option>';
    try {
      // نطلب المشاريع من السيرفر لضمان وجودها
      const r = await callApi("getInventoryInitData", {
        userInfo: currentUser,
      });
      if (r.status === "success") {
        ppeLocations = r.locations; // تحديث المتغير العالمي
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? r.locations
            : r.locations.filter((p) => userProj.includes(p));
        window.fillSelect(drProjectSelect, acc);
      } else {
        drProjectSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
      }
    } catch (e) {
      console.error("Error loading projects:", e);
      drProjectSelect.innerHTML = '<option value="">خطأ اتصال</option>';
    }
  }

  // تم إلغاء حظر الوقت ليصبح التسجيل متاحاً طوال اليوم
  const submitBtn = document.getElementById("dr-submit-btn");
  const warningDiv = document.getElementById("daily-time-warning");

  if (warningDiv) warningDiv.style.display = "none";
  if (submitBtn) submitBtn.disabled = false;

  drAddedEntities = [];
  if (typeof renderDrEntitiesTable === "function") renderDrEntitiesTable();

  // استدعاء التنبيهات للمشرف إذا كان لديه تقارير مرفوضة
  if (typeof loadRejectedReportsAlert === "function")
    loadRejectedReportsAlert();
};

window.updateDrContractors = async function () {
  const proj = document.getElementById("dr-project").value;
  const entSelect = document.getElementById("dr-ent-name");
  if (!proj) return;

  try {
    const r = await callApi("getContractorsForProject", { projectName: proj });
    entSelect.innerHTML = '<option value="">-- اختر المقاول --</option>';
    if (r.contractors) {
      r.contractors.forEach((c) => {
        if (c !== "ذاتي") entSelect.add(new Option(c, c));
      });
    }
  } catch (e) {
    console.error(e);
  }
};

// 1. دالة إضافة المقاول للسلة (تجميع 11 تصنيف للمقاول)
window.addEntityToDailyReport = function () {
  const entName = document.getElementById("dr-ent-name").value;
  const manpower = document.getElementById("dr-ent-manpower").value;

  // الشرط الجديد: يتأكد إن الاسم موجود، وإن العمالة مش فاضية ومش رقم سالب (لكن الصفر مسموح)
  if (!entName || manpower === "" || parseInt(manpower) < 0) {
    alert("الرجاء اختيار المقاول وإدخال عدد العمالة (يمكن أن يكون 0).");
    return;
  }

  const entity = {
    name: entName,
    workersCount: manpower,
    trainingRegular: document.getElementById("dr-ent-train").value || 0,
    induction: document.getElementById("dr-ent-induct").value || 0,
    // الملاحظات الـ 4
    ua: document.getElementById("dr-ent-ua").value || 0,
    uc: document.getElementById("dr-ent-uc").value || 0,
    envImpact: document.getElementById("dr-ent-env").value || 0,
    positiveObs: document.getElementById("dr-ent-pos").value || 0,
    // الحوادث الـ 7
    fatality: document.getElementById("dr-ent-fatal").value || 0,
    lti: document.getElementById("dr-ent-lti").value || 0,
    mtc: document.getElementById("dr-ent-mtc").value || 0,
    fac: document.getElementById("dr-ent-fac").value || 0,
    nm: document.getElementById("dr-ent-nm").value || 0,
    pd: document.getElementById("dr-ent-pd").value || 0,
    envIncident: document.getElementById("dr-ent-env-inc").value || 0,
  };

  // منع تكرار المقاول في نفس اليوم
  if (drAddedEntities.find((e) => e.name === entName)) {
    alert("هذا المقاول مضاف بالفعل في القائمة");
    return;
  }

  drAddedEntities.push(entity);
  renderDrEntitiesTable();

  // =========================================================
  // --- التعديل هنا: تصفير جميع خانات المقاول بالكامل ---
  // =========================================================
  const fieldsToReset = [
    "dr-ent-manpower",
    "dr-ent-train",
    "dr-ent-induct",
    "dr-ent-ua",
    "dr-ent-uc",
    "dr-ent-env",
    "dr-ent-pos",
    "dr-ent-fatal",
    "dr-ent-lti",
    "dr-ent-mtc",
    "dr-ent-fac",
    "dr-ent-nm",
    "dr-ent-pd",
    "dr-ent-env-inc",
  ];

  fieldsToReset.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "0"; // تفريغ الخانة بالكامل لتعود للوضع الافتراضي
  });
};

// الإرسال النهائي
// =================================================================
// دالة إرسال التقرير اليومي - النسخة النهائية الموحدة
// =================================================================
// الإرسال النهائي للتقرير اليومي للاعتماد
// الإرسال النهائي للتقرير اليومي للاعتماد
document.getElementById("daily-report-form").onsubmit = async function (e) {
  e.preventDefault();

  if (drAddedEntities.length === 0) {
    const confirmSolo = confirm("هل تريد إرسال تقرير (طاقم السويدي) فقط ؟");
    if (!confirmSolo) return;
  }

  // 1. تجميع البيانات العالمية للموقع (تم فصل المعدات هنا)
  const globalData = {
    projectName: document.getElementById("dr-project").value,
    reportDate: document.getElementById("dr-date").value,
    shiftHours: document.getElementById("dr-shift").value,
    sewedyStaffCount: document.getElementById("dr-total-sewedy").value || 0,
    internalManpowerCount:
      document.getElementById("dr-total-internal").value || 0,
    contractorsManpowerCount:
      document.getElementById("dr-total-contractors").value || 0,
    securityTotalCount: document.getElementById("dr-total-security").value || 0,
    ptwCount: document.getElementById("dr-ptw").value || 0,
    hazardReports: document.getElementById("dr-hazards").value || 0,
    totalObs: document.getElementById("dr-total-obs").value || 0,
    equipInspectionInt: document.getElementById("dr-equip-int").value || 0, // داخلي
    equipInspectionExt: document.getElementById("dr-equip-ext").value || 0, // خارجي
    internalAudit: document.getElementById("dr-int-audit").value || 0,
    externalAudit: document.getElementById("dr-ext-audit").value || 0,
    accInspection: document.getElementById("dr-acc-insp").value || 0,
    weeklyWalkdown: document.getElementById("dr-weekly-walk").value || 0,
    monthlySiteTour: document.getElementById("dr-monthly-tour").value || 0,
    drill: document.getElementById("dr-drill")
      ? document.getElementById("dr-drill").value || 0
      : 0,
    campaigns: document.getElementById("dr-campaigns")
      ? document.getElementById("dr-campaigns").value || 0
      : 0,
  };

  // 2. تجميع أداء شركة السويدي
  const sewedyPerformance = {
    trainingRegular: document.getElementById("dr-sw-train").value || 0,
    induction: document.getElementById("dr-sw-induct").value || 0,
    ua: document.getElementById("dr-sw-ua").value || 0,
    uc: document.getElementById("dr-sw-uc").value || 0,
    envImpact: document.getElementById("dr-sw-env").value || 0,
    positiveObs: document.getElementById("dr-sw-pos").value || 0,
    fatality: document.getElementById("dr-sw-fatal").value || 0,
    lti: document.getElementById("dr-sw-lti").value || 0,
    mtc: document.getElementById("dr-sw-mtc").value || 0,
    fac: document.getElementById("dr-sw-fac").value || 0,
    nm: document.getElementById("dr-sw-nm").value || 0,
    pd: document.getElementById("dr-sw-pd").value || 0,
    envIncident: document.getElementById("dr-sw-env-inc").value || 0,
  };

  const finalPayload = {
    globalData: globalData,
    sewedyData: sewedyPerformance,
    entitiesArray: drAddedEntities,
    userInfo: currentUser,
  };

  try {
    const response = await callApi("saveDailyHseReport", finalPayload);
    if (response.status === "success") {
      alert("✅ " + response.message);
      location.reload();
    } else {
      alert("❌ فشل الإرسال: " + response.message);
    }
  } catch (err) {
    console.error("Submission Error:", err);
    alert("❌ حدث خطأ فني أثناء الإرسال: " + err.message);
  }
};

function renderDrEntitiesTable() {
  const tbody = document.getElementById("dr-entities-body");
  tbody.innerHTML = drAddedEntities
    .map(
      (ent, i) => `
        <tr>
            <td><strong>${ent.name}</strong></td>
            <td>${ent.workersCount}</td>
            <td style="color:#0056b3">حساب تلقائي</td>
            <td style="text-align:center;"><i class="fas fa-eye"></i></td>
            <td style="text-align:center;"><i class="fas fa-exclamation-triangle"></i></td>
            <td><button type="button" class="btn-small btn-danger" onclick="removeDrEntity(${i})">X</button></td>
        </tr>
    `,
    )
    .join("");
}

window.removeDrEntity = (i) => {
  drAddedEntities.splice(i, 1);
  renderDrEntitiesTable();
};

function saveDailyHseReport(payload, userInfo) {
  try {
    // 1. تحقق أمان: التأكد من وصول بيانات المستخدم
    if (!userInfo || !userInfo.username) {
      throw new Error("لم يتم التعرف على المستخدم. يرجى إعادة تسجيل الدخول.");
    }

    const { globalData, sewedyData, entitiesArray } = payload;

    // 2. فحص صلاحية الوقت
    const access = checkDailySubmissionAccess(
      userInfo.username,
      globalData.projectName,
    );
    if (!access.allowed) throw new Error(access.message);

    const pendingSheet = getDailyReportsSheet(DAILY_PENDING_SHEET);
    const reportId = "REP-" + new Date().getTime();
    const rowsToAdd = [];

    // 3. بناء سطر السويدي
    const sewedyRow = buildRowForEntity(
      reportId,
      "Sewedy",
      "شركة السويدي",
      globalData.sewedyStaffCount,
      sewedyData,
      globalData,
      userInfo,
      access.isLate,
    );
    rowsToAdd.push(sewedyRow);

    // 4. بناء أسطر المقاولين
    if (entitiesArray && entitiesArray.length > 0) {
      entitiesArray.forEach((ent) => {
        const contractorRow = buildRowForEntity(
          reportId,
          "Contractor",
          ent.name,
          ent.workersCount,
          ent,
          globalData,
          userInfo,
          access.isLate,
        );
        rowsToAdd.push(contractorRow);
      });
    }

    // 5. الحفظ الفعلي
    pendingSheet
      .getRange(
        pendingSheet.getLastRow() + 1,
        1,
        rowsToAdd.length,
        rowsToAdd[0].length,
      )
      .setValues(rowsToAdd);

    return {
      status: "success",
      message: `تم إرسال التقرير بنجاح للاعتماد. رقم المرجع: ${reportId}`,
    };
  } catch (e) {
    Logger.log(`!!! saveDailyHseReport Error: ${e.message}`);
    return { status: "error", message: e.message };
  }
}
let currentPendingReports = [];

// --- دالة تشغيل صفحة الاعتمادات ومراقبة التأخير ---
/**
 /**
  * دالة تهيئة صفحة الاعتمادات وإدارة التقارير المتأخرة والمعلقة
  */
async function initDailyApprovalsPage() {
  const container = document.getElementById("pending-reports-container");
  if (!container) return;

  // 1. إظهار مؤشر التحميل
  container.innerHTML = `
         <div style="text-align:center; padding:20px;">
             <i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-color);"></i>
             <p style="margin-top:10px;">جاري فحص حالة التقارير والمشاريع من أول الشهر...</p>
         </div>`;

  try {
    // 2. جلب البيانات من السيرفر (التأخيرات + التقارير المعلقة)
    // طلب ملخص الأيام المفقودة
    const resSummary = await callApi("getDelayedReportsSummary", {
      userInfo: currentUser,
    });
    // طلب التقارير التي تنتظر الاعتماد
    const resPending = await callApi("getPendingReports", {
      userInfo: currentUser,
    });

    container.innerHTML = ""; // تفريغ الحاوية للبدء في الرسم

    // --- الجزء الأول: لوحة المشاريع المتأخرة (Missing Reports Dashboard) ---
    if (resSummary.status === "success" && resSummary.summary.length > 0) {
      let summaryHtml = `
                 <div class="alert-box-red" style="margin-bottom:20px;">
                     <h4 style="margin-bottom:15px; color:#856404;">
                         <i class="fas fa-exclamation-triangle"></i> تنبيه: مشاريع لم تكتمل سجلاتها اليومية هذا الشهر
                     </h4>
                     <div class="delayed-projects-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
             `;

      resSummary.summary.forEach((item) => {
        // تحويل مصفوفة التواريخ لنص JSON مؤمن لإرساله للبوب أب
        const datesJson = encodeURIComponent(JSON.stringify(item.missingDates));

        summaryHtml += `
                     <div class="delay-card" onclick="window.handleMissingCardClick('${item.projectName}', '${datesJson}')" 
                          style="cursor:pointer; background:#fff; border:1px solid #ffeeba; padding:15px; border-radius:10px; border-right:6px solid #ffc107; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition:0.3s;">
                         <div style="font-weight:bold; font-size:1.1rem; margin-bottom:5px; color:#2C2A29;">${item.projectName}</div>
                         <div style="display:flex; justify-content:space-between; align-items:center;">
                             <span class="badge" style="background:#fff3cd; color:#856404; font-size:0.9rem;">
                                 <i class="fas fa-calendar-times"></i> ${item.missingCount} أيام مفقودة
                             </span>
                             <i class="fas fa-chevron-left" style="color:#ccc;"></i>
                         </div>
                     </div>
                 `;
      });
      container.innerHTML =
        summaryHtml +
        `</div></div><hr style="border:0; border-top:1px solid #eee; margin: 30px 0;">`;
    }

    // --- الجزء الثاني: جدول التقارير المعلقة (Pending for Approval) ---
    container.insertAdjacentHTML(
      "beforeend",
      `
             <h4 style="margin-bottom:15px; color:#555;">
                 <i class="fas fa-clipboard-check"></i> تقارير مرفوعة بانتظار المراجعة و الاعتماد:
             </h4>`,
    );

    if (resPending.status === "success") {
      const reports = resPending.reports || [];
      // تحديث المتغير العالمي للتقارير المعلقة لسهوة الوصول إليه عند الفلترة
      currentPendingReports = reports;

      if (reports.length === 0) {
        container.insertAdjacentHTML(
          "beforeend",
          `
                     <div class="empty-state" style="text-align:center; padding:40px; color:#28a745; background:#f6fff6; border-radius:10px;">
                         <i class="fas fa-check-double fa-4x"></i>
                         <p style="margin-top:15px; font-weight:bold; font-size:1.1rem;">ممتاز! لا توجد تقارير معلقة حالياً.</p>
                     </div>`,
        );
      } else {
        let tableHtml = `
                     <div class="results-table-container">
                         <table class="results-table">
                             <thead>
                                 <tr>
                                     <th>التاريخ</th>
                                     <th>المشروع</th>
                                     <th>المشرف</th>
                                     <th style="text-align:center;">إجراء</th>
                                 </tr>
                             </thead>
                             <tbody>`;

        reports.forEach((rep) => {
          tableHtml += `
                         <tr>
                             <td style="white-space:nowrap;">${rep.date}</td>
                             <td><strong>${rep.projectName}</strong></td>
                             <td>${rep.supervisor}</td>
                             <td style="text-align:center;">
                                 <button class="btn-small btn-secondary" 
                                         onclick="viewDailyReportDetails('${rep.logId}')">
                                     <i class="fas fa-search"></i> مراجعة
                                 </button>
                             </td>
                         </tr>`;
        });
        container.insertAdjacentHTML(
          "beforeend",
          tableHtml + "</tbody></table></div>",
        );
      }
    }
  } catch (err) {
    console.error("Critical Render Error:", err);
    container.innerHTML = `<div class="error-message" style="display:block;">حدث خطأ في معالجة البيانات: ${err.message}</div>`;
  }
}

/**
 * دالة مساعدة للتعامل مع الضغط على كرت التأخير (تفكيك البيانات وفتح المودال)
 */
window.handleMissingCardClick = function (projName, encodedDates) {
  const dates = JSON.parse(decodeURIComponent(encodedDates));
  if (typeof window.showMissingDatesDetail === "function") {
    window.showMissingDatesDetail(projName, dates);
  } else {
    console.error("Function showMissingDatesDetail not found!");
  }
};

/**
 * دالة فتح تفاصيل الأيام المتأخرة لمشروع معين
 */
window.viewDailyReportDetails = function (logId) {
  const report = currentPendingReports.find((r) => r.logId === logId);
  if (!report) return;

  const firstEntity = report.entities[0];

  // استخراج البيانات مع مراعاة الترحيل الجديد للأعمدة
  const stats = {
    security: firstEntity[20],
    ptw: firstEntity[21],
    hazards: firstEntity[22],
    obs: firstEntity[23],
    equipInt: firstEntity[24], // الداخلي (في مكانه القديم)
    intAudit: firstEntity[25], // رجع مكانه
    extAudit: firstEntity[26], // رجع مكانه
    accInsp: firstEntity[27], // رجع مكانه
    weekly: firstEntity[28], // رجع مكانه
    monthly: firstEntity[29], // رجع مكانه
    drill: firstEntity[36] || 0, // رجع مكانه
    campaigns: firstEntity[37] || 0, // رجع مكانه
    equipExt: firstEntity[38] || 0, // الخارجي (العمود الجديد في الآخر خالص)
  };

  const modalContent = document.querySelector(
    "#report-details-modal .modal-content",
  );
  if (modalContent) {
    modalContent.style.display = "flex";
    modalContent.style.flexDirection = "column";
    modalContent.style.maxHeight = "90vh";
    modalContent.style.overflow = "hidden";
  }

  const body = document.getElementById("report-details-body");

  let html = `
    <div style="background: #f8f9fa; border-right: 4px solid #007bff; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 0.85rem;">
            <div><span style="color:#666;">المشروع:</span> <br><strong>${report.projectName}</strong></div>
            <div><span style="color:#666;">التاريخ:</span> <br><strong>${report.date}</strong></div>
            <div><span style="color:#666;">المشرف:</span> <br><strong>${report.supervisor}</strong></div>
            <div><span style="color:#666;">الوردية:</span> <br><strong>${firstEntity[4]} ساعات</strong></div>
            <div><span style="color:#666;">أفراد الأمن:</span> <br><strong>${stats.security}</strong></div>
        </div>
    </div>

    <h4 style="color: #28a745; margin-bottom: 10px; font-size: 0.95rem;"><i class="fas fa-chart-pie"></i> المؤشرات الاستباقية (Proactive)</h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); gap: 8px; margin-bottom: 15px;">
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Hazards</div><div style="font-size:1.1rem; font-weight:bold; color:#d32f2f;">${stats.hazards}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Site Obs.</div><div style="font-size:1.1rem; font-weight:bold; color:#f57c00;">${stats.obs}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">PTW</div><div style="font-size:1.1rem; font-weight:bold; color:#1976d2;">${stats.ptw}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.6rem; color:#666;">Eqp Insp(Int)</div><div style="font-size:1.1rem; font-weight:bold; color:#388e3c;">${stats.equipInt}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.6rem; color:#666;">Eqp Insp(Ext)</div><div style="font-size:1.1rem; font-weight:bold; color:#388e3c;">${stats.equipExt}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Int Audit</div><div style="font-size:1.1rem; font-weight:bold; color:#555;">${stats.intAudit}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Ext Audit</div><div style="font-size:1.1rem; font-weight:bold; color:#555;">${stats.extAudit}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Week Walk</div><div style="font-size:1.1rem; font-weight:bold; color:#673ab7;">${stats.weekly}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Month Tour</div><div style="font-size:1.1rem; font-weight:bold; color:#673ab7;">${stats.monthly}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Acc Insp</div><div style="font-size:1.1rem; font-weight:bold; color:#009688;">${stats.accInsp}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Drills</div><div style="font-size:1.1rem; font-weight:bold; color:#e91e63;">${stats.drill}</div>
        </div>
        <div style="background:white; border:1px solid #ddd; border-radius:6px; padding:5px; text-align:center;">
            <div style="font-size:0.7rem; color:#666;">Campaigns</div><div style="font-size:1.1rem; font-weight:bold; color:#e91e63;">${stats.campaigns}</div>
        </div>
    </div>
    <h4 style="color: #333; margin-bottom: 10px; font-size: 0.95rem;"><i class="fas fa-users"></i> تفاصيل العمالة، التدريب، والإصابات</h4>
    <div class="results-table-container" style="overflow-x: auto; border:1px solid #eee; border-radius:5px;">
        <table class="results-table" style="font-size: 0.75rem; min-width: 900px; margin:0;">
            <thead>
                <tr style="background:#333; color:white;">
                    <th>الجهة</th><th>عمالة</th><th>ساعات</th>
                    <th style="background:#17a2b8;">Train</th><th style="background:#17a2b8;">Induct</th>
                    <th>UA</th><th>UC</th><th>Env.I</th><th>Pos</th>
                    <th style="background:#4a0000;">Fatal</th><th style="background:#4a0000;">LTI</th><th style="background:#4a0000;">MTC</th><th style="background:#4a0000;">FAC</th><th style="background:#4a0000;">NM</th><th style="background:#4a0000;">PD</th><th style="background:#4a0000;">Env.Inc</th>
                </tr>
            </thead>
            <tbody>`;

  report.entities.forEach((row) => {
    let bg = "#fff";
    if (row[5] === "Sewedy") bg = "#f0f8ff";
    if (row[5] === "Security") bg = "#fff8e1";

    let train = row[34] || "0";
    let induct = row[35] || "0";

    html += `
        <tr style="background:${bg}; text-align:center;">
            <td style="font-weight:bold; text-align:right; white-space:nowrap;">${row[6]}</td> 
            <td style="font-weight:bold;">${row[7]}</td>  
            <td>${row[8]}</td>  
            <td style="font-weight:bold; color:#17a2b8;">${train}</td>
            <td style="font-weight:bold; color:#17a2b8;">${induct}</td>
            <td>${row[9]}</td>  
            <td>${row[10]}</td> 
            <td>${row[11]}</td> 
            <td style="color:green;">${row[12]}</td> 
            <td style="font-weight:bold; color:red;">${row[13]}</td> 
            <td style="color:red;">${row[14]}</td> 
            <td style="color:red;">${row[15]}</td> 
            <td style="color:red;">${row[16]}</td> 
            <td style="color:red;">${row[17]}</td> 
            <td style="color:red;">${row[18]}</td> 
            <td style="color:red;">${row[19]}</td> 
        </tr>`;
  });

  html += `</tbody></table></div>`;
  body.innerHTML = html;

  body.style.flexGrow = "1";
  body.style.overflowY = "auto";
  body.style.padding = "10px";

  const footerBtns = document.querySelector(".modal-footer-btns");
  if (footerBtns) {
    footerBtns.style.display = "flex";
    footerBtns.style.flexWrap = "wrap";
    footerBtns.style.gap = "10px";
    footerBtns.style.padding = "15px 10px";
    footerBtns.style.borderTop = "1px solid #eee";
    footerBtns.style.backgroundColor = "#fff";
  }

  const btnApprove = document.getElementById("btn-approve-final");
  const btnReject = document.getElementById("btn-reject-final");

  if (btnApprove) {
    btnApprove.innerHTML = '<i class="fas fa-check-circle"></i> اعتماد التقرير';
    btnApprove.style.flex = "1 1 45%";
    btnApprove.style.minWidth = "140px";
    btnApprove.onclick = () => finalizeAction(logId, "APPROVE");
  }
  if (btnReject) {
    btnReject.innerHTML = '<i class="fas fa-times-circle"></i> رفض التقرير';
    btnReject.style.flex = "1 1 45%";
    btnReject.style.minWidth = "140px";
    btnReject.onclick = () => finalizeAction(logId, "REJECT");
  }

  document.getElementById("report-details-modal").style.display = "flex";
};

async function finalizeAction(logId, action) {
  let notes = "";
  if (action === "REJECT") {
    notes = prompt("اذكر سبب الرفض ليظهر للمشرف:");
    if (notes === null) return; // لو كنسل الـ Prompt
  }

  showLoader(action === "APPROVE" ? "جاري الاعتماد..." : "جاري الرفض...");

  try {
    const res = await callApi("processReportAction", {
      reportId: logId,
      action: action,
      notes: notes,
      userInfo: currentUser,
    });

    // تم تغيير r إلى res هنا
    alert(res.message);

    // 1. إخفاء المودال
    document.getElementById("report-details-modal").style.display = "none";

    // 2. تحديث قائمة التقارير المعلقة فوراً دون إعادة تحميل الصفحة
    await initDailyApprovalsPage();
  } catch (err) {
    console.error("Action Error:", err);
    alert("❌ حدث خطأ: " + err.message);
  } finally {
    hideLoader();
  }
}

// دالة فتح التمديد
window.openExtensionModal = async function () {
  const supervisor = prompt("ادخل اسم المستخدم للمشرف (Username):");
  const proj = prompt("ادخل اسم المشروع:");
  const reason = prompt("سبب فتح التمديد:");
  if (supervisor && proj && reason) {
    const res = await callApi("grantExtension", {
      supervisor,
      proj,
      reason,
      userInfo: currentUser,
    });
    alert(res.message);
  }
};
// دالة تسجيل الإجازة عند الضغط على زر "إجازة" في التنبيهات
// دالة تسجيل الإجازة عند الضغط على زر "إجازة" في التنبيهات
window.registerProjectHoliday = async function (projectName, date) {
  if (
    confirm(
      `هل أنت متأكد من تسجيل يوم ${date} كإجازة لمشروع [${projectName}]؟ سيتم نقله للسجل النهائي فوراً.`,
    )
  ) {
    showLoader("جاري تسجيل الإجازة...");
    try {
      const res = await callApi("markDayAsHoliday", {
        project: projectName,
        date: date,
        userInfo: currentUser,
      });

      // 1. إظهار رسالة النجاح
      alert(res.message);

      // 2. إخفاء النافذة المنبثقة (المودال) فوراً
      const modal = document.getElementById("report-details-modal");
      if (modal) modal.style.display = "none";

      // 3. تحديث لوحة التنبيهات والاعتمادات في الخلفية (عشان اليوم يختفي من المربعات الحمراء)
      await initDailyApprovalsPage();
    } catch (e) {
      alert("خطأ: " + e.message);
    } finally {
      hideLoader();
    }
  }
};

// دالة تسجيل الإجازة العامة (من الزر الأزرق العلوي)
window.markHolidayPrompt = function () {
  const proj = prompt("ادخل اسم المشروع المراد تسجيل إجازة له:");
  const date = document.getElementById("dr-date").value;
  if (proj && date) {
    window.registerProjectHoliday(proj, date);
  }
};

//  الة إغلاق المودال الخاص بالتفاصيل
window.closeReportModal = function () {
  document.getElementById("report-details-modal").style.display = "none";
};

// 1. متغير عالمي مؤقت لحظ قائمy المش ين عشان نهرب من مشكلة الـ JSON في الـ HTML
let tempSupervisorsList = [];

/**
 * دالة فتح تفاصيل الأيام المتأخرة لمشروع معين
 */
window.showMissingDatesDetail = async function (projectName, dates) {
  showLoader("جاري تحميل قائمة المشرفين للمشروع...");
  try {
    // التعديل هنا: نرسل اسم المشروع كـ payload للسيرفر ليقوم بالفلترة
    const resSup = await callApi("getSupervisorsList", {
      projectName: projectName,
    });

    // حفقائمة المفلترة في المتغير العالمي لاستخدامها في البوب أب التالي
    tempSupervisorsList = resSup.list || [];

    if (tempSupervisorsList.length === 0) {
      alert(
        `تنبيه: لا يوجد مشرفين مسجلين مسموح لهم بالوصول لمشروع [${projectName}] في قاعدة البيانات.`,
      );
      // اختياري: يمكنك العودة أو الاستمرار لعرض الجدول حتى لو القائمة فارغة
    }

    let html = `
            <div style="text-align:right; direction:rtl; padding:10px;">
                <p style="margin-bottom:15px; font-size:1.1rem;">
                    إدارة أيام التأخير لمشروع: <strong style="color:var(--primary-color);">${projectName}</strong>
                </p>
                <div class="results-table-container">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>تاريخ اليوم المتأخر</th>
                                <th>إجراء سريع</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

    dates.forEach((date) => {
      html += `
                <tr>
                    <td style="font-weight:bold;">${date}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-small" style="background:#28a745; color:white;" onclick="window.registerProjectHoliday('${projectName}', '${date}')">
                                <i class="fas fa-umbrella-beach"></i> إجازة
                            </button>
                            <button class="btn-small" style="background:#007bff; color:white;" onclick="window.promptExtensionForDate('${projectName}', '${date}')">
                                <i class="fas fa-clock"></i> تمديد لمشرف
                            </button>
                        </div>
                    </td>
                </tr>
            `;
    });

    html += `</tbody></table></div></div>`;

    const body = document.getElementById("report-details-body");
    if (body) {
      body.innerHTML = html;
      document.getElementById("modal-report-title").innerText =
        "تفاصيل الأيام غير المسجلة";
      document.getElementById("report-details-modal").style.display = "block";
      const footerBtns = document.querySelector(".modal-footer-btns");
      if (footerBtns) footerBtns.style.display = "none";
    }
  } catch (e) {
    alert("خطأ في تحميل البيانات: " + e.message);
  } finally {
    hideLoader();
  }
};

/**
 * دالة عرض واجهة اختيار المشرف (تستخدم المتغير العالمي tempSupervisorsList)
 */
window.promptExtensionForDate = function (proj, date) {
  if (tempSupervisorsList.length === 0) {
    alert("تنبيه: قائمة المشرفين فارغة.");
    return;
  }

  let options = tempSupervisorsList
    .map((s) => `<option value="${s}">${s}</option>`)
    .join("");

  const modalBody = document.getElementById("report-details-body");
  modalBody.innerHTML = `
        <div style="padding: 10px; text-align: right; direction: rtl;">
            <h4 style="color: var(--primary-color); margin-bottom: 20px;">
                <i class="fas fa-user-clock"></i> تمديد الصلاحية
            </h4>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-right: 5px solid #ffc107; margin-bottom: 20px;">
                <p>المشروع: <strong>${proj}</strong> | التاريخ: <strong>${date}</strong></p>
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label>اختر المشرف:</label>
                <select id="selected-supervisor" class="modern-input" style="width:100%; padding:10px;">
                    ${options}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 25px;">
                <label>سبب التمديد:</label>
                <input type="text" id="extension-reason" class="modern-input" style="width:100%; padding:10px;" placeholder="اكتب السبب هنا...">
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn" onclick="window.executeExtension('${proj}', '${date}')" style="flex:2">تأكيد التمديد</button>
                <button class="btn" onclick="initDailyApprovalsPage()" style="background:#666; flex:1">رجوع</button>
            </div>
        </div>
    `;
};

/**
 * تنفيذ عملية التمديد النهائية
 */
window.executeExtension = async function (proj, date) {
  const supervisor = document.getElementById("selected-supervisor").value;
  const reason = document.getElementById("extension-reason").value;

  if (!reason) {
    alert("يرجى كتابة سبب التمديد.");
    return;
  }

  showLoader("جاري الإرسال...");
  try {
    const res = await callApi("grantExtension", {
      proj,
      supervisor,
      reason,
      userInfo: currentUser,
    });
    alert(res.message);
    document.getElementById("report-details-modal").style.display = "none";
    initDailyApprovalsPage(); // تحديث الصفحة الرئيسية للاعتمادات
  } catch (err) {
    alert("خطأ: " + err.message);
  } finally {
    hideLoader();
  }
};

// بوب أب لاختيار المشرف وعمل تمديد
window.promptExtension = function (proj, date, supervisors) {
  let options = supervisors
    .map((s) => `<option value="${s}">${s}</option>`)
    .join("");

  let container = document.getElementById("report-details-body");
  container.innerHTML = `
      <div style="padding:20px; text-align:right;">
          <h4>تمديد صلاحية التسجيل</h4>
          <p>مشروع: ${proj} | تاريخ: ${date}</p>
          <hr>
          <div class="form-group">
              <label>اختر المشرف المسؤول:</label>
              <select id="selected-supervisor" class="modern-input">${options}</select>
          </div>
          <div class="form-group">
              <label>سبب التمديد:</label>
              <input type="text" id="extension-reason" class="modern-input" placeholder="مثال: عطل في الشبكة">
          </div>
          <div style="margin-top:20px; display:flex; gap:10px;">
              <button class="btn" onclick="executeExtension('${proj}', '${date}')">تأكيد التمديد</button>
              <button class="btn" style="background:#666;" onclick="window.closeReportModal()">إلغاء</button>
          </div>
      </div>
  `;
};

/**
 * تنفيذ عملية التمديد وإرسالها للسيرفر
 */
window.executeExtension = async function (proj, date) {
  const supervisor = document.getElementById("selected-supervisor").value;
  const reason = document.getElementById("extension-reason").value;

  if (!reason) {
    alert("يرجى ذكر سبب التمديد أولاً");
    return;
  }

  showLoader("جاري منح الصلاحية...");
  try {
    const res = await callApi("grantExtension", {
      proj: proj,
      supervisor: supervisor,
      reason: reason,
      targetDate: date, // تأكد إن لسطر ده موجود هنا
      userInfo: currentUser,
    });

    alert(res.message);
    document.getElementById("report-details-modal").style.display = "none";
    initDailyApprovalsPage(); // تحديث الصفحة
  } catch (err) {
    alert("خطأ: " + err.message);
  } finally {
    hideLoader();
  }
};
// جلب وعرض التنبيهات للتقارير ال رفوضة
// جلب وعرض التنبيهات للتقارير المرفوضة (نخة متوافقة تماماً مع الموبايل)
async function loadRejectedReportsAlert() {
  const section = document.getElementById("DailyHseReport");
  let alertDiv = document.getElementById("rejected-alerts");

  // إنشاء صندوق التنبيهات لو مش موجود
  if (!alertDiv) {
    alertDiv = document.createElement("div");
    alertDiv.id = "rejected-alerts";
    // نضعه قبn الفورم مباشرة
    const form = document.getElementById("daily-report-form");
    section.insertBefore(alertDiv, form);
  }
  alertDiv.innerHTML = ""; // مسح القديم

  try {
    const res = await callApi("getMyRejectedReports", {
      userInfo: currentUser,
    });

    if (res.status === "success" && res.rejected.length > 0) {
      let html = `
            <div style="background: #fff5f5; color: #721c24; border: 2px solid #f5c6cb; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">

                <h4 style="margin: 0 0 15px 0; color: #c8102e; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; line-height: 1.4;">
                    <i class="fas fa-exclamation-triangle fa-lg"></i> 
                    <span>تقارير مرفوضة (تحتاج إعادة تسجيل)</span>
                </h4>

                <ul style="padding: 0; margin: 0; list-style: none; display: flex; flex-direction: column; gap: 15px;">`;

      res.rejected.forEach((r) => {
        html += `
                <li style="background: #ffffff; border: 1px solid #f5c6cb; border-radius: 6px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">

                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; font-size: 0.9rem;">
                        <span style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd; flex-grow: 1;">
                            <i class="fas fa-project-diagram" style="color: #c8102e;"></i> <strong>المشروع:</strong> ${r.projectName}
                        </span>
                        <span style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd; flex-grow: 1;">
                            <i class="far fa-calendar-alt" style="color: #c8102e;"></i> <strong>التاريخ:</strong> ${r.date}
                        </span>
                    </div>

                    <div style="background: #fdf5f6; border-right: 4px solid #c8102e; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 0.95rem;">
                        <strong style="color: #c8102e;"><i class="fas fa-comment-dots"></i> سبب الرفض/الملاحظات:</strong> 
                        <p style="margin: 5px 0 0 0; color: #333; line-height: 1.5; word-break: break-word;">${r.rejectionNote}</p>
                    </div>

                    <button type="button" class="btn btn-danger" 
                            style="width: 100%; white-space: normal; padding: 12px 10px; font-size: 0.95rem; line-height: 1.4; display: flex; align-items: center; justify-content: center; gap: 8px;" 
                            onclick="deleteRejectedReportFront('${r.logId}')">
                        <i class="fas fa-trash-alt fa-lg"></i>
                        <span>مسح التقرير</span>
                    </button>

                </li>`;
      });

      html += `</ul></div>`;
      alertDiv.innerHTML = html;
    }
  } catch (e) {
    console.error("Failed to load rejected reports", e);
  }
}

// دالة مسح التقرير المرفوض
window.deleteRejectedReportFront = async function (logId) {
  if (
    confirm(
      "هل أنت متأكد من مسح التقرير المرفوض لتبدأ في تسجيله من جديد؟\n(يجب عليك إعادة ملء الفورم بنفس التاريخ)",
    )
  ) {
    showLoader("جاري المسح...");
    try {
      const res = await callApi("deleteRejectedReport", {
        logId: logId,
        userInfo: currentUser,
      });
      alert(res.message);
      loadRejectedReportsAlert(); // تحديث التنبيهات (ستختفي الرسالة إذا لم يتبق تقارير)
    } catch (e) {
      alert(e.message);
    } finally {
      hideLoader();
    }
  }
};
// =================================================================
// --- وحدة سجل التقارير اليومية المعتمدة (Daily Reports Archive) - GLOBAL ---
// =================================================================

// متغير عالمي لتخزين التقارير المجلوبة وعرضها في الطباعة
window.loadedFinalReports = [];

window.initMonitorDailyReportsPage = async function () {
  const monDrProject = document.getElementById("mon-dr-project");
  const monDrResults = document.getElementById("mon-dr-results");
  const monDrBtn = document.getElementById("mon-dr-btn");

  // ربط الزرار بدالة البحث
  if (monDrBtn) {
    monDrBtn.onclick = window.searchFinalDailyReports;

    // --- إضافة زر التقرير المجمع برمجياً تحت زر البحث ---
    if (!document.getElementById("mon-dr-consolidated-btn")) {
      const consBtn = document.createElement("button");
      consBtn.id = "mon-dr-consolidated-btn";
      consBtn.type = "button";
      consBtn.className = "btn";
      consBtn.style.cssText =
        "width: 100%; margin-top: 10px; background-color: #ff9800; color: white;";
      consBtn.innerHTML =
        '<i class="fas fa-chart-pie"></i> استخراج تقرير مُجمّع';
      consBtn.onclick = window.generateConsolidatedDailyReport;
      monDrBtn.parentNode.insertBefore(consBtn, monDrBtn.nextSibling);
    }
  }

  // تعبئة المشاريع من السيرفر
  if (monDrProject && monDrProject.options.length <= 1) {
    monDrProject.innerHTML =
      '<option value="ALL_ACCESSIBLE">جاري التحميل...</option>';
    try {
      const r = await callApi("getInventoryInitData", {
        userInfo: currentUser,
      });
      if (r.status === "success") {
        monDrProject.innerHTML =
          '<option value="ALL_ACCESSIBLE">كل المشاريع المتاحة</option>';
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? r.locations
            : r.locations.filter((p) => userProj.includes(p));
        acc.forEach((p) => monDrProject.add(new Option(p, p)));
      }
    } catch (e) {
      console.error("Error loading projects for archive:", e);
      monDrProject.innerHTML =
        '<option value="ALL_ACCESSIBLE">خطأ في التحميل</option>';
    }
  }

  // تصفير شاشة النتائج
  if (monDrResults && monDrResults.innerHTML.trim() === "") {
    monDrResults.innerHTML =
      '<p style="text-align:center; padding:20px; color:#666;">حدد معايير البحث واضغط عرض السجلات...</p>';
  }
};

window.searchFinalDailyReports = async function () {
  const monDrProject = document.getElementById("mon-dr-project");
  const monDrFrom = document.getElementById("mon-dr-from");
  const monDrTo = document.getElementById("mon-dr-to");
  const monDrResults = document.getElementById("mon-dr-results");

  if (!monDrResults) return;
  monDrResults.innerHTML =
    '<div class="loader-small">جاري البحث وجمع البيانات...</div>';

  const filters = {
    project: monDrProject ? monDrProject.value : "ALL_ACCESSIBLE",
    fromDate: monDrFrom ? monDrFrom.value : "",
    toDate: monDrTo ? monDrTo.value : "",
  };

  try {
    // نستخدم المتغيرات بشكل مباشر بدون window.
    const res = await callApi("getFinalDailyReports", {
      filters,
      userInfo: currentUser,
    });
    if (res.status === "success") {
      window.loadedFinalReports = res.reports;
      window.renderFinalDailyReportsTable(res.reports);
    } else {
      monDrResults.innerHTML = `<p class="error-message">${res.message}</p>`;
    }
  } catch (e) {
    monDrResults.innerHTML = `<p class="error-message">خطأ في الاتصال: ${e.message}</p>`;
  }
};

window.renderFinalDailyReportsTable = function (reports) {
  const monDrResults = document.getElementById("mon-dr-results");
  if (!monDrResults) return;

  if (!reports || reports.length === 0) {
    monDrResults.innerHTML =
      '<p style="text-align:center; padding:20px; color:#c8102e; font-weight:bold;">لا توجد تقارير معتمدة لهذه المعايير.</p>';
    return;
  }

  let html = `
    <div class="results-table-container" style="overflow-x: auto;">
        <table class="results-table" style="font-size:0.9rem; min-width: 600px;">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>المشروع</th>
                    <th>المشرف</th>
                    <th style="text-align:center;">إجمالي العمالة</th>
                    <th style="text-align:center;">إجمالي الساعات</th>
                    <th style="text-align:center;">عرض وطباعة (PDF)</th>
                </tr>
            </thead>
            <tbody>`;

  reports.forEach((rep) => {
    let totalManpower = 0;
    let totalHours = 0;

    if (rep.isHoliday) {
      totalManpower = "-";
      totalHours = "-";
    } else {
      rep.entities.forEach((ent) => {
        totalManpower += parseFloat(ent.manpower || 0);
        totalHours += parseFloat(ent.hours || 0);
      });
    }

    html += `
            <tr>
                <td style="font-weight:bold; white-space:nowrap;">${rep.date}</td>
                <td>${rep.projectName}</td>
                <td>${rep.supervisor}</td>
                <td style="text-align:center; font-weight:bold;">${totalManpower}</td>
                <td style="text-align:center; color:#0056b3;">${totalHours}</td>
                <td style="text-align:center;">
                    ${
                      rep.isHoliday
                        ? `<span class="badge bg-warning" style="color:#856404; background:#fff3cd; border:1px solid #ffeeba;">إجازة / عطلة</span>`
                        : `<button class="btn-small btn-secondary" style="background:#28a745; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="window.printDailyReportPDF('${rep.logId}')">
                            <i class="fas fa-file-pdf"></i> استخراج التقرير
                         </button>`
                    }
                </td>
            </tr>`;
  });

  html += `</tbody></table></div>`;
  monDrResults.innerHTML = html;
};

// =================================================================
// دالة توليد الـ PDF الاحترافي للتقرير اليومي (مفصّل ومصمم بعناية - داخل نافذة منبثقة)
// =================================================================
window.printDailyReportPDF = function (logId) {
  const report = window.loadedFinalReports.find((r) => r.logId === logId);
  if (!report) {
    alert("لم يتم العثور على التقرير المطلوب للطباعة.");
    return;
  }

  const g = report.globalStats;

  let entitiesHtml = "";

  // كائن لجمع كل الإجماليات
  let totals = {
    manpower: 0,
    hours: 0,
    train: 0,
    induct: 0,
    ua: 0,
    uc: 0,
    env: 0,
    pos: 0,
    fatal: 0,
    lti: 0,
    mtc: 0,
    fac: 0,
    nm: 0,
    pd: 0,
    envInc: 0,
  };

  report.entities.forEach((ent) => {
    // جمع الأرقام
    totals.manpower += parseFloat(ent.manpower || 0);
    totals.hours += parseFloat(ent.hours || 0);
    totals.train += parseFloat(ent.train || 0);
    totals.induct += parseFloat(ent.induct || 0);
    totals.ua += parseFloat(ent.ua || 0);
    totals.uc += parseFloat(ent.uc || 0);
    totals.env += parseFloat(ent.env || 0);
    totals.pos += parseFloat(ent.pos || 0);
    totals.fatal += parseFloat(ent.fatal || 0);
    totals.lti += parseFloat(ent.lti || 0);
    totals.mtc += parseFloat(ent.mtc || 0);
    totals.fac += parseFloat(ent.fac || 0);
    totals.nm += parseFloat(ent.nm || 0);
    totals.pd += parseFloat(ent.pd || 0);
    totals.envInc += parseFloat(ent.envInc || 0);

    let bg = "#fff";
    if (ent.category === "Sewedy") bg = "#f0f8ff";
    if (ent.category === "Security") bg = "#fff8e1";

    entitiesHtml += `
        <tr style="background-color: ${bg}; text-align:center;">
            <td style="text-align:right; font-weight:bold;">${ent.name}</td>
            <td style="font-weight:bold;">${ent.manpower}</td>
            <td>${ent.hours}</td>
            <td style="color:#17a2b8; font-weight:bold;">${ent.train}</td>
            <td style="color:#17a2b8; font-weight:bold;">${ent.induct}</td>
            <td>${ent.ua}</td>
            <td>${ent.uc}</td>
            <td>${ent.env}</td>
            <td style="color:green; font-weight:bold;">${ent.pos}</td>
            <td style="background:#fff5f5; color:red; font-weight:bold;">${ent.fatal}</td>
            <td style="background:#fff5f5; color:red;">${ent.lti}</td>
            <td style="background:#fff5f5; color:red;">${ent.mtc}</td>
            <td style="background:#fff5f5; color:red;">${ent.fac}</td>
            <td style="background:#fff5f5; color:red;">${ent.nm}</td>
            <td style="background:#fff5f5; color:red;">${ent.pd}</td>
            <td style="background:#fff5f5; color:red;">${ent.envInc}</td>
        </tr>`;
  });

  const printerUser = window.currentUser
    ? window.currentUser.username
    : "النظام";

  // قالب الـ HTML للتقرير
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>Daily HSE Report - ${report.projectName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 landscape; margin: 1cm; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; color: #2C2A29; line-height: 1.4; font-size: 12px; }

            .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #C8102E; padding-bottom: 10px; margin-bottom: 15px; }
            .header-info h1 { color: #C8102E; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
            .header-info p { margin: 3px 0 0 0; font-size: 13px; color: #555; font-weight: 600; }
            .logo-container img { height: 60px; }

            .info-bar { background-color: #f8f9fa; padding: 10px 15px; border-radius: 6px; border-right: 5px solid #007bff; margin-bottom: 15px; display: flex; justify-content: space-between; border: 1px solid #eee; }
            .info-bar div { display: flex; flex-direction: column; }
            .info-bar span { color: #666; font-size: 11px; }
            .info-bar strong { font-size: 14px; color: #333; }

            .section-title { background: #333; color: #fff; padding: 5px 10px; font-size: 14px; border-radius: 4px; margin: 15px 0 10px 0; -webkit-print-color-adjust: exact; display:inline-block; }

            .stats-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin-bottom: 20px; }
            .stat-box { border: 1px solid #ddd; padding: 8px 5px; text-align: center; border-radius: 4px; background: #fff; }
            .stat-box .title { font-size: 10px; color: #666; font-weight: bold; margin-bottom: 5px; }
            .stat-box .val { font-size: 18px; font-weight: 800; color: #C8102E; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            th { background-color: #e9ecef !important; color: #333; font-weight: bold; border: 1px solid #ccc; padding: 8px 5px; text-align: center; -webkit-print-color-adjust: exact; }
            td { border: 1px solid #ddd; padding: 6px 5px; text-align: center; }
            .table-totals { background-color: #2C2A29 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; }
            .table-totals td { border-color: #555; }

            .pdf-footer { position: fixed; bottom: 0; left: 0; width: 100%; font-size: 10px; color: #888; border-top: 1px dashed #ccc; padding-top: 5px; display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="pdf-header">
            <div class="header-info">
                <h1>HSE Daily Report</h1>
                <p>التقرير اليومى للسلامة والصحة المهنية والبيئة</p>
            </div>
            <div class="logo-container"><img src="../turnkey.png"></div>
        </div>

        <div class="info-bar">
            <div><span>المشروع (Project)</span><strong>${report.projectName}</strong></div>
            <div><span>التاريخ (Date)</span><strong>${report.date}</strong></div>
            <div><span>مشرف السلامة (HSE Supervisor)</span><strong>${report.supervisor}</strong></div>
            <div><span>ساعات الوردية (Shift)</span><strong>${report.shift} ساعات</strong></div>
        </div>

        <div class="section-title">المؤشرات الاستباقية (Proactive Indicators)</div>
        <div class="stats-grid">
            <div class="stat-box"><div class="title">PTW</div><div class="val" style="color:#1976d2">${g.ptw}</div></div>
            <div class="stat-box"><div class="title">Hazards</div><div class="val">${g.hazards}</div></div>
            <div class="stat-box"><div class="title">Observations</div><div class="val" style="color:#f57c00">${g.obs}</div></div>
            <div class="stat-box"><div class="title">Equip. (Int)</div><div class="val" style="color:#388e3c">${g.equipInspectionInt || g.equipInt || 0}</div></div>
            <div class="stat-box"><div class="title">Equip. (Ext)</div><div class="val" style="color:#388e3c">${g.equipInspectionExt || g.equipExt || 0}</div></div>
            <div class="stat-box"><div class="title">Internal Audit</div><div class="val" style="color:#555">${g.intAudit}</div></div>
            <div class="stat-box"><div class="title">External Audit</div><div class="val" style="color:#555">${g.extAudit}</div></div>
            <div class="stat-box"><div class="title">Accomp. Insp.</div><div class="val" style="color:#009688">${g.accInsp}</div></div>
            <div class="stat-box"><div class="title">Weekly Walk</div><div class="val" style="color:#673ab7">${g.weekly}</div></div>
            <div class="stat-box"><div class="title">Monthly Tour</div><div class="val" style="color:#673ab7">${g.monthly}</div></div>
            <div class="stat-box"><div class="title">Security</div><div class="val" style="color:#000">${g.security}</div></div>
            <div class="stat-box"><div class="title">Drills</div><div class="val" style="color:#e91e63">${g.drill || 0}</div></div>
            <div class="stat-box"><div class="title">Campaigns</div><div class="val" style="color:#e91e63">${g.campaigns || 0}</div></div>
        </div>

        <div class="section-title">تفاصيل العمالة والإصابات والملاحظات (Entities Breakdown)</div>
        <table>
            <thead>
                <tr>
                    <th rowspan="2" style="width:20%">الجهة (Entity)</th>
                    <th rowspan="2">Manpower</th>
                    <th rowspan="2">Hours</th>
                    <th colspan="2" style="background:#d1ecf1 !important;">Training</th>
                    <th colspan="4">Observations</th>
                    <th colspan="7" style="background:#f8d7da !important; color:#721c24;">Incidents</th>
                </tr>
                <tr>
                    <th style="background:#d1ecf1 !important;">Reg</th>
                    <th style="background:#d1ecf1 !important;">Ind</th>
                    <th>UA</th><th>UC</th><th>Env</th><th>Pos</th>
                    <th style="background:#f8d7da !important; color:#721c24;">Fat</th>
                    <th style="background:#f8d7da !important; color:#721c24;">LTI</th>
                    <th style="background:#f8d7da !important; color:#721c24;">MTC</th>
                    <th style="background:#f8d7da !important; color:#721c24;">FAC</th>
                    <th style="background:#f8d7da !important; color:#721c24;">NM</th>
                    <th style="background:#f8d7da !important; color:#721c24;">PD</th>
                    <th style="background:#f8d7da !important; color:#721c24;">Env.Inc</th>
                </tr>
            </thead>
            <tbody>
                ${entitiesHtml}
                <tr class="table-totals">
                    <td style="text-align:right;">الإجمالي الكلي (Grand Total)</td>
                    <td>${totals.manpower}</td>
                    <td>${totals.hours}</td>
                    <td>${totals.train}</td>
                    <td>${totals.induct}</td>
                    <td>${totals.ua}</td>
                    <td>${totals.uc}</td>
                    <td>${totals.env}</td>
                    <td>${totals.pos}</td>
                    <td style="color:#ff6b6b;">${totals.fatal}</td>
                    <td style="color:#ff6b6b;">${totals.lti}</td>
                    <td style="color:#ff6b6b;">${totals.mtc}</td>
                    <td style="color:#ff6b6b;">${totals.fac}</td>
                    <td style="color:#ff6b6b;">${totals.nm}</td>
                    <td style="color:#ff6b6b;">${totals.pd}</td>
                    <td style="color:#ff6b6b;">${totals.envInc}</td>
                </tr>
            </tbody>
        </table>

        <div class="pdf-footer">
            <span>HSE Digitalization System - Turnkey Projects</span>
            <span>مستخرج بواسطة: ${printerUser}</span>
            <span>تاريخ الطباعة: ${new Date().toLocaleString("ar-EG")}</span>
        </div>

        <script>
            // تفعيل الطباعة التلقائية بمجرد فتح النافذة
            window.onload = function() { setTimeout(() => { window.print(); }, 500); };
        <\/script>
    </body>
    </html>`;

  // -------------------------------------------------------------
  // منطق النافذة المنبثقة (Modal/Iframe) لعرض التقرير
  // -------------------------------------------------------------

  // 1. البحث عن النافذة المنبثقة، ولو مش موجودة نصنعها
  let printModal = document.getElementById("dr-pdf-modal");
  if (!printModal) {
    printModal = document.createElement("div");
    printModal.id = "dr-pdf-modal";
    printModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 9999;
            display: none; align-items: center; justify-content: center;
            flex-direction: column; backdrop-filter: blur(4px);
        `;

    printModal.innerHTML = `
            <div style="width: 95%; max-width: 1200px; background: #fff; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; height: 90vh; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">

                <div style="background: #C8102E; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-family: 'Cairo', sans-serif;"><i class="fas fa-file-pdf"></i> معاينة التقرير للطباعة</h3>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button onclick="document.getElementById('dr-pdf-iframe').contentWindow.print()" style="background: #fff; color: #C8102E; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Cairo', sans-serif; transition: 0.2s;">
                            <i class="fas fa-print"></i> طباعة الآن
                        </button>
                        <button onclick="document.getElementById('dr-pdf-modal').style.display='none'" style="background: transparent; border: none; color: white; font-size: 1.8rem; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                </div>

                <iframe id="dr-pdf-iframe" style="width: 100%; height: 100%; border: none; flex-grow: 1; background: #fdfdfd;"></iframe>
            </div>
        `;
    document.body.appendChild(printModal);
  }

  // 2. إظهار اناذة المنبثقة
  printModal.style.display = "flex";

  // 3. كتابة كود الـ HTML بداخل الـ iframe
  const iframe = document.getElementById("dr-pdf-iframe");
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlTemplate);
  doc.close();
};
// =================================================================
// دالة إنشاء التقرير اليومي المُجمّع لكل المشاريع (Consolidated Report)
// (تم تعديل حساب العمالة: حساب Max/Avg لكل مشروع على حدة ثم   النواتج)
// =================================================================
window.generateConsolidatedDailyReport = function () {
  const reports = window.loadedFinalReports;

  if (!reports || reports.length === 0) {
    alert(
      "الرجاء الضغط على 'عرض السجلات' أولاً لجلب البيانات للفترة المطلوبة.",
    );
    return;
  }

  // 1. كائنات لتجميع البيانات
  let aggGlobal = {
    security: 0,
    ptw: 0,
    hazards: 0,
    obs: 0,
    equipInt: 0,
    equipExt: 0, // تم التعديل هنا
    intAudit: 0,
    extAudit: 0,
    accInsp: 0,
    weekly: 0,
    monthly: 0,
    drill: 0,
    campaigns: 0,
  };

  let aggEntities = {
    Sewedy: {
      name: "إجمالي السويدي",
      manpower: 0,
      hours: 0,
      train: 0,
      induct: 0,
      ua: 0,
      uc: 0,
      env: 0,
      pos: 0,
      fatal: 0,
      lti: 0,
      mtc: 0,
      fac: 0,
      nm: 0,
      pd: 0,
      envInc: 0,
      bg: "#f0f8ff",
    },
    Contractors: {
      name: "إجمالي مقاولي الباطن",
      manpower: 0,
      hours: 0,
      train: 0,
      induct: 0,
      ua: 0,
      uc: 0,
      env: 0,
      pos: 0,
      fatal: 0,
      lti: 0,
      mtc: 0,
      fac: 0,
      nm: 0,
      pd: 0,
      envInc: 0,
      bg: "#fff",
    },
    Security: {
      name: "إجمالي طاقم الأمن",
      manpower: 0,
      hours: 0,
      train: 0,
      induct: 0,
      ua: 0,
      uc: 0,
      env: 0,
      pos: 0,
      fatal: 0,
      lti: 0,
      mtc: 0,
      fac: 0,
      nm: 0,
      pd: 0,
      envInc: 0,
      bg: "#fff8e1",
    },
  };

  let totalProjectsSet = new Set();

  // (*** الجديد ***): كائن لتخزين إحصائيات العمالة لكل مشروع بشكل منفصل
  let projectManpowerStats = {};

  // 2. عملية التجميع الدقيقة
  reports.forEach((r) => {
    if (r.isHoliday) return; // تخطي أيام الإجازات من الحسابات

    const proj = r.projectName;
    totalProjectsSet.add(proj);

    // تجهيز ذاكرة المشروع لو مش موجودة
    if (!projectManpowerStats[proj]) {
      projectManpowerStats[proj] = {
        daysCount: 0,
        maxSewedy: 0,
        sumContractors: 0,
        sumSecurity: 0,
      };
    }

    projectManpowerStats[proj].daysCount++;

    // تجميع المؤشرات (تراكمي عادي)
    aggGlobal.ptw += parseFloat(r.globalStats.ptw || 0);
    aggGlobal.hazards += parseFloat(r.globalStats.hazards || 0);
    aggGlobal.obs += parseFloat(r.globalStats.obs || 0);
    aggGlobal.equipInt += parseFloat(
      r.globalStats.equipInspectionInt || r.globalStats.equipInt || 0,
    ); // تعديل
    aggGlobal.equipExt += parseFloat(
      r.globalStats.equipInspectionExt || r.globalStats.equipExt || 0,
    ); // تعديل
    aggGlobal.intAudit += parseFloat(r.globalStats.intAudit || 0);
    aggGlobal.extAudit += parseFloat(r.globalStats.extAudit || 0);
    aggGlobal.accInsp += parseFloat(r.globalStats.accInsp || 0);
    aggGlobal.weekly += parseFloat(r.globalStats.weekly || 0);
    aggGlobal.monthly += parseFloat(r.globalStats.monthly || 0);
    aggGlobal.security += parseFloat(r.globalStats.security || 0);
    aggGlobal.drill += parseFloat(r.globalStats.drill || 0);
    aggGlobal.campaigns += parseFloat(r.globalStats.campaigns || 0);

    let dailySewedy = 0;
    let dailyContractors = 0;
    let dailySecurity = 0;

    // تجميع الساعات والحوادث (تراكمي عادي) وحساب عمالة اليوم
    r.entities.forEach((ent) => {
      let target = aggEntities.Contractors;
      let val = parseFloat(ent.manpower || 0);

      if (ent.category === "Sewedy") {
        target = aggEntities.Sewedy;
        dailySewedy += val;
      } else if (ent.category === "Security") {
        target = aggEntities.Security;
        dailySecurity += val;
      } else {
        dailyContractors += val;
      }

      // تجميع الساعات وباقي الأرقام كمجموع تراكم
      target.hours += parseFloat(ent.hours || 0);
      target.train += parseFloat(ent.train || 0);
      target.induct += parseFloat(ent.induct || 0);
      target.ua += parseFloat(ent.ua || 0);
      target.uc += parseFloat(ent.uc || 0);
      target.env += parseFloat(ent.env || 0);
      target.pos += parseFloat(ent.pos || 0);
      target.fatal += parseFloat(ent.fatal || 0);
      target.lti += parseFloat(ent.lti || 0);
      target.mtc += parseFloat(ent.mtc || 0);
      target.fac += parseFloat(ent.fac || 0);
      target.nm += parseFloat(ent.nm || 0);
      target.pd += parseFloat(ent.pd || 0);
      target.envInc += parseFloat(ent.envInc || 0);
    });

    // (*** الجديد ***): تحديث أرقام المشروع الواحد
    if (dailySewedy > projectManpowerStats[proj].maxSewedy) {
      projectManpowerStats[proj].maxSewedy = dailySewedy;
    }
    projectManpowerStats[proj].sumContractors += dailyContractors;
    projectManpowerStats[proj].sumSecurity += dailySecurity;
  });

  // 3. (*** الجديد ***): حساب العمالة النهائية بتجميع نتائج المشاريع
  let finalSewedyManpower = 0;
  let finalContractorsManpower = 0;
  let finalSecurityManpower = 0;

  Object.values(projectManpowerStats).forEach((pStats) => {
    // جمع (Max) السويدي لكل المشاريع
    finalSewedyManpower += pStats.maxSewedy;

    // جمع (Average) المقاولين والأمن لكل المشاريع
    if (pStats.daysCount > 0) {
      finalContractorsManpower += Math.round(
        pStats.sumContractors / pStats.daysCount,
      );
      finalSecurityManpower += Math.round(
        pStats.sumSecurity / pStats.daysCount,
      );
    }
  });

  aggEntities.Sewedy.manpower = finalSewedyManpower;
  aggEntities.Contractors.manpower = finalContractorsManpower;
  aggEntities.Security.manpower = finalSecurityManpower;

  // 4. بناء صفوف الجدول والـ Grand Total
  let entitiesHtml = "";
  let grandTotals = {
    manpower: 0,
    hours: 0,
    train: 0,
    induct: 0,
    ua: 0,
    uc: 0,
    env: 0,
    pos: 0,
    fatal: 0,
    lti: 0,
    mtc: 0,
    fac: 0,
    nm: 0,
    pd: 0,
    envInc: 0,
  };

  Object.values(aggEntities).forEach((ent) => {
    if (ent.manpower === 0 && ent.hours === 0) return;

    Object.keys(grandTotals).forEach((key) => (grandTotals[key] += ent[key]));

    // توضيح طريقة الحساب جنب الرقم
    let calcNote = ent.name.includes("السويدي")
      ? '<span style="font-size:8px; color:#888;">(مجموع Max)</span>'
      : '<span style="font-size:8px; color:#888;">(مجموع Avg)</span>';

    entitiesHtml += `
        <tr style="background-color: ${ent.bg}; text-align:center;">
            <td style="text-align:right; font-weight:bold;">${ent.name}</td>
            <td style="font-weight:bold; font-size:1.1em;">${ent.manpower} ${calcNote}</td>
            <td>${ent.hours}</td>
            <td style="color:#17a2b8; font-weight:bold;">${ent.train}</td>
            <td style="color:#17a2b8; font-weight:bold;">${ent.induct}</td>
            <td>${ent.ua}</td>
            <td>${ent.uc}</td>
            <td>${ent.env}</td>
            <td style="color:green; font-weight:bold;">${ent.pos}</td>
            <td style="background:#fff5f5; color:red; font-weight:bold;">${ent.fatal}</td>
            <td style="background:#fff5f5; color:red;">${ent.lti}</td>
            <td style="background:#fff5f5; color:red;">${ent.mtc}</td>
            <td style="background:#fff5f5; color:red;">${ent.fac}</td>
            <td style="background:#fff5f5; color:red;">${ent.nm}</td>
            <td style="background:#fff5f5; color:red;">${ent.pd}</td>
            <td style="background:#fff5f5; color:red;">${ent.envInc}</td>
        </tr>`;
  });

  // 5. إعداد الطباعة والقالب
  const projSelect = document.getElementById("mon-dr-project");
  const titleProject =
    projSelect.value === "ALL_ACCESSIBLE"
      ? `مُجمّع لـ (${totalProjectsSet.size}) مشار
يع`
      : projSelect.value;

  let dateRange = "الفترة المحددة";
  const dFrom = document.getElementById("mon-dr-from").value;
  const dTo = document.getElementById("mon-dr-to").value;
  if (dFrom && dTo) dateRange = `من ${dFrom} إلى ${dTo}`;
  else if (dFrom) dateRange = `بدءاً من ${dFrom}`;
  else if (dTo) dateRange = `حتى ${dTo}`;

  const printerUser = window.currentUser
    ? window.currentUser.username
    : "النظام";

  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>Consolidated HSE Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 landscape; margin: 1cm; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; color: #2C2A29; line-height: 1.4; font-size: 12px; }
            .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #ff9800; padding-bottom: 10px; margin-bottom: 15px; }
            .header-info h1 { color: #ff9800; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
            .header-info p { margin: 3px 0 0 0; font-size: 13px; color: #555; font-weight: 600; }
            .logo-container img { height: 60px; }
            .info-bar { background-color: #fff9f0; padding: 10px 15px; border-radius: 6px; border-right: 5px solid #ff9800; margin-bottom: 15px; display: flex; justify-content: space-between; border: 1px solid #ffeeba; }
            .info-bar div { display: flex; flex-direction: column; }
            .info-bar span { color: #666; font-size: 11px; }
            .info-bar strong { font-size: 14px; color: #333; }
            .section-title { background: #333; color: #fff; padding: 5px 10px; font-size: 14px; border-radius: 4px; margin: 15px 0 10px 0; -webkit-print-color-adjust: exact; display:inline-block; }
            .stats-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 5px; margin-bottom: 20px; }
            .stat-box { border: 1px solid #ddd; padding: 8px 5px; text-align: center; border-radius: 4px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);}
            .stat-box .title { font-size: 10px; color: #666; font-weight: bold; margin-bottom: 5px; }
            .stat-box .val { font-size: 18px; font-weight: 800; color: #ff9800; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            th { background-color: #e9ecef !important; color: #333; font-weight: bold; border: 1px solid #ccc; padding: 8px 5px; text-align: center; -webkit-print-color-adjust: exact; }
            td { border: 1px solid #ddd; padding: 6px 5px; text-align: center; }
            .table-totals { background-color: #2C2A29 !important; color: white !important; font-weight: bold; -webkit-print-color-adjust: exact; }
            .table-totals td { border-color: #555; }
            .pdf-footer { position: fixed; bottom: 0; left: 0; width: 100%; font-size: 10px; color: #888; border-top: 1px dashed #ccc; padding-top: 5px; display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="pdf-header">
            <div class="header-info">
                <h1 style="color:#ff9800;">CONSOLIDATED HSE REPORT</h1>
                <p>التقرير التجميعي للسلامة والصحة المهنية والبيئة</p>
            </div>
            <div class="logo-container"><img src="../turnkey.png"></div>
        </div>

        <div class="info-bar">
            <div><span>نطاق المشاريع</span><strong>${titleProject}</strong></div>
            <div><span>الفترة الزمنية</span><strong>${dateRange}</strong></div>
            <div><span>إجمالي التقارير المدمجة</span><strong>${reports.length} تقارير</strong></div>
        </div>

        <div class="section-title">إجمالي المؤشرات الاستباقية خلال الفترة (Proactive Indicators)</div>
        <div class="stats-grid">
            <div class="stat-box"><div class="title">PTW</div><div class="val" style="color:#1976d2">${aggGlobal.ptw}</div></div>
            <div class="stat-box"><div class="title">Hazards</div><div class="val">${aggGlobal.hazards}</div></div>
            <div class="stat-box"><div class="title">Observations</div><div class="val" style="color:#f57c00">${aggGlobal.obs}</div></div>
            <div class="stat-box"><div class="title">Equip. (Int)</div><div class="val" style="color:#388e3c">${aggGlobal.equipInt}</div></div>
            <div class="stat-box"><div class="title">Equip. (Ext)</div><div class="val" style="color:#388e3c">${aggGlobal.equipExt}</div></div>
            <div class="stat-box"><div class="title">Internal Audit</div><div class="val" style="color:#555">${aggGlobal.intAudit}</div></div>
            <div class="stat-box"><div class="title">External Audit</div><div class="val" style="color:#555">${aggGlobal.extAudit}</div></div>
            <div class="stat-box"><div class="title">Accomp. Insp.</div><div class="val" style="color:#009688">${aggGlobal.accInsp}</div></div>
            <div class="stat-box"><div class="title">Weekly Walk</div><div class="val" style="color:#673ab7">${aggGlobal.weekly}</div></div>
            <div class="stat-box"><div class="title">Monthly Tour</div><div class="val" style="color:#673ab7">${aggGlobal.monthly}</div></div>
            <div class="stat-box"><div class="title">Security</div><div class="val" style="color:#000">${aggGlobal.security}</div></div>
            <div class="stat-box"><div class="title">Drills</div><div class="val" style="color:#e91e63">${aggGlobal.drill || 0}</div></div>
            <div class="stat-box"><div class="title">Campaigns</div><div class="val" style="color:#e91e63">${aggGlobal.campaigns || 0}</div></div>
        </div>

        <div class="section-title">إجمالي العمالة والإصابات والملاحظات خلال الفترة</div>
        <table>
            <thead>
                <tr>
                    <th rowspan="2" style="width:20%">الجهة (Category)</th>
                    <th rowspan="2">Total Manpower</th>
                    <th rowspan="2">Total Hours</th>
                    <th colspan="2" style="background:#d1ecf1 !important;">Training</th>
                    <th colspan="4">Observations</th>
                    <th colspan="7" style="background:#f8d7da !important; color:#721c24;">Incidents</th>
                </tr>
                <tr>
                    <th style="background:#d1ecf1 !important;">Reg</th>
                    <th style="background:#d1ecf1 !important;">Ind</th>
                    <th>UA</th><th>UC</th><th>Env</th><th>Pos</th>
                    <th style="background:#f8d7da !important; color:#721c24;">Fat</th>
                    <th style="background:#f8d7da !important; color:#721c24;">LTI</th>
                    <th style="background:#f8d7da !important; color:#721c24;">MTC</th>
                    <th style="background:#f8d7da !important; color:#721c24;">FAC</th>
                    <th style="background:#f8d7da !important; color:#721c24;">NM</th>
                    <th style="background:#f8d7da !important; color:#721c24;">PD</th>
                    <th style="background:#f8d7da !important; color:#721c24;">Env.Inc</th>
                </tr>
            </thead>
            <tbody>
                ${entitiesHtml}
                <tr class="table-totals">
                    <td style="text-align:right;">الإجمالي الكلي (Grand Total)</td>
                    <td>${grandTotals.manpower}</td>
                    <td>${grandTotals.hours}</td>
                    <td>${grandTotals.train}</td>
                    <td>${grandTotals.induct}</td>
                    <td>${grandTotals.ua}</td>
                    <td>${grandTotals.uc}</td>
                    <td>${grandTotals.env}</td>
                    <td>${grandTotals.pos}</td>
                    <td style="color:#ff6b6b;">${grandTotals.fatal}</td>
                    <td style="color:#ff6b6b;">${grandTotals.lti}</td>
                    <td style="color:#ff6b6b;">${grandTotals.mtc}</td>
                    <td style="color:#ff6b6b;">${grandTotals.fac}</td>
                    <td style="color:#ff6b6b;">${grandTotals.nm}</td>
                    <td style="color:#ff6b6b;">${grandTotals.pd}</td>
                    <td style="color:#ff6b6b;">${grandTotals.envInc}</td>
                </tr>
            </tbody>
        </table>

        <div class="pdf-footer">
            <span>HSE Digitalization System - Turnkey Projects</span>
            <span>مستخرج بواسطة: ${printerUser}</span>
            <span>تاريخ الطباعة: ${new Date().toLocaleString("ar-EG")}</span>
        </div>

        <script>
            window.onload = function() { setTimeout(() => { window.print(); }, 500); };
        <\/script>
    </body>
    </html>`;

  // 6. عرض في النافذة المنبثقة
  let printModal = document.getElementById("dr-pdf-modal");
  if (!printModal) {
    printModal = document.createElement("div");
    printModal.id = "dr-pdf-modal";
    printModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 9999;
            display: none; align-items: center; justify-content: center;
            flex-direction: column; backdrop-filter: blur(4px);
        `;
    document.body.appendChild(printModal);
  }

  printModal.innerHTML = `
        <div style="width: 95%; max-width: 1200px; background: #fff; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; height: 90vh; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="background: #ff9800; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;" id="dr-pdf-modal-header">
                <h3 style="margin: 0; font-size: 1.2rem; font-family: 'Cairo', sans-serif;"><i class="fas fa-chart-pie"></i> معاينة التقرير المُجمّع</h3>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <button onclick="document.getElementById('dr-pdf-iframe').contentWindow.print()" style="background: #fff; color: #ff9800; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Cairo', sans-serif; transition: 0.2s;" id="dr-pdf-print-btn">
                        <i class="fas fa-print"></i> طباعة الآن
                    </button>
                    <button onclick="document.getElementById('dr-pdf-modal').style.display='none'" style="background: transparent; border: none; color: white; font-size: 1.8rem; cursor: pointer; line-height: 1;">&times;</button>
                </div>
            </div>
            <iframe id="dr-pdf-iframe" style="width: 100%; height: 100%; border: none; flex-grow: 1; background: #fdfdfd;"></iframe>
        </div>
    `;

  printModal.style.display = "flex";
  const iframe = document.getElementById("dr-pdf-iframe");
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlTemplate);
  doc.close();
};

// =================================================================
// دالة طباعة تقرير المخالفات (HSE Violation Report - Formal PDF)
// =================================================================
window.printViolationPDF = async function (vioId) {
  showLoader("جاري تجهيز التقرير للطباعة...");

  try {
    const response = await callApi("getViolationFullDetails", { vioId: vioId });

    if (response.status !== "success") {
      throw new Error(response.message);
    }

    const data = response.data;

    // تجهيز علامات الصح بناءً على مستوى المخالفة (☑ للنشط، ☐ للغير نشط)
    const checkLvl1 = data.level === "Level 1" ? "☑" : "☐";
    const checkLvl2 = data.level === "Level 2" ? "☑" : "☐";
    const checkLvl3 = data.level === "Level 3" ? "☑" : "☐";

    // تجهيز جدول الجزاءات (يظهر فقط إذا كان هناك جزاءات Level 3)
    let penaltyTableHtml = "";
    if (data.level === "Level 3") {
      let rowsHtml = "";
      let unitLabel =
        data.type === "موظف" || data.type === "Employee" ? "يوم" : "جنيه";

      // إذا كان هناك بنود مفصلة من السيرفر
      if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
          let actionText =
            parseFloat(item.appliedValue) > 0
              ? `خصم (${item.appliedValue}) ${unitLabel}`
              : "إجراء إداري";
          rowsHtml += `
                    <tr>
                        <td style="text-align:center; font-weight:bold;">${index + 1}</td>
                        <td style="text-align:center; font-weight:bold; color:#c8102e;">${actionText}</td>
                        <td style="text-align:right; padding-right: 10px;">${item.appliedText}</td>
                    </tr>`;
        });
      } else {
        // بديل في حالة عدم وجود بنود مفصلة (للتقارير القديمة)
        rowsHtml = `
                <tr>
                    <td style="text-align:center; font-weight:bold;">1</td>
                    <td style="text-align:center; font-weight:bold; color:#c8102e;">
                        ${data.totalValue > 0 ? "خصم (" + data.totalValue + ") " + unitLabel : "إجراء إداري"}
                    </td>
                    <td style="text-align:right; padding-right: 10px;">${data.detailsText || "-"}</td>
                </tr>`;
      }

      // تجميع الجدول مع صف الإجمالي
      penaltyTableHtml = `
                <table class="form-table penalty-table" style="margin-top: 15px;">
                    <tr class="header-row">
                        <td style="width: 5%;">#</td>
                        <td style="width: 35%;">The Disciplinary Actions<br>الجزاء الإداري المطبق</td>
                        <td style="width: 60%;">Penalty List Clause<br>بند لائحة الجزاءات المطبق</td>
                    </tr>
                    ${rowsHtml}
                    <tr style="background-color: #f1f1f1;">
                        <td colspan="2" style="text-align:left; font-weight:bold; padding-left: 15px; color:#c8102e; font-size: 14px;">الإجمالي الكلي للخصم (Total Penalty)</td>
                        <td style="text-align:center; font-weight:bold; color:#c8102e; font-size: 15px;">
                            ${data.totalValue > 0 ? data.totalValue + " " + unitLabel : "إجراء إداري فقط"}
                        </td>
                    </tr>
                </table>
            `;
    }

    // بناء قالب الـ HTML المطابق تماماً للملف الرسمي
    const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>HSE Violation Report - ${data.id}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 portrait; margin: 1cm; }
                body { font-family: 'Cairo', sans-serif; margin: 0; padding: 0; color: #000; font-size: 13px; line-height: 1.5; }

                /* Header Styles */
                .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #C8102E; padding-bottom: 15px; margin-bottom: 20px; }
                .logo-container { text-align: left; }
                .logo { height: 75px; }
                .title-container { text-align: right; flex-grow: 1; }
                .title-en { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 0; color: #C8102E; }
                .title-ar { font-size: 20px; font-weight: 800; margin: 5px 0; color: #000; }
                .report-num { font-size: 14px; font-weight: bold; background: #eee; padding: 5px 15px; border-radius: 4px; display: inline-block; border: 1px solid #ccc; margin-top: 5px; }

                /* Form Tables Styles */
                .form-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .form-table td { border: 1px solid #000; padding: 8px 10px; vertical-align: middle; }
                .label-cell-en { font-weight: bold; text-align: left; background-color: #f8f9fa; width: 25%; font-size: 12px; }
                .label-cell-ar { font-weight: bold; text-align: right; background-color: #f8f9fa; width: 25%; font-size: 14px; }
                .value-cell { text-align: center; font-weight: bold; width: 50%; font-size: 14px; color: #C8102E; }

                /* Data Blocks */
                .data-block { border: 1px solid #000; margin-bottom: 15px; }
                .data-block-header { display: flex; justify-content: space-between; background-color: #f8f9fa; border-bottom: 1px solid #000; padding: 5px 10px; font-weight: bold; font-size: 14px; }
                .data-block-content { padding: 15px; min-height: 40px; font-size: 13px; font-weight: 600; white-space: pre-wrap; }

                /* Checkboxes Grid */
                .levels-grid { display: flex; width: 100%; border: 1px solid #000; margin-bottom: 15px; text-align: center; }
                .level-col { flex: 1; border-left: 1px solid #000; padding: 10px; }
                .level-col:last-child { border-left: none; }
                .level-title { font-weight: bold; font-size: 14px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #C8102E; }
                .checkbox-item { font-size: 14px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: 600; }
                .checkbox-item span.box { font-size: 18px; margin-top: -3px; }

                /* Penalty Table */
                .penalty-table th, .penalty-table td { text-align: center; border: 1px solid #000; }
                .header-row td { background-color: #e9ecef; font-weight: bold; text-align: center; font-size: 13px; }

                /* Signatures Section */
                .signatures-title { background: #e9ecef; border: 1px solid #000; padding: 5px; font-weight: bold; text-align: center; font-size: 14px; margin-bottom: 0; border-bottom: none; }
                .signatures-container { display: flex; border: 1px solid #000; border-top: 1px solid #000; }
                .sig-box { flex: 1; border-left: 1px solid #000; padding: 10px; }
                .sig-box:last-child { border-left: none; }
                .sig-header { text-align: center; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; font-size: 13px; }
                .sig-line { display: flex; align-items: center; margin-bottom: 15px; font-size: 13px; }
                .sig-line span { width: 65px; font-weight: bold; }
                .sig-line div { flex-grow: 1; border-bottom: 1px dotted #000; height: 18px; }

                /* Footer */
                .pdf-footer { position: fixed; bottom: 0; left: 0; width: 100%; border-top: 2px solid #C8102E; padding-top: 5px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #555; }

                /* ---------------------------------------------------- */
                /* Smart Page Break Rules (منع قص العناصر بين الصفحات) */
                /* ---------------------------------------------------- */
                .data-block, 
                .levels-grid, 
                .penalty-table, 
                .signatures-title, 
                .signatures-container {
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="title-container">
                    <h1 class="title-en">HSE Violations Report</h1>
                    <h2 class="title-ar">تقرير مخالفة قواعد السلامة والصحة المهنية</h2>
                    <div class="report-num">Report # ${data.id}</div>
                </div>
                <div class="logo-container">
                    <img src="../turnkey.png" alt="Elsewedy Turnkey" class="logo">
                </div>
            </div>

            <table class="form-table">
                <tr>
                    <td class="label-cell-en">Project Name:</td>
                    <td class="value-cell" dir="auto">${data.project}</td>
                    <td class="label-cell-ar">اسم المشروع</td>
                </tr>
                <tr>
                    <td class="label-cell-en">Employee/contractor Name:</td>
                    <td class="value-cell" dir="auto">${data.name}</td>
                    <td class="label-cell-ar">أسم الموظف / المقاول</td>
                </tr>
                <tr>
                    <td class="label-cell-en">Date:</td>
                    <td class="value-cell">${data.date}</td>
                    <td class="label-cell-ar">التاريخ</td>
                </tr>
                <tr>
                    <td class="label-cell-en">Company Name:</td>
                    <td class="value-cell" dir="auto">${data.company}</td>
                    <td class="label-cell-ar">أسم الشركة</td>
                </tr>
            </table>

            <div class="data-block">
                <div class="data-block-header">
                    <span>وصف المخالفة</span>
                    <span dir="ltr">Description of Violation</span>
                </div>
                <div class="data-block-content">${data.desc}</div>
            </div>

            <div class="data-block">
                <div class="data-block-header">
                    <span>ملاحظة مسؤول السلامة</span>
                    <span dir="ltr">HSE Observation</span>
                </div>
                <div class="data-block-content">${data.hseStmt}</div>
            </div>

            <div class="data-block">
                <div class="data-block-header">
                    <span>أقوال الموظف / المقاول</span>
                    <span dir="ltr">Employee/contractor Statement</span>
                </div>
                <div class="data-block-content">${data.violatorStmt}</div>
            </div>

            <div class="data-block">
                <div class="data-block-header">
                    <span>الإجراء المتخذ</span>
                    <span dir="ltr">Action Taken</span>
                </div>
                <div class="data-block-content">${data.actionTaken}</div>
            </div>

            <div class="levels-grid">
                <div class="level-col">
                    <div class="level-title">Level One</div>
                    <div class="checkbox-item"><span class="box">${checkLvl1}</span> First warning</div>
                    <div class="checkbox-item"><span class="box">${checkLvl1}</span> Re-induction</div>
                </div>
                <div class="level-col">
                    <div class="level-title">Level Two</div>
                    <div class="checkbox-item"><span class="box">${checkLvl2}</span> Second warning</div>
                    <div class="checkbox-item"><span class="box">${checkLvl2}</span> Contractor Notification</div>
                </div>
                <div class="level-col">
                    <div class="level-title">Level Three</div>
                    <div class="checkbox-item"><span class="box">${checkLvl3}</span> Disciplinary Actions</div>
                </div>
            </div>

            ${penaltyTableHtml}

            <div class="signatures-title">
                I have read this warning notice and understand it. لقد قرأت و فهمت ذلك التحذير<br>
                Signatures التوقيعات
            </div>
            <div class="signatures-container">
                <div class="sig-box">
                    <div class="sig-header">Employee/contractor<br>الموظف / المقاول الموقعة عليه المخالفة</div>
                    <div class="sig-line"><span>Name:</span> <div></div></div>
                    <div class="sig-line"><span>Title:</span> <div></div></div>
                    <div class="sig-line"><span>Signature:</span> <div></div></div>
                    <div class="sig-line"><span>Date:</span> <div></div></div>
                </div>
                <div class="sig-box">
                    <div class="sig-header">HSE Department<br>إدارة السلامة والصحة المهنية</div>
                    <div class="sig-line"><span>Name:</span> <div></div></div>
                    <div class="sig-line"><span>Title:</span> <div></div></div>
                    <div class="sig-line"><span>Signature:</span> <div></div></div>
                    <div class="sig-line"><span>Date:</span> <div></div></div>
                </div>
                <div class="sig-box">
                    <div class="sig-header">Project Manager<br>مدير المشروع</div>
                    <div class="sig-line"><span>Name:</span> <div></div></div>
                    <div class="sig-line"><span>Title:</span> <div></div></div>
                    <div class="sig-line"><span>Signature:</span> <div></div></div>
                    <div class="sig-line"><span>Date:</span> <div></div></div>
                </div>
            </div>

            <div class="pdf-footer">
                <span>ECTSF.07/REV.02/Issue Date: ${new Date().toLocaleDateString("en-GB")}</span>
                <span>Page 1 of 1</span>
            </div>

            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 500); };
            <\/script>
        </body>
        </html>`;

    // استدعاء نافذة العرض المنبثقة الشيك
    let printModal = document.getElementById("dr-pdf-modal");
    if (!printModal) {
      printModal = document.createElement("div");
      printModal.id = "dr-pdf-modal";
      printModal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); z-index: 9999;
                display: none; align-items: center; justify-content: center;
                flex-direction: column; backdrop-filter: blur(4px);
            `;
      document.body.appendChild(printModal);
    }

    printModal.innerHTML = `
            <div style="width: 95%; max-width: 1000px; background: #fff; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; height: 95vh; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="background: #C8102E; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.2rem; font-family: 'Cairo', sans-serif;"><i class="fas fa-file-pdf"></i> طباعة نموذج المخالفة الرسمي</h3>
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button onclick="document.getElementById('dr-pdf-iframe').contentWindow.print()" style="background: #fff; color: #C8102E; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Cairo', sans-serif; transition: 0.2s;">
                            <i class="fas fa-print"></i> طباعة الآن
                        </button>
                        <button onclick="document.getElementById('dr-pdf-modal').style.display='none'" style="background: transparent; border: none; color: white; font-size: 1.8rem; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                </div>
                <iframe id="dr-pdf-iframe" style="width: 100%; height: 100%; border: none; flex-grow: 1; background: #525659;"></iframe>
            </div>
        `;

    printModal.style.display = "flex";
    const iframe = document.getElementById("dr-pdf-iframe");
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlTemplate);
    doc.close();
  } catch (error) {
    alert("حدث خطأ أثناء إعداد الطباعة: " + error.message);
  } finally {
    hideLoader();
  }
};

// =================================================================
// --- وحدة سجل تقييمات الموظفين (Monitor KPIs) ---
// =================================================================

// =================================================================
// --- وحدة سجل تقييمات الموظفين (Monitor KPIs) ---
// =================================================================

window.initMonitorKpiPage = function () {
  const projSelect = document.getElementById("mon-kpi-project");
  const fromMonth = document.getElementById("mon-kpi-from");
  const toMonth = document.getElementById("mon-kpi-to");
  const tableContainer = document.getElementById("mon-kpi-results");
  const exportBtn = document.getElementById("mon-kpi-export-btn");

  // تصفير الواجهة
  if (tableContainer)
    tableContainer.innerHTML =
      '<p style="text-align:center; padding:20px; color:#666;">حدد معايير البحث واضغط عرض السجل...</p>';
  if (exportBtn) exportBtn.style.display = "none";

  // تعيين الشهر الحالي كافتراضي
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (fromMonth) fromMonth.value = currentMonthStr;
  if (toMonth) toMonth.value = currentMonthStr;

  // تعبئة المشاريع بصلاحيات المستخدم
  if (projSelect && projSelect.options.length <= 1) {
    projSelect.innerHTML =
      '<option value="ALL_ACCESSIBLE">كل المشاريع المتاحة</option>';
    if (initialData && initialData.projects) {
      initialData.projects.forEach((p) => projSelect.add(new Option(p, p)));
    } else if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
      const userProj = (currentUser.projects || "").toString();
      const acc =
        userProj === "ALL"
          ? ppeLocations
          : ppeLocations.filter((p) => userProj.includes(p));
      acc.forEach((p) => projSelect.add(new Option(p, p)));
    }
  }

  // ربط زر البحث
  const searchBtn = document.getElementById("mon-kpi-search-btn");
  if (searchBtn) {
    searchBtn.onclick = async function () {
      if (!tableContainer) return;
      tableContainer.innerHTML =
        '<div class="loader-small">جاري حساب السجل النهائي...</div>';
      if (exportBtn) exportBtn.style.display = "none";

      const filters = {
        project: projSelect.value,
        fromMonth: fromMonth.value,
        toMonth: toMonth.value,
      };

      try {
        const r = await callApi("getKpiLogs", {
          filters,
          userInfo: currentUser,
        });

        // حفظ البيانات في متغير عالمي عشان نستخدمها في الإكسيل
        window.currentKpiLogsData = r.data;

        window.renderKpiLogsTable(r.data, tableContainer);

        // إظهار زر الإكسيل لو فيه بيانات
        if (exportBtn && r.data && r.data.length > 0) {
          exportBtn.style.display = "block";
        }
      } catch (e) {
        tableContainer.innerHTML = `<p class="error-message">خطأ: ${e.message}</p>`;
      }
    };
  }

  // ربط زر التصدير
  if (exportBtn) {
    exportBtn.onclick = window.exportKpiLogsToExcel;
  }
};

window.renderKpiLogsTable = function (data, container) {
  if (!data || data.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; font-weight:bold; color:#c8102e; padding:20px;">لا توجد تقييمات نهائية لهذه المعاير.</p>';
    return;
  }

  let html = `
    <table class="results-table">
        <thead>
            <tr>
                <th>الشهر</th>
                <th>اسم الموظف</th>
                <th>الكود</th>
                <th>الوظيفة</th>
               <th>المشروع</th>
                <th>المُقيّمون (المديرين)</th>
                <th style="text-align:center;">النتيجة النهائية</th>
            </tr>
        </thead>
        <tbody>`;

  data.forEach((row) => {
    // اللوان الافتراضية لحالة (N/A)
    let bgColor = "#6c757d"; // رصصي قوي
    let textColor = "#ffffff"; // أبيض
    let scoreDisplay = "N/A (لم يتواجد)";

    if (row.percentage === "لم يتم التقييم") {
      bgColor = "#343a40"; // أسود/رمادي غامق جداً للمتأخرين
      textColor = "#ffffff";
      scoreDisplay = "لم يتم التقييم";
    } else if (row.percentage !== "N/A") {
      const scorePercent = parseFloat(row.percentage);

      if (scorePercent < 70) {
        bgColor = "#dc3545"; // أحمر صريح وقوي (Danger)
        textColor = "#ffffff";
      } else if (scorePercent < 90) {
        bgColor = "#ffc107"; // أصفر فاقع وواضح (Warning)
        textColor = "#212529"; // نص أسود غامق عشان يكون مقروء جداً على الأصفر
      } else {
        bgColor = "#28a745"; // أخضر صريح ومبهج (Success)
        textColor = "#ffffff";
      }
      scoreDisplay = `${row.totalScore} / ${row.totalMax}`;
    }

    html += `
          <tr style="border-bottom: 1px solid #eee;">
              <td style="font-weight:bold; white-space:nowrap; vertical-align: middle;">${row.period}</td>
              <td style="font-weight:bold; color:#2C2A29; vertical-align: middle;">${row.empName}</td>
              <td style="vertical-align: middle;">${row.empId}</td>
              <td style="vertical-align: middle;">${row.jobTitle}</td>
              <td style="vertical-align: middle;">${row.project}</td>
              <td style="font-size:0.85em; color:#555; vertical-align: middle;">${row.evaluators}</td>
              <td style="text-align:center; vertical-align: middle;">
                  <span class="badge" style="background-color: ${bgColor}; color: ${textColor}; font-size: 1.1em; padding: 8px 15px; direction: ltr; display: inline-block; border-radius: 6px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.15); letter-spacing: 1px;">
                      ${scoreDisplay}
                  </span>
              </td>
          </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
};
// =================================================================
// --- وحدة التقييم الجماعي الاحترافية (Real Excel - .xlsx) ---
// =================================================================

// 1. تحميل القالب المنسق
window.downloadKpiExcelTemplate = async function () {
  const periodSelect = document.getElementById("kpi-period-select");
  const periodValue = periodSelect ? periodSelect.value : "";

  if (!periodValue) {
    alert("الرجاء اختيار فترة (شهر) التقييم أولاً من الأعلى.");
    return;
  }

  showLoader("جاري تصميم وتحميل الإكسيل...");
  try {
    const period = `${periodValue}-01`;
    const response = await callApi("getBulkKpiTemplate", {
      period: period,
      userInfo: currentUser,
    });

    if (response.status === "success" && response.templateData.length > 0) {
      // تجهيز البيانات بعناوين أعمدة عربية واضحة
      const excelData = response.templateData.map((row) => ({
        "كود الموظف": row.empId,
        "اسم الموظف": row.empName,
        المشروع: row.project,
        الوظيفة: row.job,
        "كود البند": row.kpiId,
        "وصف البند": row.kpiDesc,
        "الدرجة القصوى": row.maxScore,
        "الدرجة المستحقة (اكتب رقم أو N/A)": "", // يسيبها فاضية للمدير
        "ملاحظات (اختياري)": "",
      }));

      // تحويل البيانات لورقة عمل (Worksheet)
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // (*** السحر هنا: تظبيط عرض الأعمدة عشان الكلام ميبقاش متاكل ***)
      const wscols = [
        { wch: 15 }, // كود الموظف
        { wch: 35 }, // اسم الموظف
        { wch: 25 }, // المشروع
        { wch: 25 }, // الوظيفة
        { wch: 15 }, // كود البند
        { wch: 60 }, // وصف البند (عريض جداً عشان الكلام يظهر)
        { wch: 15 }, // الدرجة القصوى
        { wch: 35 }, // الدرجة المستحقة
        { wch: 40 }, // ملاحظات
      ];
      worksheet["!cols"] = wscols;

      // إنشاء ملف الإكسيل (Workbook)
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "سجل التقييمات");

      // تحميل الملف بصيغة xlsx الحقيقية
      XLSX.writeFile(
        workbook,
        `KPI_Evaluation_${currentUser.username}_${periodValue}.xlsx`,
      );
    } else {
      alert("لا يوجد موظفين أو بنود تقييم متاحة لك في هذا الشهر.");
    }
  } catch (e) {
    alert("خطأ: " + e.message);
  } finally {
    hideLoader();
  }
};

// 2. قراءة ملف الـ .xlsx ورفعه
window.handleKpiBulkUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const periodSelect = document.getElementById("kpi-period-select");
  const periodValue = periodSelect ? periodSelect.value : "";
  if (!periodValue) {
    alert("الرجاء اختيار فترة التقييم قبل الرفع.");
    event.target.value = "";
    return;
  }

  showLoader("جاري قراءة ملف الإكسيل...");

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      // قراءة الملف باستخدام المكتبة
      const workbook = XLSX.read(data, { type: "array" });

      // أخذ أول شيت في الملف
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // تحويل الشيت لمصفوفة جافاسكريبت ذكية (defval بيخلي الخانات الفاضية تبقى "")
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsedData = [];

      for (let i = 0; i < jsonRows.length; i++) {
        const row = jsonRows[i];

        // سحب البيانات بناءً على أسماء الأعمدة اللي إحنا حددناها فوق
        const empId = String(row["كود الموظف"]).trim();
        const kpiId = String(row["كود البند"]).trim();
        const maxScore = String(row["الدرجة القصوى"]).trim();
        const score = String(row["الدرجة المستحقة (اكتب رقم أو N/A)"]).trim();
        const notes = String(row["ملاحظات (اختياري)"]).trim();

        if (!empId || !kpiId) continue; // لو سطر فاضي نتجاهله
        if (score === "") continue; // لو المدير مقيمش البند ده، نتجاهله

        // التحقق من صحة الدرجة
        if (score.toUpperCase() !== "N/A" && isNaN(parseFloat(score))) {
          alert(
            `خطأ في الإكسيل (صف رقم ${i + 2}): الدرجة المستحقة للموظف (${row["اسم الموظف"]}) يجب أن تكون رقماً أو N/A. القيمه: ${score}`,
          );
          event.target.value = "";
          hideLoader();
          return;
        }

        parsedData.push({
          empId: empId,
          kpiId: kpiId,
          maxScore: maxScore,
          score: score.toUpperCase() === "N/A" ? "N/A" : parseFloat(score),
          notes: notes,
        });
      }

      if (parsedData.length === 0) {
        alert(
          "لم يتم العثور على تقييمات جديدة في الملف، تأكد من تعبئة عمود 'الدرجة المستحقة'.",
        );
        event.target.value = "";
        hideLoader();
        return;
      }

      if (
        !confirm(
          `تم العثور على درجات لعدد ${parsedData.length} بند. هل تريد الاعتماد والحفظ الآن؟`,
        )
      ) {
        event.target.value = "";
        hideLoader();
        return;
      }

      showLoader("جاري حفظ التقييمات في السيرفر...");
      const period = `${periodValue}-01`;
      const response = await callApi("saveBulkKpiEvaluations", {
        bulkData: { period: period, rows: parsedData },
        userInfo: currentUser,
      });

      alert("✅ " + response.message);
      window.initKpiPage();
    } catch (err) {
      alert("❌ حدث خطأ أثناء معالجة الملف: " + err.message);
    } finally {
      hideLoader();
      event.target.value = "";
    }
  };

  // نقرأ الملف كـ ArrayBuffer عشان المكتبة تقدر تتعامل معاه
  reader.readAsArrayBuffer(file);
};

// =================================================================
// --- وحدة غرفة العمليات وتتبع المستخدمين (User Tracking) ---
// =================================================================

window.initUserTrackingPage = async function () {
  const container = document.getElementById("tracking-table-container");
  if (!container) return;
  container.innerHTML =
    '<div class="loader-small">جاري الاتصال بالقمر الصناعي وتحديث البيانات...</div>';

  try {
    const res = await callApi("getUserTrackingData", { userInfo: currentUser });
    if (res.status === "success") {
      window.renderTrackingTable(res.data, container);
    } else {
      container.innerHTML = `<p class="error-message">${res.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">خطأ في الاتصال: ${e.message}</p>`;
  }
};

window.renderTrackingTable = function (data, container) {
  if (!data || data.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding:20px;">لا توجد بيانات تتبع حتى الآن.</p>';
    return;
  }

  // 1. قاموس ترجمة الإجراءات (لتحويل أسماء السيرفر لأسماء مقروءة للمدير)
  const actionDictionary = {
    checkLogin: "تسجيل الدخول",
    verifySession: "فتح النظام",
    getInitialData: "تحديث النظام",
    savePermit: "إصدار تصريح جديد",
    closePermit: "إغلاق تصريح",
    searchPermits: "البحث في التصاريح",
    getOpenPermits: "تصفح التصاريح",
    saveTransaction: "حركة مخزنية",
    savePpeTransaction: "صرف مهمات",
    getInventoryInitData: "تصفح المخازن",
    saveEvaluations: "تقييم موظف (KPI)",
    saveBulkKpiEvaluations: "رفع تقييمات (Excel)",
    getKpiInitData: "تصفح تقييمات الموظفين",
    saveTrainingSession: "تسجيل تدريب",
    getTrainingInitData: "تصفح سجل التدريب",
    saveObservationFull: "تسجيل ملاحظة",
    searchObservations: "تصفح الملاحظات",
    saveHazardFull: "تسجيل تقرير خطر",
    searchHazards: "تصفح تقارير الخطر",
    saveViolation: "تسجيل مخالفة",
    saveNCR: "إصدار تقرير عدم مطابقة (NCR)",
    saveContractorEval: "تقييم مقاول",
    saveAccidentFull: "تسجيل حادث",
    saveDailyHseReport: "تسجيل تقرير يومي",
    getPendingReports: "تصفح التقارير اليومية",
    processReportAction: "اعتماد/رفض تقرير",
    getUserTrackingData: "مراقبة غرفة العمليات", // الإجراء اللي كان طالعلك في الصورة
  };

  let html = `
    <table class="results-table">
      <thead>
        <tr>
          <th style="text-align:center;">الحالة</th>
          <th>اسم المشرف</th>
          <th>آخر نشاط فعلي</th>
          <th>وقت النشاط</th>
          <th>الجهاز المستخدم</th>
          <th style="text-align:center;">الموقع الجغرافي (GPS)</th>
        </tr>
      </thead>
      <tbody>
  `;

  const now = new Date();

  data.forEach((row) => {
    let isOnline = false;
    let timeDisplay = "-";

    // 2. إصلاح مشكلة التاريخ (استبدال المسافة بـ T لضمان التوافق مع كل المتصفحات)
    let rawTime = String(row.actionTime || row.lastLogin).trim();
    // تحويل "2026-03-08 12:14:26" إلى "2026-03-08T12:14:26"
    let safeTimeStr = rawTime.replace(" ", "T").replace(/\//g, "-");

    const actionDate = new Date(safeTimeStr);

    if (!isNaN(actionDate.getTime())) {
      const diffMins = (now - actionDate) / (1000 * 60);

      // لو عدى أقل من 15 دقيقة يبقى أونلاين
      if (diffMins >= 0 && diffMins <= 15) {
        isOnline = true;
      }

      timeDisplay = actionDate.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const statusHtml = isOnline
      ? `<span style="color:#28a745; font-size:1.3em;" title="متصل الآن"><i class="fas fa-circle"></i></span>`
      : `<span style="color:#adb5bd; font-size:1.3em;" title="أوفلاين"><i class="fas fa-circle"></i></span>`;

    // 2. تظبيط زرار الخريطة (مع إصلاح الروابط القديمة الخاطئة)
    let mapLinkHtml =
      '<span style="color:#999; font-size:0.85em;">غير متاح</span>';
    let finalLink = row.mapsLink;

    // السحر هنا: لو الرابط قديم وفيه المشكلة، هنستخرج منه الإحداثيات ونبني رابط نظيف
    if (finalLink && finalLink.includes("q=")) {
      const match = finalLink.match(/q=([^&"]+)/);
      if (match && match[1]) {
        finalLink = `https://www.google.com/maps?q=${match[1]}`;
      }
    }

    if (finalLink && finalLink.startsWith("http")) {
      mapLinkHtml = `<a href="${finalLink}" target="_blank" class="btn btn-sm" style="background-color:#dc3545; color:white; padding: 5px 10px; text-decoration: none; border-radius: 4px;">
            <i class="fas fa-map-marker-alt"></i> فتح الخريطة
        </a>`;
    }

    // 3. تطبيق القاموس على اسم النشاط
    const rawAction = String(row.lastAction).trim();
    const friendlyAction = actionDictionary[rawAction] || rawAction; // لو مش في القاموس هيعرض الاسم الأصلي

    let actionBadge = `<span class="badge bg-info" style="color:#000; font-weight:normal;">${friendlyAction}</span>`;
    if (rawAction === "checkLogin" || friendlyAction === "تسجيل الدخول") {
      actionBadge = `<span class="badge bg-warning" style="color:#000; font-weight:normal;">تسجيل الدخول</span>`;
    }

    html += `
      <tr>
        <td style="text-align:center; vertical-align:middle;">${statusHtml}</td>
        <td style="font-weight:bold; color:#2C2A29;">${row.username}</td>
        <td>${actionBadge}</td>
        <td style="direction:ltr; text-align:right; font-weight:bold; color:#555;">${timeDisplay}</td>
        <td style="font-size:0.85em; color:#666;"><i class="fas fa-mobile-alt"></i> ${row.device}</td>
        <td style="text-align:center;">${mapLinkHtml}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
};
// دالة تصدير سجل التقييمات إلى ملف Excel احترافي
// دالة تصدير سجل التقييمات إ ى ملف Excel احترافي
window.exportKpiLogsToExcel = function () {
  if (!window.currentKpiLogsData || window.currentKpiLogsData.length === 0) {
    alert("لا توجد بيانات لتصديرها.");
    return;
  }

  window.showLoader("جاري تجهيز ملف الإكسيل...");

  try {
    // 1. تجهيز اليانات بالعناوين العربية (تم إضافة القسم)
    const excelData = window.currentKpiLogsData.map((row, index) => {
      let percentageText = row.percentage + "%";
      if (row.percentage === "N/A") percentageText = "لم يتواجد (N/A)";
      if (row.percentage === "لم يتم التقييم")
        percentageText = "لم يتم التقييم";

      return {
        م: index + 1,
        "شهر التقييم": row.period,
        "كود الموظف": row.empId,
        "اسم الموظف": row.empName,
        القسم: row.department || "غير محدد", // <--- (العمود الجديد)
        "المسمى الوظيفي": row.jobTitle,
        المشروع: row.project,
        "ا؄درجة المحققة": row.totalScore,
        "الدرجة القصوى": row.totalMax,
        "النسبة المئوية": percentageText,
        "المدير المُقيّم": row.evaluators,
      };
    });

    // 2. إنشاء ورقة العمل (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 3. تظبيط عرض الأعمدة عشان الكلام ميبقاش مقصوص
    const wscols = [
      { wch: 5 }, // م
      { wch: 15 }, // شهر التقييم
      { wch: 15 }, // الكود
      { wch: 35 }, // اسم الموظف
      { wch: 25 }, // القسم  <--- (مساحة العمود الجديد)
      { wch: 25 }, // الوظيفة
      { wch: 25 }, // المشروع
      { wch: 15 }, // الدرجة المحققة
      { wch: 15 }, // الدرجة القصوى
      { wch: 20 }, // النسبة
      { wch: 40 }, // المدير
    ];
    worksheet["!cols"] = wscols;

    // 4. إنشاء الملف (Workbook) وإضافة الشيت ليه
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "سجل التقييمات");

    // 5. تحديد اسم الملف
    const projSelect = document.getElementById("mon-kpi-project");
    const projName =
      projSelect && projSelect.value !== "ALL_ACCESSIBLE"
        ? projSelect.value
        : "All_Projects";
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `KPI_Report_${projName}_${dateStr}.xlsx`;

    // 6. تحميل الملف
    XLSX.writeFile(workbook, fileName);
  } catch (e) {
    alert("حدث خطأ أثناء تصدير الملف: " + e.message);
  } finally {
    window.hideLoader();
  }
};
// =================================================================
// --- وحدة تسجيل السيارات (Vehicle Registration) - ذكية وموحدة ---
// =================================================================

window.activeEmpTarget = "";
window.activeWorkerTarget = "";

window.initVehiclePage = async function () {
  const vehProject = document.getElementById("veh-project");
  const vehDate = document.getElementById("veh-date");
  const vehTime = document.getElementById("veh-time");

  // 1. ضبط التاريخ والوقت
  const now = new Date();
  if (vehDate) vehDate.valueAsDate = now;
  if (vehTime) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    vehTime.value = `${hh}:${mm}`;
  }

  // 2. تحميل الموظفين (للسويدي)
  if (!window.ppeEmployees || window.ppeEmployees.length === 0) {
    try {
      const r = await callApi("getInventoryInitData", {
        userInfo: currentUser,
      });
      if (r.status === "success") {
        window.ppeLocations = r.locations;
        window.ppeEmployees = r.employees;
        window.ppeContractors = r.contractors;
      }
    } catch (e) {
      console.error("فشل التحميل الأولي:", e);
    }
  }

  // 3. تعبئة المشاريع
  if (vehProject && vehProject.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (
      typeof window.ppeLocations !== "undefined" &&
      window.ppeLocations.length > 0
    ) {
      acc =
        userProj === "ALL"
          ? window.ppeLocations
          : window.ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }
    fillSelect(vehProject, acc);
  }

  window.toggleVehOwner();
};

// --- التحكم في الواجهة (السويدي / مقاول) ---
window.toggleVehOwner = function () {
  const ownerType = document.getElementById("veh-owner-type").value;
  const contGroup = document.getElementById("veh-cont-group");
  const contSelect = document.getElementById("veh-contractor");

  const driverName = document.getElementById("veh-driver-name");
  const driverNid = document.getElementById("veh-driver-nid");

  const empSearchBtn = document.getElementById("veh-emp-btn");
  const workerSearchBtn = document.getElementById("veh-worker-btn");
  const nidSearchBtn = document.getElementById("veh-nid-search-btn");

  // تصفير الخانات وإغلاق الاسم
  driverName.value = "";
  driverNid.value = "";
  driverName.readOnly = true;
  driverName.style.backgroundColor = "#f0f0f0";

  if (ownerType === "السويدي") {
    contGroup.style.display = "none";
    contSelect.removeAttribute("required");

    driverNid.readOnly = true;
    driverNid.style.backgroundColor = "#f0f0f0";
    driverNid.placeholder = "يتم جلبه تلقائياً";
    driverName.placeholder = "اضغط (الموظفين) لاختيار الاسم";

    empSearchBtn.style.display = "block";
    workerSearchBtn.style.display = "none";
    nidSearchBtn.style.display = "none"; // نخفي الفحص لأن الموظف بيتجاب من القائمة
  } else {
    contGroup.style.display = "block";
    contSelect.setAttribute("required", "required");

    driverNid.readOnly = false;
    driverNid.style.backgroundColor = "#fff";
    driverNid.placeholder = "اكتب الرقم القومي وافحص...";
    driverName.placeholder = "افحص الرقم أو اختر من القائمة";

    empSearchBtn.style.display = "none";
    workerSearchBtn.style.display = "block";
    nidSearchBtn.style.display = "block"; // نظهر الفحص للمقاول

    window.updateVehContractors();
  }
};

window.updateVehContractors = async function () {
  const proj = document.getElementById("veh-project").value;
  const vehContractor = document.getElementById("veh-contractor");
  const ownerType = document.getElementById("veh-owner-type").value;

  if (ownerType === "السويدي") return;

  if (!proj) {
    vehContractor.innerHTML =
      '<option value="">-- اختر المشروع أولاً --</option>';
    vehContractor.disabled = true;
    return;
  }

  vehContractor.innerHTML = "<option>جاري التحميل...</option>";
  vehContractor.disabled = true;

  try {
    const r = await callApi("getVehicleContractors", { projectName: proj });
    if (r.status === "success" && r.contractors && r.contractors.length > 0) {
      fillSelect(vehContractor, r.contractors);
      vehContractor.disabled = false;
    } else {
      vehContractor.innerHTML =
        '<option value="">لا يوجد مقاولي سيارات</option>';
    }
  } catch (e) {
    vehContractor.innerHTML = "<option>خطأ في التحميل</option>";
  }
};

// --- (الجديد والمحسن) فحص الرقم القومي للسائق ---
window.searchVehDriverNid = async function () {
  const nidEl = document.getElementById("veh-driver-nid");
  const nameEl = document.getElementById("veh-driver-name");

  if (!nidEl.value || nidEl.value.length < 5) {
    alert("الرجاء إدخال رقم قومي/إقامة صحيح قبل الفحص.");
    return;
  }

  nameEl.value = "جاري الفحص...";
  nameEl.readOnly = true;
  nameEl.style.backgroundColor = "#f0f0f0";

  try {
    const r = await callApi("getRecipientByNID", { nationalId: nidEl.value });
    if (r.status === "found") {
      nameEl.value = r.name;
      nameEl.readOnly = true; // نخليه مقفول طالما موجود
      nameEl.style.backgroundColor = "#e8f5e9"; // أخضر خفيف دليل النجاح

      const currentCont = document.getElementById("veh-contractor").value;
      if (r.contractor !== currentCont) {
        alert(
          `تنبيه: هذا السائق مسجل مسبقاً تبع شركة (${r.contractor}).\nسيتم تسجيل سيارته الآن في عهدة (${currentCont}).`,
        );
      }
    } else {
      // العامل جديد
      nameEl.value = "";
      nameEl.placeholder = "عامل جديد.. اكتب الاسم بالكامل";
      nameEl.readOnly = false; // نفتح الخانة عشان يكتب
      nameEl.style.backgroundColor = "#fff"; // لون أبيض للكتابة
      nameEl.focus();
      alert("هذا الرقم غير مسجل مسبقاً، يرجى كتابة اسم السائق لتسجيله.");
    }
  } catch (e) {
    nameEl.value = "";
    nameEl.placeholder = "خطأ في الاتصال، يمكنك الكتابة يدوياً";
    nameEl.readOnly = false;
    nameEl.style.backgroundColor = "#fff";
  }
};

// --- فتح بوب أب عمال المقاول (تحديث لايف لمنع القائمة الفاضية) ---
window.openVehWorkerSelector = async function () {
  const contractorName = document.getElementById("veh-contractor").value;
  if (!contractorName) {
    alert("الرجاء اختيار المقاول أولاً");
    return;
  }

  window.activeWorkerTarget = "VEHICLE";
  const modal = document.getElementById("worker-selector-modal");
  modal.style.display = "flex";
  document.getElementById("worker-search-box").value = "";

  const container = document.getElementById("worker-list-container");
  if (container) {
    container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#ff9800;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top:10px;">جاري جلب عمال المقاول...</p>
        </div>`;
  }

  try {
    const response = await callApi("getContractorWorkers", {
      contractorName: contractorName,
    });
    if (response.status === "success") {
      window.currentContractorWorkers = response.workers;

      if (!response.workers || response.workers.length === 0) {
        container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#666;">
                    <p>لا يوجد عمال مسجلين لهذه الشركة حتى الآن.</p>
                    <button class="btn btn-primary" onclick="window.addNewVehWorkerManually()" style="margin-top:10px;">
                       <i class="fas fa-plus"></i> تسجيل عامل جديد
                    </button>
                </div>`;
      } else {
        let html = response.workers
          .map(
            (w) => `
                  <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:5px;" onclick="window.selectWorker('${w.id}', '${w.name}')">
                      <div style="text-align:right;">
                          <span style="display:block; font-weight:700;">${w.name}</span>
                          <small style="color:#666;">ID: ${w.id}</small>
                      </div>
                      <i class="fas fa-chevron-left" style="color:#ccc;"></i>
                  </div>
              `,
          )
          .join("");

        // زرار الإضافة اليدوية في آخر القائمة
        html += `
                <button class="btn-secondary" onclick="window.addNewVehWorkerManually()" style="width:100%; margin-top:15px; background:#17a2b8; color:white; border:none; padding:10px; border-radius:4px;">
                   <i class="fas fa-plus"></i> السائق غير موجود بالقائمة؟ سجل عامل جديد
                </button>`;

        container.innerHTML = html;
      }
      document.getElementById("worker-search-box").focus();
    }
  } catch (e) {
    if (container)
      container.innerHTML =
        '<p style="text-align:center; color:red; padding:20px;">حدث خطأ في الاتصال بقاعدة البيانات.</p>';
  }
};

// زر "إضافة جديد" من داخل البوب أب
window.addNewVehWorkerManually = function () {
  if (typeof closeWorkerSelector === "function") closeWorkerSelector();
  const nidInput = document.getElementById("veh-driver-nid");
  nidInput.value = "";
  nidInput.focus();
  alert("الرجاء إدخال الرقم القومي للسائق الجديد ثم الضغط على زر (فحص)");
};

// فتح بوب أب الموظفين (للسويدي)
window.openVehEmpSelector = function () {
  const proj = document.getElementById("veh-project").value;
  if (!proj) {
    alert("الرجاء اختيار المشروع أولاً");
    return;
  }

  window.activeEmpTarget = "VEHICLE";
  document.getElementById("emp-selector-modal").style.display = "flex";
  document.getElementById("emp-search-box").value = "";

  const list = window.ppeEmployees.filter((e) => e.project === proj);
  if (typeof renderEmployeesInModal === "function")
    renderEmployeesInModal(list);
};

// توجيه الاختيارات من البوب أب
const originalSelectEmployee = window.selectEmployee;
window.selectEmployee = function (id, name, company) {
  if (window.activeEmpTarget === "VEHICLE") {
    document.getElementById("veh-driver-name").value = name;
    document.getElementById("veh-driver-nid").value = id;
    if (typeof closeEmpSelector === "function") closeEmpSelector();
    window.activeEmpTarget = "";
  } else {
    if (typeof originalSelectEmployee === "function")
      originalSelectEmployee(id, name, company);
  }
};

const originalSelectWorker = window.selectWorker;
window.selectWorker = function (id, name) {
  if (window.activeWorkerTarget === "VEHICLE") {
    const nameInput = document.getElementById("veh-driver-name");
    nameInput.value = name;
    nameInput.readOnly = true;
    nameInput.style.backgroundColor = "#e8f5e9";

    document.getElementById("veh-driver-nid").value = id;
    if (typeof closeWorkerSelector === "function") closeWorkerSelector();
    window.activeWorkerTarget = "";
  } else {
    if (typeof originalSelectWorker === "function")
      originalSelectWorker(id, name);
  }
};

// --- حفظ النموذج وإرساله للسيرفر ---
const vehForm = document.getElementById("vehicle-form");
if (vehForm) {
  const newVehForm = vehForm.cloneNode(true);
  vehForm.parentNode.replaceChild(newVehForm, vehForm);

  newVehForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("veh-save-btn");
    const msg = document.getElementById("veh-save-msg");
    const ownerType = document.getElementById("veh-owner-type").value;
    const nameInput = document.getElementById("veh-driver-name");

    const contractorVal =
      ownerType === "السويدي"
        ? "السويدي"
        : document.getElementById("veh-contractor").value;

    const vehData = {
      date: document.getElementById("veh-date").value,
      time: document.getElementById("veh-time").value,
      project: document.getElementById("veh-project").value,
      contractor: contractorVal,
      vehNumber: document.getElementById("veh-number").value,
      vehType: document.getElementById("veh-type").value,
      vehModel: document.getElementById("veh-model").value,
      vehLicenseExp: document.getElementById("veh-license-exp").value,
      driverName: nameInput.value,
      driverNid: document.getElementById("veh-driver-nid").value,
      drvLicenseExp: document.getElementById("veh-driver-exp").value,
      gpsApp: document.getElementById("veh-gps-app").value,
      gpsUser: document.getElementById("veh-gps-user").value,
      gpsPass: document.getElementById("veh-gps-pass").value,

      // إذا كانت خاة الاسم مفتوحة للكتابة، إذاً هذا عامل جديد يجب  فيز
      driverIsNew: !nameInput.readOnly,
    };

    if (!vehData.contractor) {
      alert("الرجاء اختيار المقاول.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const r = await callApi("saveVehicleRecord", {
        vehData: vehData,
        userInfo: currentUser,
      });
      showMessage(msg, r.message, true);
      newVehForm.reset();
      window.initVehiclePage();
    } catch (err) {
      showMessage(msg, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> حفظ بيانات السيارة';
    }
  });
}

// =================================================================
// --- وحدة الفحص الشهري للسيارات (Vehicle Inspection) ---
// =================================================================

// مصفوفة الـ 26 نقطة بناءً على النموذج المرفق
const vehicleChecklistItems = [
  "وثائق المركبة والسائق (رخصة المركبة والسائق) - Vehicle and Driver documentation",
  "وثائق السائق (سجل جنائي / اختبار مخدرات) - Driver's paperwork",
  "زجاج السيارة الأمامي، الخلفي، والجوانب - Glass (front, back, and sides)",
  "حالة الأضواء الأمامية / الإشارة - Head/signal light Condition",
  "حالة المرايا الجانبية والأمامية - Side and front mirrors Condition",
  "حالة الإطارات - Tires Condition",
  "إطار إحتياطي - Spare tire",
  "العدة (توفر العدة الضرورية) - Suitable tools",
  "العاكس مثلث التحذير - Reflecting Triangle",
  "سترة عاكسة (سترتين) - Reflective vest",
  "قفازات قطنية - Cotton Gloves",
  "مصباح يدوي - Flashlight",
  "حالة المساحات الأمامية - Wipers Condition",
  "الحالة العامة للمركبة - General Condition",
  "صندوق الإسعافات الأولية / جهاز إطفاء الحريق - First Aid Box/Fire Extinguisher",
  "حالة حزام الأمان - Seat belts Condition",
  "تخزين المواد القابلة للاشتعال (تأكد من عدم وجودها) - Storage of flammable materials",
  "خزان الوقود (عدم وجود تسربات) - Fuel tank",
  "الفرامل والفرملة اليدوية - Brakes and Hand Brake",
  "نظام مانع الانغلاق - Antilock Brake System (ABS)",
  "وسائد هوائية (وسادتي هواء على الأقل) - Airbags",
  "عمر المركبة (لا يتجاوز 5 سنوات) - Vehicle age",
  "المؤشرات - Indicators",
  "حالة البوق (آلة التنبيه) - Horn Condition",
  "جهاز التنبيه عند الرجوع للخلف - Reverse Alarm",
  "جهاز تتبع GPS - GPS tracking device",
];
let currentProjectVehicles = [];

window.initVehicleInspectionPage = function () {
  const projSelect = document.getElementById("v-insp-project");
  const container = document.getElementById("v-insp-cards-container");

  // تعبئة المشاريع
  if (projSelect && projSelect.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
      acc =
        userProj === "ALL"
          ? ppeLocations
          : ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }
    fillSelect(projSelect, acc);
  }

  // رسم كروت فحص السيارات بالشكل الرايق
  if (container) {
    let html = "";
    vehicleChecklistItems.forEach((item, index) => {
      const i = index + 1;
      const parts = item.split(" - ");
      const arText = parts[0];
      const enText = parts[1]
        ? `<br><small style="color:#666; font-weight:normal; font-size:0.85rem;">${parts[1]}</small>`
        : "";

      html += `
                <div class="insp-item-card">
                    <div class="insp-item-title">
                        <span class="badge-num">${i}</span> ${arText} ${enText}
                    </div>
                    <div class="insp-options-group">
                        <label class="insp-opt-label">
                            <input type="radio" name="v-chk-${i}" value="S" required>
                            <div class="insp-opt-btn"><i class="fas fa-check"></i> S</div>
                        </label>
                        <label class="insp-opt-label">
                            <input type="radio" name="v-chk-${i}" value="U" required>
                            <div class="insp-opt-btn"><i class="fas fa-times"></i> U</div>
                        </label>
                        <label class="insp-opt-label">
                            <input type="radio" name="v-chk-${i}" value="NA" required>
                            <div class="insp-opt-btn"><i class="fas fa-minus"></i> NA</div>
                        </label>
                    </div>
                </div>`;
    });
    container.innerHTML = html;
  }
};

window.updateInspectionVehicles = async function () {
  const proj = document.getElementById("v-insp-project").value;
  const plateSelect = document.getElementById("v-insp-plate");

  document.getElementById("v-insp-cont").value = "";
  document.getElementById("v-insp-type").value = "";
  document.getElementById("v-insp-driver").value = "";

  if (!proj) {
    plateSelect.innerHTML =
      '<option value="">-- اختر المشروع أولاً --</option>';
    plateSelect.disabled = true;
    return;
  }

  plateSelect.innerHTML = "<option>جاري التحميل...</option>";
  plateSelect.disabled = true;

  try {
    const r = await callApi("getProjectVehicles", { projectName: proj });
    if (r.status === "success" && r.vehicles.length > 0) {
      currentProjectVehicles = r.vehicles;
      plateSelect.innerHTML = '<option value="">-- اختر السيارة --</option>';
      r.vehicles.forEach((v) => {
        plateSelect.add(new Option(`${v.plate} (${v.driver})`, v.plate));
      });
      plateSelect.disabled = false;
    } else {
      plateSelect.innerHTML = '<option value="">لا توجد سيارات مسجلة</option>';
    }
  } catch (e) {
    plateSelect.innerHTML = "<option>خطأ في التحميل</option>";
  }
};

window.autoFillVehicleDetails = function () {
  const plate = document.getElementById("v-insp-plate").value;
  if (!plate) return;
  const vehicle = currentProjectVehicles.find((v) => v.plate === plate);
  if (vehicle) {
    document.getElementById("v-insp-cont").value = vehicle.contractor;
    document.getElementById("v-insp-type").value = vehicle.type;
    document.getElementById("v-insp-driver").value = vehicle.driver;
  }
};

const vehInspForm = document.getElementById("veh-insp-form");
if (vehInspForm) {
  const newVehInspForm = vehInspForm.cloneNode(true);
  vehInspForm.parentNode.replaceChild(newVehInspForm, vehInspForm);

  newVehInspForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("v-insp-save-btn");
    const msg = document.getElementById("v-insp-save-msg");

    let checklistResults = {};
    for (let i = 1; i <= vehicleChecklistItems.length; i++) {
      const selected = document.querySelector(
        `input[name="v-chk-${i}"]:checked`,
      );
      if (!selected) {
        alert(`الرجاء تقييم النقطة رقم ${i}`);
        return;
      }
      checklistResults[`Q${i}`] = selected.value;
    }

    const data = {
      project: document.getElementById("v-insp-project").value,
      plate: document.getElementById("v-insp-plate").value,
      contractor: document.getElementById("v-insp-cont").value,
      type: document.getElementById("v-insp-type").value,
      driver: document.getElementById("v-insp-driver").value,
      checklist: checklistResults,
      comments: {
        text: document.getElementById("v-insp-comments").value,
        targetDate: document.getElementById("v-insp-target-date").value,
      },
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const r = await callApi("saveVehicleInspection", {
        data: data,
        userInfo: currentUser,
      });
      showMessage(msg, r.message, true);
      newVehInspForm.reset();
      window.initVehicleInspectionPage();
    } catch (err) {
      showMessage(msg, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> اعتماد وحفظ الفحص';
    }
  });
}

const inspForm = document.getElementById("veh-insp-form");
if (inspForm) {
  inspForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("v-insp-save-btn");
    const msg = document.getElementById("v-insp-save-msg");

    // تجميع نتيجة الـ 26 نقطة
    let checklistResults = {};
    for (let i = 1; i <= 26; i++) {
      const selected = document.querySelector(`input[name="chk-${i}"]:checked`);
      if (!selected) {
        alert(`الرجاء تقييم النقطة رقم ${i}`);
        return;
      }
      checklistResults[`Q${i}`] = selected.value; // بيخزن S أو U أو NA
    }

    const data = {
      project: document.getElementById("v-insp-project").value,
      plate: document.getElementById("v-insp-plate").value,
      contractor: document.getElementById("v-insp-cont").value,
      type: document.getElementById("v-insp-type").value,
      driver: document.getElementById("v-insp-driver").value,
      checklist: checklistResults,
      comments: {
        text: document.getElementById("v-insp-comments").value,
        targetDate: document.getElementById("v-insp-target-date").value,
      },
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const r = await callApi("saveVehicleInspection", {
        data: data,
        userInfo: currentUser,
      });
      showMessage(msg, r.message, true);
      inspForm.reset();
      document.getElementById("v-insp-cont").value = "";
      document.getElementById("v-insp-type").value = "";
      document.getElementById("v-insp-driver").value = "";
    } catch (err) {
      showMessage(msg, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> اعتماد وحفظ الفحص';
    }
  });
}
// =================================================================
// الحل الجذري: دوال مستقلة تماماً للبوب أب في قسم السيارات
// =================================================================

// 1. فتح بوب أب عمال المقاول (خاص بالسيارات فقط)
window.openVehWorkerSelector = async function () {
  const contractorName = document.getElementById("veh-contractor").value;
  if (!contractorName) {
    alert("الرجاء اختيار المقاول أولاً");
    return;
  }

  const modal = document.getElementById("worker-selector-modal");
  if (modal) modal.style.display = "flex";

  const searchBox = document.getElementById("worker-search-box");
  if (searchBox) {
    searchBox.value = "";
    searchBox.oninput = window.filterVehWorkerList; // ربط البحث بدالة السيارات
    searchBox.focus();
  }

  const container = document.getElementById("worker-list-container");
  if (container) {
    container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#ff9800;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top:10px;">جاري جلب عمال المقاول...</p>
        </div>`;
  }

  try {
    const response = await callApi("getContractorWorkers", {
      contractorName: contractorName,
    });
    if (response.status === "success") {
      window.currentContractorWorkers = response.workers;
      window.renderVehWorkersInModal(response.workers);
    }
  } catch (e) {
    if (container)
      container.innerHTML =
        '<p style="text-align:center; color:red; padding:20px;">حدث خطأ في الاتصال بقاعدة البيانات.</p>';
  }
};

// 2. رسم العمال في البوب أب (وتوجيه الضغطة لدالة السيارات)
window.renderVehWorkersInModal = function (workers) {
  const container = document.getElementById("worker-list-container");
  if (!container) return;

  if (!workers || workers.length === 0) {
    container.innerHTML = `
          <div style="text-align:center; padding:20px; color:#666;">
              <p>لا يوجد عمال مسجلين لهذه الشركة حتى الآن.</p>
              <button class="btn btn-primary" onclick="window.addNewVehWorkerManually()" style="margin-top:10px;">
                 <i class="fas fa-plus"></i> تسجيل سائق جديد
              </button>
          </div>`;
  } else {
    let html = workers
      .map(
        (w) => `
            <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:5px;" onclick="window.selectVehWorker('${w.id}', '${w.name}')">
                <div style="text-align:right;">
                    <span style="display:block; font-weight:700;">${w.name}</span>
                    <small style="color:#666;">ID: ${w.id}</small>
                </div>
                <i class="fas fa-check-circle" style="color:#28a745;"></i>
            </div>
        `,
      )
      .join("");

    html += `
          <button class="btn-secondary" onclick="window.addNewVehWorkerManually()" style="width:100%; margin-top:15px; background:#17a2b8; color:white; border:none; padding:10px; border-radius:4px;">
             <i class="fas fa-plus"></i> السائق غير موجود بالقائمة؟ سجل سائق جديد
          </button>`;

    container.innerHTML = html;
  }
};

// 3. فلترة العمال في البوب أب (خاص بالسيارات)
window.filterVehWorkerList = function () {
  const query = document
    .getElementById("worker-search-box")
    .value.toLowerCase();
  const filtered = (window.currentContractorWorkers || []).filter(
    (w) => w.name.toLowerCase().includes(query) || w.id.includes(query),
  );
  window.renderVehWorkersInModal(filtered);
};

// 4. دالة اختيار العامل (خاصة بالسيارات فقط)
window.selectVehWorker = function (id, name) {
  const nameInput = document.getElementById("veh-driver-name");
  const nidInput = document.getElementById("veh-driver-nid");

  if (nameInput) {
    nameInput.value = name;
    nameInput.readOnly = true;
    nameInput.style.backgroundColor = "#e8f5e9"; // لون أخضر
  }
  if (nidInput) {
    nidInput.value = id;
    nidInput.readOnly = true;
    nidInput.style.backgroundColor = "#f0f0f0";
  }

  const modal = document.getElementById("worker-selector-modal");
  if (modal) modal.style.display = "none";
};

// 5. إضافة عامل يدوي (خاصة بالسيارات)
window.addNewVehWorkerManually = function () {
  const query = document.getElementById("worker-search-box").value;
  const nameInput = document.getElementById("veh-driver-name");
  const nidInput = document.getElementById("veh-driver-nid");

  if (nameInput) {
    nameInput.value = query;
    nameInput.readOnly = false;
    nameInput.style.backgroundColor = "#fff";
  }
  if (nidInput) {
    nidInput.value = "";
    nidInput.readOnly = false;
    nidInput.style.backgroundColor = "#fff";
    nidInput.focus();
  }

  const modal = document.getElementById("worker-selector-modal");
  if (modal) modal.style.display = "none";

  alert(
    "الرجاء إدخال الرقم القومي للسائق الجديد ثم الضغط على زر (فحص) للتأكد من عدم تسجيله مسبقاً.",
  );
};

// ---------------------------------------------------------------------
// 6. دوال الموظفين (للسويدي) مستقلة للسيارات
// ---------------------------------------------------------------------
window.openVehEmpSelector = function () {
  const proj = document.getElementById("veh-project").value;
  if (!proj) {
    alert("الرجاء اختيار المشروع أولاً");
    return;
  }

  const modal = document.getElementById("emp-selector-modal");
  if (modal) modal.style.display = "flex";

  const searchBox = document.getElementById("emp-search-box");
  if (searchBox) {
    searchBox.value = "";
    searchBox.oninput = window.filterVehEmpList;
    searchBox.focus();
  }

  const list = (window.ppeEmployees || []).filter((e) => e.project === proj);
  window.renderVehEmpsInModal(list);
};

window.renderVehEmpsInModal = function (list) {
  const container = document.getElementById("emp-list-container");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding:20px; color:#999;">لا يوجد موظفين</p>';
    return;
  }
  container.innerHTML = list
    .map(
      (e) => `
        <div class="ppe-cart-item" style="cursor:pointer; margin-bottom:8px;" onclick="window.selectVehEmployee('${e.id}', '${e.name}')">
            <div style="text-align:right;">
                <span style="display:block; font-weight:700;">${e.name}</span>
                <small style="color:#666;">ID: ${e.id} | ${e.project}</small>
            </div>
            <i class="fas fa-check-circle" style="color:#007bff;"></i>
        </div>
    `,
    )
    .join("");
};

window.filterVehEmpList = function () {
  const query = document.getElementById("emp-search-box").value.toLowerCase();
  const proj = document.getElementById("veh-project").value;
  const baseList = (window.ppeEmployees || []).filter(
    (e) => e.project === proj,
  );
  const filtered = baseList.filter(
    (e) =>
      e.name.toLowerCase().includes(query) || e.id.toString().includes(query),
  );
  window.renderVehEmpsInModal(filtered);
};

window.selectVehEmployee = function (id, name) {
  const nameInput = document.getElementById("veh-driver-name");
  const nidInput = document.getElementById("veh-driver-nid");

  if (nameInput) {
    nameInput.value = name;
    nameInput.readOnly = true;
    nameInput.style.backgroundColor = "#e8f5e9";
  }
  if (nidInput) {
    nidInput.value = id;
    nidInput.readOnly = true;
    nidInput.style.backgroundColor = "#f0f0f0";
  }

  const modal = document.getElementById("emp-selector-modal");
  if (modal) modal.style.display = "none";
};

// =================================================================
// --- وحدة إدارة السيارات (Manage Vehicles) ---
// =================================================================

window.allVehiclesData = [];

window.initManageVehiclesPage = async function () {
  const projSelect = document.getElementById("manage-veh-project");

  // تعبئة المشاريع
  if (projSelect && projSelect.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (
      typeof window.ppeLocations !== "undefined" &&
      window.ppeLocations.length > 0
    ) {
      acc =
        userProj === "ALL"
          ? window.ppeLocations
          : window.ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }
    acc.forEach((p) => projSelect.add(new Option(p, p)));
  }

  window.loadManageVehicles();
};

window.loadManageVehicles = async function () {
  const container = document.getElementById("manage-veh-results");
  const projFilter = document.getElementById("manage-veh-project").value;

  container.innerHTML =
    '<div class="loader-small">جاري جلب بيانات السيارات...</div>';

  try {
    const r = await callApi("getAllVehicles", { userInfo: currentUser });
    if (r.status === "success") {
      // فلترة حسب المشروع المختار
      if (projFilter !== "ALL_ACCESSIBLE") {
        window.allVehiclesData = r.vehicles.filter(
          (v) => v.project === projFilter,
        );
      } else {
        window.allVehiclesData = r.vehicles;
      }
      window.renderManageVehicles(window.allVehiclesData);
    } else {
      container.innerHTML = `<p class="error-message">${r.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">خطأ: ${e.message}</p>`;
  }
};

// حساب الأيام المتبقية وحالة الرخصة
function checkLicenseStatus(dateStr) {
  if (!dateStr || dateStr === "-")
    return { status: "unknown", days: 0, text: "-", badge: "bg-secondary" };

  const expDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return {
      status: "expired",
      days: diffDays,
      text: "منتهية",
      badge: "bg-danger",
    };
  if (diffDays <= 30)
    return {
      status: "warning",
      days: diffDays,
      text: `تنتهي خلال ${diffDays} يوم`,
      badge: "bg-warning",
    };
  return {
    status: "valid",
    days: diffDays,
    text: "سارية",
    badge: "bg-success",
  };
}

window.renderManageVehicles = function (data) {
  const container = document.getElementById("manage-veh-results");
  document.getElementById("veh-alerts-dashboard").style.display = "grid";

  let total = data.length;
  let warning = 0;
  let danger = 0;

  if (total === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding:20px;">لا توجد سيارات مسجلة.</p>';
    document.getElementById("veh-count-total").textContent = "0";
    document.getElementById("veh-count-warning").textContent = "0";
    document.getElementById("veh-count-danger").textContent = "0";
    return;
  }

  let html = `<table class="results-table" style="font-size:0.85rem;">
      <thead>
          <tr>
              <th>رقم اللوحة</th>
              <th>المشروع والمقاول</th>
              <th>السائق</th>
              <th>رخصة السيارة</th>
              <th>رخصة السائق</th>
              <th style="text-align:center;">إجراءات وتفاصيل</th>
          </tr>
      </thead>
      <tbody>`;

  data.forEach((v) => {
    const vehLic = checkLicenseStatus(v.vehLicExp);
    const drvLic = checkLicenseStatus(v.drvLicExp);

    if (vehLic.status === "expired" || drvLic.status === "expired") danger++;
    else if (vehLic.status === "warning" || drvLic.status === "warning")
      warning++;

    html += `<tr>
          <td style="font-weight:bold; font-size:1.1em; color:#0056b3;">${v.plate}</td>
          <td><strong>${v.project}</strong><br><small style="color:#666;">${v.contractor}</small></td>
          <td><strong>${v.driver}</strong><br><small style="color:#666;">${v.driverNid}</small></td>
          <td>
              ${v.vehLicExp}<br>
              <span class="badge ${vehLic.badge}" style="font-size:0.7em;">${vehLic.text}</span>
          </td>
          <td>
              ${v.drvLicExp}<br>
              <span class="badge ${drvLic.badge}" style="font-size:0.7em;">${drvLic.text}</span>
          </td>
          <td style="text-align:center;">
              <div style="display:flex; justify-content:center; gap:5px; margin-bottom:5px;">
                  <button class="btn-small btn-secondary" onclick="window.viewVehicleGPS('${v.id}')" style="background:#17a2b8; border:none; color:white;" title="بيانات الـ GPS">
                      <i class="fas fa-map-marker-alt"></i> GPS
                  </button>
                  <button class="btn-small btn-secondary" onclick="window.viewVehicleInspections('${v.plate}')" style="background:#28a745; border:none; color:white;" title="سجل الفحوصات">
                      <i class="fas fa-clipboard-check"></i> الفحوصات
                  </button>
              </div>
              <div style="display:flex; justify-content:center; gap:5px;">
                  <button class="btn-small btn-secondary" onclick="window.openEditVehicle('${v.id}')" style="background:#ffc107; border:none; color:#000;" title="تعديل البيانات">
                      <i class="fas fa-edit"></i> تعديل
                  </button>
                  <button class="btn-small btn-danger" onclick="window.deleteVehicle('${v.id}', '${v.plate}')" title="مسح من الموقع">
                      <i class="fas fa-trash-alt"></i> إزالة
                  </button>
              </div>
          </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  // تحديث لوحة التنبيهات
  document.getElementById("veh-count-total").textContent = total;
  document.getElementById("veh-count-warning").textContent = warning;
  document.getElementById("veh-count-danger").textContent = danger;
};

// --- دوال عرض النوافذ المنبثقة الجديدة ---

window.viewVehicleGPS = function (id) {
  const veh = window.allVehiclesData.find((v) => v.id === id);
  if (!veh) return;

  document.getElementById("gps-plate-display").textContent = veh.plate;
  document.getElementById("gps-app-display").textContent =
    veh.gpsApp || "غير مسجل";
  document.getElementById("gps-user-display").textContent =
    veh.gpsUser || "غير مسجل";
  document.getElementById("gps-pass-display").textContent =
    veh.gpsPass || "غير مسجل";

  document.getElementById("gps-veh-modal").style.display = "flex";
};

window.viewVehicleInspections = async function (plate) {
  const modal = document.getElementById("insp-history-modal");
  const container = document.getElementById("insp-history-results");

  document.getElementById("insp-history-plate").textContent = plate;
  modal.style.display = "flex";
  container.innerHTML =
    '<div class="loader-small">جاري جلب السجل التفصيلي للفحوصات...</div>';

  try {
    const r = await callApi("getVehicleInspections", { plate: plate });
    if (r.status === "success") {
      if (r.data.length === 0) {
        container.innerHTML =
          '<p style="text-align:center; padding:20px; color:#666;">لم يتم إجراء أي فحوصات لهذه السيارة حتى الآن.</p>';
      } else {
        let html = `<div style="display: flex; flex-direction: column; gap: 15px;">`;

        r.data.forEach((insp, inspIndex) => {
          // توليد الـ 26 نقطة
          let checklistHtml = "";
          if (typeof vehicleChecklistItems !== "undefined") {
            vehicleChecklistItems.forEach((item, idx) => {
              const qKey = `Q${idx + 1}`;
              const score = insp.checklist[qKey] || "-";

              let badgeColor = "#6c757d";
              let scoreLabel = score;
              if (score === "S") {
                badgeColor = "#28a745";
                scoreLabel = "تحقق (S)";
              } else if (score === "U") {
                badgeColor = "#dc3545";
                scoreLabel = "غير متحقق (U)";
              } else if (score === "NA") {
                badgeColor = "#6c757d";
                scoreLabel = "غير مطلوب";
              }

              const arText = item.split(" - ")[0]; // نأخذ الجزء العربي فقط للاختصار

              checklistHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 8px 0;">
                                <span style="flex: 1; padding-left: 10px; font-size: 0.85rem; color:#333;">${idx + 1}. ${arText}</span>
                                <span class="badge" style="background-color: ${badgeColor}; color: white; padding: 4px 8px; font-size: 0.75rem;">${scoreLabel}</span>
                            </div>`;
            });
          }

          // كارت الفحص الواحد (أكورديون)
          // أول كارت نخليه مفتوح تلقائي، والباقي مقفول
          const isFirst = inspIndex === 0;
          const displayStyle = isFirst ? "block" : "none";
          const iconClass = isFirst ? "fa-chevron-up" : "fa-chevron-down";

          html += `
                    <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="background: #f8f9fa; padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;" 
                             onclick="const details = this.nextElementSibling; const icon = this.querySelector('.toggle-icon'); if(details.style.display === 'none'){ details.style.display = 'block'; icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); } else { details.style.display = 'none'; icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }">
                            <div>
                                <strong style="color: #2C2A29; font-size: 1.1rem;">تاريخ الفحص: ${insp.date}</strong> <br>
                                <small style="color: #0056b3;"><i class="fas fa-user-shield"></i> المفتش: ${insp.inspector}</small>
                            </div>
                            <div style="color: #666; font-weight: bold; font-size: 0.9rem;">
                                عرض التفاصيل <i class="fas ${iconClass} toggle-icon" style="margin-right: 5px;"></i>
                            </div>
                        </div>

                        <div style="display: ${displayStyle}; padding: 15px;">
                            <div style="margin-bottom: 15px; background: #fff3cd; padding: 12px; border-right: 4px solid #ffc107; border-radius: 4px;">
                                <p style="margin: 0 0 8px 0; color: #333; line-height: 1.5;"><strong><i class="fas fa-comment-dots"></i> الملاحظات:</strong><br> ${insp.comments}</p>
                                <p style="margin: 0; color: #dc3545; font-weight: bold;">
                                    <i class="fas fa-calendar-times"></i> تاريخ الهدف للإصلاح: ${insp.targetDate && insp.targetDate !== "-" ? insp.targetDate : "غير محدد"}
                                </p>
                            </div>

                            <h4 style="margin-bottom: 10px; color: #17a2b8; border-bottom: 2px dashed #eee; padding-bottom: 5px;">
                                <i class="fas fa-list-ul"></i> تفاصيل الـ 26 بند:
                            </h4>

                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0 20px;">
                               ${checklistHtml}
                            </div>
                        </div>
                    </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
      }
    } else {
      container.innerHTML = `<p class="error-message">${r.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">حدث خطأ: ${e.message}</p>`;
  }
};

window.filterManageVehicles = function () {
  const query = document
    .getElementById("manage-veh-search")
    .value.toLowerCase();
  const filtered = window.allVehiclesData.filter(
    (v) =>
      v.plate.toLowerCase().includes(query) ||
      v.driver.toLowerCase().includes(query) ||
      v.contractor.toLowerCase().includes(query),
  );
  window.renderManageVehicles(filtered);
};

// --- التعديل والمسح ---
window.openEditVehicle = function (id) {
  const veh = window.allVehiclesData.find((v) => v.id === id);
  if (!veh) return;

  document.getElementById("e-veh-id").value = veh.id;
  document.getElementById("e-veh-plate").value = veh.plate;
  document.getElementById("e-veh-type").value = veh.type;

  // تحويل صيغة التاريخ لـ YYYY-MM-DD عشان الـ input date يقرأها
  try {
    document.getElementById("e-veh-lic-exp").value = new Date(
      veh.vehLicExp.split("/").reverse().join("-"),
    )
      .toISOString()
      .split("T")[0];
    document.getElementById("e-drv-lic-exp").value = new Date(
      veh.drvLicExp.split("/").reverse().join("-"),
    )
      .toISOString()
      .split("T")[0];
  } catch (e) {}

  document.getElementById("e-drv-name").value = veh.driver;
  document.getElementById("e-drv-nid").value = veh.driverNid;

  document.getElementById("edit-veh-modal").style.display = "flex";
};

// حفظ التعديلات
const eVehForm = document.getElementById("edit-veh-form");
if (eVehForm) {
  eVehForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("e-veh-save-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    const data = {
      id: document.getElementById("e-veh-id").value,
      plate: document.getElementById("e-veh-plate").value,
      type: document.getElementById("e-veh-type").value,
      vehLicExp: document.getElementById("e-veh-lic-exp").value,
      drvLicExp: document.getElementById("e-drv-lic-exp").value,
      driverName: document.getElementById("e-drv-name").value,
      driverNid: document.getElementById("e-drv-nid").value,
    };

    try {
      const r = await callApi("updateVehicleData", {
        vehData: data,
        userInfo: currentUser,
      });
      alert(r.message);
      document.getElementById("edit-veh-modal").style.display = "none";
      window.loadManageVehicles(); // ريفريش الجدول
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = "حفظ التعديلات";
    }
  });
}

// مسح السيارة
window.deleteVehicle = async function (id, plate) {
  if (
    !confirm(
      `هل أنت متأكد من إزالة السيارة رقم (${plate}) نهائياً من الموقع؟\n(هذا الإجراء لا يمكن التراجع عنه)`,
    )
  )
    return;

  window.showLoader("جاري إزالة السيارة...");
  try {
    const r = await callApi("deleteVehicleRecord", {
      vehId: id,
      userInfo: currentUser,
    });
    alert(r.message);
    window.loadManageVehicles(); // ريفريش الجدول
  } catch (e) {
    alert(e.message);
  } finally {
    window.hideLoader();
  }
};

// =================================================================
// --- وحدة تسجيل المعدات (Equipment Registration) ---
// =================================================================

// مصفوفة بنود فحص المعدات (يمكنك تعديل الأسئلة وزيادتها حسب الشيت الخاص بك)
const equipmentChecklistItems = [
  "وثائق المعدة (شهادة الفحص / الطرف الثالث) - Third Party Certificate",
  "رخصة المعداتي / المشغل - Operator License",
  "الهيكل الخارجي العام للمعدة - General Body Condition",
  "حالة الإطارات أو الجنزير - Tires / Tracks Condition",
  "المحرك وعدم وجود تسريب زيوت أو وقود - Engine & Leaks",
  "النظام الهيدروليكي وخراطيم الضغط - Hydraulic System & Hoses",
  "حالة الفرامل (الأساسية واليدوية) - Brakes",
  "الإضاءة الأمامية والخلفية والإشارات - Lights & Signals",
  "إنذار الرجوع للخلف وآلة التنبيه (البوق) - Reverse Alarm & Horn",
  "المرايا والرؤية من الكابينة - Mirrors & Visibility",
  "توفر وصلاحية طفاية الحريق - Fire Extinguisher",
  "حالة حزام الأمان - Seat Belt Condition",
  "حالة هوك الرفع والواير (للأوناش) - Lifting Hook & Wire Ropes",
  "مفاتيح الإيقاف الطارئ ومحددات الأمان - Emergency Stop Buttons & Limiters",
];

window.initNewEquipmentPage = async function () {
  const eqProject = document.getElementById("eq-project");
  const eqDate = document.getElementById("eq-date");
  const eqTime = document.getElementById("eq-time");

  // 1. ضبط التاريخ والوقت
  const now = new Date();
  if (eqDate) eqDate.valueAsDate = now;
  if (eqTime) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    eqTime.value = `${hh}:${mm}`;
  }

  // 2. تحميل البيانات الأولية إذا لم تكن محملة
  if (!window.ppeLocations || window.ppeLocations.length === 0) {
    try {
      const r = await callApi("getInventoryInitData", {
        userInfo: currentUser,
      });
      if (r.status === "success") {
        window.ppeLocations = r.locations;
      }
    } catch (e) {
      console.error("فشل التحميل الأولي للمعدات:", e);
    }
  }

  // 3. تعبئة المشاريع
  if (eqProject && eqProject.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (
      typeof window.ppeLocations !== "undefined" &&
      window.ppeLocations.length > 0
    ) {
      acc =
        userProj === "ALL"
          ? window.ppeLocations
          : window.ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }
    fillSelect(eqProject, acc);
  }

  window.toggleEqCert(); // تهيئة حقول الشهادة
};

// جلب المقاولين عند تغيير المشروع
window.updateEqContractors = async function () {
  const proj = document.getElementById("eq-project").value;
  const eqContractor = document.getElementById("eq-contractor");

  if (!proj) {
    eqContractor.innerHTML =
      '<option value="">-- اختر المشروع أولاً --</option>';
    eqContractor.disabled = true;
    return;
  }

  eqContractor.innerHTML = "<option>جاري التحميل...</option>";
  eqContractor.disabled = true;

  try {
    const r = await callApi("getContractorsForProject", { projectName: proj });
    if (r.status === "success" && r.contractors && r.contractors.length > 0) {
      fillSelect(eqContractor, r.contractors);
      eqContractor.disabled = false;
    } else {
      eqContractor.innerHTML =
        '<option value="">لا يوجد مقاولين مسجلين</option>';
    }
  } catch (e) {
    eqContractor.innerHTML = "<option>خطأ في التحميل</option>";
  }
};

// إظهار/إخفاء حقول الشهادة
window.toggleEqCert = function () {
  const hasCert = document.getElementById("eq-has-cert").value;
  const certGroup = document.getElementById("eq-cert-group");
  const certIssuer = document.getElementById("eq-cert-issuer");
  const certExp = document.getElementById("eq-cert-exp");
  const certSerial = document.getElementById("eq-cert-serial"); // السيريال الجديد

  if (hasCert === "نعم") {
    certGroup.style.display = "flex";
    certIssuer.setAttribute("required", "required");
    certExp.setAttribute("required", "required");
    certSerial.setAttribute("required", "required");
  } else {
    certGroup.style.display = "none";
    certIssuer.removeAttribute("required");
    certExp.removeAttribute("required");
    certSerial.removeAttribute("required");
    certIssuer.value = "";
    certExp.value = "";
    certSerial.value = "";
  }
};

// حفظ النموذج وإرساله للسيرفر
const eqForm = document.getElementById("equipment-form");
if (eqForm) {
  const newEqForm = eqForm.cloneNode(true);
  eqForm.parentNode.replaceChild(newEqForm, eqForm);

  newEqForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("eq-save-btn");
    const msg = document.getElementById("eq-save-msg");
    let checklistResults = {};
    // اللف على عدد أسئلة المعدات (تأكد أن equipmentChecklistItems معرفة لديك)
    for (let i = 1; i <= equipmentChecklistItems.length; i++) {
      const selectEl = document.getElementById(`eq-chk-${i}`);
      if (selectEl) {
        checklistResults[`Q${i}`] = selectEl.value; // سيخزن (أخضر، أصفر، أزرق، أبيض)
      }
    }
    const eqData = {
      date: document.getElementById("eq-date").value,
      time: document.getElementById("eq-time").value,
      project: document.getElementById("eq-project").value,
      contractor: document.getElementById("eq-contractor").value,
      ownerCompany: document.getElementById("eq-owner-company").value,

      type: document.getElementById("eq-type").value,
      plateChassis:
        document.getElementById("eq-plate-chassis").value || "غير محدد",
      capacity: document.getElementById("eq-capacity").value || "غير محدد",

      operatorName: document.getElementById("eq-operator-name").value,
      operatorNid: document.getElementById("eq-operator-nid").value,
      operatorLicenseExp: document.getElementById("eq-operator-license-exp")
        .value,

      hasCert: document.getElementById("eq-has-cert").value,
      colorCode: document.getElementById("eq-color-code").value,
      certSerial: document.getElementById("eq-cert-serial")
        ? document.getElementById("eq-cert-serial").value
        : "لا يوجد",
      certIssuer: document.getElementById("eq-cert-issuer").value || "لا يوجد",
      certExp: document.getElementById("eq-cert-exp").value || "لا يوجد",
      checklist: checklistResults,
    };

    if (!eqData.contractor) {
      alert("الرجاء اختيار المقاول المورد للمعدة.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const r = await callApi("saveEquipmentRecord", {
        eqData: eqData,
        userInfo: currentUser,
      });
      showMessage(msg, r.message, true);
      newEqForm.reset();
      window.initNewEquipmentPage();
    } catch (err) {
      showMessage(msg, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> تسجيل المعدة في الموقع';
    }
  });
}
// دالة لتغيير لون القائمة المنسدلة بناءً على التقييم المختار
// دالة تلوين قائمة كود الشهر
window.updateEqColorSelect = function (selectEl) {
  const val = selectEl.value;
  selectEl.style.color = "#000"; // افتراضي

  if (val === "أخضر") {
    selectEl.style.backgroundColor = "#28a745";
    selectEl.style.color = "#fff";
  } else if (val === "أصفر") {
    selectEl.style.backgroundColor = "#ffc107";
  } else if (val === "أزرق") {
    selectEl.style.backgroundColor = "#007bff";
    selectEl.style.color = "#fff";
  } else {
    selectEl.style.backgroundColor = "#ffffff";
  }
};
// =================================================================
// --- وحدة الفحص الدوري للمعدات (Equipment Inspection) ---
// =================================================================

const heavyEqChecklistItems = [
  "شهادات المعايرة والرخص وجدول الاحمال ومرشد المستخدم - Calibration Certificates, Load Chart and manual",
  "كابينة القيادة (زجاج-مرايا-مساحات-حزام-طريق وصول) - Operating Unit status",
  "التلفيات وحالة البنوز - Damages and pins status",
  "حالة النظام الهيدروليكي - Hydraulic system condition",
  "حالة المحرك (مستوى المياه والزيت) - Engine status",
  "جنزير الكاتينة والاطارات - Crawling Parts, Tires and Wheels",
  "حالة البطاريات ومستوى ماؤها - Batteries status",
  "تسرب الزيوت - Oil leak",
  "الفرامل - Mechanical brake",
  "تانك الوقود ومستواه - Fuel tank and Level",
  "العلامات التحذيرية - Warning signs",
  "حالة الذراع - Boom status",
  "الأسلاك الكهربية والإضاءات والإشارات وسارينة الإنذار - Electrical wiring, lights, alarms",
  "وسائل حماية الأجزاء الساخنة والمتحركة - Hot/Rotating parts protection",
  "التشحيم - Lubrication",
  "طفاية الحريق - Fire Extinguishers",
  "حالة إسطوانة الدك - Roller status",
  "حالة الكبشة - Bucket Status",
  "حالة الدقاق - Jack Hammer Status",
  "حالة العادم الخارج من المعدة - Exhausts status / Emissions",
];

const liftingEqChecklistItems = [
  "شهادات المعايرة والرخص وجدول الاحمال ومرشد المستخدم - Calibration Certificates, Load chart and manual",
  "كابينة القيادة (زجاج-مرايا-مساحات-حزام-طريق وصول) - Operating Unit status",
  "حالة أسلاك الرفع وحالة الخطاف ومانع إنزلاق الحمولة - Wire, hook block and Load safety latch",
  "حالة البكرة - Sheave condition",
  "الحاسب الآلى - Computer system",
  "حالة البطاريات ومستوى ماؤها - Batteries status",
  "تسرب الزيوت - Oil leak",
  "الفرامل - Mechanical brakes",
  "الركائز والقواعد (Outrigger) - Outrigger and pads",
  "تانك الوقود ومستواه - Fuel tank and level",
  "حالة ذراع الرفع - Boom status",
  "نظام الأمان اليدوى في حالات الطوارئ - Manual system for emergency cases",
  "حالة المحرك (مستوى المياه والزيت) - Engine status",
  "الأسلاك الكهربية والإضاءات والإشارات وسارينة الإنذار - Electrical wiring, lights, alarms",
  "وسائل حماية الأجزاء الساخنة والمتحركة - Hot/Rotating parts protection",
  "مفتاح إيقاف الرفع الآلى - Limit switches",
  "التشحيم - Lubrication",
  "العلامات التحذيرية - Warning signs",
  "طفاية الحريق - Fire extinguishers",
  "جنزير الكاتينة والاطارات - Crawling parts, tires and wheels",
  "حالة النظام الهيدروليكي - Hydraulic system condition",
  "التلفيات وحالة البنوز - Mechanical damages and pins",
  "حالة الشوكة - Fork status",
  "حالة الباسكت - Basket Status",
];

let currentProjectEquipments = [];

window.initEquipmentInspectionPage = function () {
  const projSelect = document.getElementById("e-insp-project");

  // تعبئة المشاريع
  if (projSelect && projSelect.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
      acc =
        userProj === "ALL"
          ? ppeLocations
          : ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }
    window.fillSelect(projSelect, acc);
  }
  window.renderEquipmentChecklist();
};

window.updateEqColorSelect = function (selectEl) {
  const val = selectEl.value;
  selectEl.style.color = "#000";

  if (val === "أخضر") {
    selectEl.style.backgroundColor = "#28a745";
    selectEl.style.color = "#fff";
  } else if (val === "أصفر") {
    selectEl.style.backgroundColor = "#ffc107";
  } else if (val === "أزرق") {
    selectEl.style.backgroundColor = "#007bff";
    selectEl.style.color = "#fff";
  } else if (val === "أحمر") {
    selectEl.style.backgroundColor = "#dc3545";
    selectEl.style.color = "#fff";
  } else {
    selectEl.style.backgroundColor = "#ffffff";
  }
};

window.renderEquipmentChecklist = function () {
  const container = document.getElementById("e-insp-cards-container");
  if (!container) return;

  const typeRadio = document.querySelector(
    'input[name="eq-insp-type"]:checked',
  );
  if (!typeRadio) return;

  const type = typeRadio.value;
  const items =
    type === "Heavy" ? heavyEqChecklistItems : liftingEqChecklistItems;

  let html = "";
  items.forEach((item, index) => {
    const i = index + 1;
    const parts = item.split(" - ");
    const arText = parts[0];
    const enText = parts[1]
      ? `<br><small style="color:#666; font-weight:normal; font-size:0.85rem;">${parts[1]}</small>`
      : "";

    // رسم كروت فحص ال عدات بنفس الشكل الرايق
    html += `
            <div class="insp-item-card">
                <div class="insp-item-title">
                    <span class="badge-num">${i}</span> ${arText} ${enText}
                </div>
                <div class="insp-options-group">
                    <label class="insp-opt-label">
                        <input type="radio" name="eq-chk-${i}" value="S" required>
                        <div class="insp-opt-btn"><i class="fas fa-check"></i> S</div>
                    </label>
                    <label class="insp-opt-label">
                        <input type="radio" name="eq-chk-${i}" value="U" required>
                        <div class="insp-opt-btn"><i class="fas fa-times"></i> U</div>
                    </label>
                    <label class="insp-opt-label">
                        <input type="radio" name="eq-chk-${i}" value="NA" required>
                        <div class="insp-opt-btn"><i class="fas fa-minus"></i> NA</div>
                    </label>
                </div>
            </div>`;
  });
  container.innerHTML = html;
};

window.updateInspectionEquipments = async function () {
  const proj = document.getElementById("e-insp-project").value;
  const plateSelect = document.getElementById("e-insp-plate");

  document.getElementById("e-insp-cont").value = "";
  document.getElementById("e-insp-type").value = "";

  if (!proj) {
    plateSelect.innerHTML =
      '<option value="">-- اختر المشروع أولاً --</option>';
    plateSelect.disabled = true;
    return;
  }

  plateSelect.innerHTML = "<option>جاري التحميل...</option>";
  plateSelect.disabled = true;

  try {
    const r = await callApi("getProjectEquipments", { projectName: proj });
    if (r.status === "success" && r.equipments && r.equipments.length > 0) {
      currentProjectEquipments = r.equipments;
      plateSelect.innerHTML = '<option value="">-- اختر المعدة --</option>';
      r.equipments.forEach((e) => {
        plateSelect.add(
          new Option(`${e.plateChassis} (${e.type})`, e.plateChassis),
        );
      });
      plateSelect.disabled = false;
    } else {
      plateSelect.innerHTML = '<option value="">لا توجد معدات مسجلة</option>';
    }
  } catch (e) {
    plateSelect.innerHTML = "<option>خطأ في التحميل</option>";
  }
};

window.autoFillEquipDetails = function () {
  const plate = document.getElementById("e-insp-plate").value;
  if (!plate) return;

  const eq = currentProjectEquipments.find((v) => v.plateChassis === plate);
  if (eq) {
    document.getElementById("e-insp-cont").value =
      eq.contractor || eq.ownerCompany || "غير محدد";
    document.getElementById("e-insp-type").value = eq.type;
  }
};

const eqInspForm = document.getElementById("eq-insp-form");
if (eqInspForm) {
  const newEqInspForm = eqInspForm.cloneNode(true);
  eqInspForm.parentNode.replaceChild(newEqInspForm, eqInspForm);

  newEqInspForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("e-insp-save-btn");
    const msg = document.getElementById("e-insp-save-msg");

    const type = document.querySelector(
      'input[name="eq-insp-type"]:checked',
    ).value;
    const itemsCount =
      type === "Heavy"
        ? heavyEqChecklistItems.length
        : liftingEqChecklistItems.length;

    let checklistResults = {};
    for (let i = 1; i <= itemsCount; i++) {
      const selected = document.querySelector(
        `input[name="eq-chk-${i}"]:checked`,
      );
      if (!selected) {
        alert(`الرجاء تقييم النقطة رقم ${i}`);
        return;
      }
      checklistResults[`Q${i}`] = selected.value;
    }

    const data = {
      project: document.getElementById("e-insp-project").value,
      plateChassis: document.getElementById("e-insp-plate").value,
      contractor: document.getElementById("e-insp-cont").value,
      type: document.getElementById("e-insp-type").value,
      inspectionType: type,
      colorCode: document.getElementById("e-insp-color").value,
      checklist: checklistResults,
      comments: document.getElementById("e-insp-comments").value,
      targetDate: document.getElementById("e-insp-target-date").value,
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      const r = await callApi("saveEquipmentInspection", {
        data: data,
        userInfo: currentUser,
      });
      showMessage(msg, r.message, true);

      newEqInspForm.reset();
      document.getElementById("e-insp-cont").value = "";
      document.getElementById("e-insp-type").value = "";

      const colorSelect = document.getElementById("e-insp-color");
      if (colorSelect) {
        colorSelect.style.backgroundColor = "#fff";
        colorSelect.style.color = "#000";
      }
      window.renderEquipmentChecklist();
    } catch (err) {
      showMessage(msg, err.message, false);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> اعتماد وحفظ الفحص';
    }
  });
}
// =================================================================
// --- وحدة إدارة ومتابعة المعدات (Manage Equipment) ---
// =================================================================

window.allEquipmentData = [];

window.initManageEquipmentPage = async function () {
  const projSelect = document.getElementById("manage-eq-project");

  if (projSelect && projSelect.options.length <= 1) {
    const userProj = (currentUser.projects || "").toString();
    let acc = [];
    if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
      acc =
        userProj === "ALL"
          ? ppeLocations
          : ppeLocations.filter((p) => userProj.includes(p));
    } else if (initialData && initialData.projects) {
      acc =
        userProj === "ALL"
          ? initialData.projects
          : initialData.projects.filter((p) => userProj.includes(p));
    }

    // تصفير الخيارات القديمة ثم إضافتها
    projSelect.innerHTML =
      '<option value="ALL_ACCESSIBLE">كل المشاريع</option>';
    acc.forEach((p) => projSelect.add(new Option(p, p)));
  }

  // استدعاء جلب البيانات فوراً
  window.loadManageEquipment();
};

window.loadManageEquipment = async function () {
  const container = document.getElementById("manage-eq-results");
  const projFilter = document.getElementById("manage-eq-project").value;

  container.innerHTML =
    '<div class="loader-small">جاري جلب بيانات المعدات...</div>';

  try {
    const r = await callApi("getAllEquipments", { userInfo: currentUser });
    if (r.status === "success") {
      if (projFilter !== "ALL_ACCESSIBLE") {
        window.allEquipmentData = r.equipments.filter(
          (e) => e.project === projFilter,
        );
      } else {
        window.allEquipmentData = r.equipments;
      }
      window.renderManageEquipment(window.allEquipmentData);
    } else {
      container.innerHTML = `<p class="error-message">${r.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">خطأ: ${e.message}</p>`;
  }
};

window.renderManageEquipment = function (data) {
  const container = document.getElementById("manage-eq-results");
  document.getElementById("eq-alerts-dashboard").style.display = "grid";

  let total = data.length;
  let warning = 0;
  let danger = 0;

  if (total === 0) {
    container.innerHTML =
      '<p style="text-align:center; padding:20px;">لا توجد معدات مسجلة.</p>';
    document.getElementById("eq-count-total").textContent = "0";
    document.getElementById("eq-count-warning").textContent = "0";
    document.getElementById("eq-count-danger").textContent = "0";
    return;
  }

  let html = `<table class="results-table" style="font-size:0.85rem;">
        <thead>
            <tr>
                <th>الكود/الشاسيه</th>
                <th>المشروع والمقاول</th>
                <th>النوع والمشغل</th>
                <th>شهادة المعايرة</th>
                <th>رخصة المشغل</th>
                <th style="text-align:center;">كود الفحص</th>
                <th style="text-align:center;">إجراءات وتفاصيل</th>
            </tr>
        </thead>
        <tbody>`;

  data.forEach((eq) => {
    const certExp = checkLicenseStatus(eq.certExp);
    const opExp = checkLicenseStatus(eq.operatorLicExp);

    let isRejected = eq.colorCode && eq.colorCode.includes("أحمر");

    if (
      isRejected ||
      certExp.status === "expired" ||
      opExp.status === "expired"
    ) {
      danger++;
    } else if (certExp.status === "warning" || opExp.status === "warning") {
      warning++;
    }

    // تجهيز شكل كود اللون
    let colorBg = "#6c757d";
    let colorTxt = "#fff";
    let colorDisplay = eq.colorCode;

    if (eq.colorCode.includes("أخضر")) colorBg = "#28a745";
    else if (eq.colorCode.includes("أصفر")) {
      colorBg = "#ffc107";
      colorTxt = "#000";
    } else if (eq.colorCode.includes("أزرق")) colorBg = "#007bff";
    else if (eq.colorCode.includes("أحمر")) {
      colorBg = "#dc3545";
      colorDisplay = "مرفوضة / إيقاف";
    } else if (eq.colorCode.includes("أبيض")) {
      colorBg = "#f8f9fa";
      colorTxt = "#000";
    }

    html += `<tr>
            <td style="font-weight:bold; font-size:1.1em; color:#0056b3;">${eq.plate}</td>
            <td><strong>${eq.project}</strong><br><small style="color:#666;">${eq.contractor}</small></td>
            <td><strong>${eq.type}</strong><br><small style="color:#666;">${eq.operator}</small></td>
            <td>
                ${eq.certExp}<br>
                <span class="badge ${certExp.badge}" style="font-size:0.7em;">${certExp.text}</span>
            </td>
            <td>
                ${eq.operatorLicExp}<br>
                <span class="badge ${opExp.badge}" style="font-size:0.7em;">${opExp.text}</span>
            </td>
            <td style="text-align:center;">
                <span class="badge" style="background-color:${colorBg}; color:${colorTxt}; padding: 6px 10px; font-size: 0.85em;">
                    ${colorDisplay}
                </span>
            </td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:5px; margin-bottom:5px;">
                    <button class="btn-small btn-secondary" onclick="window.viewEquipmentInspections('${eq.plate}')" style="background:#28a745; border:none; color:white; width:100%;" title="سجل الفحوصات">
                        <i class="fas fa-clipboard-check"></i> الفحوصات
                    </button>
                </div>
                <div style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn-small btn-secondary" onclick="window.openEditEquipment('${eq.id}')" style="background:#ffc107; border:none; color:#000; flex:1;" title="تعديل البيانات">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn-small btn-danger" onclick="window.deleteEquipment('${eq.id}', '${eq.plate}')" style="flex:1;" title="مسح من الموقع">
                        <i class="fas fa-trash-alt"></i> إزالة
                    </button>
                </div>
            </td>
        </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  document.getElementById("eq-count-total").textContent = total;
  document.getElementById("eq-count-warning").textContent = warning;
  document.getElementById("eq-count-danger").textContent = danger;
};

window.filterManageEquipment = function () {
  const query = document.getElementById("manage-eq-search").value.toLowerCase();
  const filtered = window.allEquipmentData.filter(
    (e) =>
      e.plate.toLowerCase().includes(query) ||
      e.operator.toLowerCase().includes(query) ||
      e.contractor.toLowerCase().includes(query),
  );
  window.renderManageEquipment(filtered);
};

// --- سجل الفحوصات للمعدة ---
window.viewEquipmentInspections = async function (plate) {
  const modal = document.getElementById("eq-insp-history-modal");
  const container = document.getElementById("eq-history-results");

  document.getElementById("eq-history-plate").textContent = plate;
  modal.style.display = "flex";
  container.innerHTML =
    '<div class="loader-small">جاري جلب سجل فحوصات المعدة...</div>';

  try {
    const r = await callApi("getEquipmentInspections", { plate: plate });
    if (r.status === "success") {
      if (r.data.length === 0) {
        container.innerHTML =
          '<p style="text-align:center; padding:20px; color:#666;">لم يتم إجراء أي فحوصات لهذه المعدة حتى الآن.</p>';
      } else {
        let html = `<div style="display: flex; flex-direction: column; gap: 15px;">`;

        r.data.forEach((insp, inspIndex) => {
          const itemsArr =
            insp.inspectionType === "Heavy"
              ? heavyEqChecklistItems
              : liftingEqChecklistItems;
          let checklistHtml = "";

          itemsArr.forEach((item, idx) => {
            const qKey = `Q${idx + 1}`;
            const score = insp.checklist[qKey] || "-";

            let badgeColor = "#6c757d";
            let scoreLabel = score;
            if (score === "S") {
              badgeColor = "#28a745";
              scoreLabel = "سليم (S)";
            } else if (score === "U") {
              badgeColor = "#dc3545";
              scoreLabel = "غير سليم (U)";
            } else if (score === "NA") {
              badgeColor = "#6c757d";
              scoreLabel = "لا ينطبق";
            }

            const arText = item.split(" - ")[0];

            checklistHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 8px 0;">
                                <span style="flex: 1; padding-left: 10px; font-size: 0.85rem; color:#333;">${idx + 1}. ${arText}</span>
                                <span class="badge" style="background-color: ${badgeColor}; color: white; padding: 4px 8px; font-size: 0.75rem;">${scoreLabel}</span>
                            </div>`;
          });

          const isFirst = inspIndex === 0;
          const displayStyle = isFirst ? "block" : "none";
          const iconClass = isFirst ? "fa-chevron-up" : "fa-chevron-down";

          // لون كود الفحص في الهيدر
          let histColorBg = "#6c757d";
          if (insp.colorCode.includes("أخضر")) histColorBg = "#28a745";
          else if (insp.colorCode.includes("أصفر")) histColorBg = "#ffc107";
          else if (insp.colorCode.includes("أزرق")) histColorBg = "#007bff";
          else if (insp.colorCode.includes("أحمر")) histColorBg = "#dc3545";

          html += `
                        <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="background: #f8f9fa; padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; border-right: 5px solid ${histColorBg};" 
                                 onclick="const details = this.nextElementSibling; const icon = this.querySelector('.toggle-icon'); if(details.style.display === 'none'){ details.style.display = 'block'; icon.classList.replace('fa-chevron-down', 'fa-chevron-up'); } else { details.style.display = 'none'; icon.classList.replace('fa-chevron-up', 'fa-chevron-down'); }">
                                <div>
                                    <strong style="color: #2C2A29; font-size: 1.1rem;">تاريخ الفحص: ${insp.date}</strong> <br>
                                    <small style="color: #0056b3;"><i class="fas fa-user-shield"></i> المفتش: ${insp.inspector}</small><br>
                                    <small style="color: #555;"><i class="fas fa-tag"></i> كود اللون: ${insp.colorCode}</small>
                                </div>
                                <div style="color: #666; font-weight: bold; font-size: 0.9rem;">
                                    عرض التفاصيل <i class="fas ${iconClass} toggle-icon" style="margin-right: 5px;"></i>
                                </div>
                            </div>
                            <div style="display: ${displayStyle}; padding: 15px;">
                                <div style="margin-bottom: 15px; background: #fff3cd; padding: 12px; border-right: 4px solid #ffc107; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; color: #333; line-height: 1.5;"><strong><i class="fas fa-comment-dots"></i> الملاحظات:</strong><br> ${insp.comments}</p>
                                    <p style="margin: 0; color: #dc3545; font-weight: bold;">
                                        <i class="fas fa-calendar-times"></i> تاريخ الهدف للإصلاح: ${insp.targetDate && insp.targetDate !== "-" ? insp.targetDate : "غير محدد"}
                                    </p>
                                </div>
                                <h4 style="margin-bottom: 10px; color: #17a2b8; border-bottom: 2px dashed #eee; padding-bottom: 5px;">
                                    <i class="fas fa-list-ul"></i> تفاصيل أسئلة الفحص:
                                </h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0 20px;">
                                    ${checklistHtml}
                                </div>
                            </div>
                        </div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
      }
    } else {
      container.innerHTML = `<p class="error-message">${r.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">حدث خطأ: ${e.message}</p>`;
  }
};

// --- التعديل والإزالة ---
window.openEditEquipment = function (id) {
  const eq = window.allEquipmentData.find((v) => v.id === id);
  if (!eq) return;

  document.getElementById("e-eq-id").value = eq.id;
  document.getElementById("e-eq-plate").value = eq.plate;
  document.getElementById("e-eq-type").value = eq.type;

  try {
    document.getElementById("e-eq-cert-exp").value = new Date(
      eq.certExp.split("/").reverse().join("-"),
    )
      .toISOString()
      .split("T")[0];
    document.getElementById("e-eq-op-exp").value = new Date(
      eq.operatorLicExp.split("/").reverse().join("-"),
    )
      .toISOString()
      .split("T")[0];
  } catch (e) {}

  document.getElementById("e-eq-op-name").value = eq.operator;
  document.getElementById("e-eq-op-nid").value = eq.operatorNid;

  document.getElementById("edit-eq-modal").style.display = "flex";
};

const eEqForm = document.getElementById("edit-eq-form");
if (eEqForm) {
  eEqForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("e-eq-save-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    const data = {
      id: document.getElementById("e-eq-id").value,
      plate: document.getElementById("e-eq-plate").value,
      type: document.getElementById("e-eq-type").value,
      certExp: document.getElementById("e-eq-cert-exp").value,
      opExp: document.getElementById("e-eq-op-exp").value,
      opName: document.getElementById("e-eq-op-name").value,
      opNid: document.getElementById("e-eq-op-nid").value,
    };

    try {
      const r = await callApi("updateEquipmentData", {
        eqData: data,
        userInfo: currentUser,
      });
      alert(r.message);
      document.getElementById("edit-eq-modal").style.display = "none";
      window.loadManageEquipment();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = "حفظ التعديلات";
    }
  });
}

window.deleteEquipment = async function (id, plate) {
  if (
    !confirm(
      `هل أنت متأكد من إزالة المعدة رقم/كود (${plate}) نهائياً من الموقع؟\n(هذا الإجراء لا يمكن التراجع عنه)`,
    )
  )
    return;

  window.showLoader("جاري إزالة المعدة...");
  try {
    const r = await callApi("deleteEquipmentRecord", {
      eqId: id,
      userInfo: currentUser,
    });
    alert(r.message);
    window.loadManageEquipment();
  } catch (e) {
    alert(e.message);
  } finally {
    window.hideLoader();
  }
};
// =================================================================
// --- وحدة لوحة شرف المشاريع التراكمية (Cumulative Leaderboard) ---
// =================================================================

window.initLeaderboardPage = function () {
  const fromInput = document.getElementById("leaderboard-from");
  const toInput = document.getElementById("leaderboard-to");
  const now = new Date();

  // افتراضياً: من بداية السنة الحالية إلى الشهر الحالي
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const startOfYearStr = `${now.getFullYear()}-01`;

  if (!fromInput.value) fromInput.value = startOfYearStr;
  if (!toInput.value) toInput.value = currentMonthStr;

  window.loadLeaderboard();
};

window.loadLeaderboard = async function () {
  const container = document.getElementById("leaderboard-results");
  const fromStr = document.getElementById("leaderboard-from").value;
  const toStr = document.getElementById("leaderboard-to").value;

  if (!fromStr || !toStr) return;

  if (new Date(fromStr) > new Date(toStr)) {
    alert("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية!");
    return;
  }

  container.innerHTML =
    '<div style="text-align:center; padding:50px; color:#0056b3;"><i class="fas fa-spinner fa-spin fa-3x"></i><h3 style="margin-top:20px;">جاري تجميع البيانات وحساب التقييم التراكمي...</h3><p>برجاء الانتظار، يتم الآن فحص كافة السجلات للفترة المحددة.</p></div>';

  try {
    const r = await callApi("getProjectsLeaderboard", {
      fromMonth: fromStr,
      toMonth: toStr,
    });

    if (r.status === "success") {
      if (r.leaderboard.length === 0) {
        container.innerHTML =
          '<div style="text-align:center; padding:40px; color:#777;"><i class="fas fa-folder-open fa-3x" style="color:#ccc;"></i><p>لا توجد بيانات مسجلة في أي مشروع خلال هذه الفترة التراكمية.</p></div>';
        return;
      }

      let html = "";
      r.leaderboard.forEach((proj, index) => {
        let rankBadge = `<span style="font-size:1.5rem; font-weight:bold; color:#777;">#${index + 1}</span>`;
        let cardBorder = "border: 1px solid #ddd;";
        let bgTitle = "#f8f9fa";

        if (index === 0) {
          rankBadge = `<i class="fas fa-medal fa-2x" style="color:#ffd700;" title="المركز الأول"></i>`;
          cardBorder =
            "border: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2);";
          bgTitle = "#fffcf0";
        } else if (index === 1) {
          rankBadge = `<i class="fas fa-medal fa-2x" style="color:#c0c0c0;" title="المركز الثاني"></i>`;
          cardBorder = "border: 2px solid #c0c0c0;";
        } else if (index === 2) {
          rankBadge = `<i class="fas fa-medal fa-2x" style="color:#cd7f32;" title="المركز الثالث"></i>`;
          cardBorder = "border: 2px solid #cd7f32;";
        }

        let scoreColor = "#28a745";
        if (proj.score < 70) scoreColor = "#dc3545";
        else if (proj.score < 90) scoreColor = "#ffc107";

        const d = proj.details;

        html += `
                    <div style="background:#fff; border-radius:12px; overflow:hidden; ${cardBorder} margin-bottom:10px;">

                        <div style="display:flex; justify-content:space-between; align-items:center; background:${bgTitle}; padding:15px 20px; border-bottom:1px solid #eee;">
                            <div style="display:flex; align-items:center; gap:15px;">
                                <div style="width:40px; text-align:center;">${rankBadge}</div>
                                <h3 style="margin:0; color:#2c2a29; font-size:1.4rem;">${proj.project}</h3>
                            </div>
                            <div style="text-align:right;">
                                <span style="font-size:0.9rem; color:#666;">التقييم التراكمي للمشروع</span><br>
                                <span style="font-size:1.8rem; font-weight:900; color:${scoreColor};">${proj.score}<small style="font-size:1rem;">%</small></span>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; padding:20px; background:#fafafa;">

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                                <div style="font-size:0.85rem; color:#666; margin-bottom:5px;"><i class="fas fa-eye" style="color:#007bff;"></i> إغلاق الملاحظات</div>
                                <div style="font-weight:bold; font-size:1.2rem; color:#333;">${d.obsRate}%</div>
                                <div style="font-size:0.75rem; color:#999;">(${d.obsClosed} من ${d.obsTotal})</div>
                            </div>

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                                <div style="font-size:0.85rem; color:#666; margin-bottom:5px;"><i class="fas fa-exclamation-circle" style="color:#fd7e14;"></i> إغلاق الهازرد</div>
                                <div style="font-weight:bold; font-size:1.2rem; color:#333;">${d.hazRate}%</div>
                                <div style="font-size:0.75rem; color:#999;">(${d.hazClosed} من ${d.hazTotal})</div>
                            </div>

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                                <div style="font-size:0.85rem; color:#666; margin-bottom:5px;"><i class="fas fa-file-signature" style="color:#6f42c1;"></i> إغلاق الـ NCR</div>
                                <div style="font-weight:bold; font-size:1.2rem; color:#333;">${d.ncrRate}%</div>
                                <div style="font-size:0.75rem; color:#999;">(${d.ncrClosed} من ${d.ncrTotal})</div>
                            </div>

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; text-align:center;">
                                <div style="font-size:0.85rem; color:#666; margin-bottom:5px;"><i class="fas fa-ambulance" style="color:#dc3545;"></i> إغلاق الحوادث</div>
                                <div style="font-weight:bold; font-size:1.2rem; color:#333;">${d.accRate}%</div>
                                <div style="font-size:0.75rem; color:#999;">(${d.accClosed} من ${d.accTotal})</div>
                            </div>

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; display:flex; justify-content:space-around; align-items:center;">
                                <div style="text-align:center;">
                                    <div style="font-size:0.8rem; color:#666;"><i class="fas fa-chalkboard-teacher" style="color:#20c997;"></i> دورات تدريبية</div>
                                    <div style="font-weight:bold; font-size:1.1rem; color:#333;">${d.train}</div>
                                </div>
                                <div style="width:1px; height:30px; background:#eee;"></div>
                                <div style="text-align:center;">
                                    <div style="font-size:0.8rem; color:#666;"><i class="fas fa-ban" style="color:#dc3545;"></i> المخالفات</div>
                                    <div style="font-weight:bold; font-size:1.1rem; color:${d.vio > 0 ? "#dc3545" : "#28a745"};">${d.vio}</div>
                                </div>
                            </div>

                            <div style="background:#fff; border:1px solid #eee; border-radius:8px; padding:10px; display:flex; justify-content:space-around; align-items:center;">
                                <div style="text-align:center;">
                                    <div style="font-size:0.8rem; color:#666;"><i class="fas fa-fire-extinguisher" style="color:#e91e63;"></i> تجارب إخلاء</div>
                                    <div style="font-weight:bold; font-size:1.1rem; color:#333;">${d.drills}</div>
                                </div>
                                <div style="width:1px; height:30px; background:#eee;"></div>
                                <div style="text-align:center;">
                                    <div style="font-size:0.8rem; color:#666;"><i class="fas fa-bullhorn" style="color:#007bff;"></i> حملات توعية</div>
                                    <div style="font-weight:bold; font-size:1.1rem; color:#333;">${d.campaigns}</div>
                                </div>
                            </div>

                        </div>
                    </div>
                `;
      });

      container.innerHTML = html;
    } else {
      container.innerHTML = `<p class="error-message">${r.message}</p>`;
    }
  } catch (e) {
    container.innerHTML = `<p class="error-message">حدث خطأ في الاتصال بالخادم: ${e.message}</p>`;
  }
};

// ==========================================
// وحدة المساعد الذكي (النص والصوت)
// ==========================================

// إعدادات الصوت (Speech Recognition)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "ar-EG"; // اللغة العربية
  recognition.interimResults = false;

  recognition.onstart = function () {
    document.getElementById("mic-btn").classList.add("mic-active");
  };

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById("ai-chat-input").value = transcript;
    sendAiMessage(); // إرسال الرسالة تلقائياً بعد التحدث
  };

  recognition.onerror = function (event) {
    console.error("Voice Error: ", event.error);
    document.getElementById("mic-btn").classList.remove("mic-active");
  };

  recognition.onend = function () {
    document.getElementById("mic-btn").classList.remove("mic-active");
  };
}

function startVoiceRecognition() {
  if (recognition) {
    recognition.start();
  } else {
    alert("عذراً، متصفحك لا يدعم خاصية التحدث الصوتي.");
  }
}

// ==========================================
// وحدة التحكم في القراءة الصوتية (Text to Speech)
// ==========================================

// ==========================================
// وحدة التحكم في القراءة الصوتية (Text to Speech)
// ==========================================

let isAiVoiceEnabled = true; // الصوت شغال افتراضياً

// دالة تشغيل/إيقاف الصوت من الزرار
function toggleAiVoice() {
  isAiVoiceEnabled = !isAiVoiceEnabled;
  const btnIcon = document.querySelector("#ai-voice-toggle-btn i");

  if (isAiVoiceEnabled) {
    btnIcon.className = "fas fa-volume-up";
  } else {
    btnIcon.className = "fas fa-volume-mute";
    window.speechSynthesis.cancel(); // السطر ده بيسكت البوت فوراً
  }
}

// دالة نطق رد البوت (محسنة لإجبار المتصفح على قراءة العربي)
function speakText(text) {
  if (!isAiVoiceEnabled) return;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel(); // إيقاف أي كلام قديم

    // 1. تنظيف النص من الرموز والـ HTML
    let cleanText = text.replace(/<[^>]*>?/gm, " ");
    cleanText = cleanText.replace(/[*_#`\[\]\-]/g, "");

    // 2. إزالة الإيموجيز بشكل كامل عشان متعملش تشويش للصوت
    cleanText = cleanText.replace(
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu,
      "",
    );

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // 3. إجبار المتصفح على اللغة العربية
    utterance.lang = "ar-SA";
    utterance.rate = 1.0; // سرعة القراءة

    // دالة لاختيار الصوت العربي بذكاء
    function playWithArabicVoice() {
      let voices = window.speechSynthesis.getVoices();

      // البحث عن أي صوت عربي (حتى لو اسمه بالإنجليزي زي Tarik أو Laila)
      let arabicVoice = voices.find(
        (v) =>
          v.lang.startsWith("ar") ||
          v.name.includes("Arabic") ||
          v.name.includes("العربية") ||
          v.name.includes("Magid") ||
          v.name.includes("Tarik") ||
          v.name.includes("Laila"),
      );

      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      window.speechSynthesis.speak(utterance);
    }

    // 4. حل مشكلة تأخر المتصفح في تحميل الأصوات
    if (window.speechSynthesis.getVoices().length === 0) {
      // لو الأصوات لسه محملتش، استنى لحد ما تحمل وبعدين اتكلم
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        playWithArabicVoice,
        { once: true },
      );
    } else {
      // لو محملة جاهزة، اتكلم فوراً
      playWithArabicVoice();
    }
  }
}

// دالة فتح وإغلاق الشات وإخفاء الأيقونة
function toggleAiChat() {
  const modal = document.getElementById("ai-chat-modal");
  const triggerBtn = document.getElementById("ai-chat-trigger-btn");

  if (modal.style.display === "none" || modal.style.display === "") {
    modal.style.display = "flex"; // فتح الشات
    triggerBtn.style.display = "none"; // إخفاء الأيقونة الدائرية
  } else {
    modal.style.display = "none"; // إغلاق الشات
    triggerBtn.style.display = "flex"; // إظهار الأيقونة الدائرية
  }
}

// دالة إرسال الرسالة
async function sendAiMessage() {
  const input = document.getElementById("ai-chat-input");
  const msgsContainer = document.getElementById("ai-chat-messages");
  const query = input.value.trim();

  if (!query) return;

  // عرض رسالة المستخدم (يمين)
  msgsContainer.innerHTML += `
        <div style="align-self: flex-start; background: #c8102e; color: white; padding: 12px 15px; border-radius: 15px 15px 0 15px; max-width: 85%; font-size: 0.95rem; margin-bottom: 10px;">
            ${window.escapeHTML ? window.escapeHTML(query) : query}
        </div>
    `;
  input.value = "";

  // عرض اللودر (يسار)
  const loaderId = "loader-" + Date.now();
  msgsContainer.innerHTML += `
        <div id="${loaderId}" style="align-self: flex-end; background: #e9ecef; color: #333; padding: 12px 15px; border-radius: 15px 15px 15px 0; max-width: 85%; font-size: 0.9rem; margin-bottom: 10px;">
            <i class="fas fa-spinner fa-spin"></i> جاري فحص البيانات...
        </div>
    `;
  msgsContainer.scrollTop = msgsContainer.scrollHeight;

  try {
    // إصلاح الخطأ: تأكدنا أن اسم العملية هو 'askSmartAssistant' كما في السيرفر
    const result = await window.callApi("askSmartAssistant", { query: query });

    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();

    if (result && result.status === "success") {
      msgsContainer.innerHTML += `
            <div style="align-self: flex-start; background: #fff; padding: 12px 15px; border-radius: 15px 15px 15px 0; max-width: 90%; font-size: 0.95rem; border: 1px solid #ddd; line-height: 1.6; color: #333; margin-bottom: 10px; white-space: pre-wrap;">
                ${result.answer}
            </div>
        `;
      if (typeof speakText === "function") speakText(result.answer);
    } else {
      throw new Error(result.message || "حدث خطأ غير معروف.");
    }
  } catch (err) {
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
    msgsContainer.innerHTML += `
            <div style="align-self: flex-end; background: #fff5f5; color: #dc3545; padding: 12px 15px; border-radius: 15px 15px 15px 0; max-width: 85%; font-size: 0.9rem; border: 1px solid #f5c6cb; margin-bottom: 10px;">
                عذراً: ${err.message}
            </div>
        `;
  }
  msgsContainer.scrollTop = msgsContainer.scrollHeight;
}
