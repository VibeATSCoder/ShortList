from pathlib import Path
from textwrap import wrap

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Mehdi-Sharifi-Solo-AI-Builder-Application.pdf"

W, H = A4
INK = HexColor("#17231E")
MUTED = HexColor("#607068")
GREEN = HexColor("#168B67")
GREEN_DARK = HexColor("#0E6048")
MINT = HexColor("#E9F6F0")
PALE = HexColor("#F5F8F6")
LINE = HexColor("#DCE8E1")
WHITE = HexColor("#FFFFFF")
AMBER = HexColor("#B86B17")

MARGIN = 18 * mm
CONTENT_W = W - 2 * MARGIN


def font(c, name="Helvetica", size=9, color=INK):
    c.setFont(name, size)
    c.setFillColor(color)


def rounded(c, x, y, w, h, fill=PALE, stroke=LINE, radius=4 * mm):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.6)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def p(c, text, x, y_top, width, style=None):
    style = style or ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=8.4,
        leading=11.4,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=0,
    )
    para = Paragraph(text, style)
    _, height = para.wrap(width, H)
    para.drawOn(c, x, y_top - height)
    return y_top - height


def label(c, text, x, y, color=GREEN):
    font(c, "Helvetica-Bold", 6.7, color)
    c.drawString(x, y, text.upper())


def footer(c, page):
    c.setStrokeColor(LINE)
    c.line(MARGIN, 13 * mm, W - MARGIN, 13 * mm)
    font(c, "Helvetica", 6.7, MUTED)
    c.drawString(MARGIN, 8.5 * mm, "MEHDI SHARIFI  /  SOLO AI BUILDER")
    right = f"SHORTLIST  /  {page} OF 2"
    c.drawRightString(W - MARGIN, 8.5 * mm, right)


def qr(c, value, x, y, size):
    widget = QrCodeWidget(value)
    bounds = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (bounds[2] - bounds[0]), 0, 0, size / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def metric(c, x, y, w, number, caption, accent=GREEN):
    rounded(c, x, y, w, 24 * mm, WHITE, LINE)
    font(c, "Helvetica-Bold", 19, accent)
    c.drawString(x + 5 * mm, y + 12.3 * mm, number)
    font(c, "Helvetica", 6.8, MUTED)
    c.drawString(x + 5 * mm, y + 6.2 * mm, caption.upper())


def bullet(c, text, x, y_top, width, color=GREEN):
    c.setFillColor(color)
    c.circle(x + 1.4 * mm, y_top - 2.4 * mm, 1.05 * mm, fill=1, stroke=0)
    return p(c, text, x + 5 * mm, y_top, width - 5 * mm)


