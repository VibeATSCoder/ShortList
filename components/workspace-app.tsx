"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AtSign,
  BookOpenCheck,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleGauge,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Files,
  Fingerprint,
  History,
  Inbox,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRoundCheck,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { ScoreRing } from "@/components/score-ring";
import { WorkspaceScreenModal } from "@/components/workspace-screen-modal";
import { formatNumber, type Locale } from "@/lib/i18n";
import type {
  AuditEventSummary,
  EmailTemplateSummary,
  PipelineStage,
  PositionSummary,
  WorkspaceCandidate,
  WorkspaceSnapshot,
} from "@/lib/workspace-types";

type WorkspaceTab = "pipeline" | "candidates" | "team" | "templates" | "automations" | "audit";

const workspaceCopy = {
  en: {
    workspace: "Recruiter workspace",
    portfolio: "Upload and screen resume",
    positions: "Positions",
    overview: "Workspace",
    pipeline: "Pipeline",
    candidates: "Candidates",
    team: "Team access",
    templates: "Email templates",
    automations: "Automations",
    audit: "Audit trail",
    open: "Open",
    draft: "Draft",
    paused: "Paused",
    closed: "Closed",
    archived: "Archived",
    newPosition: "New position",
    positionHealth: "Position health",
    candidateCount: "Active candidates",
    evidenceReady: "Evidence ready",
    awaitingReview: "Awaiting team review",
    averageFit: "Average fit signal",
    demoMode: "Interactive demo · changes stay in this browser",
    databaseMode: "cPanel MySQL · private workspace",
    search: "Search candidate, role, or source",
    blindOn: "Blind review on",
    blindOff: "Identity visible",
    applied: "Applied",
    fit: "Job fit",
    parse: "Parse quality",
    stage: "Stage",
    source: "Source",
    lastActivity: "Last activity",
    noCandidates: "No candidates are in this position yet.",
    noCandidatesHint: "Upload a candidate CV to screen it with AI and add the assessment directly to this position.",
    candidateEvidence: "Candidate evidence",
    protectedResume: "Protected showcase resume",
    originalResume: "Original resume",
    resumeAndAssessment: "Resume and ATS evidence",
    resumeIdentityLocked: "Turn off blind review to view the original resume.",
    openResume: "Open resume",
    resumePreviewUnavailable: "Inline preview is unavailable for this file type. Open the original file instead.",
    moveCandidate: "Move candidate",
    moveReason: "Reason for this transition",
    moveReasonPlaceholder: "e.g. scorecard approved by the hiring manager",
    confirmMove: "Confirm stage move",
    moving: "Moving…",
    moveSaved: "Stage updated. The audit event was recorded.",
    interviewDraft: "An interview email draft was prepared for human approval.",
    requirements: "Requirement checks",
    evidence: "Evidence",
    gaps: "Evidence gaps",
    questions: "Interview questions",
    parseDiagnostics: "Resume parse diagnostics",
    parseNote: "Parse quality is separate from job fit. It only reports whether the document was interpreted reliably.",
    contactField: "Contact",
    experienceField: "Experience",
    skillsField: "Skills",
    datesField: "Dates",
    parsed: "Parsed",
    partial: "Partial",
    missing: "Missing",
    parseWarnings: "Parser warnings",
    directIdentifiers: "Direct identifiers",
    identityAccess: "Identity access",
    allPositions: "All positions",
    assignedOnly: "Assigned only",
    active: "Active",
    invited: "Invited",
    suspended: "Suspended",
    role: "Role",
    access: "Position access",
    privacy: "Privacy",
    templateLibrary: "Template library",
    templateNote: "Versioned, bilingual templates with restricted variables. Candidate messages always require a human confirmation.",
    activeVersion: "Active version",
    draftVersion: "Draft version",
    subject: "Subject",
    message: "Message",
    allowedVariables: "Allowed variables",
    smtpReady: "cPanel SMTP ready",
    smtpMissing: "SMTP password/DNS still required",
    sendTest: "Download test .eml",
    testPrepared: "Test email downloaded. No candidate data was included.",
    retiredVersion: "Retired version",
    automationSafety: "Safe automation contract",
    automationNote: "Rules may prepare drafts and reminders. They never auto-reject, auto-advance, or send adverse messages.",
    inviteMember: "Invite member",
    teamAdminUnavailable: "Team administration is read-only in this showcase.",
    newRule: "New rule",
    ruleBuilderUnavailable: "Rule creation is read-only; the existing safety switches remain interactive.",
    approvalRequired: "Human approval",
    automatic: "Safe to run",
    lastRun: "Last run",
    never: "Never",
    auditNote: "Append-only security and hiring events. Resume text, tokens, and passwords are never written here.",
    actor: "Actor",
    action: "Action",
    target: "Target",
    time: "Time",
    systemReady: "System readiness",
    database: "Database",
    smtp: "SMTP",
    ai: "Live AI",
    files: "Encrypted files",
    configured: "Configured",
    notConfigured: "Not configured",
    logout: "Sign out",
    openNavigation: "Open navigation",
    close: "Close",
    createPosition: "Create position",
    createPositionHint: "Start with a job ad, then confirm the pipeline and scoring criteria before screening.",
    removePosition: "Remove position",
    removingPosition: "Removing...",
    removePositionConfirm: "Remove this position from the workspace? Its candidates, assessments, and audit history will be retained in the archive.",
    positionRemoved: "Position removed. Its hiring history remains archived.",
    protectedPosition: "Protected challenge position",
    title: "Position title",
    department: "Department",
    location: "Location",
    employmentType: "Employment type",
    description: "Job ad / role context",
    creating: "Creating…",
    create: "Create draft position",
    demoCreated: "Draft position created for this demo session.",
    error: "The action could not be completed. Refresh and try again.",
    saved: "Saved",
    noResults: "No matching candidates.",
    scoreSignal: "AI signal—not a hiring decision",
    humanControl: "Human-controlled",
    refresh: "Refresh",
    communication: "Candidate communication",
    communicationNote: "The recipient is loaded from the canonical candidate record. Sending requires explicit approval.",
    chooseTemplate: "Email template",
    schedulingUrl: "Scheduling URL",
    nextUpdateDate: "Next update date",
    sendApproved: "Approve & send email",
    sendingEmail: "Sending…",
    emailSent: "Email accepted by cPanel SMTP and recorded in the outbox.",
    emailPending: "SMTP accepted the request, but the final outbox state still needs reconciliation. Do not send it again.",
    emailUnavailable: "Add a candidate email and complete SMTP setup before sending.",
    deleteApplication: "Delete resume",
    deleteApplicationConfirm: "Remove this candidate and resume assessment from the active position? This cannot be undone from the workspace. The archived record and audit history are retained for accountability.",
    applicationDeleted: "Resume and candidate application removed from this position.",
    exportAudit: "Export audit events as CSV",
  },
  fa: {
    workspace: "فضای کار استخدام",
    portfolio: "بارگذاری و ارزیابی رزومه",
    positions: "موقعیت‌ها",
    overview: "فضای کار",
    pipeline: "فرایند جذب",
    candidates: "داوطلبان",
    team: "دسترسی تیم",
    templates: "قالب‌های ایمیل",
    automations: "خودکارسازی‌ها",
    audit: "تاریخچه ممیزی",
    open: "باز",
    draft: "پیش‌نویس",
    paused: "متوقف",
    closed: "بسته",
    archived: "بایگانی",
    newPosition: "موقعیت جدید",
    positionHealth: "وضعیت موقعیت",
    candidateCount: "داوطلب فعال",
    evidenceReady: "شواهد آماده",
    awaitingReview: "منتظر بررسی تیم",
    averageFit: "میانگین سیگنال تناسب",
    demoMode: "دموی تعاملی · تغییرات فقط در این مرورگر می‌ماند",
    databaseMode: "MySQL سی‌پنل · فضای خصوصی",
    search: "جست‌وجوی داوطلب، نقش یا منبع",
    blindOn: "بررسی ناشناس فعال",
    blindOff: "هویت قابل مشاهده",
    applied: "تاریخ درخواست",
    fit: "تناسب شغلی",
    parse: "کیفیت خوانش",
    stage: "مرحله",
    source: "منبع",
    lastActivity: "آخرین فعالیت",
    noCandidates: "هنوز داوطلبی در این موقعیت نیست.",
    noCandidatesHint: "رزومه داوطلب را بارگذاری کنید تا با هوش مصنوعی ارزیابی و مستقیماً به این موقعیت اضافه شود.",
    candidateEvidence: "شواهد داوطلب",
    protectedResume: "رزومه نمایشی محافظت‌شده",
    originalResume: "رزومه اصلی",
    resumeAndAssessment: "رزومه و شواهد ATS",
    resumeIdentityLocked: "برای مشاهده رزومه اصلی، بررسی ناشناس را غیرفعال کنید.",
    openResume: "باز کردن رزومه",
    resumePreviewUnavailable: "پیش‌نمایش درون‌صفحه‌ای برای این نوع فایل در دسترس نیست؛ فایل اصلی را باز کنید.",
    moveCandidate: "انتقال داوطلب",
    moveReason: "دلیل این انتقال",
    moveReasonPlaceholder: "مثلاً تأیید اسکورکارت توسط مدیر استخدام",
    confirmMove: "تأیید انتقال مرحله",
    moving: "در حال انتقال…",
    moveSaved: "مرحله به‌روزرسانی و رویداد ممیزی ثبت شد.",
    interviewDraft: "پیش‌نویس ایمیل مصاحبه برای تأیید انسانی آماده شد.",
    requirements: "بررسی الزامات",
    evidence: "شواهد",
    gaps: "شکاف‌های شواهد",
    questions: "پرسش‌های مصاحبه",
    parseDiagnostics: "تشخیص کیفیت خوانش رزومه",
    parseNote: "کیفیت خوانش از تناسب شغلی جداست و فقط قابل‌اعتماد بودن تفسیر سند را نشان می‌دهد.",
    contactField: "اطلاعات تماس",
    experienceField: "سوابق کاری",
    skillsField: "مهارت‌ها",
    datesField: "تاریخ‌ها",
    parsed: "کامل",
    partial: "ناقص",
    missing: "یافت نشد",
    parseWarnings: "هشدارهای خوانش",
    directIdentifiers: "شناسه‌های مستقیم",
    identityAccess: "دسترسی به هویت",
    allPositions: "همه موقعیت‌ها",
    assignedOnly: "فقط تخصیص‌یافته",
    active: "فعال",
    invited: "دعوت‌شده",
    suspended: "تعلیق‌شده",
    role: "نقش",
    access: "دسترسی موقعیت",
    privacy: "حریم خصوصی",
    templateLibrary: "کتابخانه قالب‌ها",
    templateNote: "قالب‌های نسخه‌دار و دوزبانه با متغیرهای محدود. پیام داوطلب همیشه تأیید انسانی می‌خواهد.",
    activeVersion: "نسخه فعال",
    draftVersion: "نسخه پیش‌نویس",
    subject: "موضوع",
    message: "پیام",
    allowedVariables: "متغیرهای مجاز",
    smtpReady: "SMTP سی‌پنل آماده است",
    smtpMissing: "رمز SMTP و اصلاح DNS لازم است",
    sendTest: "دریافت ایمیل تست",
    testPrepared: "ایمیل تست دریافت شد؛ هیچ داده‌ای از داوطلب در آن نیست.",
    retiredVersion: "نسخه بازنشسته",
    automationSafety: "قرارداد امن خودکارسازی",
    automationNote: "قواعد می‌توانند پیش‌نویس و یادآوری بسازند؛ هرگز خودکار رد، منتقل یا پیام منفی ارسال نمی‌کنند.",
    inviteMember: "دعوت عضو",
    teamAdminUnavailable: "مدیریت اعضای تیم در این نسخه نمایشی فقط خواندنی است.",
    newRule: "قاعده جدید",
    ruleBuilderUnavailable: "ساخت قاعده فقط خواندنی است؛ کلیدهای ایمنی موجود همچنان تعاملی‌اند.",
    approvalRequired: "تأیید انسانی",
    automatic: "اجرای امن",
    lastRun: "آخرین اجرا",
    never: "هرگز",
    auditNote: "رویدادهای امنیتی و استخدامی فقط افزوده می‌شوند؛ متن رزومه، توکن و رمز هرگز اینجا ذخیره نمی‌شود.",
    actor: "عامل",
    action: "اقدام",
    target: "هدف",
    time: "زمان",
    systemReady: "آمادگی سیستم",
    database: "پایگاه داده",
    smtp: "SMTP",
    ai: "هوش مصنوعی زنده",
    files: "فایل رمزنگاری‌شده",
    configured: "تنظیم‌شده",
    notConfigured: "تنظیم‌نشده",
    logout: "خروج",
    openNavigation: "باز کردن منوی اصلی",
    close: "بستن",
    createPosition: "ایجاد موقعیت",
    createPositionHint: "با آگهی شغلی شروع کنید و پیش از ارزیابی، مراحل و معیارها را تأیید کنید.",
    removePosition: "حذف موقعیت",
    removingPosition: "در حال حذف...",
    removePositionConfirm: "این موقعیت از فضای کار حذف شود؟ داوطلبان، ارزیابی‌ها و تاریخچه ممیزی آن در بایگانی نگه‌داری می‌شود.",
    positionRemoved: "موقعیت حذف شد و تاریخچه استخدام آن در بایگانی باقی ماند.",
    protectedPosition: "موقعیت محافظت‌شده چالش",
    title: "عنوان موقعیت",
    department: "دپارتمان",
    location: "مکان",
    employmentType: "نوع همکاری",
    description: "آگهی شغلی / زمینه نقش",
    creating: "در حال ایجاد…",
    create: "ایجاد موقعیت پیش‌نویس",
    demoCreated: "موقعیت پیش‌نویس برای این جلسه دمو ساخته شد.",
    error: "انجام این اقدام ممکن نبود. صفحه را تازه کنید.",
    saved: "ذخیره شد",
    noResults: "داوطلبی مطابق جست‌وجو نیست.",
    scoreSignal: "سیگنال هوش مصنوعی؛ نه تصمیم استخدام",
    humanControl: "با کنترل انسانی",
    refresh: "تازه‌سازی",
    communication: "ارتباط با داوطلب",
    communicationNote: "گیرنده از رکورد معتبر داوطلب خوانده می‌شود و ارسال به تأیید صریح نیاز دارد.",
    chooseTemplate: "قالب ایمیل",
    schedulingUrl: "پیوند زمان‌بندی",
    nextUpdateDate: "تاریخ به‌روزرسانی بعدی",
    sendApproved: "تأیید و ارسال ایمیل",
    sendingEmail: "در حال ارسال…",
    emailSent: "ایمیل توسط SMTP سی‌پنل پذیرفته و در صندوق خروجی ثبت شد.",
    emailPending: "درخواست توسط SMTP پذیرفته شده، اما وضعیت نهایی صندوق خروجی هنوز نیازمند تطبیق است؛ دوباره ارسال نکنید.",
    emailUnavailable: "پیش از ارسال، ایمیل داوطلب و SMTP را کامل کنید.",
    deleteApplication: "حذف رزومه",
    deleteApplicationConfirm: "این داوطلب و ارزیابی رزومه از موقعیت فعال حذف شود؟ بازگردانی از فضای کار ممکن نیست و رکورد بایگانی‌شده و تاریخچه ممیزی نگه داشته می‌شود.",
    applicationDeleted: "رزومه و درخواست داوطلب از این موقعیت حذف شد.",
    exportAudit: "خروجی CSV رویدادهای ممیزی",
  },
} as const;

