import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";
import type { Locale } from "@/lib/i18n";
import type {
  JobProfile,
  RubricKey,
  ScreeningResult,
} from "@/lib/types";

type DemoCandidateId =
  | "demo-mina"
  | "demo-arman"
  | "demo-sofia"
  | "demo-reza";

interface DemoCandidateTranslation {
  currentRole: string;
  verdict: string;
  summary: string;
  rubricRationales: Record<RubricKey, string>;
  mustHaveRequirements: string[];
  strengths: string[];
  gaps: string[];
  riskNames: string[];
  interviewQuestions: Array<{ question: string; why: string }>;
  fairnessNote: string;
}

export const DEMO_JOB_FA: JobProfile = {
  title: "سازنده مستقل محصولات هوش مصنوعی / مهندس فول‌استک هوش مصنوعی",
  description:
    "محصولات کاربردی هوش مصنوعی را از صفحه سفید تا نسخه مستقرشده، در چند روز و نه چند ماه، طراحی و عرضه کند. این موقعیت به یک سازنده فول‌استک با اختیار عمل بالا نیاز دارد که از مدل‌های زبانی و عامل‌های کدنویسی برای توسعه سریع استفاده کند، پشته فنی را عمل‌گرایانه انتخاب کند، سرویس‌های مدیریت‌شده‌ای مانند Supabase، Firebase و Vercel را کنار هم قرار دهد، APIها را با ابزارهای خودکارسازی یا پایتون متصل کند و به‌تنهایی مالک رابط کاربری، معماری بک‌اند، آزمون و استقرار باشد. سابقه تحویل مستقل، نتایج قابل‌اندازه‌گیری محصول، تجربه وب مدرن با TypeScript و React یا فناوری مشابه، ارکستراسیون عملی هوش مصنوعی، یکپارچه‌سازی API و استقرار سریع، از مدرک دانشگاهی یا وفاداری به یک پشته خاص مهم‌تر است. فرد مناسب باید بتواند موازنه‌های فنی را شفاف توضیح دهد، بدون سند نیازمندی مفصل کار کند و نگاه محصول‌محور و انسان‌محور خود را حفظ کند.",
};