def page_one(c):
    # Hero
    label(c, "48-hour product proof", MARGIN, H - 20 * mm)
    font(c, "Helvetica-Bold", 25, INK)
    c.drawString(MARGIN, H - 33 * mm, "MEHDI SHARIFI")
    font(c, "Helvetica-Bold", 12, GREEN)
    c.drawString(MARGIN, H - 41 * mm, "SOLO AI BUILDER  /  FULL-STACK AI ENGINEER")
    p(
        c,
        "I turn ambiguous product visions into deployed, useful software. Shortlist is the proof: an AI-powered ATS I designed, built, tested, and shipped solo.",
        MARGIN,
        H - 50 * mm,
        122 * mm,
        ParagraphStyle("lead", fontName="Helvetica", fontSize=10.3, leading=14.1, textColor=MUTED),
    )
    qr(c, "https://ats.mehdisharifi.com", W - MARGIN - 28 * mm, H - 49 * mm, 26 * mm)
    font(c, "Helvetica-Bold", 6.5, GREEN_DARK)
    c.drawCentredString(W - MARGIN - 15 * mm, H - 53 * mm, "OPEN LIVE PRODUCT")

    # Metrics
    gap = 4 * mm
    mw = (CONTENT_W - 3 * gap) / 4
    y = H - 89 * mm
    metric(c, MARGIN, y, mw, "47h 59m", "challenge-ready core")
    metric(c, MARGIN + mw + gap, y, mw, "60", "automated tests")
    metric(c, MARGIN + 2 * (mw + gap), y, mw, "13", "passing suites")
    metric(c, MARGIN + 3 * (mw + gap), y, mw, "LIVE", "custom domain", AMBER)

    # What shipped / ownership
    y2 = y - 10 * mm
    col_gap = 8 * mm
    col = (CONTENT_W - col_gap) / 2
    label(c, "The product", MARGIN, y2)
    font(c, "Helvetica-Bold", 14, INK)
    c.drawString(MARGIN, y2 - 8 * mm, "Evidence, not AI vibes.")
    yy = y2 - 15 * mm
    items = [
        "Screens PDF, DOCX, TXT, and Markdown resumes against a canonical job description.",
        "Separates parse quality from role fit and grounds six scoring dimensions in resume evidence.",
        "Runs a durable recruiter pipeline with positions, stages, reviewers, audit events, and human decisions.",
        "Shows the original PDF beside ATS evidence and protects the challenge position and showcase resume.",
        "Sends candidate receipts plus controlled HR and reviewer notifications after successful intake.",
    ]
    for item in items:
        yy = bullet(c, item, MARGIN, yy, col) - 3.1 * mm

    x2 = MARGIN + col + col_gap
    label(c, "What I owned", x2, y2)
    font(c, "Helvetica-Bold", 14, INK)
    c.drawString(x2, y2 - 8 * mm, "One builder, full surface area.")
    yy2 = y2 - 15 * mm
    items2 = [
        "Product framing, scope control, reviewer journey, UX, visual system, and responsive behavior.",
        "Frontend, server routes, AI prompt/schema, file validation, scoring normalization, and error contracts.",
        "Authentication, CSRF, role capabilities, PostgreSQL model, private object storage, and migrations.",
        "SMTP automation, allowlists, templates, idempotency, auditability, DNS diagnosis, and deployment.",
        "Test strategy, regression fixes, production verification, documentation, and operational trade-offs.",
    ]
    for item in items2:
        yy2 = bullet(c, item, x2, yy2, col) - 3.1 * mm

    # Stack strip
    y3 = 48 * mm
    rounded(c, MARGIN, y3, CONTENT_W, 35 * mm, MINT, HexColor("#C9E6D8"), 5 * mm)
    label(c, "Pragmatic production stack", MARGIN + 6 * mm, y3 + 27 * mm, GREEN_DARK)
    lines = [
        "NEXT.JS 16  /  REACT 19  /  TYPESCRIPT 6  /  ZOD",
        "OPENROUTER + OPENAI/GPT-5.4-NANO  /  NEON POSTGRESQL",
        "PRIVATE VERCEL BLOB  /  CPANEL SMTP  /  VERCEL HOBBY",
        "FRAMER MOTION  /  VITEST  /  ESLINT  /  CODEX-ASSISTED DELIVERY",
    ]
    for i, line in enumerate(lines):
        font(c, "Helvetica-Bold", 7.6 if i != 1 else 7.1, INK)
        c.drawString(MARGIN + 6 * mm, y3 + (20 - i * 5) * mm, line)

    # Live database-backed demo credentials
    access_y = 23 * mm
    rounded(c, MARGIN, access_y, CONTENT_W, 21 * mm, WHITE, LINE, 4 * mm)
    label(c, "Live reviewer access", MARGIN + 5 * mm, access_y + 14.5 * mm, GREEN_DARK)
    font(c, "Helvetica", 6.6, MUTED)
    c.drawRightString(W - MARGIN - 5 * mm, access_y + 14.5 * mm, "ats.mehdisharifi.com/login  /  github.com/VibeATSCoder/ShortList")
    font(c, "Helvetica-Bold", 6.8, GREEN_DARK)
    c.drawString(MARGIN + 5 * mm, access_y + 7 * mm, "FREE")
    font(c, "Helvetica", 6.8, INK)
    c.drawString(MARGIN + 17 * mm, access_y + 7 * mm, "free@ats.mehdisharifi.com  /  TryShortlistFree2026!")
    split_x = MARGIN + CONTENT_W / 2 + 3 * mm
    font(c, "Helvetica-Bold", 6.8, GREEN_DARK)
    c.drawString(split_x, access_y + 7 * mm, "PRO")
    font(c, "Helvetica", 6.8, INK)
    c.drawString(split_x + 10 * mm, access_y + 7 * mm, "pro@ats.mehdisharifi.com  /  TryShortlistPro2026!")
    footer(c, 1)


