// ─────────────────────────────────────────────────────────────────────────────
// i18n — translation strings for EN / GU / HI / SA
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = "en" | "gu" | "hi" | "sa";

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English",   nativeLabel: "English" },
  { code: "gu", label: "Gujarati",  nativeLabel: "ગુજરાતી" },
  { code: "hi", label: "Hindi",     nativeLabel: "हिंदी" },
  { code: "sa", label: "Sanskrit",  nativeLabel: "संस्कृत" },
];

export const translations = {
  // ── Navigation ──────────────────────────────────────────────────────────────
  nav_dashboard:   { en: "Dashboard",  gu: "ડેશબોર્ડ",      hi: "डैशबोर्ड",    sa: "सारपट्टिका" },
  nav_clients:     { en: "Clients",    gu: "ગ્રાહકો",        hi: "ग्राहक",      sa: "ग्राहकाः" },
  nav_inquiries:   { en: "Inquiries",  gu: "પૂછપરછ",         hi: "जाँच",        sa: "जिज्ञासाः" },
  nav_quotations:  { en: "Quotations", gu: "ભાવ પત્રક",      hi: "कोटेशन",      sa: "मूल्यपत्रम्" },
  nav_invoices:    { en: "Invoices",   gu: "ઇન્વૉઇસ",        hi: "चालान",       sa: "शुल्कपत्रम्" },
  nav_calendar:    { en: "Calendar",   gu: "કૅલેન્ડર",       hi: "कैलेंडर",     sa: "पञ्चाङ्गम्" },
  nav_warehouse:   { en: "Warehouse",  gu: "વેરહાઉસ",        hi: "गोदाम",       sa: "भाण्डागारम्" },
  nav_equipment:   { en: "Equipment",  gu: "સાધન સામગ્રી",   hi: "उपकरण",       sa: "उपकरणानि" },
  nav_kits:        { en: "Kits",       gu: "કિટ્સ",          hi: "किट्स",       sa: "सम्भाराः" },
  nav_vendors:     { en: "Vendors",    gu: "વિક્રેતા",       hi: "विक्रेता",    sa: "विक्रेतारः" },
  nav_staff:       { en: "Staff",      gu: "સ્ટાફ",          hi: "कर्मचारी",    sa: "कर्मचारिणः" },
  nav_settings:    { en: "Settings",   gu: "સેટિંગ્સ",       hi: "सेटिंग्स",    sa: "व्यवस्थापनम्" },
  nav_org_explorer:     { en: "Org Explorer",          gu: "સંસ્થા અન્વેષક",    hi: "संगठन एक्सप्लोरर", sa: "संस्था अन्वेषकः" },
  nav_salary_reports:   { en: "Salary Reports & Payroll", gu: "પગાર અહેવાલ",    hi: "वेतन रिपोर्ट",     sa: "वेतनप्रतिवेदनम्" },
  nav_inactive_staff:   { en: "Inactive Staff",           gu: "નિષ્ક્રિય સ્ટાફ", hi: "निष्क्रिय कर्मचारी", sa: "निष्क्रिय कर्मचारिणः" },

  // ── Header / Account ────────────────────────────────────────────────────────
  account_menu:       { en: "Account menu",   gu: "એકાઉન્ટ મેનૂ",  hi: "अकाउंट मेनू",  sa: "लेखामेनू" },
  sign_out:           { en: "Sign out",        gu: "સાઇન આઉટ",      hi: "साइन आउट",     sa: "निर्गमनम्" },
  signing_out:        { en: "Signing out…",    gu: "સાઇન આઉટ થઈ રહ્યું છે…", hi: "साइन आउट हो रहा है…", sa: "निर्गच्छति…" },
  switch_to_dark:     { en: "Switch to dark mode",  gu: "ડાર્ક મોડ",  hi: "डार्क मोड",  sa: "तमोदर्शनम्" },
  switch_to_light:    { en: "Switch to light mode", gu: "લાઇટ મોડ",   hi: "लाइट मोड",   sa: "प्रकाशदर्शनम्" },
  language:           { en: "Language",        gu: "ભાષા",           hi: "भाषा",         sa: "भाषा" },

  // ── Login ───────────────────────────────────────────────────────────────────
  login_welcome:      { en: "Welcome to BK Media",               gu: "BK મીડિયામાં આપનું સ્વાગત છે",    hi: "BK मीडिया में आपका स्वागत है",    sa: "BK मीडियामध्ये स्वागतम्" },
  login_subtitle:     { en: "Sign in to access Video Department CRM", gu: "વિડિઓ વિભાગ CRM ઍક્સેસ કરો", hi: "वीडियो विभाग CRM एक्सेस करें",   sa: "विडियो विभाग CRM प्रवेशः" },
  login_username:     { en: "Username",    gu: "વપરાશકર્તા નામ", hi: "यूज़रनेम",   sa: "उपयोक्तृनाम" },
  login_password:     { en: "Password",    gu: "પાસવર્ડ",         hi: "पासवर्ड",    sa: "गुप्तशब्दः" },
  login_btn:          { en: "Sign In",     gu: "સાઇન ઇન",         hi: "साइन इन",    sa: "प्रवेशः" },
  login_signing_in:   { en: "Signing in…", gu: "સાઇન ઇન થઈ રહ્યું છે…", hi: "साइन इन हो रहा है…", sa: "प्रविशति…" },
  login_fill_fields:  { en: "Please fill in all fields.", gu: "કૃપા કરી બધા ક્ષેત્રો ભરો.", hi: "कृपया सभी फ़ील्ड भरें।", sa: "सर्वाणि क्षेत्राणि पूरयतु।" },
  login_placeholder_user: { en: "e.g. admin", gu: "ઉદા. admin", hi: "जैसे admin", sa: "यथा admin" },

  // ── Common ──────────────────────────────────────────────────────────────────
  cancel:       { en: "Cancel",  gu: "રદ કરો",   hi: "रद्द करें",  sa: "निरस्तम्" },
  save:         { en: "Save",    gu: "સાચવો",    hi: "सहेजें",     sa: "रक्षतु" },
  edit:         { en: "Edit",    gu: "સંપાદિત કરો", hi: "संपादित करें", sa: "सम्पादयतु" },
  delete:       { en: "Delete",  gu: "કાઢી નાખો", hi: "हटाएं",     sa: "हस्तयतु" },
  search:       { en: "Search",  gu: "શોધ",       hi: "खोजें",      sa: "अन्विष्यतु" },
  loading:      { en: "Loading…", gu: "લોડ થઈ રહ્યું છે…", hi: "लोड हो रहा है…", sa: "लोड्यति…" },
  no_results:   { en: "No results found.", gu: "કોઈ પરિણામ મળ્યું નથી.", hi: "कोई परिणाम नहीं मिला।", sa: "कोऽपि परिणामः न प्राप्तः।" },
  actions:      { en: "Actions",  gu: "ક્રિયાઓ",  hi: "कार्रवाई",   sa: "क्रियाः" },
  status:       { en: "Status",   gu: "સ્થિતિ",   hi: "स्थिति",     sa: "स्थितिः" },
  active:       { en: "Active",   gu: "સક્રિય",   hi: "सक्रिय",     sa: "सक्रियः" },
  inactive:     { en: "Inactive", gu: "નિષ્ક્રિય", hi: "निष्क्रिय", sa: "निष्क्रियः" },
  department:   { en: "Department", gu: "વિભાગ",  hi: "विभाग",      sa: "विभागः" },
  role:         { en: "Role",     gu: "ભૂમિકા",   hi: "भूमिका",     sa: "भूमिका" },
  name:         { en: "Name",     gu: "નામ",       hi: "नाम",        sa: "नाम" },
  phone:        { en: "Phone",    gu: "ફોન",       hi: "फोन",        sa: "दूरवाणी" },
  created:      { en: "Created",  gu: "બનાવ્યું",  hi: "बनाया",      sa: "निर्मितम्" },
  view_all:     { en: "View all", gu: "બધા જુઓ",  hi: "सब देखें",   sa: "सर्वं पश्यतु" },

  // ── Status values ────────────────────────────────────────────────────────────
  status_new:       { en: "New",       gu: "નવું",       hi: "नया",       sa: "नूतनम्" },
  status_quoted:    { en: "Quoted",    gu: "ભાવ અપાઈ",  hi: "कोटेड",     sa: "मूल्याङ्कितम्" },
  status_confirmed: { en: "Confirmed", gu: "પાક્કું",    hi: "कन्फर्म",   sa: "निश्चितम्" },
  status_cancelled: { en: "Cancelled", gu: "રદ",          hi: "रद्द",      sa: "रद्दम्" },

  // ── Users & Roles ────────────────────────────────────────────────────────────
  users_title:        { en: "Users & Roles",         gu: "વપરાશકર્તા અને ભૂમિકા",   hi: "यूज़र और भूमिकाएं",    sa: "उपयोक्तारः भूमिकाश्च" },
  users_desc:         { en: "Manage user credentials, status, and system roles. Only Administrators have access.", gu: "વપરાશકર્તાઓ, સ્ટેટસ અને ભૂમિકા સંચાલિત કરો. ફક્ત એડમિન ઍક્સેસ.", hi: "यूज़र क्रेडेंशियल, स्थिति और सिस्टम भूमिकाएं प्रबंधित करें।", sa: "उपयोक्तृप्रमाणानि स्थितिः भूमिकाश्च प्रबन्धयतु।" },
  users_tab_accounts: { en: "User Accounts",    gu: "વપરાશકર્તા એકાઉન્ટ",   hi: "यूज़र अकाउंट",    sa: "उपयोक्तृलेखाः" },
  users_tab_perms:    { en: "Permissions Matrix", gu: "પરવાનગી મેટ્રિક્સ",  hi: "अनुमति मैट्रिक्स", sa: "अनुमतिपट्टिका" },
  users_total:        { en: "Total Users",   gu: "કુલ વપરાશકર્તા",  hi: "कुल यूज़र",     sa: "कुल उपयोक्तारः" },
  users_active:       { en: "Active",        gu: "સક્રિય",           hi: "सक्रिय",        sa: "सक्रियाः" },
  users_admins:       { en: "Admins",        gu: "એડમિન",            hi: "एडमिन",         sa: "प्रशासकाः" },
  users_dept_heads:   { en: "Dept Heads",    gu: "વિભાગ વડા",        hi: "विभाग प्रमुख",  sa: "विभागाध्यक्षाः" },
  users_search:       { en: "Search users…", gu: "વપરાશકર્તા શોધો…", hi: "यूज़र खोजें…",  sa: "उपयोक्तारम् अन्विष्यतु…" },
  users_all:          { en: "All Users",     gu: "બધા વપરાશકર્તા",   hi: "सभी यूज़र",     sa: "सर्वे उपयोक्तारः" },
  users_new_btn:      { en: "New User",      gu: "નવો વપરાશકર્તા",   hi: "नया यूज़र",     sa: "नूतन उपयोक्ता" },
  users_create_title: { en: "Create New User",       gu: "નવો વપરાશકર્તા બનાવો",    hi: "नया यूज़र बनाएं",    sa: "नूतन उपयोक्ता निर्मातु" },
  users_create_sub:   { en: "Set credentials and assign a role", gu: "ઓળખ અને ભૂમિકા સેટ કરો", hi: "क्रेडेंशियल और भूमिका सेट करें", sa: "प्रमाणं भूमिकां च निर्धारयतु" },
  users_full_name:    { en: "Full Name",     gu: "પૂરું નામ",          hi: "पूरा नाम",      sa: "पूर्णनाम" },
  users_username:     { en: "Username *",    gu: "વપરાશકર્તા નામ *",  hi: "यूज़रनेम *",    sa: "उपयोक्तृनाम *" },
  users_password:     { en: "Password * (min 6 chars)", gu: "પાસવર્ડ * (ઓછામાં ઓછા ૬ અક્ષર)", hi: "पासवर्ड * (कम से कम 6 अक्षर)", sa: "गुप्तशब्दः * (न्यूनतः ६ वर्णाः)" },
  users_link_staff:   { en: "Link to Staff Record *",   gu: "સ્ટાફ રેકોર્ડ સાથે જોડો *",    hi: "स्टाफ रिकॉर्ड से जोड़ें *",       sa: "कर्मचारि-लेखेन योजयतु *" },
  users_select_staff: { en: "— Select staff member —", gu: "— સ્ટાફ સભ્ય પસંદ કરો —",    hi: "— स्टाफ सदस्य चुनें —",           sa: "— कर्मचारिणं वृणोतु —" },
  users_staff_note:   { en: "This staff member will see their own assigned events and payments when they log in.", gu: "આ સ્ટાફ સભ્ય લૉગ ઇન કરે ત્યારે તેમના ઇવેન્ટ અને ચૂકવણી જોઈ શકશે.", hi: "यह स्टाफ सदस्य लॉगिन करने पर अपने असाइन किए गए इवेंट और पेमेंट देख सकेगा।", sa: "एषः कर्मचारी स्वकीयान् नियुक्तकार्यक्रमान् भुगतानानि च द्रक्ष्यति।" },
  users_creating:     { en: "Creating…",   gu: "બનાવાઈ રહ્યું છે…", hi: "बनाया जा रहा है…", sa: "निर्मीयते…" },
  users_create_btn:   { en: "Create User", gu: "વપરાશકર્તા બનાવો",  hi: "यूज़र बनाएं",      sa: "उपयोक्तारं निर्मातु" },
  users_saving:       { en: "Saving…",     gu: "સાચવાઈ રહ્યું છે…", hi: "सहेजा जा रहा है…", sa: "रक्ष्यते…" },
  users_save_changes: { en: "Save Changes", gu: "ફેરફારો સાચવો",    hi: "परिवर्तन सहेजें",   sa: "परिवर्तनानि रक्षतु" },
  users_no_results:   { en: "No users found.", gu: "કોઈ વપરાશકર્તા મળ્યો નથી.", hi: "कोई यूज़र नहीं मिला।", sa: "कोऽपि उपयोक्ता न प्राप्तः।" },
  users_err_required: { en: "Username and password are required.", gu: "વપરાશકર્તા નામ અને પાસવર્ડ જરૂરી છે.", hi: "यूज़रनेम और पासवर्ड आवश्यक हैं।", sa: "उपयोक्तृनाम गुप्तशब्दश्च आवश्यकौ।" },
  users_err_passlen:  { en: "Password must be at least 6 characters.", gu: "પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.", hi: "पासवर्ड कम से कम 6 अक्षर का होना चाहिए।", sa: "गुप्तशब्दः न्यूनतः षड्वर्णात्मकः भवेत्।" },
  users_err_staff:    { en: "Please select which staff member this account belongs to.", gu: "આ ખાતો કયા સ્ટાફ સભ્ય માટે છે તે પસંદ કરો.", hi: "कृपया चुनें कि यह अकाउंट किस स्टाफ सदस्य का है।", sa: "कस्य कर्मचारिणः एतत् लेखं इति वृणोतु।" },
  users_success_created: { en: "User created successfully.", gu: "વપરાશકર્તા સફળતાપૂર્વક બનાવ્યો.", hi: "यूज़र सफलतापूर्वक बनाया गया।", sa: "उपयोक्ता सफलतया निर्मितः।" },
  users_success_updated: { en: "User updated.", gu: "વપરાશકર્તા અપડેટ થયો.", hi: "यूज़र अपडेट हो गया।", sa: "उपयोक्ता अद्यतनः।" },
  users_success_deleted: { en: "User deleted.", gu: "વપરાશકર્તા કાઢી નાખ્યો.", hi: "यूज़र हटाया गया।", sa: "उपयोक्ता हस्तितः।" },
  users_new_password: { en: "New Password (leave blank to keep current)", gu: "નવો પાસવર્ડ (ખાલી રાખો તો ચાલુ રહેશે)", hi: "नया पासवर्ड (खाली छोड़ें तो वर्तमान रहेगा)", sa: "नूतन गुप्तशब्दः (रिक्तं चेत् वर्तमानः रक्ष्यते)" },
  users_acct_status:  { en: "Account Status", gu: "ખાતાની સ્થિતિ", hi: "अकाउंट स्थिति", sa: "लेखस्थितिः" },

  // ── Role hints ───────────────────────────────────────────────────────────────
  role_hint_admin:   { en: "Full access including user management.",                         gu: "વપરાશકર્તા વ્યવસ્થાપન સહિત સંપૂર્ণ ઍક્સેસ.",            hi: "यूज़र प्रबंधन सहित पूर्ण एक्सेस।",      sa: "उपयोक्तृप्रबन्धनसहितः पूर्णः प्रवेशः।" },
  role_hint_manager: { en: "Can create and edit all records. Cannot manage users or delete equipment.", gu: "બધા રેકોર્ડ બનાવી અને સંપાદિત કરી શકે. વપરાશકર્તા અથવા સાધન ડિલીટ ન કરી શકે.", hi: "सभी रिकॉर्ड बना और संपादित कर सकते हैं। यूज़र प्रबंधन या उपकरण हटा नहीं सकते।", sa: "सर्वाणि अभिलेखानि निर्मातुं सम्पादयितुं च शक्नोति। उपयोक्तृप्रबन्धनं उपकरणहस्तनं च न शक्नोति।" },
  role_hint_operator:{ en: "Read-only access across all sections.",                         gu: "બધા વિભાગોમાં ફક્ત વાંચવાનો ઍક્સેસ.",                     hi: "सभी अनुभागों में केवल पढ़ने की एक्सेस।", sa: "सर्वेषु विभागेषु केवलं पठनप्रवेशः।" },
  role_hint_dept:    { en: "View and edit access scoped to their department.",              gu: "તેમના વિભાગ સુધી સીમિત ઍક્સેસ.",                           hi: "अपने विभाग तक सीमित देखने और संपादित करने की एक्सेस।", sa: "स्वविभागपर्यन्तः दर्शन-सम्पादन-प्रवेशः।" },
  role_hint_staff:   { en: "See own assigned events, dates, and payments only.",           gu: "ફક્ત પોતાના ઇવેન્ટ, તારીખ અને ચૂકવણી જોઈ શકે.",          hi: "केवल अपने असाइन किए गए इवेंट, तारीखें और पेमेंट देख सकते हैं।", sa: "केवलं स्वनियुक्तकार्यक्रमान् तिथीः भुगतानानि च पश्यतु।" },

  // ── Staff list ───────────────────────────────────────────────────────────────
  staff_title:        { en: "Staff Directory",   gu: "સ્ટાફ ડિરેક્ટરી",  hi: "स्टाफ डायरेक्टरी", sa: "कर्मचारि-सूची" },
  staff_desc:         { en: "Manage in-house employees, external contractors, assign positions, check availability and record payments.", gu: "ઇન-હાઉસ કર્મચારીઓ, બહારના ઠેકેદારોનું સંચાલન, પોઝિશન સોંપો, ઉપલબ્ધતા તપાસો અને ચૂકવણી નોંધો.", hi: "इन-हाउस कर्मचारियों, बाहरी ठेकेदारों का प्रबंधन करें, पोजीशन असाइन करें।", sa: "आन्तरिककर्मचारिणाम् बाह्यठेकेदाराणां च प्रबन्धनम्।" },
  staff_total:        { en: "Total Staff",       gu: "કુલ સ્ટાફ",         hi: "कुल कर्मचारी",    sa: "कुल कर्मचारिणः" },
  staff_available:    { en: "Available",         gu: "ઉપલબ્ધ",            hi: "उपलब्ध",          sa: "उपलब्धाः" },
  staff_deployed:     { en: "Deployed",          gu: "જમાવ્યા",           hi: "तैनात",            sa: "नियुक्ताः" },
  staff_pending_pay:  { en: "Pending Payment",   gu: "બાકી ચૂકવણી",       hi: "बकाया भुगतान",    sa: "अपूर्णभुगतानम्" },
  staff_all:          { en: "All Staff",         gu: "બધો સ્ટાફ",         hi: "सभी कर्मचारी",    sa: "सर्वे कर्मचारिणः" },
  staff_inhouse:      { en: "In-house",          gu: "ઇન-હાઉસ",           hi: "इन-हाउस",         sa: "आन्तरिकः" },
  staff_external:     { en: "External",          gu: "બહારના",            hi: "बाहरी",            sa: "बाह्यः" },
  staff_export_csv:   { en: "Export CSV",        gu: "CSV નિકાસ",         hi: "CSV निर्यात",      sa: "CSV निर्यातयतु" },
  staff_export_pdf:   { en: "Export PDF",        gu: "PDF નિકાસ",         hi: "PDF निर्यात",      sa: "PDF निर्यातयतु" },
  staff_add:          { en: "+ Add Staff",       gu: "+ સ્ટાફ ઉમેરો",     hi: "+ स्टाफ जोड़ें",   sa: "+ कर्मचारिणं योजयतु" },
  staff_search:       { en: "Search staff by name, role, mobile number…", gu: "નામ, ભૂમિકા, મોબાઇલ નંબર દ્વારા સ્ટાફ શોધો…", hi: "नाम, भूमिका, मोबाइल नंबर से खोजें…", sa: "नाम्ना भूमिकया दूरवाणीसंख्यया वा अन्विष्यतु…" },
  staff_all_status:   { en: "All Statuses",      gu: "બધી સ્થિતિ",        hi: "सभी स्थितियां",   sa: "सर्वाः स्थितयः" },
  staff_all_payments: { en: "All Payments",      gu: "બધી ચૂકવણી",        hi: "सभी भुगतान",      sa: "सर्वाणि भुगतानानि" },
  staff_per_day:      { en: "Per Day",           gu: "પ્રતિ દિવસ",        hi: "प्रति दिन",        sa: "प्रतिदिनम्" },
  staff_monthly:      { en: "Monthly Fixed",     gu: "માસિક નિશ્ચિત",     hi: "मासिक निश्चित",   sa: "मासिकनिश्चितम्" },
  staff_type:         { en: "Type",              gu: "પ્રકાર",             hi: "प्रकार",           sa: "प्रकारः" },
  staff_payment:      { en: "Payment",           gu: "ચૂકવણી",            hi: "भुगतान",           sa: "भुगतानम्" },
  staff_with_equip:   { en: "With Equip.",       gu: "સાધન સાથે",         hi: "उपकरण सहित",      sa: "उपकरणसहितः" },
  staff_no_results:   { en: "No staff members found matching the selected filters.", gu: "પસંદ કરેલ ફિલ્ટર સાથે કોઈ સ્ટાફ મળ્યો નથી.", hi: "चुने गए फ़िल्टर से कोई स्टाफ नहीं मिला।", sa: "चितफिल्टरेण कोऽपि कर्मचारी न प्राप्तः।" },

  // ── Staff portal ─────────────────────────────────────────────────────────────
  portal_dashboard:    { en: "Dashboard",      gu: "ડેશબોર્ડ",       hi: "डैशबोर्ड",     sa: "सारपट्टिका" },
  portal_my_schedule:  { en: "My Schedule",    gu: "મારો શેડ્યૂલ",   hi: "मेरा शेड्यूल",  sa: "मम कार्यसूची" },
  portal_my_payments:  { en: "My Payments",    gu: "મારી ચૂકવણી",    hi: "मेरे भुगतान",   sa: "मम भुगतानानि" },
  portal_good_day:     { en: "Good day",       gu: "નમસ્તે",         hi: "नमस्ते",        sa: "नमस्ते" },
  portal_summary:      { en: "Here's a summary of your events and payments.", gu: "તમારા ઇવેન્ટ અને ચૂકવણીનો સારાંશ.", hi: "आपके इवेंट और भुगतान का सारांश।", sa: "भवतः कार्यक्रमाणां भुगतानानां च सारः।" },
  portal_total_events: { en: "Total Events",   gu: "કુલ ઇવેન્ટ",     hi: "कुल इवेंट",     sa: "कुल कार्यक्रमाः" },
  portal_upcoming:     { en: "Upcoming Events", gu: "આગામી ઇવેન્ટ",  hi: "आगामी इवेंट",   sa: "आगामि-कार्यक्रमाः" },
  portal_no_upcoming:  { en: "No upcoming events", gu: "કોઈ આગામી ઇવેન્ટ નથી", hi: "कोई आगामी इवेंट नहीं", sa: "कोऽपि आगामि-कार्यक्रमः नास्ति" },
  portal_assigned_by:  { en: "Your Department Head will assign you to events.", gu: "તમારા વિભાગ વડા તમને ઇવેન્ટ સોંપશે.", hi: "आपके विभाग प्रमुख आपको इवेंट असाइन करेंगे।", sa: "भवतः विभागाध्यक्षः कार्यक्रमान् नियोक्ष्यति।" },
  portal_report_at:    { en: "Report at",      gu: "સમય",             hi: "रिपोर्ट समय",   sa: "उपस्थितिः" },
  portal_earnings:     { en: "Earnings Summary", gu: "કમાણીનો સારાંશ", hi: "कमाई का सारांश", sa: "आयसारः" },
  portal_total_earned: { en: "Total Earned",   gu: "કુલ કમાણી",       hi: "कुल कमाई",      sa: "कुल आयः" },
  portal_pending:      { en: "Pending",        gu: "બાકી",             hi: "बकाया",         sa: "अपूर्णम्" },
  portal_view_payments:{ en: "View Payments",  gu: "ચૂકવણી જુઓ",      hi: "भुगतान देखें",  sa: "भुगतानानि पश्यतु" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang] ?? translations[key]["en"];
}
