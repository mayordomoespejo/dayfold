# Dayfold

A React 19 SPA for exploring historical events on any day of the year via a scroll-driven radial wheel, powered by the Wikimedia On This Day feed API.

## Stack

| Purpose       | Library / Tool              |
|---------------|-----------------------------|
| UI            | React 19 + TypeScript       |
| Build         | Vite                        |
| Data fetching | TanStack Query v5           |
| i18n          | i18next + react-i18next     |
| Routing       | React Router v7 (URL state) |
| Styles        | SCSS                        |
| Data source   | Wikimedia Feed API          |

## Scripts

```bash
npm install       # install dependencies
npm run dev       # local dev server → http://localhost:5173
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## Architecture

```
src/
├── components/
│   ├── Header/          # Fixed header: brand, date picker, language selector, theme toggle
│   ├── DateSelector/    # Controlled month/day picker with local draft state
│   ├── Timeline/        # Radial wheel + sticky detail card (scroll and drag driven)
│   └── common/          # Shared primitives: Dropdown, Skeleton, ErrorState
├── config/
│   ├── app.ts           # App-wide constants (name, storage keys, API base URL)
│   └── langs.ts         # Supported Wikipedia content languages + resolution logic
├── context/
│   ├── content-lang-context.ts   # ContentLang context definition
│   ├── content-lang-provider.tsx # Provider: persists choice, syncs i18n language
│   └── useContentLang.ts         # Hook with provider-guard
├── hooks/
│   ├── useTimelineDate.ts    # Reads/writes month+day from URL search params
│   ├── useOnThisDayEvents.ts # TanStack Query wrapper for Wikimedia events
│   └── useTheme.ts           # Theme persistence + document class sync
├── i18n/
│   ├── index.ts          # i18next bootstrap (11 languages, browser detection)
│   └── locales/          # JSON translation files: ar de en es fr it pt sv tr uk zh
├── lib/
│   └── queryClient.ts    # Singleton TanStack QueryClient (staleTime: Infinity)
├── services/
│   └── wikimediaClient.ts # Fetch + map Wikimedia API response → TimelineEvent[]
├── styles/
│   ├── main.scss                  # Global reset imports, .skeleton class, @keyframes
│   ├── abstracts/_variables.scss  # CSS custom properties (colors, spacing, typography)
│   ├── abstracts/_mixins.scss     # Responsive breakpoints, focus-ring, visually-hidden
│   └── base/                      # Reset + typography base rules
├── types/index.ts        # CalendarDate, TimelineEvent, Theme
└── utils/
    ├── date.ts            # getTodayDate, normalizeCalendarDate, getDaysInMonth, clampDay
    ├── text.ts            # capitalizeSentenceStart (locale-aware)
    └── timelineTitle.ts   # Relative/absolute date label for the timeline header
```

## Data flow

1. `useTimelineDate` reads `?month=&day=` from the URL; invalid values are clamped to valid dates.
2. `useOnThisDayEvents` queries the Wikimedia Feed API via TanStack Query. Results are cached indefinitely (`staleTime: Infinity`) and keyed by `[lang, month, day]`.
3. `fetchOnThisDayEvents` maps the raw API response to `TimelineEvent[]`, sorted ascending by year.
4. `Timeline` renders the normalized events as a scroll-driven radial wheel. Scroll position maps linearly to wheel rotation; a snap timer settles on the nearest item after the user stops scrolling.

## i18n

11 UI languages are supported: Arabic, German, English, Spanish, French, Italian, Portuguese, Swedish, Turkish, Ukrainian, Chinese. The content language (Wikipedia edition) is stored in `localStorage` under `cl_content_lang` and can differ from the UI language. Both fall back to the browser locale on first visit.

## Data source

[Wikimedia On This Day feed API](https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day)

```
GET https://api.wikimedia.org/feed/v1/wikipedia/{lang}/onthisday/events/{month}/{day}
```