const tabIcons = {
  pipeline: Workflow,
  candidates: Users,
  team: KeyRound,
  templates: Mail,
  automations: Zap,
  audit: History,
};

const organizationRoleLabels = {
  en: {
    owner: "Owner",
    admin: "Administrator",
    recruiter: "Recruiter",
    hiring_manager: "Hiring manager",
    interviewer: "Interviewer",
    viewer: "Viewer",
  },
  fa: {
    owner: "مالک",
    admin: "مدیر سیستم",
    recruiter: "کارشناس جذب",
    hiring_manager: "مدیر استخدام",
    interviewer: "مصاحبه‌گر",
    viewer: "مشاهده‌گر",
  },
} as const;

function useDialogAccessibility(
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [containerRef, initialFocusRef, onClose]);
}

function downloadTextFile(contents: string, fileName: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeCsvCell(value: string): string {
  const clean = value.replaceAll("\0", "");
  const formulaSafe = /^[\t\r\n ]*[=+\-@]/.test(clean) ? `'${clean}` : clean;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

function exportAuditCsv(events: AuditEventSummary[], locale: Locale) {
  const t = workspaceCopy[locale];
  const rows = [
    [t.actor, t.action, t.target, t.source, t.time],
    ...events.map((event) => [event.actor, event.action, event.target, event.source, event.occurredAt]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(",")).join("\r\n")}`;
  downloadTextFile(csv, `shortlist-audit-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
}

function readCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("shortlist_csrf="))
      ?.split("=")[1] ?? "",
  );
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function displayCandidateName(candidate: WorkspaceCandidate, blind: boolean, locale: Locale, index: number): string {
  if (!blind) return candidate.displayName;
  return locale === "fa" ? `داوطلب ناشناس ${formatNumber(index + 1, locale, { minimumIntegerDigits: 2 })}` : `Anonymous ${String(index + 1).padStart(2, "0")}`;
}

