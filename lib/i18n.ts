export type Lang = "en" | "es" | "ar";
export const LANGS: [Lang, string][] = [["en", "English"], ["es", "Español"], ["ar", "العربية"]];
export const parseLang = (v?: string): Lang => (v === "es" || v === "ar" ? v : "en");
export const dir = (l: Lang) => (l === "ar" ? "rtl" : "ltr");
// المفتاح هو النص الإنجليزي؛ القيمة [إسبانية, عربية]. غياب المفتاح يعيد الإنجليزية.
const D: Record<string, [string, string]> = {
  "Home": ["Inicio", "الرئيسية"], "Assistant": ["Asistente", "المساعد"], "Alerts": ["Alertas", "التنبيهات"], "Settings": ["Ajustes", "الإعدادات"], "Navigation": ["Navegación", "التنقل"],
  "Add": ["Añadir", "إضافة"], "Search documents…": ["Buscar documentos…", "ابحث في الوثائق…"], "All": ["Todos", "الكل"], "Favorites": ["Favoritos", "المفضلة"], "Archive": ["Archivo", "الأرشيف"], "Folders": ["Carpetas", "المجلدات"], "Trash": ["Papelera", "المحذوفات"],
  "Several results found. Pick the document you mean.": ["Hay varios resultados. Elige el documento que buscas.", "هناك أكثر من نتيجة. اختر الوثيقة المقصودة."],
  "Could not load documents. Check your connection.": ["No se pudieron cargar los documentos. Revisa tu conexión.", "تعذر تحميل الوثائق. تحقق من الاتصال."],
  "Loading…": ["Cargando…", "جارٍ التحميل…"], "No results. Try other words.": ["Sin resultados. Prueba otras palabras.", "لا توجد نتائج. جرّب كلمات أخرى."],
  "No documents yet": ["Aún no hay documentos", "لا توجد وثائق بعد"], "Tap Add to upload your first document.": ["Pulsa Añadir para subir tu primer documento.", "اضغط إضافة لرفع أول وثيقة."],
  "Your smart document vault": ["Tu bóveda inteligente de documentos", "خزنتك الذكية للوثائق"], "Email": ["Correo electrónico", "البريد الإلكتروني"], "Password": ["Contraseña", "كلمة المرور"],
  "Sign in": ["Iniciar sesión", "تسجيل الدخول"], "Create account": ["Crear cuenta", "إنشاء حساب"], "New account": ["Cuenta nueva", "حساب جديد"], "I have an account": ["Ya tengo cuenta", "لدي حساب"],
  "Could not complete the request. Check your details and try again.": ["No se pudo completar. Revisa tus datos e inténtalo de nuevo.", "تعذر إكمال العملية. تحقق من البيانات وحاول مجدداً."],
  "Account created. Check your email to confirm it if confirmation is enabled.": ["Cuenta creada. Revisa tu correo para confirmarla si la confirmación está activada.", "تم إنشاء الحساب. تحقق من بريدك لتأكيده إن كان التأكيد مفعّلاً."],
  "Add document": ["Añadir documento", "إضافة وثيقة"], "Files (pick several or take a photo)": ["Archivos (varios o una foto)", "الملفات (أكثر من ملف أو التقاط صورة)"], "Name": ["Nombre", "الاسم"], "Category": ["Categoría", "الفئة"],
  "Issuer (optional)": ["Emisor (opcional)", "الجهة المصدرة (اختياري)"], "Expiry date (optional)": ["Fecha de vencimiento (opcional)", "تاريخ الانتهاء (اختياري)"], "Folder (optional)": ["Carpeta (opcional)", "المجلد (اختياري)"], "No folder": ["Sin carpeta", "بدون مجلد"],
  "Save": ["Guardar", "حفظ"], "Saving…": ["Guardando…", "جارٍ الحفظ…"], "Pick a file first.": ["Elige un archivo primero.", "اختر ملفاً أولاً."],
  "File “{name}” is not accepted. Allowed: PDF, JPG, PNG, WEBP up to 15 MB.": ["El archivo «{name}» no es válido. Permitidos: PDF, JPG, PNG, WEBP hasta 15 MB.", "الملف «{name}» غير مقبول. المسموح: PDF وJPG وPNG وWEBP حتى 15 ميغابايت."],
  "Could not save {n} of the files. Try again.": ["No se pudieron guardar {n} archivos. Inténtalo de nuevo.", "تعذر حفظ {n} من الملفات. حاول مجدداً."],
  "ID, contract, invoice…": ["DNI, contrato, factura…", "هوية، عقد، فاتورة…"], "Passport — 2028": ["Pasaporte — 2028", "جواز السفر — 2028"],
  "Issuer": ["Emisor", "الجهة"], "Owner": ["Titular", "صاحب الوثيقة"], "Issue date": ["Fecha de emisión", "تاريخ الإصدار"], "Expiry date": ["Fecha de vencimiento", "تاريخ الانتهاء"], "Reference no.": ["N.º de referencia", "الرقم المرجعي"], "Notes": ["Notas", "الملاحظات"], "Archived": ["Archivado", "مؤرشفة"],
  "Open document": ["Abrir documento", "فتح الوثيقة"], "Download": ["Descargar", "تنزيل"], "Rename": ["Renombrar", "إعادة تسمية"], "Add to favorites": ["Añadir a favoritos", "إضافة للمفضلة"], "Remove from favorites": ["Quitar de favoritos", "إزالة من المفضلة"],
  "Unarchive": ["Desarchivar", "إلغاء الأرشفة"], "Delete": ["Eliminar", "حذف"], "New name": ["Nuevo nombre", "الاسم الجديد"], "Move this document to trash?": ["¿Mover este documento a la papelera?", "نقل الوثيقة إلى المحذوفات؟"],
  "Could not complete the action.": ["No se pudo completar la acción.", "تعذر تنفيذ العملية."], "Could not open the document.": ["No se pudo abrir el documento.", "تعذر فتح الوثيقة."],
  "Text and data extraction": ["Extracción de texto y datos", "استخراج النص والبيانات"], "Failed before": ["Falló antes", "فشل سابق"], "Extracted": ["Extraído", "تم الاستخراج"],
  "Document content is sent to the selected AI provider. Extracted values are suggestions and are not applied without your approval.": ["El contenido se envía al proveedor de IA elegido. Los valores extraídos son sugerencias y no se aplican sin tu aprobación.", "يُرسل محتوى الوثيقة إلى مزود الذكاء الاصطناعي المختار. القيم المستخرجة مقترحات ولا تُعتمد دون موافقتك."],
  "Extracting…": ["Extrayendo…", "جارٍ الاستخراج…"], "Re-extract": ["Extraer de nuevo", "إعادة الاستخراج"], "Extract with AI": ["Extraer con IA", "استخراج بالذكاء الاصطناعي"],
  "Enable AI document analysis in Settings first.": ["Activa primero el análisis de documentos con IA en Ajustes.", "فعّل تحليل الوثائق بالذكاء الاصطناعي من الإعدادات أولاً."],
  "File is too large to extract.": ["El archivo es demasiado grande para extraer.", "الملف كبير على الاستخراج."], "Extraction failed. Your original document is safe; try again later.": ["Falló la extracción. Tu documento original está a salvo; inténtalo más tarde.", "فشل الاستخراج. الوثيقة الأصلية سليمة، حاول لاحقاً."],
  "Approve": ["Aprobar", "اعتماد"], "Ignore": ["Ignorar", "تجاهل"], "Invalid value for this field.": ["Valor no válido para este campo.", "القيمة غير صالحة لهذا الحقل."],
  "Restore": ["Restaurar", "استعادة"], "Delete forever": ["Eliminar definitivamente", "حذف نهائي"], "No deleted documents.": ["No hay documentos eliminados.", "لا توجد وثائق محذوفة."],
  "Delete “{title}” forever?": ["¿Eliminar «{title}» definitivamente?", "حذف «{title}» نهائياً؟"], "This cannot be undone. Are you sure?": ["No se puede deshacer. ¿Seguro?", "لا يمكن التراجع عن الحذف النهائي. متأكد؟"],
  "Could not restore.": ["No se pudo restaurar.", "تعذرت الاستعادة."], "Could not delete the file.": ["No se pudo eliminar el archivo.", "تعذر حذف الملف."], "Could not delete the record.": ["No se pudo eliminar el registro.", "تعذر حذف السجل."],
  "New folder": ["Carpeta nueva", "مجلد جديد"], "Folder name": ["Nombre de la carpeta", "اسم المجلد"], "No folders yet.": ["Aún no hay carpetas.", "لا توجد مجلدات بعد."],
  "Delete this folder? Documents inside stay without a folder.": ["¿Eliminar esta carpeta? Los documentos quedarán sin carpeta.", "حذف المجلد؟ الوثائق داخله تبقى دون مجلد."], "Could not create the folder.": ["No se pudo crear la carpeta.", "تعذر إنشاء المجلد."],
  "New chat": ["Chat nuevo", "محادثة جديدة"], "Searches your vault": ["Busca en tu bóveda", "يبحث في خزنتك"], "Ask about your documents": ["Pregunta sobre tus documentos", "اسأل عن وثائقك"], "Ask about your documents…": ["Pregunta sobre tus documentos…", "اسأل عن وثائقك…"],
  "Where is my rental contract?": ["¿Dónde está mi contrato de alquiler?", "أين عقد الإيجار؟"], "Which documents expire this month?": ["¿Qué documentos vencen este mes?", "ما الوثائق التي تنتهي هذا الشهر؟"], "Show my ID documents": ["Muestra mis documentos de identidad", "أرني وثائق الهوية"],
  "Thinking…": ["Pensando…", "جارٍ التفكير…"], "Send": ["Enviar", "إرسال"], "Stop": ["Detener", "إيقاف"], "Copy": ["Copiar", "نسخ"],
  "Summaries are for help only; the original document is the reference.": ["Los resúmenes son solo orientativos; el documento original es la referencia.", "الملخصات للمساعدة فقط، والوثيقة الأصلية هي المرجع."],
  "Turn on AI document analysis in Settings to use the assistant.": ["Activa el análisis de documentos con IA en Ajustes para usar el asistente.", "فعّل تحليل الوثائق بالذكاء الاصطناعي من الإعدادات لاستخدام المساعد."],
  "The assistant is not set up yet: no valid AI provider.": ["El asistente aún no está configurado: no hay proveedor de IA válido.", "المساعد غير مُعدّ بعد: لا يوجد مزود ذكاء اصطناعي صالح."],
  "The assistant is unavailable right now. Try again later.": ["El asistente no está disponible ahora. Inténtalo más tarde.", "تعذر الاتصال بالمساعد الآن. أعد المحاولة لاحقاً."],
  "Connection lost.": ["Se perdió la conexión.", "انقطع الاتصال."], "Retry": ["Reintentar", "إعادة المحاولة"],
  "The current model hit its usage limit, so we switched to a backup model.": ["El modelo actual alcanzó su límite de uso, así que cambiamos a uno de respaldo.", "وصل النموذج الحالي إلى حد الاستخدام، انتقلنا إلى نموذج بديل."],
  "Dates & alerts": ["Fechas y alertas", "المواعيد والتنبيهات"], "Due reminders": ["Recordatorios pendientes", "تذكيرات مستحقة"], "Reminder {n} days before expiry": ["Recordatorio {n} días antes del vencimiento", "تذكير قبل {n} يوماً من الانتهاء"],
  "Expired": ["Vencido", "منتهية"], "Expiring soon": ["Por vencer", "قريبة الانتهاء"], "Valid": ["Vigente", "سارية"], "Expired {n} days ago": ["Venció hace {n} días", "انتهت منذ {n} يوماً"], "{n} days left": ["Quedan {n} días", "متبقٍ {n} يوماً"],
  "No documents with an expiry date. Add a date when uploading to get reminders.": ["No hay documentos con fecha de vencimiento. Añade una fecha al subir para recibir recordatorios.", "لا توجد وثائق بتاريخ انتهاء. أضف تاريخاً عند رفع وثيقة لتصلك تذكيرات."],
  "Language": ["Idioma", "اللغة"], "AI": ["IA", "الذكاء الاصطناعي"],
  "When enabled, parts of your documents' text may be sent to the selected AI provider for analysis. You can turn this off at any time.": ["Si lo activas, partes del texto de tus documentos pueden enviarse al proveedor de IA elegido para analizarlas. Puedes desactivarlo cuando quieras.", "عند التفعيل قد تُرسل أجزاء من نص وثائقك إلى مزود الذكاء الاصطناعي المختار لتحليلها. يمكنك التعطيل في أي وقت."],
  "Disable AI analysis": ["Desactivar análisis con IA", "تعطيل تحليل الوثائق"], "Enable AI analysis": ["Activar análisis con IA", "تفعيل تحليل الوثائق"], "configured": ["configurado", "مُعدّ"], "not configured": ["sin configurar", "غير مُعدّ"],
  "Light mode": ["Modo claro", "الوضع الفاتح"], "Dark mode": ["Modo oscuro", "الوضع الداكن"], "Export my data": ["Exportar mis datos", "تصدير بياناتي"], "Delete chat history": ["Borrar historial de chats", "حذف سجل المحادثات"],
  "Delete all chats?": ["¿Borrar todos los chats?", "حذف كل المحادثات؟"], "Chats deleted.": ["Chats borrados.", "تم حذف المحادثات."], "Could not delete.": ["No se pudo borrar.", "تعذر الحذف."], "Could not save.": ["No se pudo guardar.", "تعذر الحفظ."], "Sign out": ["Cerrar sesión", "تسجيل الخروج"],
  "Install the app on your device": ["Instalar la app en tu dispositivo", "تثبيت التطبيق على جهازك"],
  "To install on iPhone: open the site in Safari, tap Share, then “Add to Home Screen”.": ["Para instalar en iPhone: abre el sitio en Safari, pulsa Compartir y luego «Añadir a pantalla de inicio».", "للتثبيت على آيفون: افتح الموقع في Safari، اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية»."],
  "To install: open the browser menu (⋮) then choose “Install app” or “Add to Home Screen”.": ["Para instalar: abre el menú del navegador (⋮) y elige «Instalar app» o «Añadir a pantalla de inicio».", "للتثبيت: افتح قائمة المتصفح (⋮) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."],
  "You are offline. Some features are unavailable.": ["Sin conexión. Algunas funciones no están disponibles.", "لا يوجد اتصال بالإنترنت. بعض الميزات غير متاحة."],
};
export function tr(l: Lang, s: string, v?: Record<string, string | number>) {
  let o = l === "en" ? s : D[s]?.[l === "es" ? 0 : 1] ?? s;
  if (v) for (const k in v) o = o.replace(`{${k}}`, String(v[k]));
  return o;
}