const translations: Record<DemoCandidateId, DemoCandidateTranslation> = {
  "demo-mina": {
    currentRole: "مهندس بنیان‌گذار محصول هوش مصنوعی",
    verdict:
      "شواهد کم‌نظیری از تحویل سریع و سرتاسری محصولات هوش مصنوعی با نتایج قابل‌اندازه‌گیری دارد.",
    summary:
      "مینا چندین بار تمام مسیر، از مسئله کاربر تا محصول هوش مصنوعی مستقرشده را شخصاً هدایت کرده است. رزومه او ارکستراسیون عملی مدل‌های زبانی، توان تحویل قوی با TypeScript و Python، زیرساخت مدیریت‌شده و شواهدی بسیار مشخص از سرعت و پذیرش کاربر را در کنار هم نشان می‌دهد.",
    rubricRationales: {
      core_skills:
        "سامانه‌های عملیاتی را با Next.js، Python، OpenAI، Supabase و ابزارهای خودکارسازی گردش کار ساخته است.",
      relevant_experience:
        "چهار سال تجربه مستقیم و مرتبط در مهندسی محصول، از جمله نقش مهندس بنیان‌گذار، دارد.",
      demonstrated_impact:
        "کاهش ۶۳ درصدی زمان رسیدگی پشتیبانی و پذیرش هفتگی ۴۱ درصدی کاربران را گزارش کرده است.",
      ownership_delivery:
        "نخستین پایلوت پولی را شامل محصول، بک‌اند و استقرار، به‌تنهایی طی ۹ روز عرضه کرده است.",
      role_context:
        "با شرح‌های مبهم بنیان‌گذاران و کاربران میان‌وظیفه‌ای دورکار با موفقیت کار کرده است.",
      communication:
        "موارد رزومه مشخص و باورپذیرند، هرچند یکی از پروژه‌ها حجم پایه را بیان نمی‌کند.",
    },
    mustHaveRequirements: [
      "عرضه مستقل یک محصول هوش مصنوعی",
      "مالکیت کامل توسعه وب",
      "تحویل سریع و عمل‌گرایانه",
    ],
    strengths: [
      "چندین گردش کار هوش مصنوعی مستقرشده، نه صرفاً پروژه آموزشی",
      "شواهد قوی از مالکیت مستقل و سرعت تحویل",
      "اندازه‌گیری نتایج کاربر و کسب‌وکار",
    ],
    gaps: ["شواهد محدود از تحویل محصول موبایل بومی"],
    riskNames: ["بیشتر نمونه‌ها مربوط به محصولات گردش کار B2B هستند"],
    interviewQuestions: [
      {
        question:
          "بدترین میان‌بری را که برای عرضه پایلوت ۹ روزه زدید توضیح دهید؛ بعداً چه چیزی را جایگزین کردید؟",
        why: "قضاوت عمل‌گرایانه و توان مدیریت آگاهانه بدهی فنی را می‌سنجد.",
      },
      {
        question:
          "پیش از ارائه دستیار پشتیبانی به مشتریان پولی، آن را چگونه ارزیابی کردید؟",
        why: "عمق ادعاشده در ارزیابی و قابلیت اطمینان را راستی‌آزمایی می‌کند.",
      },
      {
        question: "در دو ساعت نخست این نقش چه چیزی را مستقر می‌کنید؟",
        why: "نشان می‌دهد رفتار با اختیار عمل بالا در محیطی تازه نیز تکرار می‌شود یا نه.",
      },
    ],
    fairnessNote:
      "امتیاز فقط بر شواهد مرتبط با نقش استوار است. نام، محل زندگی، اعتبار دانشگاه، سن، جنسیت و سایر ویژگی‌های حفاظت‌شده در ارزیابی استفاده نشده‌اند.",
  },
  "demo-arman": {
    currentRole: "مهندس ارشد فول‌استک",
    verdict:
      "توسعه‌دهنده فول‌استک توانمندی است که یکپارچه‌سازی‌های معتبر هوش مصنوعی دارد، اما در مالکیت کامل محصول کمی کمبود شواهد دیده می‌شود.",
    summary:
      "آرمان توان مهندسی وب و استقرار بسیار خوبی دارد و چند یکپارچه‌سازی عملیاتی هوش مصنوعی را تحویل داده است. او سریع و مستقل کار کرده، اما رزومه‌اش نسبت به داوطلب نخست شواهد کمتری از مالکیت کشف محصول و چرخه بازخورد بازار نشان می‌دهد.",
    rubricRationales: {
      core_skills:
        "تجربه قوی با Next.js، Node، Python، PostgreSQL، OpenAI و Vercel دارد.",
      relevant_experience:
        "سابقه فول‌استک مرتبط و دو محصول اخیر مجهز به هوش مصنوعی دارد.",
      demonstrated_impact:
        "تکمیل فرایند شروع کار را ۲۷ درصد افزایش و زمان انتشار را از چند روز به چند ساعت کاهش داده است.",
      ownership_delivery:
        "معماری و استقرار یک تیم سه‌نفره را هدایت کرده و محصولات جانبی را به‌تنهایی عرضه کرده است.",
      role_context:
        "با شرح‌های فنی مبهم راحت است، اما مالکیت او در کشف محصول شفافیت کمتری دارد.",
      communication:
        "رزومه کوتاه و سنجش‌پذیر است، با اندکی ابهام درباره سهم فردی او.",
    },
    mustHaveRequirements: [
      "عرضه مستقل یک محصول هوش مصنوعی",
      "مالکیت کامل توسعه وب",
      "تحویل سریع و عمل‌گرایانه",
    ],
    strengths: [
      "توان عمیق در توسعه وب عملیاتی و استقرار",
      "نتایج تحویل خوب و قابل‌اندازه‌گیری",
      "استفاده عمل‌گرایانه از زیرساخت مدیریت‌شده",
    ],
    gaps: ["شواهد محدود از کشف مشتری و قضاوت طراحی محصول"],
    riskNames: ["بخشی از ادعاهای مالکیت با یک تیم کوچک مشترک بوده‌اند"],
    interviewQuestions: [
      {
        question:
          "یک تصمیم محصول را نشان دهید که بدون سند نیازمندی گرفته‌اید.",
        why: "قضاوت مستقل محصول را که مهم‌ترین ابهام باقی‌مانده است می‌سنجد.",
      },
      {
        question:
          "کدام بخش از فرایند ورود کاربر مبتنی بر هوش مصنوعی شما نخست در محیط عملیاتی شکست خورد؟",
        why: "عمق عملیاتی و صداقت در بیان شکست را می‌سنجد.",
      },
      {
        question:
          "چه زمانی Make را به یک worker سفارشی Node ترجیح می‌دهید؟",
        why: "عمل‌گرایی مستقل از پشته فنی را می‌سنجد.",
      },
    ],
    fairnessNote:
      "امتیاز فقط از شواهد مرتبط با نقش استفاده می‌کند و هویت و ویژگی‌های حفاظت‌شده در آن نقشی ندارند.",
  },
  "demo-sofia": {
    currentRole: "مهندس خودکارسازی و هوش مصنوعی",
    verdict:
      "در خودکارسازی بسیار توانمند است؛ عمق مالکیت او بر محصول فول‌استک باید راستی‌آزمایی شود.",
    summary:
      "سوفیا سازنده‌ای سریع در خودکارسازی است و تجربه خوبی با Python، مدل‌های زبانی، Zapier و Make دارد. او ابزارهای داخلی ارزشمندی تحویل داده، اما رزومه‌اش شواهد محدودی از مالکیت محصولات وب مشتری‌محور و معماری فرانت‌اند عملیاتی ارائه می‌کند.",
    rubricRationales: {
      core_skills:
        "در Python، OpenAI، Make، Zapier و یکپارچه‌سازی API قوی است؛ عمق فرانت‌اند او کمتر است.",
      relevant_experience:
        "سه سال سابقه خودکارسازی و چند گردش کار مرتبط مبتنی بر مدل زبانی دارد.",
      demonstrated_impact:
        "با چهار گردش کار، ۴۶ ساعت کار عملیاتی دستی در ماه را حذف کرده است.",
      ownership_delivery:
        "چندین خودکارسازی داخلی را مستقلاً شناسایی و عرضه کرده است.",
      role_context:
        "با شرح‌های باز و مبهم خوب کار می‌کند، اما شواهد کمتری از مسئولیت محصول عمومی دارد.",
      communication:
        "نتایج شفاف‌اند، هرچند دامنه فنی گاهی بیش از حد کلی بیان شده است.",
    },
    mustHaveRequirements: [
      "عرضه مستقل یک محصول هوش مصنوعی",
      "مالکیت کامل توسعه وب",
      "تحویل سریع و عمل‌گرایانه",
    ],
    strengths: [
      "توان بسیار خوب در خودکارسازی و اتصال APIها",
      "نمونه‌های روشن از تحویل سریع",
      "صرفه‌جویی معنادار در زمان عملیات",
    ],
    gaps: [
      "مالکیت فرانت‌اند مشتری‌محور اثبات نشده است",
      "عمق استقرار و پایش محیط عملیاتی نامشخص است",
    ],
    riskNames: [
      "ممکن است در خودکارسازی تخصصی قوی‌تر از مالکیت کامل محصول فول‌استک باشد",
    ],
    interviewQuestions: [
      {
        question:
          "برای یکی از گردش کارهای خود یک رابط کوچک مشتری‌محور بسازید و مستقر کنید؛ چه فناوری‌ای انتخاب می‌کنید و چرا؟",
        why: "مهم‌ترین کمبود شواهد را مستقیماً می‌سنجد.",
      },
      {
        question:
          "یک گردش کار Make که کسب‌وکار به آن وابسته است را چگونه پایش می‌کنید؟",
        why: "نگاه او به قابلیت اطمینان در محیط عملیاتی را بررسی می‌کند.",
      },
      {
        question: "کدام خودکارسازی را اساساً نباید با ابزار بدون کد می‌ساختید؟",
        why: "شناخت مرزهای معماری و کیفیت قضاوت را می‌سنجد.",
      },
    ],
    fairnessNote:
      "ارزیابی فقط از شواهد مرتبط با نتایج شغلی و توانمندی‌های موردنیاز استفاده می‌کند.",
  },
  "demo-reza": {
    currentRole: "توسعه‌دهنده فرانت‌اند",
    verdict:
      "پایه فرانت‌اند امیدوارکننده‌ای دارد، اما شواهد لازم از هوش مصنوعی و مالکیت سرتاسری وجود ندارد.",
    summary:
      "رضا پایه قابل‌قبولی در React و چند پروژه رابط کاربری تمیز دارد. رزومه فعلی هنوز کار عملیاتی با مدل‌های زبانی، معماری بک‌اند، مالکیت مستقل استقرار یا نتایج قابل‌اندازه‌گیری محصول را در سطح موردنیاز این نقش نشان نمی‌دهد.",
    rubricRationales: {
      core_skills:
        "در React و TypeScript قوی است؛ شواهد بک‌اند، ارکستراسیون هوش مصنوعی و خودکارسازی محدودند.",
      relevant_experience:
        "دو سال سابقه تحویل فرانت‌اند دارد و دامنه مستقیم مرتبط با هوش مصنوعی فول‌استک کم است.",
      demonstrated_impact:
        "به بهبود عملکرد اشاره می‌کند، اما مبنایی برای نتیجه کاربر یا کسب‌وکار ارائه نمی‌دهد.",
      ownership_delivery:
        "مالک قابلیت‌های رابط کاربری بوده، نه یک محصول یا سامانه عملیاتی سرتاسری.",
      role_context:
        "سرعت یادگیری و پروژه‌های جانبی را نشان می‌دهد، اما استقلال در شرح‌های مبهم محصول اثبات نشده است.",
      communication:
        "رزومه خواناست، ولی دامنه و معیار چند ادعا مشخص نیست.",
    },
    mustHaveRequirements: [
      "عرضه مستقل یک محصول هوش مصنوعی",
      "مالکیت کامل توسعه وب",
      "تحویل سریع و عمل‌گرایانه",
    ],
    strengths: [
      "پایه مناسب React و TypeScript",
      "کیفیت خوب پیاده‌سازی بصری",
      "یادگیری خودراهبر",
    ],
    gaps: [
      "فاقد شواهد از مدل زبانی یا سامانه عامل‌محور در محیط عملیاتی",
      "مالکیت بک‌اند، داده و استقرار نشان داده نشده است",
      "نتایج محصول سنجش‌پذیر نیستند",
    ],
    riskNames: [
      "این نقش ممکن است در شرایط فعلی جهش بسیار بزرگی در دامنه استقلال او باشد",
    ],
    interviewQuestions: [
      {
        question:
          "کدام پروژه بهتر از همه ثابت می‌کند که می‌توانید فراتر از فرانت‌اند را مالک شوید؟",
        why: "فرصتی برای آشکار کردن شواهدی است که در رزومه نیامده‌اند.",
      },
      {
        question:
          "یک سامانه عملیاتی ارزیابی رزومه را در یک آخر هفته چگونه می‌سازید؟",
        why: "معماری، شناخت هوش مصنوعی و اولویت‌بندی عمل‌گرایانه را می‌سنجد.",
      },
      {
        question: "چه چیزی مستقر کرده‌اید که کاربران واقعی به آن وابسته‌اند؟",
        why: "مسئولیت او در محیط عملیاتی را روشن می‌کند.",
      },
    ],
    fairnessNote:
      "این پیشنهاد فقط بازتاب کمبود شواهد مرتبط با نقش است و از اطلاعات شخصی یا حفاظت‌شده استفاده نمی‌کند.",
  },
};

