// =================================== */
// CLIENT-SIDE LOGIC (app.js - Final V7 - All Modules Included)
// =================================== */

// API endpoint on the same server (points to api/index.js or server.js via proxy)
const API_URL = "/api";

// --- Run when DOM is ready ---
document.addEventListener("DOMContentLoaded", function () {
  // --- GLOBAL STATE ---
  let currentUser = null; // Stores {username, email, role, projects, sections}
  let initialData = null; // Stores {projects:[], permitTypes:[], requesters:[]}
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
    MonitorPermits: "fas fa-tasks",
    KpiEvaluation: "fas fa-chart-line",
    PpeTransactions: "fas fa-boxes", // (جديد)
    ProjectStockReport: "fas fa-chart-pie", // (جديد)
    NewTraining: "fas fa-chalkboard-teacher",
    NewNearMiss: "fas fa-exclamation-triangle", // Example
  };
  const sectionNames = {
    Dashboard: "لوحة التحكم",
    NewPermit: "تصريح جديد",
    ClosePermit: "إغلاق التصاريح",
    NewObservation: "تسجيل ملاحظة",
    MyObservations: "متابعة ملاحظاتي",
    MonitorPermits: "متابعة التصاريح",
    KpiEvaluation: "تقييم الموظفين",
    PpeTransactions: "حركات المخزن", // (جديد)
    ProjectStockReport: "أرصدة المخازن", // (جديد)
    NewTraining: "تسجيل تدريب", // (*** جديد ***) اسم القسم
    NewNearMiss: "Near Miss", // Example
  };

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
  function showMessage(element, text, isSuccess) {
    if (element) {
      element.textContent = text;
      element.className = isSuccess ? "success-message" : "error-message";
      element.style.display = "block";

      let timeout = 5000;
      if (
        isSuccess &&
        (element.id === "kpi-save-message" || element.id === "ppe-save-message")
      ) {
        timeout = 10000; // 10 ثوان لرسائل النجاح الطويلة
      }

      setTimeout(() => {
        if (element) element.style.display = "none";
      }, timeout);
    } else {
      console.warn(
        "Attempted to show message on a non-existent element:",
        text,
      );
    }
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
    localStorage.setItem("hse_user_session", JSON.stringify(response.userInfo));
    currentUser = response.userInfo;
    if (loginScreen) loginScreen.style.display = "none";
    if (appWrapper) appWrapper.style.display = "flex";
    const wu = document.getElementById("welcome-user");
    const ur = document.getElementById("user-role");
    if (wu) wu.textContent = `أهلاً، ${currentUser.username || "?"}`;
    if (ur) ur.textContent = currentUser.role || "?";
    buildSidebar(currentUser.sections);
    loadInitialData();
    const firstLink = sidebarMenu ? sidebarMenu.querySelector("a") : null;
    let initialSection = "Dashboard";
    if (firstLink && firstLink.dataset.section) {
      initialSection = firstLink.dataset.section;
    } else if (
      currentUser.sections &&
      !currentUser.sections.toUpperCase().includes("DASHBOARD")
    ) {
      const secs = String(currentUser.sections)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
      if (secs.length > 0 && sectionNames[secs[0]]) initialSection = secs[0];
    }
    showSection(initialSection);
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

  function buildSidebar(sectionsString) {
    if (!sidebarMenu) {
      console.error("#sidebar-menu not found.");
      return;
    }
    sidebarMenu.innerHTML = "";
    if (!sectionsString) {
      sidebarMenu.innerHTML = "<li><a>لا أقسام</a></li>";
      return;
    }
    let sections = [];
    const cleanedString = sectionsString; // Assumes cleaned by backend
    if (cleanedString.toUpperCase() === "ALL") {
      sections = Object.keys(sectionNames);
    } else {
      sections = cleanedString
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);
    }
    if (sections.length === 0) {
      sidebarMenu.innerHTML = "<li><a>لا أقسام متاحة</a></li>";
      return;
    }
    let isFirstLink = true;
    sections.forEach((sectionId) => {
      if (sectionNames[sectionId]) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.dataset.section = sectionId;
        const icon = document.createElement("i");
        icon.className = sectionIcons[sectionId] || "fas fa-question-circle";
        a.appendChild(icon);
        a.appendChild(document.createTextNode(" " + sectionNames[sectionId]));
        if (isFirstLink) {
          a.classList.add("active");
          isFirstLink = false;
        }
        a.addEventListener("click", function (e) {
          e.preventDefault();
          const targetId = this.dataset.section;
          showSection(targetId);
          sidebarMenu
            .querySelectorAll("a")
            .forEach((link) => link.classList.remove("active"));
          this.classList.add("active");
          if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove("active");
          }
        });
        li.appendChild(a);
        sidebarMenu.appendChild(li);
      } else {
        console.warn(`Section ID "${sectionId}" ignored.`);
      }
    });
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
        initObservationPage(); // <-- واستخدم الجديدة دي
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
      if (sectionId === "ProjectStockReport") {
        initStockReportPage(); // (*** هذا هو السطر الجديد ***)
      }
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

      // 5. الإرسال للسيرفر
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

    // التأكد من إخفاء المقاول
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
  function buildResultsTable(permits) {
    if (!monitorResultsTable) return;
    if (!permits || !Array.isArray(permits) || permits.length === 0) {
      monitorResultsTable.innerHTML = "<p>No results.</p>";
      return;
    }
    let tbl = `<table class="results-table"><thead><tr><th>ID</th><th>Project</th><th>Date</th><th>Type</th><th>Issuer</th><th>Requester</th><th>Description</th><th>Status</th></tr></thead><tbody>`;
    permits.forEach((p) => {
      tbl += `<tr><td>${p.id || "-"}</td><td>${p.projectName || "-"}</td><td>${p.permitDate || "-"}</td><td>${p.permitType || "-"}</td><td>${p.issuer || "-"}</td><td>${p.requester || "-"}</td><td title="${p.description || ""}">${p.description || "-"}</td><td class="${p.status && p.status.toUpperCase() === "OPEN" ? "status-open" : "status-closed"}">${p.status || "-"}</td></tr>`;
    });
    tbl += `</tbody></table>`;
    monitorResultsTable.innerHTML = tbl;
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

  // --- =================================== ---
  // --- KPI EVALUATION LOGIC (V2.1 Module) ---
  // --- =================================== ---
  function initKpiPage() {
    console.log("بدء تشغيل صفحة تقييم الموظفين (V2.1)...");
    if (!kpiPeriodSelect.value) {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      kpiPeriodSelect.value = `${year}-${month}`;
    }
    loadKpiEmployees();
    kpiEmployeeSelect.removeEventListener("change", handleKpiSelectionChange);
    kpiPeriodSelect.removeEventListener("change", handleKpiSelectionChange);
    kpiFormArea.removeEventListener("submit", handleKpiSave);
    kpiEmployeeSelect.addEventListener("change", handleKpiSelectionChange);
    kpiPeriodSelect.addEventListener("change", handleKpiSelectionChange);
    kpiFormArea.addEventListener("submit", handleKpiSave);
  }
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
            '<option value="">لا يوجد موo�فين</option>';
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
    kpiListContainer.innerHTML = "<p>الرجاء اختيار الموظف وفترة التقييم...</p>";
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
  async function loadKpisForEmployee(employeeId, period) {
    kpiListContainer.innerHTML = "<p>جاري تحميل بنود التقييم...</p>";
    kpiSaveBtn.style.display = "none";
    showMessage(kpiMessageArea, "", true);
    try {
      const payload = {
        employeeId: employeeId,
        period: period,
        userInfo: currentUser,
      };
      const response = await callApi("getKPIsForEmployee", payload);
      if (response.status === "success" && response.kpis) {
        if (response.kpis.length > 0) {
          buildKpiForm(response.kpis);
          kpiSaveBtn.style.display = "block";
        } else {
          kpiListContainer.innerHTML =
            "<p>لا توجد بنود تقييم مطلوبة لهذا الموظف في هذه الفترة.</p>";
          kpiSaveBtn.style.display = "none";
        }
      } else {
        throw new Error(response.message || "Failed to load KPIs.");
      }
    } catch (error) {
      showMessage(kpiMessageArea, error.message, false);
      kpiListContainer.innerHTML =
        '<p style="color:red;">خطأ في تحميل الـ KPIs.</p>';
    }
  }
  function buildKpiForm(kpis) {
    if (!kpiListContainer) return;
    kpiListContainer.innerHTML = "";
    let totalMaxScore = 0;
    kpis.forEach((kpi, index) => {
      totalMaxScore += parseFloat(kpi.maxScore) || 0;
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
<label for="score-${kpi.kpiId}">الدرجة:</label>
<input type="number" id="score-${kpi.kpiId}" class="kpi-score-input" 
value="${kpi.scoreAchieved || ""}" 
min="0" max="${kpi.maxScore || 0}" step="0.5" placeholder="0">
</div>
<input type="text" id="notes-${kpi.kpiId}" class="kpi-notes-input" 
value="${kpi.notes || ""}" placeholder="ملاحظات (اختياري)...">
</div>`;
      kpiListContainer.appendChild(card);
    });
    if (kpiEmployeeJobTitle) {
      kpiEmployeeJobTitle.textContent = `${kpiEmployeeJobTitle.textContent} | إجمالي الدرجات المتاحة: ${totalMaxScore}`;
    }
  }
  async function handleKpiSave(event) {
    event.preventDefault();
    if (!currentUser) {
      showMessage(kpiMessageArea, "انتهت الجلسة.", false);
      return;
    }
    const employeeId = kpiEmployeeSelect.value;
    const period = `${kpiPeriodSelect.value}-01`;
    if (!employeeId || !kpiPeriodSelect.value) {
      showMessage(kpiMessageArea, "اختر الموظف والفترة.", false);
      return;
    }
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
        showMessage(
          kpiMessageArea,
          `الدرجة لـ ${kpiId} (${scoreNum}) غير صالحة (الحد الأقصى ${maxScore}).`,
          false,
        );
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
    if (validationError) return;
    const evaluationsData = {
      employeeId: employeeId,
      period: period,
      scores: scoresToSave,
    };
    if (
      !confirm(
        `هل أنت متأكد من حفظ التقييم لـ ${kpiEmployeeSelect.options[kpiEmployeeSelect.selectedIndex].text} عن فترة ${kpiPeriodSelect.value}؟`,
      )
    ) {
      return;
    }
    try {
      const response = await callApi("saveEvaluations", {
        evaluationsData: evaluationsData,
        userInfo: currentUser,
      });
      onSaveEvaluationSuccess(response);
    } catch (error) {
      onSaveEvaluationFailure(error);
    }
  }
  function onSaveEvaluationSuccess(response) {
    showMessage(kpiSaveMessage, response.message || "تم الحفظ!", true);
    if (kpiSaveMessage) kpiSaveMessage.style.whiteSpace = "pre-wrap";
    kpiListContainer.innerHTML =
      "<p>تم الحفظ. الرجاء اختيار موظف وفترة تقييم...</p>";
    kpiSaveBtn.style.display = "none";
    kpiEmployeeJobTitle.textContent = "";
  }
  function onSaveEvaluationFailure(error) {
    showMessage(kpiMessageArea, error.message, false);
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
  async function initPpePage() {
    console.log("بدء تشغيل صفحة المخزن...");
    ppeForm.reset(); // ريسيت للفورم
    updatePpeFormUI(); // إخفاء كل الحقول
    ppeCart = []; // تفريغ السلة
    updatePpeCartUI(); // تحديث عرض السلة

    // جلب البيانات الأولية (مرة واحدة لو مش موجودة)
    // (*** تعديل ***) هنخليها تتحمل كل مرة عشان الرصيد يتحدث
    // if (ppeLocations.length === 0) {
    try {
      const data = await callApi("getInventoryInitData", {
        userInfo: currentUser,
      });
      if (data.status === "success") {
        ppeLocations = data.locations;
        ppeEmployees = data.employees;
        ppeContractors = data.contractors;
        ppeItems = data.ppeItems;

        // تعبئة القوائم المنسدلة
        populateSelect(ppeSupplierDest, ppeLocations);
        populateSelect(ppeTransferSource, ppeLocations);
        populateSelect(ppeTransferDest, ppeLocations);
        populateSelect(ppeRecipientLocation, ppeLocations);
        populateSelect(ppeRecipientContractorCompany, ppeContractors);

        // (*** تعديل ***) مش هنملى قايمة المهمات هنا
        // populateSelect(ppeItemSelect, ppeItems, 'id', 'name');

        // (*** تعديل ***) مش هنملى قايمة الموظفين هنا
        // populateSelect(ppeRecipientEmployee, ppeEmployees, 'id', 'name');
      }
    } catch (e) {
      showMessage(
        ppeMainMessage,
        `خطأ فادح في تحميل البيانات: ${e.message}`,
        false,
      );
    }
    // }
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
  function checkRecipientTypeUI() {
    const type = ppeRecipientType.value;
    ppeRecipientEmployeeGroup.style.display =
      type === "موظف" ? "block" : "none";
    ppeRecipientContractorGroup.style.display =
      type === "مقاول" ? "block" : "none";

    if (type === "موظف") {
      updateEmployeeDropdown();
    }
    // (*** الإضافة الجديدة ***)
    else if (type === "مقاول") {
      updatePpeContractorDropdown();
    }
  }

  /**
   * (جديد) دالة فلترة قايمة الموظفين بناءً على المشروع المختار
   */
  function updateEmployeeDropdown() {
    // 1. هات اسم المشروع اللي اختاره
    const selectedProject = ppeRecipientLocation.value;

    // 2. لو مختارش مشروع، فضي القايمة
    if (!selectedProject) {
      ppeRecipientEmployee.innerHTML =
        '<option value="">-- اختر المشروع أولاً --</option>';
      return;
    }

    // 3. (الأهم) فلتر قايمة الموظفين العالمية
    const filteredEmployees = ppeEmployees.filter(
      (emp) => emp.project === selectedProject,
    );

    // 4. اعرض النتيجة
    if (filteredEmployees.length === 0) {
      ppeRecipientEmployee.innerHTML =
        '<option value="">-- لا يوجد موظفين بهذا المشروع --</option>';
      return;
    }

    // 5. املأ القايمة بالموظفين المفلترين
    populateSelect(ppeRecipientEmployee, filteredEmployees, "id", "name");
  }

  /**
   * (جديد) تحديث قائمة المقاولين بناءً على المشروع المختار
   */
  async function updatePpeContractorDropdown() {
    const selectedProject = ppeRecipientLocation.value;

    // لو مفيش مشروع أو النوع مش مقاول، مفيش داعي نحمل
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
  async function refreshPpeItemsDropdown() {
    const type = ppeTransactionType.value;
    let sourceLocation = null;

    if (type === "صرف") {
      sourceLocation = ppeRecipientLocation.value;
    } else if (type === "تحويل") {
      sourceLocation = ppeTransferSource.value;
    }

    // --- (ده المنطق اللي إنت طلبته بالظبط) ---

    // (الحالة 1: مرتجع أو توريد) - اعرض كل حاجة
    if (type === "مرتجع" || type === "توريد") {
      console.log("الوضع: مرتجع/توريد. عرض كل المهمات...");
      populateSelect(ppeItemSelect, ppeItems, "id", "name");
      ppeItemSelect.disabled = false;
      return;
    }

    // (الحالة 2: صرف أو تحويل) - لازم نفلتر
    if (!sourceLocation) {
      ppeItemSelect.innerHTML =
        '<option value="">-- اختر المخزن أولاً --</option>';
      ppeItemSelect.disabled = true;
      return;
    }

    // (الحالة 3: صرف/تحويل + اختار مخزن) - نادي الـ API
    ppeItemSelect.innerHTML =
      '<option value="">جاري تحميل المهمات المتاحة...</option>';
    ppeItemSelect.disabled = true;

    try {
      const response = await callApi("getAvailableItemsForLocation", {
        locationName: sourceLocation,
      });
      const availableIds = response.availableItemIds; // ['HEL-01', 'SHO-02']

      if (availableIds.length === 0) {
        ppeItemSelect.innerHTML =
          '<option value="">-- المخزن ده فاضي --</option>';
        return;
      }

      // فلترة القايمة الرئيسية بناءً على الأكواد المتاحة
      const availableItems = ppeItems.filter((item) =>
        availableIds.includes(item.id),
      );

      populateSelect(ppeItemSelect, availableItems, "id", "name");
      ppeItemSelect.disabled = false;
    } catch (e) {
      showMessage(ppeMainMessage, e.message, false);
      ppeItemSelect.innerHTML =
        '<option value="">-- خطأ في التحميل --</option>';
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

      // (*** هذا هو المنطق الجديد للتحقق من الرصيد ***)
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
        const totalQtyNeeded = qty + qtyInCart; // الكمية المطلوبة = (اللي في السلة + اللي هتضيفه)

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
      ppeCartContainer.innerHTML = ""; // تفريغ
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

    // (جديد) تحديث الرصيد المعروض
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
  async function handlePpeSave(event) {
    event.preventDefault();
    ppeSaveBtn.disabled = true;
    ppeSaveBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    showMessage(ppeMainMessage, "", true);
    showMessage(ppeSaveMessage, "", true);

    try {
      const transactionData = {};
      transactionData.transactionType = ppeTransactionType.value;
      transactionData.notes = ppeNotes.value;

      // 1. تجميع بيانات "السلة"
      if (ppeCart.length === 0) {
        throw new Error("يجب إضافة مهمة واحدة على الأقل.");
      }
      transactionData.items = ppeCart; // إرسال السلة بالكامل

      // 2. تجميع بيانات "المواقع"
      transactionData.locations = {};
      if (transactionData.transactionType === "صرف") {
        transactionData.locations.source = ppeRecipientLocation.value;
      } else if (transactionData.transactionType === "مرتجع") {
        transactionData.locations.destination = ppeRecipientLocation.value;
      } else if (transactionData.transactionType === "تحويل") {
        transactionData.locations.source = ppeTransferSource.value;
        transactionData.locations.destination = ppeTransferDest.value;
        if (
          transactionData.locations.source ===
          transactionData.locations.destination
        ) {
          throw new Error("لا يمكن التحويل إلى نفس المخزن.");
        }
      } else if (transactionData.transactionType === "توريد") {
        transactionData.locations.destination = ppeSupplierDest.value;
      }

      // 3. تجميع بيانات "المستلم"
      transactionData.recipient = {};
      if (
        transactionData.transactionType === "صرف" ||
        transactionData.transactionType === "مرتجع"
      ) {
        transactionData.recipient.type = ppeRecipientType.value;
        if (transactionData.recipient.type === "موظف") {
          const empId = ppeRecipientEmployee.value;
          const selectedEmp = ppeEmployees.find((e) => e.id == empId);
          if (!selectedEmp) throw new Error("الرجاء اختيار موظف صحيح.");
          transactionData.recipient.id = selectedEmp.id;
          transactionData.recipient.name = selectedEmp.name;
          transactionData.recipient.company = selectedEmp.company; // (سويدي مثلاً)
        } else if (transactionData.recipient.type === "مقاول") {
          transactionData.recipient.id = ppeRecipientNid.value;
          transactionData.recipient.name = ppeRecipientName.value;
          transactionData.recipient.company =
            ppeRecipientContractorCompany.value;
          transactionData.recipient.isNew = !ppeRecipientName.disabled; // هل هو مستلم جديد؟
        }
      }

      // 4. تجميع بيانات "المورد"
      transactionData.supplier = {};
      if (transactionData.transactionType === "توريد") {
        transactionData.supplier.name = ppeSupplierName.value;
        // يمكنك إضافة تاريخ التوريد لو احتجت
      }

      // --- التحقق من المدخلات ---
      if (!validateTransaction(transactionData)) return; // (دالة التحقق بالأسفل)

      // 5. إرسال الطلب
      const response = await callApi("saveTransaction", {
        transactionData: transactionData,
        userInfo: currentUser,
      });

      // 6. النجاح
      showMessage(ppeSaveMessage, response.message, true);
      ppeForm.reset();
      updatePpeFormUI();
      ppeCart = [];
      updatePpeCartUI();
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
  if (ppeRecipientLocation) {
    ppeRecipientLocation.addEventListener("change", updateEmployeeDropdown);
  }
  // (*** تعديل ***) ربط الدالة الجديدة
  // (معدل) عند تغيير موقع الصرف/الاستلام
  if (ppeRecipientLocation) {
    ppeRecipientLocation.addEventListener("change", () => {
      updateEmployeeDropdown(); // فلترة الموظفين
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
  let trnAttendeesCart = [];
  let trainingDataLoaded = false;

  async function initTrainingPage() {
    console.log("بدء تشغيل صفحة التدريب...");

    // 1. إعدادات أولية (التاريخ والوقت والمدرب)
    const now = new Date();
    if (trnDate) trnDate.value = now.toLocaleDateString("en-CA");
    if (trnTime)
      trnTime.value = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    if (trnTrainer && currentUser) trnTrainer.value = currentUser.username;

    trnAttendeesCart = [];
    updateTrnCartUI();

    // 2. تحميل البيانات
    if (!trainingDataLoaded) {
      try {
        const r = await callApi("getTrainingInitData", {
          userInfo: currentUser,
        });

        if (r.status === "success") {
          // تخزين البيانات
          ppeEmployees = r.employees;
          ppeContractors = r.contractors;

          // تعبئة المشاريع
          const userProj = (currentUser.projects || "").toString();
          let accProj = r.projects;
          if (userProj !== "ALL") {
            accProj = r.projects.filter((p) => userProj.includes(p));
          }
          fillSelect(trnProject, accProj);

          // تعبئة المواضيع
          fillSelect(trnTopic, r.topics);

          // تعبئة المقاولين
          fillSelect(trnContCompany, r.contractors);

          trainingDataLoaded = true;
        } else {
          // (تعديل) إظهار رسالة الخطأ بوضوح
          alert("خطأ من السيرفر: " + r.message);
        }
      } catch (e) {
        // (تعديل) إظهار رسالة الخطأ بوضوح
        alert("فشل تحميل البيانات: " + e.message);
      }
    }

    // تشغيل الفلترة
    if (trnProject) handleTrnProjectChange();
  }

  // فلترة الموظفين والمقاولين حسب المشروع
  function handleTrnProjectChange() {
    const proj = trnProject.value;

    // 1. فلترة الموظفين
    filterTrnEmployees();

    // 2. فلترة شركات المقاولين (استدعاء السيرفر)
    if (proj) {
      trnContCompany.innerHTML = "<option>جاري التحميل...</option>";
      callApi("getContractorsForProject", { projectName: proj })
        .then((r) => {
          if (r.contractors) fillSelect(trnContCompany, r.contractors);
        })
        .catch(() => {
          trnContCompany.innerHTML = '<option value="">خطأ</option>';
        });
    }
  }

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

  // إضافة للحضور
  function addTrnAttendee() {
    if (trnAddMsg) trnAddMsg.style.display = "none";
    const type = trnAttendeeType.value;
    let att = { type: type };

    if (type === "موظف") {
      const empId = trnEmpSelect.value;
      if (!empId) {
        showMessage(trnAddMsg, "اختر الموظف", false);
        return;
      }
      const opt = trnEmpSelect.selectedOptions[0];
      att.id = empId;
      att.name = opt.dataset.name;
      att.company = opt.dataset.company;
    } else {
      const nid = trnContNid.value;
      const name = trnContName.value;
      const comp = trnContCompany.value;
      if (!nid || !name || !comp) {
        showMessage(trnAddMsg, "بيانات المقاول ناقصة", false);
        return;
      }
      att.id = nid;
      att.name = name;
      att.company = comp;
      att.isNew = !trnContName.disabled; // هل هو جديد؟
    }

    // منع التكرار
    if (trnAttendeesCart.find((x) => x.id === att.id)) {
      showMessage(trnAddMsg, "هذا الشخص مضاف بالفعل", false);
      return;
    }

    trnAttendeesCart.push(att);
    updateTrnCartUI();

    // ريسيت للخانات
    if (type === "مقاول") {
      trnContNid.value = "";
      trnContName.value = "";
      trnContName.disabled = false;
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
  async function searchTrnCont() {
    const nid = trnContNid.value;
    if (!nid) return;
    trnContName.value = "بحث...";
    trnContName.disabled = true;
    try {
      const r = await callApi("getRecipientByNID", { nationalId: nid });
      if (r.status === "found") {
        trnContName.value = r.name;
        // محاولة تحديد الشركة لو موجودة في القائمة
        trnContCompany.value = r.contractor;
        trnContName.disabled = true;
      } else {
        trnContName.value = "";
        trnContName.placeholder = "اسم جديد...";
        trnContName.disabled = false;
        trnContName.focus();
      }
    } catch (e) {
      trnContName.value = "";
      trnContName.disabled = false;
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

  let obsActionsCart = []; // سلة الإجراءات

  async function initObservationPage() {
    console.log("بدء تشغيل صفحة الملاحظات...");

    // 1. ضبط الوقت والتاريخ
    const now = new Date();
    if (obsViewDate) obsViewDate.value = now.toLocaleDateString("en-CA");
    if (obsViewTime)
      obsViewTime.value = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    // 2. تعبئة المشاريع (بناءً على صلاحيات المستخدم)
    if (obsProject && obsProject.options.length <= 1) {
      // نحاول نستخدم البيانات المحملة مسبقاً من المخزن لتسريع الأداء
      if (typeof ppeLocations !== "undefined" && ppeLocations.length > 0) {
        fillSelect(obsProject, ppeLocations);
      } else {
        // لو مش موجودة، نحملها
        try {
          const r = await callApi("getInventoryInitData", {
            userInfo: currentUser,
          });
          if (r.status === "success") {
            // فلترة حسب الصلاحية
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

    // 3. تعبئة المخاطر (Hazard Category)
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
        console.error(e);
        obsHazard.innerHTML = '<option value="">خطأ اتصال</option>';
      }
    }

    // تصفير
    obsActionsCart = [];
    renderObsActions();
    if (document.getElementById("resp-elsewedy"))
      document.getElementById("resp-elsewedy").checked = true;
    toggleObsContractor();
  }

  // إظهار/إخفاء المقاول حسب الراديو
  function toggleObsContractor() {
    let isCont = false;
    // التأكد من العنصر المختار
    const checkedRadio = document.querySelector(
      'input[name="obs-resp"]:checked',
    );
    if (checkedRadio && checkedRadio.value === "مقاول") isCont = true;

    if (obsContractorDiv)
      obsContractorDiv.style.display = isCont ? "block" : "none";

    // تحميل المقاولين فقط لو اخترنا مقاول واخترنا مشروع
    if (isCont) {
      const currentProj = obsProject.value;
      if (currentProj) {
        loadObsContractors(currentProj);
      } else {
        obsContractorSelect.innerHTML =
          '<option value="">-- اختر المشروع أولاً --</option>';
      }
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
                  <th>المشروع</th>
                  <th>الوصف</th>
                  <th>إجراء</th>
              </tr>
          </thead>
          <tbody>`;

    obsArray.forEach((obs) => {
      // تنسيق التاريخ للعرض فقط
      let dateDisplay = obs.date;
      try {
        dateDisplay = new Date(obs.date).toLocaleDateString();
      } catch (e) {}

      html += `
          <tr>
              <td><strong>${obs.id}</strong><br><small>${dateDisplay}</small></td>
              <td>${obs.project}<br><small style="color:#666;">${obs.type}</small></td>
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

    // إظهار لودر بسيط
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
});
// --- END DOMContentLoaded ---
