<div dir="rtl">

# 🎵 מסע התווים — Note Quest

**משחק ללימוד קריאת תווים בעברית** (דו · רה · מי · פה · סול · לה · סי) — בנוי כדי להיות *כיף אמיתי*, כך שהלמידה קורית כתוצר לוואי של המשחק.

### ▶️ [שחק עכשיו בדפדפן](https://tikshuvccna.github.io/note-quest/)

🇮🇱 עברית (כאן) · [🇬🇧 English below ↓](#-note-quest--english)

---

## ✨ מה זה?

משחק רשת (web) להתקנה (PWA) שמלמד ילדים לקרוא תווים על חמשה, בעברית, בעזרת שמות סולפז' (דו-רה-מי). העיצוב שואב השראה ממשחקי בלוקבסטר כמו Brawl Stars — לולאת משחק קצרה וממכרת, תגמולים, התקדמות, ו"מיץ" (אפקטים, קול, רטט ויזואלי).

## 🎮 מצבי משחק

- **🍃 תפיסת תווים** — תווים נופלים לעבר קו הפגיעה; הקש על השם המתאים בזמן.
- **⏱️ כרטיס מהיר** — תו אחד עם טיימר; ענה לפני שהזמן נגמר.
- **⭐ ריצת מהירות** — ענה מהר ככל האפשר, בנה רצף 🔥, טעות אחת מסיימת.
- **🎹 בנה את התו** (הפוך) — המשחק אומר שם, ואתה מקיש על המיקום הנכון בחמשה.
- **🎤 אתגר הזיכרון** — רצף תווים מהבהב, ואתה משחזר אותו לפי הסדר.
- **👑 קרב בּוס** — מפלצת יורקת אש שחוסמת כפתורים; תזמון חשוב!

## 🗺️ מאפיינים

- **8 עולמות** עם נושא ויזואלי משלהם, מתקדמים מתו אחד (דו) ועד אוקטבות גבוהות וקווי עזר.
- **📖 שיעור לפני כל עולם** — מלמד את התווים החדשים, עם שער תרגול קצר וללא לחץ.
- **קול אירופאי** שאומר את שמות התווים (דו·רה·מי בּאיטלקית/צרפתית/ספרדית) + צליל פסנתר אמיתי.
- **התאמת קושי חכמה** וחזרה מרווחת (spaced repetition) — בלתי נראות, אבל הן הסיבה שזוכרים.
- **מצב קל** (איטי ב-50%) ו**מצב קטנטנים** (5–8) בהגדרות.
- עברית מלאה (RTL), עובד במחשב/טאבלט/טלפון, ניתן להתקנה כאפליקציה.

## ▶️ איך מפעילים

הדרך הכי קלה: לחיצה כפולה על `PLAY.bat` (דורש [Node.js](https://nodejs.org) מותקן).

או ידנית:

</div>

```bash
npm install      # פעם אחת / once
npm run dev      # מצב פיתוח / dev server → http://localhost:5173
npm run build    # בניית גרסת הפצה / production build → dist/
npm test         # הרצת בדיקות / run tests
```

<div dir="rtl">

### 🔑 קודים

בכפתור **🔑 קוד** במסך הבית אפשר להקליד קוד כדי להמשיך מאיפה שעצרת (גם במכשיר אחר). הקוד פותח את העולם וכל מה שלפניו:

| עולם | קוד |
|---|---|
| 1 · 🌱 התחלה | `DOSTART` |
| 2 · 🌊 הים | `SEAMIRE` |
| 3 · 🌳 היער | `TREEFA` |
| 4 · 🔮 הקסם | `MAGICLA` |
| 5 · 🏜️ המדבר | `DUNEHOP` |
| 6 · 🌌 החלל | `SPACE6` |
| 7 · 🌋 הר הגעש | `LAVA7` |
| 8 · ❄️ הקרח | `ICEPEAK` |

**קוד מנהל:** `MAESTRO` — פותח פאנל מנהל (פתיחת עולמות/הכל, איפוס, מטבעות/כוכבים, דילוג שיעורים, החלפת מצבים). הקוד אינו תלוי-רישיות.

להורדת הגרסה המוכנה למשחק — ראו [**Releases**](../../releases).

**מחסנית טכנולוגית:** Phaser 3 · TypeScript · Vite · PWA.

</div>

---

# 🎵 Note Quest — English

**A game for learning to read musical notes in Hebrew** (do · re · mi · fa · sol · la · si) — built to be *genuinely fun*, so the learning happens as a side effect of play.

🇬🇧 English (here) · [🇮🇱 עברית למעלה ↑](#-מסע-התווים--note-quest)

## ✨ What is it?

### ▶️ [Play now in your browser](https://tikshuvccna.github.io/note-quest/)

An installable web game (PWA) that teaches kids to read notes on a staff, in Hebrew, using solfège names (do-re-mi). The design takes cues from blockbuster games like Brawl Stars — a short addictive core loop, rewards, progression, and lots of "juice" (effects, sound, game feel).

## 🎮 Game modes

- **🍃 Note Catcher** — notes fall toward a hit-line; tap the matching name in time.
- **⏱️ Quick Card** — one note with a timer; answer before it runs out.
- **⭐ Speed Run** — answer as fast as you can, build a streak 🔥, one miss ends it.
- **🎹 Build the Note** (reverse) — the game says a name, you tap the right position on the staff.
- **🎤 Memory Echo** — a sequence of notes flashes; replay it in order.
- **👑 Boss Duel** — a fire-spitting monster blocks buttons; timing matters!

## 🗺️ Features

- **8 themed worlds**, progressing from a single note (do) up to higher octaves and ledger lines.
- **📖 A lesson before each world** teaches its new notes, with a short no-pressure practice gate.
- **European voice** speaking the note names (do·re·mi in Italian/French/Spanish) + real piano pitch.
- **Adaptive difficulty** and **spaced repetition** — invisible, but they're why notes stick.
- **Easy mode** (50% slower) and **Little-kids mode** (ages 5–8) in settings.
- Full Hebrew (RTL), runs on desktop/tablet/phone, installable as an app.

## ▶️ Running it

Easiest: double-click `PLAY.bat` (requires [Node.js](https://nodejs.org)).

Or manually: `npm install`, then `npm run dev` (dev) or `npm run build` (production → `dist/`).

For a ready-to-play build, see [**Releases**](../../releases).

**Tech stack:** Phaser 3 · TypeScript · Vite · PWA.

---

<div dir="rtl">

נבנה עם ❤️ · Built with ❤️

</div>