function isDemoCandidateId(id: string): id is DemoCandidateId {
  return id in translations;
}

/**
 * Applies Persian narrative copy to a demo result while preserving IDs, enum
 * keys, scores, human decisions, metadata, filenames, names, and source-language
 * evidence. `dir="auto"` or `<bdi>` should be used where those evidence strings
 * are rendered inside the RTL interface.
 */
export function localizeDemoCandidate(
  candidate: ScreeningResult,
  locale: Locale,
): ScreeningResult {
  if (locale === "en" || candidate.source !== "demo" || !isDemoCandidateId(candidate.id)) {
    return candidate;
  }

  const translation = translations[candidate.id];

  return {
    ...candidate,
    profile: {
      ...candidate.profile,
      currentRole: translation.currentRole,
    },
    verdict: translation.verdict,
    summary: translation.summary,
    rubric: candidate.rubric.map((item) => ({
      ...item,
      label: {
        core_skills: "مهارت‌های اصلی",
        relevant_experience: "تجربه مرتبط",
        demonstrated_impact: "اثرگذاری اثبات‌شده",
        ownership_delivery: "مالکیت و تحویل",
        role_context: "تناسب با نقش",
        communication: "شفافیت ارتباطی",
      }[item.key],
      rationale: translation.rubricRationales[item.key],
      evidence: [...item.evidence],
    })),
    mustHaves: candidate.mustHaves.map((item, index) => ({
      ...item,
      requirement: translation.mustHaveRequirements[index] ?? item.requirement,
      evidence: item.evidence,
    })),
    strengths: [...translation.strengths],
    gaps: [...translation.gaps],
    risks: candidate.risks.map((item, index) => ({
      ...item,
      risk: translation.riskNames[index] ?? item.risk,
      evidence: item.evidence,
    })),
    interviewQuestions: translation.interviewQuestions.map((item) => ({ ...item })),
    fairnessNote: translation.fairnessNote,
  };
}

export function localizeDemoCandidates(
  candidates: ScreeningResult[],
  locale: Locale,
): ScreeningResult[] {
  return candidates.map((candidate) => localizeDemoCandidate(candidate, locale));
}

export const DEMO_CANDIDATES_FA: ScreeningResult[] = localizeDemoCandidates(
  DEMO_CANDIDATES,
  "fa",
);

export const DEMO_DATA_BY_LOCALE: Record<
  Locale,
  { job: JobProfile; candidates: ScreeningResult[] }
> = {
  en: { job: DEMO_JOB, candidates: DEMO_CANDIDATES },
  fa: { job: DEMO_JOB_FA, candidates: DEMO_CANDIDATES_FA },
};