def timeline_row(c, y, hours, title, detail, gate):
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(MARGIN + 12 * mm, y - 1 * mm, MARGIN + 12 * mm, y - 21 * mm)
    c.setFillColor(GREEN)
    c.circle(MARGIN + 12 * mm, y, 2.2 * mm, fill=1, stroke=0)
    font(c, "Helvetica-Bold", 7.1, GREEN_DARK)
    c.drawRightString(MARGIN + 8 * mm, y + 2 * mm, hours)
    font(c, "Helvetica-Bold", 9.2, INK)
    c.drawString(MARGIN + 19 * mm, y + 2 * mm, title)
    end = p(c, detail, MARGIN + 19 * mm, y - 2.5 * mm, 150 * mm, ParagraphStyle("timeline", fontName="Helvetica", fontSize=7.4, leading=9.4, textColor=INK))
    font(c, "Helvetica-Bold", 6.6, GREEN_DARK)
    c.drawString(MARGIN + 19 * mm, end - 3 * mm, "GATE")
    p(c, gate, MARGIN + 31 * mm, end - 2.2 * mm, 138 * mm, ParagraphStyle("gate", fontName="Helvetica", fontSize=6.7, leading=8.2, textColor=MUTED))


def page_two(c):
    label(c, "The 48-hour challenge", MARGIN, H - 20 * mm)
    font(c, "Helvetica-Bold", 22, INK)
    c.drawString(MARGIN, H - 33 * mm, "DEPLOY EARLY. CLOSE VERTICAL SLICES.")
    p(
        c,
        "The first deployment is a real walking skeleton: landing and login, health endpoint, fictional seeded assessment, environment contract, and the smallest upload-to-result path.",
        MARGIN,
        H - 42 * mm,
        CONTENT_W,
        ParagraphStyle("lead2", fontName="Helvetica", fontSize=9.4, leading=13, textColor=MUTED),
    )

    rows = [
        ("0-2", "Frame and deploy", "Define the reviewer journey, rubric, privacy and fairness boundaries, file budgets, typed shell, health route, seed, and production environment contract.", "A public mobile-ready URL is healthy and contains no secret or candidate PII."),
        ("2-8", "Complete one AI slice", "Validate one resume, call OpenRouter server-side, enforce a strict Zod contract, normalize scores, render evidence and gaps, and return stable provider/file errors.", "One fictional resume completes upload to evidence-backed report without manual repair."),
        ("8-16", "Make it useful", "Add bounded batch screening, deterministic ranking, positions, comparison, search, stages, blind behavior, responsive details, and human decisions.", "A recruiter can explain the ranking and finish the core flow in under two minutes."),
        ("16-24", "Persist the workflow", "Add auth, roles, CSRF, PostgreSQL entities, sealed assessments, private resume storage, and side-by-side PDF plus ATS review.", "Sign-in through candidate stage move works after refresh."),
        ("24-32", "Automate communication", "Send candidate receipts and HR/reviewer notifications with dropdown selection, allowlists, templates, idempotency, and auditable failure handling.", "Successful intake persists independently of email delivery and every attempt is observable."),
        ("32-40", "Harden", "Protect the model/data boundary, add plan limits, retry-safe intake, archive rules, showcase locks, rate limits, safe logs, and adversarial tests.", "Misuse and dependency failure produce safe, actionable outcomes."),
        ("40-46", "Verify and polish", "Run lint, types, tests, production build, and live smoke paths; refine accessibility, hierarchy, loading feedback, and mobile behavior.", "The deployed commit matches the tested commit and the critical journey passes."),
        ("46-48", "Package the proof", "Publish architecture, trade-offs, limits, demo narrative, application brief, release notes, and rollback guidance.", "A reviewer can understand and verify the product without assistance."),
    ]
    y = H - 61 * mm
    for row in rows:
        timeline_row(c, y, *row)
        y -= 22.5 * mm

    # Bottom panel
    panel_y = 24 * mm
    rounded(c, MARGIN, panel_y, CONTENT_W, 31 * mm, MINT, HexColor("#C9E6D8"), 5 * mm)
    label(c, "Engineering judgment", MARGIN + 6 * mm, panel_y + 23 * mm, GREEN_DARK)
    notes = [
        "Deterministic structured call over an agent swarm: lower latency, clearer contracts, easier audit.",
        "Managed PostgreSQL and Blob over custom infrastructure: spend the deadline on recruiter value.",
        "Archive plus audit over destructive deletion; acknowledgement and notification over autonomous rejection.",
    ]
    yy = panel_y + 17 * mm
    for note in notes:
        yy = bullet(c, note, MARGIN + 6 * mm, yy, CONTENT_W - 12 * mm, GREEN_DARK) - 1.6 * mm
    footer(c, 2)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    c.setTitle("Mehdi Sharifi - Solo AI Builder Application")
    c.setAuthor("Mehdi Sharifi")
    page_one(c)
    c.showPage()
    page_two(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
