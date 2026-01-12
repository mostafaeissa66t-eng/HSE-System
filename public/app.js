// =================================== */
// CLIENT-SIDE LOGIC (app.js - Final V7 - All Modules Included)
// =================================== */

// API endpoint on the same server (points to api/index.js or server.js via proxy)
// --- التعريفات العالمية (Global Scope) ---
let evaluatedEmpIds = [];
let currentUser = null;
const API_URL = "/api";

// جعل دوال اللودر عالمية لأن callApi تعتمد عليها
function showLoader(message = "جاري التحميل...") {
  const loader = document.getElementById("loader-overlay");
  const loaderText = loader ? loader.querySelector("p") : null;
  if (loaderText) loaderText.textContent = message;
  if (loader) loader.style.display = "flex";
}
function showMessage(element, text, isSuccess) {
  if (element) {
    element.textContent = text;
    element.className = isSuccess ? "success-message" : "error-message";
    element.style.display = "block";
    setTimeout(() => {
      if (element) element.style.display = "none";
    }, 5000);
  }
}
function hideLoader() {
  const loader = document.getElementById("loader-overlay");
  setTimeout(() => {
    if (loader) loader.style.display = "none";
  }, 100);
}

// الدالة الأهم: جعل callApi عالمية لكي تراها كل الصفحات والبوب أب
async function callApi(action, payload) {
  showLoader(`جاري ${action}...`);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, payload: payload }),
    });
    const responseText = await response.text();
    hideLoader();
    const result = JSON.parse(responseText);
    if (result && result.status === "error") throw new Error(result.message);
    return result;
  } catch (error) {
    hideLoader();
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}
// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
  // --- GLOBAL STATE ---

  // ============================================================
  // (*** جديد ***) التحقق من وجود جلسة محفوظة
  // ============================================================
  const savedSession = localStorage.getItem("hse_user_session");
  if (savedSession) {
    try {
      // استرجاع البيانات
      const parsedUser = JSON.parse(savedSession);

      // محاكاة عملية نجاح الدخول عشان نشغل الموقع علطول
      // (بنستخدم setTimeout عشان نضمن إن الدوال التانية اتحملت)
      setTimeout(() => {
        if (typeof onLoginSuccess === "function") {
          console.log("تم استعادة الجلسة للمستخدم:", parsedUser.username);
          onLoginSuccess({ userInfo: parsedUser });
        }
      }, 100);
    } catch (e) {
      console.error("خطأ في استعادة الجلسة", e);
      localStorage.removeItem("hse_user_session"); // مسح البيانات التالفة
    }
  }

  // --- SELECTORS ---
  // (Ensure these IDs match your public/index.html)
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
      children: ["NewObservation", "MyObservations", "MonitorObservations"], // أضفناها هنا
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
      children: ["KpiEvaluation", "ContractorEvaluation"],
    },
    {
      type: "group",
      title: "إدارة المقاولين",
      icon: "fas fa-hard-hat", // أيقونة الخوذة (مناسبة للمقاولين)
      children: ["NewContractor", "ContractorAnalytics"],
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

  // --- API Call Function (Defined AFTER utilities) ---
  async function callApi(action, payload) {
    let loaderMessage = `جاري ${action}...`;
    if (action === "checkLogin") loaderMessage = "جاري تسجيل الدخول...";
    if (action === "getInitialData") loaderMessage = "جاري تحميل البيانات...";
    if (action === "savePermit") loaderMessage = "جاري حفظ التصريح...";
    if (action === "saveObservation") loaderMessage = "جاري حفظ الملاحظة...";
    if (action === "getOpenPermits") loaderMessage = "جاري تحميل التصاريح...";
    if (action === "closePermit") loaderMessage = "جاري إغلاق التصريح...";
    if (action === "searchPermits") loaderMessage = "جاري البحث...";
    if (action === "getEmployeesToEvaluate")
      loaderMessage = "جاري تحميل الموظفين...";
    if (action === "getKPIsForEmployee")
      loaderMessage = "جاري تحميل المؤشرات...";
    if (action === "saveEvaluations") loaderMessage = "جاري حفظ التقييم...";

    // (جديد) رسائل المخزن
    if (action === "getInventoryInitData")
      loaderMessage = "جاري تحميل بيانات المخزن...";
    if (action === "getRecipientByNID")
      loaderMessage = "جاري البحث بالرقم القومي...";
    if (action === "checkStockBalance") loaderMessage = "جاري فحص الرصيد...";
    if (action === "saveTransaction") loaderMessage = "جاري حفظ الحركة...";
    if (action === "getProjectStockReport")
      loaderMessage = "جاري تحميل التقرير...";

    showLoader(loaderMessage);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, payload: payload }),
      });
      const responseText = await response.text();
      hideLoader();

      if (!response.ok) {
        console.error(
          `API Error Response (${response.status}) for action ${action}:`,
          responseText,
        );
        let errorMsg = `API Error: ${response.status} ${response.statusText}`;
        try {
          const ed = JSON.parse(responseText);
          if (ed.message) errorMsg = ed.message;
        } catch (e) {
          /* ignore */
        }
        throw new Error(errorMsg);
      }
      try {
        const result = JSON.parse(responseText);
        if (result && result.status === "error") {
          console.error(
            `Google Script Error for action ${action}:`,
            result.message,
          );
          throw new Error(result.message || "خطأ من السيرفر.");
        }
        return result;
      } catch (parseError) {
        console.error(
          `JSON Parse Error for action ${action}:`,
          parseError,
          "Raw:",
          responseText,
        );
        throw new Error(
          `Received invalid response: ${responseText.substring(0, 100)}...`,
        );
      }
    } catch (error) {
      hideLoader(); // Ensure hidden on error
      console.error(`callApi Error for action ${action}:`, error);
      throw new Error(`فشل الاتصال بالخادم (${action}): ${error.message}`);
    }
  }

  // --- =================================== ---
  // --- START APPLICATION LOGIC (Defined AFTER helpers)
  // --- =================================== ---

  // --- Login Logic ---
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const u = document.getElementById("username");
      const p = document.getElementById("password");
      if (!u || !p) return;
      if (loginError) loginError.style.display = "none";
      try {
        const r = await callApi("checkLogin", {
          username: u.value,
          password: p.value,
        });
        onLoginSuccess(r);
      } catch (err) {
        onLoginFailure(err);
      }
    });
  } else {
    console.error("#login-form not found.");
  }

  function onLoginSuccess(response) {
    // حفظ الجلسة
    localStorage.setItem("hse_user_session", JSON.stringify(response.userInfo));

    currentUser = response.userInfo;

    // إخفاء اللوجن وإظهار التطبيق
    if (loginScreen) loginScreen.style.display = "none";
    if (appWrapper) appWrapper.style.display = "flex";

    // (1) تحديث بيانات السايد بار (القديم)
    const wu = document.getElementById("welcome-user");
    const ur = document.getElementById("user-role");
    if (wu) wu.textContent = `أهلاً، ${currentUser.username}`;
    if (ur) ur.textContent = currentUser.role;

    // (2) تحديث لوحة التحكم الجديدة (Dashboard)
    const dashWelcome = document.getElementById("dash-welcome");
    const dashRoleVal = document.getElementById("dash-role-val");
    const dashDateVal = document.getElementById("dash-date-val");

    if (dashWelcome)
      dashWelcome.textContent = `مرحباً بك، ${currentUser.username}`;
    if (dashRoleVal) dashRoleVal.textContent = currentUser.role;

    // وضع تاريخ اليوم بالعربي أو الإنجليزي
    if (dashDateVal) {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      dashDateVal.textContent = new Date().toLocaleDateString("ar-EG", options);
    }

    // تشغيل باقي النظام
    buildSidebar(currentUser.sections);
    loadInitialData();

    // التوجيه للداشبورد
    showSection("Dashboard");
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
      localStorage.removeItem("hse_user_session");
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

  // دالة مساعدة لإنشاء قائe�ة منسدلة
  function createGroupMenu(title, iconClass, childrenIds, parentContainer) {
    const li = document.createElement("li");

    // 1. رأس n�لقائمة (العنوان)
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
        // resetObservationForm(); // <-- امسح القديمة دي لو موجودة
        initObservationPage(); // <-- واستe�دم الجديدة دي
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
      // أضف الكود هنا
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
        initViolationPage(); // (مهم) تشغيل المخالفات <-- ده اللي هينشط الكود الرمادي
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

    // الشرط: لو الساعة أكبر من أو تساوي 8 (يعني من 8:00 وأنت طالع)
    // يمكنك تعديل الشرط لو عايزها بعد 8:30 مثلاً
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

      // 2. تجميع البيانات (باستخدام ?.value لمنع الأخطاء لو العنصر مش موجود)
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

      // 5. الإرسال للسيa�فر
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

    // الت(�كد من إخفاء المقاول
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
      lc.innerHTML = "<p>لا توجد تصاريح مفتوحة.</p>";
      return;
    }
    if (response.permits) {
      lc.innerHTML = "";
      response.permits.forEach((p) => {
        const card = document.createElement("div");
        card.className = "permit-card";
        card.innerHTML = `<div class="permit-info"><p><strong>المشروع:</strong> ${p.project || "-"}</p><p><strong>النوع:</strong> ${p.type || "-"}</p><p><strong>التاريخ:</strong> ${p.date || "-"}</p><p><strong>الوصف:</strong> ${p.description || "-"}</p><p><strong>ID:</strong> ${p.id || "-"}</p></div><button class="btn-close" data-id="${p.id}"><i class="fas fa-check-circle"></i> إغلاق</button>`;
        const btn = card.querySelector(".btn-close");
        if (btn) {
          btn.addEventListener("click", function () {
            if (confirm(`إغلاق ${this.dataset.id}؟`)) {
              handleClosePermit(this.dataset.id);
            }
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
  async function handleClosePermit(id) {
    if (!id) return;
    try {
      const r = await callApi("closePermit", { permitId: id });
      onPermitClosed(r);
    } catch (e) {
      onPermitCloseFailure(e);
    }
  }
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
    buildResultsTable(response.permits);
  }
  function onSearchFailure(error) {
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
      // نستخدم البيانات المحملة مسبقاً إذا وجدت، أو نحم��ها
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
   * (مهم) الدالة اللي بتخفي وتظهر الحقول بناءً على نوع الحركة
   */
  function updatePpeFormUI() {
    const type = ppeTransactionType.value;

    // إخفاء كل الأجزاء أولاً
    ppeSupplierGroup.style.display = "none";
    ppeTransferGroup.style.display = "none";
    ppeRecipientGroup.style.display = "none";
    ppeItemsGroup.style.display = "none";
    ppeSaveBtn.disabled = true;

    // مسح كل الرسائل
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
      // حذفنا استدعاء updateEmployeeDropdown() لأنه لم يعد هناك قائمة منسدلة
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

    // لو T�فيش مشروع أو النوع مش مقاول، مفيش داعي نحمل
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
        // محاولة إعادة تحميل الC�يانات لو مش موجودة
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

      // (إضافة) عرض عدد الأصناف المتاحة في أول خي-�ر كنوع من التأكيد
      ppeItemSelect.options[0].text = `-- اختر المهمة (${availableItems.length} صنف متاح) --`;

      ppeItemSelect.disabled = false;
    } catch (e) {
      console.error(e);
      ppeItemSelect.innerHTML = '<option value="">⚠️ خطاء فى الاتصال</option>';
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

      // (*** هذا هو المنطق الجديد  �لتحe�ق من الرصيد ***)
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
        const totalQtyNeeded = qty + qtyInCart; // الكمية المطل �بة = (اللي في السلة + اللي هتضيفه)

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
      ppeCartContainer.innerHTML = ""; // ت �ريغ
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

    // (جديد) تحد)�ث الرصيد الم=�روض
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
  // --- (*** جديد ***) وحدة تقرير أرصدة المخازن ---
  // =================================================================

  /**
   * دالة بدء تشغيل صفحة تقرير المخزن
   */
  async function initStockReportPage() {
    console.log("بدء تشغيل صفحة تقرير الأرصدة...");
    stockReportResultsTable.innerHTML = "";
    showMessage(
      stockReportMessage,
      "الرجاء اختيار الموقع والضغط على بحث",
      true,
    ); // Reset message

    // جلب البيانات الأولية (لو مش موجودة)
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

    // (*** فلترة القائمة بناءً على صلاحيات المستخدم ***)
    const userProjects = (currentUser.projects || "").toString().trim();
    let accessibleLocations = [];

    if (userProjects === "ALL") {
      accessibleLocations = ppeLocations; // متاح له كل حاجة
    } else {
      const userProjectList = userProjects.split(",");
      // فلترة قائمة المخازن بناءً على صلاحيات المستخدم
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
  async function handleStockReportSearch() {
    const locationName = stockReportProjectSelect.value;
    if (!locationName) {
      showMessage(stockReportMessage, "الرجاء اختيار الموقع أولاً.", false);
      return;
    }

    showMessage(stockReportMessage, "", true); // إخفاء الرسالة
    stockReportResultsTable.innerHTML = "<p>جاري تحميل التقرير...</p>";

    try {
      // (مهم) هنبعت بيانات المستخدم عشان السيرفر يتأكد من الصلاحيات
      const response = await callApi("getProjectStockReport", {
        locationName: locationName,
        userInfo: currentUser,
      });

      if (response.report && response.report.length > 0) {
        buildStockReportTable(response.report, locationName);
      } else {
        stockReportResultsTable.innerHTML = `<p>المخزن [${locationName}] فارغ حالياً.</p>`;
      }
    } catch (e) {
      showMessage(stockReportMessage, e.message, false);
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
  // --- متغيرات الحالة (تأكد من وجودها في أعلى الملف أو بداية سكشن التدريب) ---
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
        // (هام جداً) تعبئة المصفوفة العالمية للموظفين ليراها المودال
        window.ppeEmployees = r.employees;

        // تعبئة المشاريع والمواضيع والمقاولين في القوائم المنسدلة
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
      trnContNid.readOnly = false; // إعادة الحقل قابلاً للكتابة
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

        // تنبيه إضافي لضمان اD�انتباه
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

  let obsActionsCart = []; // سلة i�لإجراءات

  async function initObservationPage() {
    console.log("بدء تشغيل صفحة الملاحظات...");

    // 1. ضبط التاريخ والاسم (يد=�=�ا-y-� لضمان الشكل الصحيح)
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
  // إظهار/إخفاl� المقاول حسب الراديو
  // إظهار/إخفاء المقاول (تم تصحيح الخطأ الإملائي)
  function toggleObsContractor() {
    let isCont = false;

    // البحث عن الراديو المختار
    const checkedRadio = document.querySelector(
      'input[name="obs-resp"]:checked',
    );

    // (تصحيح هام): الكلمة كانت مكتوبة خطأ "مDاول"
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

    // إظهار لn�در بسh�ط
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
  const hazResult = document.getElementById("haz-result"); // القائمة المنسدلة للهازارد
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

    // تعيين التاريخ
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
    // تعيين اسم المستخدم (المصدر)
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

        // اr�تحقق من أن المستخدم اختار موظفاً بالفعل من البوب أب
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
      renderMonitorTable(r.data, monObsTable);
    } catch (e) {
      monObsTable.innerHTML = e.message;
    }
  }

  // 2. منطق بحث المخ �طر
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
  // --- (جديد) وحدة تقييم المقاوليi� ---
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

    // 3. التأكد من جلب بيانات الموظفين وتخزينها في window لكي يراها المودال
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

      // تفعيل حقول NCR وتعطيل حقول Violation (لحل مشكلة الـ Submit)
      setContainerState(ncrFieldsDiv, true);
      setContainerState(vioFieldsDiv, false);

      toggleNcrObserver(); // ضبط الحقول الفرعية للـ NCR
    } else {
      ncrFieldsDiv.style.display = "none";
      vioFieldsDiv.style.display = "block";

      // تفعيل حقول Violation وتعطيل حقول NCR
      setContainerState(ncrFieldsDiv, false);
      setContainerState(vioFieldsDiv, true);

      // تهS�ئة صفحة المخالفات (التاريخ والوقت)
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

  // دالة فتح المودال لقسم المخالفات
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
          // البحث في مصفوفة الt�وظفين المحملة
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
      // --- الحالة 2: Violation (مخالفة) ---
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
          updateVioCartUI(); // تصفير سلة الجزاءات
        } catch (err) {
          showMessage(ncrSaveMsg, err.message, false);
        } finally {
          ncrSaveBtn.disabled = false;
          ncrSaveBtn.innerHTML = "حفظ المخالفة"; // إعادة نص الزر حسب السياق
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

    // 2. المشاريع (إعادة استخدام المخزn�)
    if (vioProject && vioProject.options.length <= 1) {
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        const userProj = (currentUser.projects || "").toString();
        const acc =
          userProj === "ALL"
            ? ppeLocations
            : ppeLocations.filter((p) => userProj.includes(p));
        fillSelect(vioProject, acc);
      } else {
        // تحميل احتيا��ي
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

  // 5. تحديث واجهة ا؄سلة والحسابات (معدل لتميo�ز العملة/الأيام)
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
                  <th>المصدر</th> <th style="width:30%;">الوصف</th>
                  <th>الحالة</th>
              </tr>
          </thead>
          <tbody>`;

    data.forEach((row) => {
      // تمييز النوع بألوان
      const typeBadge =
        row.type === "NCR"
          ? '<span class="badge bg-warning" style="color:#856404; background:#fff3cd;">NCR</span>'
          : '<span class="badge bg-danger" style="color:#fff; background:#dc3545;">Violation</span>';

      // تنسيق التاريخ
      let dateDisplay = row.date;
      try {
        const d = new Date(row.date);
        dateDisplay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } catch (e) {}

      html += `<tr>
              <td>${typeBadge}</td>
              <td style="font-weight:bold;">${row.id}</td>
              <td style="white-space:nowrap;">${dateDisplay}</td>
              <td>${row.project}</td>
              <td style="color:#0056b3; font-weight:600;">${row.issuer || "-"}</td> <td class="desc-cell">${row.desc}</td>
              <td><span class="badge ${row.status === "Open" ? "bg-danger" : "bg-success"}">${row.status}</span></td>
          </tr>`;
    });
    html += `</tbody></table>`;
    monNcrVioTable.innerHTML = html;
  }

  if (monNcrVioBtn) monNcrVioBtn.addEventListener("click", searchNcrViolations);

  // =================================================================
  // --- (معدل) وحدة المقاولين والرفع (Contractors Upload) ---
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

  // (جديد) دالة جلب المقاولين عند تغيير المشروع
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

  // عر � اسم الملف
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

  // (جديد) ربط حدث تغيير المشروع
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
  // (app.js) إصلاح القائمة المنسدلة للمشاريع + رسم الجدول
  // =================================================================

  async function initContractorAnalyticsPage() {
    console.log("Analytics Page Init...");

    // 1. ضبط الشهر الحالي
    if (anaMonth && !anaMonth.value) {
      const d = new Date();
      anaMonth.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    }

    // 2. تعبئة قائمة المشاريع (إصلاح المشكلة)
    // نتأكد إن القائمة لسه فاضية (فيها خيار واحد بس)
    if (anaProject && anaProject.options.length <= 1) {
      anaProject.innerHTML =
        '<option value="ALL_ACCESSIBLE">كل المشاريع</option>';

      // محاولة استخدام البيانات المحملة مسبقاً
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

  // رسم الجدوr� (V4: PPE Details with Badges)
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
    // 1. معرفة الe�عمدة المختارة
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

    // 5. (اختياري) إعادة إظهار كل الأعمدة بعد الطباعة (عشان لو اليوزر كنسل متبقاش الصفحة بايظة)
    // ممكن نعملها بـ setTimeout عشان تلحق تظهر في الطباعة الأول
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

  let allEmployeesCache = []; // لتخزين اp�i�ائمة محلياً

  // دالة التهيئة (تستدعى من showSection)
  function initEmployeeReports() {
    // تحميل القائمة لو مش موجودة
    if (allEmployeesCache.length === 0) {
      callApi("getAllEmployeesForSearch", {}).then((r) => {
        if (r.status === "success") allEmployeesCache = r.list;
      });
    }
    // تصفير البحث
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
      const d = new Date();
      document.getElementById("emp-print-date").textContent =
        "تاريخ التقرير: " + d.toLocaleDateString("ar-EG");
      window.print();
    });
  }

  // (مهم) أضف استدعاء initEmployeeReports في دالة showSection
  // ابحث عن showSection وعدل الشرط:
  // if (sectionId === "EmployeeReports") initEmployeeReports();
  // =================================================================
  // --- (جديد) و-�دة y�سجيt� ومتابعة الحوادث (Accident Module) ---
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
      if (emptyMsgEl) emptyMsgEl.style.display = "none"; // أخفِ الرسالo�

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

      // 1. تحديد نوع الحادث أولاً لمعرفة هل نحتاج بيانات ضحية أم لا
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

    // أضف كلاس ا=�إخفاء للصفوف غير المحددة
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
        currentContractorWorkers = response.workers; // حe�ظ في المتغير العام

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
};

////////////////////////////////////////////////////////////
// --- END DOMContentLoaded ---

window.buildKpiForm = function (kpis) {
  const listContainer = document.getElementById("kpi-list-container");
  if (!listContainer) return;
  listContainer.innerHTML = "";

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
                           value="${kpi.scoreAchieved || ""}" 
                           min="0" max="${kpi.maxScore || 0}" step="0.5" placeholder="0">
                </div>
                <input type="text" class="kpi-notes-input" 
                       value="${kpi.notes || ""}" placeholder="ملاحظات (اختياري)...">
            </div>`;
    listContainer.appendChild(card);
  });
};

// 3. دالة تحميل البنود (إخفاء الإرشادات وإظهار الفورم)
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
// --- دوال النافذة المنبثقة (خارج أي نطاق مغلق لضمان العمل) ---
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

// 2. دالة اختيار الموظف من البوب أب (تعديل الربط مع التصميم الجديد)
window.selectKpiEmployee = function (id, name, job, project) {
  // تعبئة الحقول الظاهرة والمخفية
  const nameInput = document.getElementById("kpi-emp-name-display");
  const idInput = document.getElementById("kpi-emp-id-hidden");
  const jobTitleEl = document.getElementById("kpi-employee-jobtitle");

  if (nameInput) nameInput.value = name;
  if (idInput) idInput.value = id;

  // إظهار المسمى الوظيفي والمشروع في "شريط المعلومات" الجديد
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
window.handleKpiSave = async function (event) {
  // 1. منع إعادة تحميل الصفحة فوراً
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // 2. جلب العناصر مباشرة بالـ ID لضمان الوصول إليها
  const saveBtn = document.getElementById("kpi-save-btn");
  const kpiListContainer = document.getElementById("kpi-list-container");
  const empIdInput = document.getElementById("kpi-emp-id-hidden");
  const periodSelect = document.getElementById("kpi-period-select");
  const msgArea = document.getElementById("kpi-message-area");

  // 3. التحقق من وجود المستخدم (العالمي) والبيانات الأساسية
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

  // 4. تجميع الدرجات من الكروت
  const scoresToSave = [];
  const kpiCards = kpiListContainer.querySelectorAll(".kpi-card");
  let validationError = false;

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

  if (!confirm("هل أنت متأكد من حفظ هذا التقييم؟")) return;

  // 5. الإرسال للسيرفر
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  }

  try {
    const response = await callApi("saveEvaluations", {
      evaluationsData: { employeeId, period, scores: scoresToSave },
      userInfo: currentUser,
    });

    // 6. استدعاء دالة النجاح
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