function formatDate(value: string, locale: Locale, includeTime = false): string {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", includeTime
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric" }).format(new Date(value));
}

function statusLabel(status: PositionSummary["status"], t: (typeof workspaceCopy)[Locale]): string {
  return t[status];
}

function PositionStatusChip({ position, locale }: { position: PositionSummary; locale: Locale }) {
  const t = workspaceCopy[locale];
  return <span className={`ws-status ws-status--${position.status}`}><i />{statusLabel(position.status, t)}</span>;
}

function EmptyCandidates({ locale, onScreen }: { locale: Locale; onScreen: () => void }) {
  const t = workspaceCopy[locale];
  return (
    <div className="ws-empty">
      <span><Inbox size={25} /></span>
      <h3>{t.noCandidates}</h3>
      <p>{t.noCandidatesHint}</p>
      <button className="button button--dark" onClick={onScreen} type="button"><FileSearch size={16} />{t.portfolio}</button>
    </div>
  );
}

function PipelineBoard({
  snapshot,
  candidates,
  locale,
  blindMode,
  onOpen,
  onScreen,
}: {
  snapshot: WorkspaceSnapshot;
  candidates: WorkspaceCandidate[];
  locale: Locale;
  blindMode: boolean;
  onOpen: (candidate: WorkspaceCandidate) => void;
  onScreen: () => void;
}) {
  const reduceMotion = useReducedMotion();
  if (!candidates.length) return <EmptyCandidates locale={locale} onScreen={onScreen} />;
  return (
    <div className="ws-pipeline" role="region" aria-label={workspaceCopy[locale].pipeline} tabIndex={0}>
      {snapshot.stages.filter((stage) => !stage.terminal).map((stage) => {
        const stageCandidates = candidates.filter((candidate) => candidate.stageId === stage.id);
        return (
          <section className="ws-stage" key={stage.id}>
            <header>
              <div><span className={`ws-stage__dot ws-stage__dot--${stage.kind}`} /><strong>{stage.name[locale]}</strong></div>
              <span>{formatNumber(stageCandidates.length, locale)}</span>
            </header>
            <div className="ws-stage__cards">
              {stageCandidates.map((candidate) => {
                const rank = candidates.findIndex((item) => item.applicationId === candidate.applicationId);
                return (
                  <motion.button
                    className="ws-candidate-card"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={candidate.applicationId}
                    layout={!reduceMotion}
                    onClick={() => onOpen(candidate)}
                    type="button"
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                  >
                    <div className="ws-candidate-card__top">
                      <span className="ws-avatar">{blindMode ? String(rank + 1).padStart(2, "0") : initials(candidate.displayName)}</span>
                      <span className="ws-score-compact"><strong>{candidate.score ?? "—"}</strong><small>/100</small></span>
                    </div>
                    <strong className="bidi-isolate" dir="auto">{displayCandidateName(candidate, blindMode, locale, rank)}</strong>
                    <small className="bidi-isolate" dir="auto">{candidate.currentRole}</small>
                    <div className="ws-candidate-card__meta">
                      <span><FileCheck2 size={12} />{candidate.parseQuality.score}%</span>
                      <span>{candidate.source}</span>
                    </div>
                  </motion.button>
                );
              })}
              {!stageCandidates.length ? <div className="ws-stage__empty">—</div> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CandidateTable({
  candidates,
  stages,
  locale,
  blindMode,
  onOpen,
  onScreen,
}: {
  candidates: WorkspaceCandidate[];
  stages: PipelineStage[];
  locale: Locale;
  blindMode: boolean;
  onOpen: (candidate: WorkspaceCandidate) => void;
  onScreen: () => void;
}) {
  const t = workspaceCopy[locale];
  if (!candidates.length) return <EmptyCandidates locale={locale} onScreen={onScreen} />;
  return (
    <div className="ws-table-wrap">
      <table className="ws-table">
        <thead><tr><th>{t.candidates}</th><th>{t.fit}</th><th>{t.parse}</th><th>{t.stage}</th><th>{t.source}</th><th>{t.lastActivity}</th><th><span className="visually-hidden">{t.open}</span></th></tr></thead>
        <tbody>
          {candidates.map((candidate, index) => {
            const stage = stages.find((item) => item.id === candidate.stageId);
            return (
              <tr key={candidate.applicationId}>
                <td><button className="ws-person" onClick={() => onOpen(candidate)} type="button"><span className="ws-avatar">{blindMode ? String(index + 1).padStart(2, "0") : initials(candidate.displayName)}</span><span><strong className="bidi-isolate" dir="auto">{displayCandidateName(candidate, blindMode, locale, index)}</strong><small className="bidi-isolate" dir="auto">{candidate.currentRole}</small></span></button></td>
                <td><span className="ws-score-cell"><strong>{candidate.score ?? "—"}</strong><small>/100</small></span></td>
                <td><span className={`ws-parse ws-parse--${candidate.parseQuality.score >= 90 ? "great" : candidate.parseQuality.score >= 75 ? "good" : "review"}`}><i style={{ "--parse": `${candidate.parseQuality.score}%` } as React.CSSProperties} />{formatNumber(candidate.parseQuality.score, locale)}%</span></td>
                <td><span className="ws-stage-chip"><i className={`ws-stage__dot ws-stage__dot--${stage?.kind ?? "applied"}`} />{stage?.name[locale] ?? candidate.stageKey}</span></td>
                <td>{candidate.source}</td>
                <td>{formatDate(candidate.lastActivityAt, locale, true)}</td>
                <td><button aria-label={t.open} className="icon-button icon-button--small" onClick={() => onOpen(candidate)} type="button"><ChevronRight size={16} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamAccess({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: Locale }) {
  const t = workspaceCopy[locale];
  return (
    <div className="ws-panel">
      <header className="ws-panel__header">
        <div><span className="ws-kicker"><ShieldCheck aria-hidden="true" size={13} />{t.privacy}</span><h2>{t.team}</h2><p>{locale === "fa" ? "نقش سازمانی، دسترسی به موقعیت و نمایش هویت مستقل از یکدیگر کنترل می‌شوند." : "Organization role, position scope, and identity visibility are controlled independently."}</p></div>
        <span className="ws-disabled-action">
          <button aria-describedby="team-admin-note" className="button button--dark" disabled type="button"><Plus aria-hidden="true" size={16} />{t.inviteMember}</button>
          <small id="team-admin-note">{t.teamAdminUnavailable}</small>
        </span>
      </header>
      <div className="ws-access-list">
        <div className="ws-access-list__head"><span>{t.team}</span><span>{t.role}</span><span>{t.access}</span><span>{t.identityAccess}</span><span>{t.lastActivity}</span></div>
        {snapshot.team.map((member) => (
          <article key={member.id}>
            <div className="ws-member"><span className="ws-avatar">{initials(member.name)}</span><span><strong className="bidi-isolate" dir="auto">{member.name}</strong><small className="bidi-isolate" dir="ltr">{member.email}</small></span></div>
            <span className="ws-role-chip">{organizationRoleLabels[locale][member.role]}</span>
            <span>{member.positionAccess === "all" ? t.allPositions : t.assignedOnly}</span>
            <span className={member.identityAccess ? "ws-access-yes" : "ws-access-no"}>{member.identityAccess ? <Eye size={15} /> : <EyeOff size={15} />}{member.identityAccess ? t.directIdentifiers : t.blindOn}</span>
            <span>{member.lastActiveAt ? formatDate(member.lastActiveAt, locale, true) : t[member.status]}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function TemplateLibrary({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: Locale }) {
  const t = workspaceCopy[locale];
  const [selectedId, setSelectedId] = useState(snapshot.templates[0]?.id ?? "");
  const selected = snapshot.templates.find((template) => template.id === selectedId) ?? snapshot.templates[0];
  return (
    <div className="ws-panel">
      <header className="ws-panel__header"><div><span className="ws-kicker"><BookOpenCheck size={13} />{t.templateLibrary}</span><h2>{t.templates}</h2><p>{t.templateNote}</p></div><span className={`ws-readiness-chip ${snapshot.capabilities.smtp ? "ws-readiness-chip--ready" : ""}`}>{snapshot.capabilities.smtp ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}{snapshot.capabilities.smtp ? t.smtpReady : t.smtpMissing}</span></header>
      <div className="ws-template-layout">
        <nav aria-label={t.templateLibrary} className="ws-template-list">
          {snapshot.templates.map((template) => (
            <button className={selected?.id === template.id ? "is-active" : ""} key={template.id} onClick={() => setSelectedId(template.id)} type="button"><span><Mail aria-hidden="true" size={16} /><strong className="bidi-isolate" dir="auto">{template.name}</strong></span><small><span lang={template.locale}>{template.locale.toUpperCase()}</span> · v{template.version} · {template.status === "active" ? t.activeVersion : template.status === "draft" ? t.draftVersion : t.retiredVersion}</small></button>
          ))}
        </nav>
        {selected ? <TemplatePreview key={selected.id} template={selected} locale={locale} /> : null}
      </div>
    </div>
  );
}

function TemplatePreview({ template, locale }: { template: EmailTemplateSummary; locale: Locale }) {
  const t = workspaceCopy[locale];
  const [prepared, setPrepared] = useState(false);

  function downloadTestEmail() {
    const subject = template.subject.replace(/[\r\n]+/g, " ");
    const eml = [
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      `Subject: ${subject}`,
      "",
      template.body,
    ].join("\r\n");
    const safeKey = template.key.replace(/[^a-z0-9_-]+/gi, "-") || "template";
    downloadTextFile(eml, `${safeKey}-${template.locale}-v${template.version}.eml`, "message/rfc822;charset=utf-8");
    setPrepared(true);
  }

  const versionLabel = template.status === "active" ? t.activeVersion : template.status === "draft" ? t.draftVersion : t.retiredVersion;
  return (
    <div className="ws-template-preview" dir={template.locale === "fa" ? "rtl" : "ltr"} lang={template.locale}>
      <div className="ws-mail-chrome"><span aria-hidden="true"><i /><i /><i /></span><bdi dir="ltr">reviews@ats.mehdisharifi.com</bdi><MoreHorizontal aria-hidden="true" size={17} /></div>
      <div className="ws-mail-body">
        <label>{t.subject}<strong className="bidi-isolate" dir="auto">{template.subject}</strong></label>
        <div className="ws-mail-message"><span className="brand__mark" aria-hidden="true">S<span /></span><pre className="bidi-isolate" dir="auto">{template.body}</pre></div>
        <div className="ws-variable-row"><span>{t.allowedVariables}</span>{template.allowedVariables.map((variable) => <code key={variable}>{`{{${variable}}}`}</code>)}</div>
      </div>
      <footer>
        <span><Fingerprint aria-hidden="true" size={14} />v{template.version} · {versionLabel}</span>
        <span className="ws-template-preview__actions">
          {prepared ? <small role="status">{t.testPrepared}</small> : null}
          <button className="button button--dark" onClick={downloadTestEmail} type="button"><Send aria-hidden="true" size={15} />{t.sendTest}</button>
        </span>
      </footer>
    </div>
  );
}

function Automations({ snapshot, locale, onChange }: { snapshot: WorkspaceSnapshot; locale: Locale; onChange: (id: string) => void }) {
  const t = workspaceCopy[locale];
  return (
    <div className="ws-panel">
      <header className="ws-panel__header">
        <div><span className="ws-kicker"><ShieldCheck aria-hidden="true" size={13} />{t.automationSafety}</span><h2>{t.automations}</h2><p>{t.automationNote}</p></div>
        <span className="ws-disabled-action">
          <button aria-describedby="rule-builder-note" className="button button--dark" disabled type="button"><Plus aria-hidden="true" size={16} />{t.newRule}</button>
          <small id="rule-builder-note">{t.ruleBuilderUnavailable}</small>
        </span>
      </header>
      <div className="ws-automation-list">
        {snapshot.automations.map((rule) => (
          <article key={rule.id}>
            <button aria-label={rule.name} aria-pressed={rule.enabled} className={`ws-switch ${rule.enabled ? "is-on" : ""}`} onClick={() => onChange(rule.id)} type="button"><i /></button>
            <span className={`ws-automation-icon ${rule.enabled ? "is-on" : ""}`}><Zap size={18} /></span>
            <div><strong className="bidi-isolate" dir="auto">{rule.name}</strong><span><em>{locale === "fa" ? "محرک" : "When"}</em><bdi dir="auto">{rule.trigger}</bdi><ChevronRight aria-hidden="true" size={13} /><em>{locale === "fa" ? "اقدام" : "Then"}</em><bdi dir="auto">{rule.action}</bdi></span></div>
            <span className={rule.requiresApproval ? "ws-approval-chip" : "ws-safe-chip"}>{rule.requiresApproval ? <UserRoundCheck size={14} /> : <Bot size={14} />}{rule.requiresApproval ? t.approvalRequired : t.automatic}</span>
            <small>{t.lastRun}<strong>{rule.lastRunAt ? formatDate(rule.lastRunAt, locale, true) : t.never}</strong></small>
          </article>
        ))}
      </div>
    </div>
  );
}

function AuditTrail({ events, locale }: { events: AuditEventSummary[]; locale: Locale }) {
  const t = workspaceCopy[locale];
  return (
    <div className="ws-panel">
      <header className="ws-panel__header"><div><span className="ws-kicker"><Fingerprint aria-hidden="true" size={13} />{t.audit}</span><h2>{t.audit}</h2><p>{t.auditNote}</p></div><button aria-label={t.exportAudit} className="button button--subtle" onClick={() => exportAuditCsv(events, locale)} title={t.exportAudit} type="button"><Files aria-hidden="true" size={16} />CSV</button></header>
      <div className="ws-audit-list">
        {events.map((event, index) => (
          <article key={event.id}><span aria-hidden="true" className="ws-audit-line"><i />{index < events.length - 1 ? <b /> : null}</span><span aria-hidden="true" className={`ws-audit-icon ws-audit-icon--${event.source}`}>{event.source === "automation" ? <Bot size={16} /> : event.source === "cron" ? <CalendarClock size={16} /> : event.source === "api" ? <Activity size={16} /> : <UserRoundCheck size={16} />}</span><div><strong className="bidi-isolate" dir="auto">{event.actor}</strong><p className="bidi-isolate" dir="auto"><span>{event.action}</span> · {event.target}</p></div><time dateTime={event.occurredAt}>{formatDate(event.occurredAt, locale, true)}</time></article>
        ))}
      </div>
    </div>
  );
}

function Readiness({ snapshot, locale }: { snapshot: WorkspaceSnapshot; locale: Locale }) {
  const t = workspaceCopy[locale];
  const items = [
    ["database", t.database, Database],
    ["smtp", t.smtp, Mail],
    ["ai", t.ai, Sparkles],
    ["privateFiles", t.files, LockKeyhole],
  ] as const;
  return (
    <div className="ws-readiness"><div><span className="ws-kicker"><CircleGauge size={13} />{t.systemReady}</span><h2>{t.positionHealth}</h2></div><div>{items.map(([key, label, Icon]) => <span className={snapshot.capabilities[key] ? "is-ready" : ""} key={key}><Icon size={15} /><strong>{label}</strong><small>{snapshot.capabilities[key] ? t.configured : t.notConfigured}</small></span>)}</div></div>
  );
}

function CandidateDrawer({
  candidate,
  candidates,
  snapshot,
  locale,
  blindMode,
  onClose,
  onMove,
  onSendEmail,
  onDelete,
}: {
  candidate: WorkspaceCandidate;
  candidates: WorkspaceCandidate[];
  snapshot: WorkspaceSnapshot;
  locale: Locale;
  blindMode: boolean;
  onClose: () => void;
  onMove: (candidate: WorkspaceCandidate, stageId: string, reason: string) => Promise<{ draftEmailCreated?: boolean }>;
  onSendEmail: (candidate: WorkspaceCandidate, templateId: string, variables: Record<string, string>) => Promise<"sent" | "pending">;
  onDelete: (candidate: WorkspaceCandidate) => Promise<void>;
}) {
  const t = workspaceCopy[locale];
  const reduceMotion = useReducedMotion();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const parseTitleId = useId();
  const index = candidates.findIndex((item) => item.applicationId === candidate.applicationId);
  const [stageId, setStageId] = useState(candidate.stageId);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "moving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const candidateTemplates = useMemo(() => {
    const supportedVariables = new Set([
      "candidate_name",
      "position_title",
      "sender_name",
      "scheduling_url",
      "next_update_date",
    ]);
    return snapshot.templates.filter(
      (template) =>
        template.status === "active" &&
        template.locale === locale &&
        template.allowedVariables.every((variable) => supportedVariables.has(variable)),
    );
  }, [locale, snapshot.templates]);
  const [templateId, setTemplateId] = useState(candidateTemplates[0]?.id ?? "");
  const activeTemplateId = candidateTemplates.some((template) => template.id === templateId)
    ? templateId
    : candidateTemplates[0]?.id ?? "";
  const selectedTemplate = candidateTemplates.find((template) => template.id === activeTemplateId);
  const [schedulingUrl, setSchedulingUrl] = useState("");
  const [nextUpdateDate, setNextUpdateDate] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent" | "pending" | "error">("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error">("idle");
  const assessment = candidate.assessment;
  useDialogAccessibility(onClose, drawerRef, closeButtonRef);

  const parseFields = [
    ["contact", t.contactField],
    ["experience", t.experienceField],
    ["skills", t.skillsField],
    ["dates", t.datesField],
  ] as const;
  const parseBand = candidate.parseQuality.score >= 90 ? "great" : candidate.parseQuality.score >= 75 ? "good" : "review";

  async function move() {
    if (stageId === candidate.stageId || reason.trim().length < 3) return;
    const target = snapshot.stages.find((stage) => stage.id === stageId);
    if (target?.terminal && !window.confirm(locale === "fa" ? "این مرحله نهایی است. انتقال تأیید شود؟" : "This is a terminal stage. Confirm the move?")) return;
    setState("moving");
    try {
      const result = await onMove(candidate, stageId, reason.trim());
      setState("done");
      setMessage(result.draftEmailCreated ? `${t.moveSaved} ${t.interviewDraft}` : t.moveSaved);
    } catch {
      setState("error");
      setMessage(t.error);
    }
  }

  async function sendEmail() {
    if (!activeTemplateId) return;
    if (
      selectedTemplate?.key === "not_selected" &&
      !window.confirm(
        locale === "fa"
          ? "این پیام نتیجه منفی استخدام است و فوراً ارسال می‌شود. ارسال را تأیید می‌کنید؟"
          : "This is an adverse hiring outcome and will be sent immediately. Confirm delivery?",
      )
    ) return;
    const variables: Record<string, string> = {};
    if (selectedTemplate?.allowedVariables.includes("scheduling_url")) variables.scheduling_url = schedulingUrl.trim();
    if (selectedTemplate?.allowedVariables.includes("next_update_date")) variables.next_update_date = nextUpdateDate.trim();
    setEmailState("sending");
    try {
      setEmailState(await onSendEmail(candidate, activeTemplateId, variables));
    } catch {
      setEmailState("error");
    }
  }

  async function removeApplication() {
    if (!window.confirm(t.deleteApplicationConfirm)) return;
    setDeleteState("deleting");
    try {
      await onDelete(candidate);
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <motion.aside
      aria-labelledby={titleId}
      aria-modal="true"
      className={`ws-drawer ${candidate.resume ? "has-resume" : ""}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: locale === "fa" ? -36 : 36 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: locale === "fa" ? -24 : 24 }}
      ref={drawerRef}
      role="dialog"
    >
      <header><div><span className="ws-kicker"><FileSearch aria-hidden="true" size={13} />{t.candidateEvidence}</span><h2 className="bidi-isolate" dir="auto" id={titleId}>{displayCandidateName(candidate, blindMode, locale, index)}</h2><p className="bidi-isolate" dir="auto">{candidate.currentRole}</p>{candidate.protected ? <span className="ws-protected-resume"><LockKeyhole size={12} />{t.protectedResume}</span> : null}</div><div className="ws-drawer__header-actions">{!candidate.protected && ["owner", "admin", "recruiter"].includes(snapshot.session.role) ? <button aria-label={t.deleteApplication} className="icon-button ws-delete-application" disabled={deleteState === "deleting"} onClick={removeApplication} title={t.deleteApplication} type="button"><Trash2 aria-hidden="true" size={17} /></button> : null}<button aria-label={t.close} className="icon-button" onClick={onClose} ref={closeButtonRef} type="button"><X aria-hidden="true" size={19} /></button></div></header>
      {deleteState === "error" ? <p className="ws-drawer__delete-error" role="alert"><CircleAlert size={14} />{t.error}</p> : null}
      <div className="ws-candidate-review-layout">
        {candidate.resume ? <aside className={`ws-resume-preview ${blindMode ? "is-locked" : ""}`}><header><div><span className="ws-kicker"><FileCheck2 size={13} />{t.resumeAndAssessment}</span><strong className="bidi-isolate" dir="auto">{candidate.resume.fileName}</strong></div>{!blindMode ? <a className="button button--subtle" href={candidate.resume.url} rel="noreferrer" target="_blank"><ExternalLink size={15} />{t.openResume}</a> : null}</header>{blindMode ? <div className="ws-resume-preview__locked"><EyeOff size={28} /><strong>{t.originalResume}</strong><p>{t.resumeIdentityLocked}</p></div> : candidate.resume.contentType === "application/pdf" ? <iframe loading="eager" src={`${candidate.resume.url}#page=1&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0&pagemode=none`} title={`${t.originalResume}: ${candidate.resume.fileName}`} /> : <div className="ws-resume-preview__locked"><FileCheck2 size={28} /><strong>{candidate.resume.fileName}</strong><p>{t.resumePreviewUnavailable}</p><a className="button button--dark" href={candidate.resume.url} rel="noreferrer" target="_blank"><ExternalLink size={15} />{t.openResume}</a></div>}</aside> : null}
        <div className="ws-drawer__analysis">
      <div className="ws-drawer__scores"><ScoreRing score={candidate.score ?? 0} size="large" /><div><span>{t.fit}</span><strong>{candidate.score ?? "—"}<small>/100</small></strong><p>{t.scoreSignal}</p></div><span className="ws-parse-score"><FileCheck2 size={17} /><strong>{candidate.parseQuality.score}%</strong><small>{t.parse}</small></span></div>

      <section className="ws-drawer__move"><div><span>{t.moveCandidate}</span><select onChange={(event) => setStageId(event.target.value)} value={stageId}>{snapshot.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name[locale]}</option>)}</select></div><label><span>{t.moveReason}</span><textarea maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder={t.moveReasonPlaceholder} rows={2} value={reason} /></label><button className="button button--dark" disabled={state === "moving" || stageId === candidate.stageId || reason.trim().length < 3} onClick={move} type="button"><Workflow size={16} />{state === "moving" ? t.moving : t.confirmMove}</button>{message ? <p className={state === "error" ? "is-error" : "is-success"} role="status">{state === "error" ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}{message}</p> : null}</section>

      <section className="ws-drawer__communication">
        <div className="ws-drawer__section-title"><span><Mail size={16} />{t.communication}</span><strong>{candidate.email ? <AtSign size={12} /> : <CircleAlert size={12} />}</strong></div>
        <p className="ws-drawer__note">{t.communicationNote}</p>
        <label><span>{t.chooseTemplate}</span><select onChange={(event) => { setTemplateId(event.target.value); setEmailState("idle"); }} value={activeTemplateId}>{candidateTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label>
        {selectedTemplate?.allowedVariables.includes("scheduling_url") ? <label><span>{t.schedulingUrl}</span><input dir="ltr" onChange={(event) => setSchedulingUrl(event.target.value)} placeholder="https://cal.example.com/interview" type="url" value={schedulingUrl} /></label> : null}
        {selectedTemplate?.allowedVariables.includes("next_update_date") ? <label><span>{t.nextUpdateDate}</span><input dir="ltr" onChange={(event) => setNextUpdateDate(event.target.value)} type="date" value={nextUpdateDate} /></label> : null}
        <button
          className="button button--dark"
          disabled={
            !candidate.email ||
            !snapshot.capabilities.smtp ||
            ["sending", "sent", "pending"].includes(emailState) ||
            !activeTemplateId ||
            (selectedTemplate?.allowedVariables.includes("scheduling_url") && !schedulingUrl.trim()) ||
            (selectedTemplate?.allowedVariables.includes("next_update_date") && !nextUpdateDate.trim())
          }
          onClick={sendEmail}
          type="button"
        ><Send size={15} />{emailState === "sending" ? t.sendingEmail : t.sendApproved}</button>
        {emailState === "sent" ? <p className="is-success" role="status"><CheckCircle2 size={14} />{t.emailSent}</p> : null}
        {emailState === "pending" ? <p className="ws-communication-disabled" role="status"><CircleAlert size={14} />{t.emailPending}</p> : null}
        {emailState === "error" ? <p className="is-error" role="alert"><CircleAlert size={14} />{t.error}</p> : null}
        {(!candidate.email || !snapshot.capabilities.smtp) && emailState === "idle" ? <p className="ws-communication-disabled"><LockKeyhole size={13} />{t.emailUnavailable}</p> : null}
      </section>

      <section aria-labelledby={parseTitleId} className={`ws-parse-quality-card ws-parse-quality-card--${parseBand}`}>
        <div className="ws-drawer__section-title">
          <span id={parseTitleId}><FileCheck2 aria-hidden="true" size={17} />{t.parseDiagnostics}</span>
          <strong>{formatNumber(candidate.parseQuality.score, locale)}%</strong>
        </div>
        <p className="ws-drawer__note">{t.parseNote}</p>
        <div aria-label={`${t.parse}: ${formatNumber(candidate.parseQuality.score, locale)}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={candidate.parseQuality.score} className="ws-parse-quality-card__bar" role="meter"><i style={{ width: `${candidate.parseQuality.score}%` }} /></div>
        <div className="ws-parse-grid" role="list">
          {parseFields.map(([key, label]) => {
            const status = candidate.parseQuality[key];
            const Icon = status === "parsed" ? CheckCircle2 : CircleAlert;
            return <span className={`is-${status}`} key={key} role="listitem"><Icon aria-hidden="true" size={16} /><strong>{label}</strong><small>{t[status]}</small></span>;
          })}
        </div>
        {candidate.parseQuality.warnings.length ? <div className="ws-parse-warnings"><strong><CircleAlert aria-hidden="true" size={14} />{t.parseWarnings}</strong><ul>{candidate.parseQuality.warnings.map((warning) => <li className="bidi-isolate" dir="auto" key={warning}>{warning}</li>)}</ul></div> : null}
      </section>

      {assessment ? <>
        <section><div className="ws-drawer__section-title"><span><Target size={16} />{t.requirements}</span><strong>{assessment.mustHaves.filter((item) => item.status === "met").length}/{assessment.mustHaves.length}</strong></div><div className="ws-requirement-list">{assessment.mustHaves.map((item) => <article key={item.requirement}><span className={`status-chip status-chip--${item.status}`}>{item.status}</span><div><strong className="bidi-isolate" dir="auto">{item.requirement}</strong><p className="bidi-isolate" dir="auto">{item.evidence}</p></div></article>)}</div></section>
        <section><div className="ws-drawer__section-title"><span><FileCheck2 size={16} />{t.evidence}</span><strong>{assessment.rubric.length}</strong></div><div className="ws-evidence-list">{assessment.rubric.map((item) => <article key={item.key}><div><span>{item.label}</span><strong>{item.score}/{item.maxScore}</strong></div><p className="bidi-isolate" dir="auto">{item.rationale}</p>{item.evidence[0] ? <q className="bidi-isolate" dir="auto">{item.evidence[0]}</q> : null}</article>)}</div></section>
        <section><div className="ws-drawer__section-title"><span><CircleAlert size={16} />{t.gaps}</span><strong>{assessment.gaps.length}</strong></div><ul className="ws-simple-list">{assessment.gaps.map((gap) => <li className="bidi-isolate" dir="auto" key={gap}>{gap}</li>)}</ul></section>
        <section><div className="ws-drawer__section-title"><span><MessageSquareText size={16} />{t.questions}</span><strong>{assessment.interviewQuestions.length}</strong></div><ol className="ws-question-list">{assessment.interviewQuestions.map((item, questionIndex) => <li key={item.question}><span>{formatNumber(questionIndex + 1, locale, { minimumIntegerDigits: 2 })}</span><div><strong className="bidi-isolate" dir="auto">{item.question}</strong><p className="bidi-isolate" dir="auto">{item.why}</p></div></li>)}</ol></section>
      </> : null}
        </div>
      </div>
    </motion.aside>
  );
}

function CreatePositionModal({ locale, onClose, onCreate }: { locale: Locale; onClose: () => void; onCreate: (input: { title: string; department: string; location: string; employmentType: string; description: string; defaultLocale: Locale }) => Promise<void> }) {
  const t = workspaceCopy[locale];
  const modalRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", department: "", location: "Tehran", employmentType: "Full-time", description: "", defaultLocale: locale });
  const [state, setState] = useState<"idle" | "creating" | "error">("idle");
  useDialogAccessibility(onClose, modalRef, titleInputRef);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("creating");
    try {
      await onCreate(form);
      onClose();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="modal-backdrop ws-modal-backdrop" role="presentation">
      <section aria-describedby="create-position-description" aria-labelledby="create-position-title" aria-modal="true" className="ws-create-modal" ref={modalRef} role="dialog">
        <header>
          <div><span className="ws-kicker"><BriefcaseBusiness aria-hidden="true" size={13} />{t.newPosition}</span><h2 id="create-position-title">{t.createPosition}</h2><p id="create-position-description">{t.createPositionHint}</p></div>
          <button aria-label={t.close} className="icon-button" onClick={onClose} type="button"><X aria-hidden="true" size={19} /></button>
        </header>
        <form onSubmit={submit}>
          <label><span>{t.title}</span><input maxLength={180} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} ref={titleInputRef} required value={form.title} /></label>
          <div className="ws-form-grid">
            <label><span>{t.department}</span><input maxLength={140} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} value={form.department} /></label>
            <label><span>{t.location}</span><input maxLength={180} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} value={form.location} /></label>
          </div>
          <div className="ws-form-grid">
            <label><span>{t.employmentType}</span><input maxLength={80} onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))} value={form.employmentType} /></label>
          </div>
          <label><span>{t.description}<small>{formatNumber(form.description.length, locale)}/20,000</small></span><textarea maxLength={20_000} minLength={80} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required rows={8} value={form.description} /></label>
          {state === "error" ? <p className="form-error" role="alert">{t.error}</p> : null}
          <footer><button className="button button--ghost" onClick={onClose} type="button">{t.close}</button><button className="button button--dark" disabled={state === "creating"} type="submit"><Plus aria-hidden="true" size={16} />{state === "creating" ? t.creating : t.create}</button></footer>
        </form>
      </section>
    </div>
  );
}

export function WorkspaceApp({ initialSnapshot }: { initialSnapshot: WorkspaceSnapshot }) {
  const { locale } = useLocale();
  const t = workspaceCopy[locale];
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [tab, setTab] = useState<WorkspaceTab>("pipeline");
  const [query, setQuery] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [selected, setSelected] = useState<WorkspaceCandidate | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [positionMenuOpen, setPositionMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [removingPosition, setRemovingPosition] = useState(false);
  const reduceMotion = useReducedMotion();

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale === "fa" ? "fa-IR" : "en-US");
    if (!normalized) return snapshot.candidates;
    return snapshot.candidates.filter((candidate) => [blindMode ? "" : candidate.displayName, candidate.currentRole, candidate.source].some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [blindMode, locale, query, snapshot.candidates]);

  const reviewedCount = snapshot.candidates.filter((candidate) => candidate.stageKey === "review").length;
  const evidenceReady = snapshot.candidates.filter((candidate) => candidate.assessment && candidate.parseQuality.score >= 75).length;
  const averageScore = snapshot.candidates.length ? Math.round(snapshot.candidates.reduce((sum, candidate) => sum + (candidate.score ?? 0), 0) / snapshot.candidates.length) : 0;

  async function switchPosition(positionId: string) {
    setPositionMenuOpen(false);
    if (snapshot.mode === "demo") {
      const response = await fetch(`/api/workspace?positionId=${encodeURIComponent(positionId)}`, { cache: "no-store" });
      if (response.ok) setSnapshot(await response.json());
      return;
    }
    const response = await fetch(`/api/workspace?positionId=${encodeURIComponent(positionId)}`, { cache: "no-store" });
    if (response.status === 401) { window.location.assign("/login"); return; }
    if (!response.ok) { setNotice(t.error); return; }
    setSnapshot(await response.json());
    setSelected(null);
  }

  async function moveCandidate(candidate: WorkspaceCandidate, stageId: string, reason: string) {
    if (snapshot.mode === "demo") {
      const stage = snapshot.stages.find((item) => item.id === stageId);
      setSnapshot((current) => ({
        ...current,
        candidates: current.candidates.map((item) => item.applicationId === candidate.applicationId ? { ...item, stageId, stageKey: stage?.key ?? item.stageKey, applicationVersion: item.applicationVersion + 1, lastActivityAt: new Date().toISOString() } : item),
        audit: [{ id: crypto.randomUUID(), actor: current.session.name, action: "moved candidate", target: `${candidate.displayName} → ${stage?.name.en ?? stageId}`, occurredAt: new Date().toISOString(), source: "ui" }, ...current.audit],
      }));
      setSelected((current) => current ? { ...current, stageId, stageKey: stage?.key ?? current.stageKey, applicationVersion: current.applicationVersion + 1 } : current);
      return { draftEmailCreated: stage?.kind === "interview" };
    }
    const response = await fetch(`/api/workspace/applications/${candidate.applicationId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": readCsrfToken() },
      body: JSON.stringify({ toStageId: stageId, expectedVersion: candidate.applicationVersion, reason, idempotencyKey: crypto.randomUUID() }),
    });
    if (!response.ok) throw new Error("TRANSITION_FAILED");
    const result = await response.json();
    await switchPosition(snapshot.activePosition.id);
    return result as { draftEmailCreated?: boolean };
  }

  async function createPosition(input: { title: string; department: string; location: string; employmentType: string; description: string; defaultLocale: Locale }) {
    if (snapshot.mode === "demo") {
      const position: PositionSummary = { id: `demo-${crypto.randomUUID()}`, title: input.title, department: input.department, location: input.location, employmentType: input.employmentType, description: input.description, status: "draft", defaultLocale: input.defaultLocale, candidateCount: 0, updatedAt: new Date().toISOString(), protected: false };
      setSnapshot((current) => ({ ...current, positions: [position, ...current.positions], activePosition: position, candidates: [] }));
      setNotice(t.demoCreated);
      return;
    }
    const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": readCsrfToken() }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error("CREATE_POSITION_FAILED");
    const result = await response.json() as { id: string };
    await switchPosition(result.id);
  }

  async function removeActivePosition() {
    const target = snapshot.activePosition;
    if (target.protected || removingPosition) return;
    if (!window.confirm(t.removePositionConfirm)) return;
    setRemovingPosition(true);
    try {
      if (snapshot.mode === "demo") {
        const remaining = snapshot.positions.filter((position) => position.id !== target.id);
        const next = remaining[0];
        if (!next) throw new Error("NO_REMAINING_POSITION");
        const response = await fetch(`/api/workspace?positionId=${encodeURIComponent(next.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("POSITION_REFRESH_FAILED");
        const nextSnapshot = await response.json() as WorkspaceSnapshot;
        setSnapshot({ ...nextSnapshot, positions: nextSnapshot.positions.filter((position) => position.id !== target.id) });
      } else {
        const response = await fetch(`/api/workspace/positions/${target.id}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": readCsrfToken() },
        });
        if (!response.ok) throw new Error("POSITION_ARCHIVE_FAILED");
        const refresh = await fetch("/api/workspace", { cache: "no-store" });
        if (!refresh.ok) throw new Error("POSITION_REFRESH_FAILED");
        setSnapshot(await refresh.json());
      }
      setSelected(null);
      setPositionMenuOpen(false);
      setNotice(t.positionRemoved);
    } catch {
      setNotice(t.error);
    } finally {
      setRemovingPosition(false);
    }
  }

  async function sendCandidateEmail(candidate: WorkspaceCandidate, templateId: string, variables: Record<string, string>) {
    if (snapshot.mode === "demo" || !snapshot.capabilities.smtp) throw new Error("SMTP_NOT_CONFIGURED");
    const response = await fetch(`/api/workspace/applications/${candidate.applicationId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": readCsrfToken() },
      body: JSON.stringify({ templateVersionId: templateId, variables, approved: true, idempotencyKey: crypto.randomUUID() }),
    });
    if (!response.ok) throw new Error("EMAIL_SEND_FAILED");
    const result = await response.json() as { status?: string };
    return result.status === "sent" ? "sent" as const : "pending" as const;
  }

  async function deleteCandidate(candidate: WorkspaceCandidate) {
    if (snapshot.mode === "demo") {
      setSnapshot((current) => ({
        ...current,
        candidates: current.candidates.filter((item) => item.applicationId !== candidate.applicationId),
        audit: [{ id: crypto.randomUUID(), actor: current.session.name, action: "deleted application", target: candidate.displayName, occurredAt: new Date().toISOString(), source: "ui" }, ...current.audit],
      }));
      setSelected(null);
      setNotice(t.applicationDeleted);
      return;
    }
    const response = await fetch(`/api/workspace/applications/${candidate.applicationId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": readCsrfToken() },
      body: JSON.stringify({ expectedVersion: candidate.applicationVersion }),
    });
    if (!response.ok) throw new Error("DELETE_APPLICATION_FAILED");
    setSelected(null);
    await switchPosition(snapshot.activePosition.id);
    setNotice(t.applicationDeleted);
  }

  async function logout() {
    if (snapshot.mode === "demo") { window.location.href = "/"; return; }
    await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": readCsrfToken() } });
    window.location.href = "/login";
  }

  function toggleAutomation(id: string) {
    if (snapshot.mode !== "demo") { setNotice(locale === "fa" ? "ویرایش قواعد از نسخه بعدی API فعال می‌شود." : "Rule editing is read-only in this deployment."); return; }
    setSnapshot((current) => ({ ...current, automations: current.automations.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule) }));
  }

  function openCreatePosition() {
    setPositionMenuOpen(false);
    if (snapshot.positions.length >= snapshot.plan.positionLimit) {
      setNotice(locale === "fa" ? "سقف موقعیت‌های فعال این طرح پر شده است. برای موقعیت‌های بیشتر به Pro ارتقا دهید." : "This plan has reached its active-position limit. Upgrade to Pro for more positions.");
      return;
    }
    setCreateOpen(true);
  }

  const tabs = ["pipeline", "candidates", "team", "templates", "automations", "audit"] as const;
  const proTabs = new Set<WorkspaceTab>(["team", "templates", "automations", "audit"]);
  return (
    <div className="ws-shell">
      <aside aria-label={t.workspace} className={`ws-sidebar ${navigationOpen ? "is-open" : ""}`}>
        <div className="ws-brand"><Link href="/"><span className="brand__mark" aria-hidden="true">S<span /></span><span><strong>Shortlist</strong><small>{t.workspace}</small></span></Link><button aria-label={t.close} className="icon-button ws-nav-close" onClick={() => setNavigationOpen(false)} type="button"><X size={18} /></button></div>
        <nav aria-label={t.workspace}>
          <span className="ws-nav-label">{t.overview}</span>
          {tabs.map((item) => { const Icon = tabIcons[item]; const locked = snapshot.plan.tier === "free" && proTabs.has(item); return <button aria-current={tab === item ? "page" : undefined} className={`${tab === item ? "is-active" : ""} ${locked ? "is-locked" : ""}`} key={item} onClick={() => { if (locked) { setNotice(locale === "fa" ? "این قابلیت در طرح Pro فعال است." : "This feature is available on the Pro plan."); return; } setTab(item); setNavigationOpen(false); }} type="button"><Icon aria-hidden="true" size={17} /><span>{t[item]}</span>{locked ? <LockKeyhole aria-hidden="true" size={13} /> : item === "candidates" ? <em>{formatNumber(snapshot.candidates.length, locale)}</em> : null}</button>; })}
        </nav>
        <div className="ws-sidebar__bottom"><Readiness snapshot={snapshot} locale={locale} /><div className="ws-user"><span className="ws-avatar">{initials(snapshot.session.name)}</span><span><strong className="bidi-isolate" dir="auto">{snapshot.session.name}</strong><small>{organizationRoleLabels[locale][snapshot.session.role]}</small></span><button aria-label={t.logout} className="icon-button icon-button--small" onClick={logout} type="button"><LogOut aria-hidden="true" size={15} /></button></div></div>
      </aside>
      <div aria-hidden="true" className={`ws-sidebar-scrim ${navigationOpen ? "is-open" : ""}`} onClick={() => setNavigationOpen(false)} />

      <main className="ws-main">
        <header className="ws-topbar">
          <div><button aria-label={t.openNavigation} className="icon-button ws-menu" onClick={() => setNavigationOpen(true)} type="button"><Menu aria-hidden="true" size={19} /></button><span className="ws-topbar__context"><BriefcaseBusiness aria-hidden="true" size={15} />{t.positions}<ChevronRight aria-hidden="true" size={14} /></span><div className="ws-position-switcher"><button aria-controls="workspace-position-menu" aria-expanded={positionMenuOpen} aria-haspopup="menu" onClick={() => setPositionMenuOpen((current) => !current)} type="button"><span><strong className="bidi-isolate" dir="auto">{snapshot.activePosition.title}</strong><small className="bidi-isolate" dir="auto">{snapshot.activePosition.department} · {snapshot.activePosition.location}</small></span><ChevronDown aria-hidden="true" size={16} /></button>{positionMenuOpen ? <div className="ws-position-menu" id="workspace-position-menu" role="menu">{snapshot.positions.map((position) => <button aria-checked={position.id === snapshot.activePosition.id} className={position.id === snapshot.activePosition.id ? "is-active" : ""} key={position.id} onClick={() => switchPosition(position.id)} role="menuitemradio" type="button"><span><strong className="bidi-isolate" dir="auto">{position.title}</strong><small className="bidi-isolate" dir="auto">{position.department || position.location || "—"}</small></span><span><PositionStatusChip position={position} locale={locale} /><small>{formatNumber(position.candidateCount, locale)}</small></span></button>)}<button className="ws-position-menu__new" onClick={openCreatePosition} role="menuitem" type="button"><Plus aria-hidden="true" size={15} />{t.newPosition}</button></div> : null}</div></div>
          <div className="ws-topbar__actions"><span className={`ws-plan-chip ws-plan-chip--${snapshot.plan.tier}`}><Sparkles size={13} />{snapshot.plan.tier.toUpperCase()}</span><span className={`ws-mode-chip ${snapshot.mode === "database" ? "is-live" : ""}`}>{snapshot.mode === "database" ? <Database size={14} /> : <Sparkles size={14} />}{snapshot.mode === "database" ? t.databaseMode : t.demoMode}</span><button className="button button--dark" onClick={openCreatePosition} type="button"><Plus size={16} />{t.newPosition}</button></div>
        </header>

        <div className="ws-content">
          <section className="ws-position-hero">
            <div><div><PositionStatusChip position={snapshot.activePosition} locale={locale} /><span>{snapshot.activePosition.department}</span><span>{snapshot.activePosition.location}</span><span>{snapshot.activePosition.employmentType}</span></div><h1 className="bidi-isolate" dir="auto">{snapshot.activePosition.title}</h1><p>{locale === "fa" ? "فرایند استخدام ساختاریافته با شواهد قابل بررسی و کنترل انسانی." : "Structured hiring with reviewable evidence and explicit human control."}</p></div>
            <div className="ws-position-hero__actions"><button className="button button--dark" onClick={() => setScreenOpen(true)} type="button"><FileSearch aria-hidden="true" size={16} />{locale === "fa" ? "ارزیابی رزومه" : "Screen resumes"}</button>{snapshot.activePosition.protected ? <span className="ws-protected-position"><LockKeyhole size={14} />{t.protectedPosition}</span> : <button className="button ws-button--danger" disabled={removingPosition} onClick={removeActivePosition} type="button"><Trash2 aria-hidden="true" size={15} />{removingPosition ? t.removingPosition : t.removePosition}</button>}</div>
          </section>

          <section className="ws-metrics" aria-label={t.positionHealth}>
            <article><span><Users size={18} /></span><div><small>{t.candidateCount}</small><strong>{formatNumber(snapshot.candidates.length, locale)}</strong><em>{snapshot.activePosition.status === "open" ? t.open : statusLabel(snapshot.activePosition.status, t)}</em></div></article>
            <article><span><FileCheck2 size={18} /></span><div><small>{t.evidenceReady}</small><strong>{formatNumber(evidenceReady, locale)}</strong><em>{snapshot.candidates.length ? `${Math.round((evidenceReady / snapshot.candidates.length) * 100)}%` : "0%"}</em></div></article>
            <article><span><UserRoundCheck size={18} /></span><div><small>{t.awaitingReview}</small><strong>{formatNumber(reviewedCount, locale)}</strong><em>{t.humanControl}</em></div></article>
            <article><span><CircleGauge size={18} /></span><div><small>{t.averageFit}</small><strong>{formatNumber(averageScore, locale)}</strong><em>{t.scoreSignal}</em></div></article>
          </section>

          {(tab === "pipeline" || tab === "candidates") ? <section className="ws-workarea">
            <header><div><span className="ws-kicker">{tab === "pipeline" ? <Workflow aria-hidden="true" size={13} /> : <Users aria-hidden="true" size={13} />}{t[tab]}</span><h2>{tab === "pipeline" ? (locale === "fa" ? "جریان داوطلبان" : "Candidate flow") : t.candidates}</h2></div><div className="ws-workarea__tools"><label className="ws-search"><Search aria-hidden="true" size={15} /><input aria-label={t.search} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} value={query} /></label><button aria-pressed={blindMode} className={`ws-blind ${blindMode ? "is-active" : ""}`} onClick={() => setBlindMode((current) => !current)} type="button">{blindMode ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}{blindMode ? t.blindOn : t.blindOff}</button></div></header>
            <AnimatePresence mode="wait" initial={false}><motion.div animate={{ opacity: 1, y: 0 }} initial={reduceMotion ? false : { opacity: 0, y: 5 }} key={tab} transition={{ duration: 0.18 }}>{tab === "pipeline" ? <PipelineBoard snapshot={snapshot} candidates={filteredCandidates} locale={locale} blindMode={blindMode} onOpen={setSelected} onScreen={() => setScreenOpen(true)} /> : <CandidateTable candidates={filteredCandidates} stages={snapshot.stages} locale={locale} blindMode={blindMode} onOpen={setSelected} onScreen={() => setScreenOpen(true)} />}{query && !filteredCandidates.length && snapshot.candidates.length ? <div className="ws-no-results"><Search size={21} />{t.noResults}</div> : null}</motion.div></AnimatePresence>
          </section> : null}

          {tab === "team" ? <TeamAccess snapshot={snapshot} locale={locale} /> : null}
          {tab === "templates" ? <TemplateLibrary snapshot={snapshot} locale={locale} /> : null}
          {tab === "automations" ? <Automations snapshot={snapshot} locale={locale} onChange={toggleAutomation} /> : null}
          {tab === "audit" ? <AuditTrail events={snapshot.audit} locale={locale} /> : null}
        </div>
      </main>

      <AnimatePresence>{selected ? <><motion.div animate={{ opacity: 1 }} className="ws-drawer-scrim" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={() => setSelected(null)} /><CandidateDrawer candidate={selected} candidates={snapshot.candidates} snapshot={snapshot} locale={locale} blindMode={blindMode} onClose={() => setSelected(null)} onMove={moveCandidate} onSendEmail={sendCandidateEmail} onDelete={deleteCandidate} /></> : null}</AnimatePresence>
      {createOpen ? <CreatePositionModal locale={locale} onClose={() => setCreateOpen(false)} onCreate={createPosition} /> : null}
      {screenOpen ? <WorkspaceScreenModal aiReady={snapshot.capabilities.ai} locale={locale} onClose={() => setScreenOpen(false)} onImported={async () => { await switchPosition(snapshot.activePosition.id); setNotice(locale === "fa" ? "داوطلب با ارزیابی مهرشده به فرایند افزوده شد." : "Candidate added with a sealed assessment."); }} position={snapshot.activePosition} /> : null}
      {notice ? <div className="toast ws-toast" role="status"><CheckCircle2 size={16} /><span>{notice}</span><button aria-label={t.close} onClick={() => setNotice("")} type="button"><X size={14} /></button></div> : null}
    </div>
  );
}
