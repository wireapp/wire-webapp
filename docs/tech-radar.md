# Tech Radar

A living map of our technology choices, organized by areas and levels of adoption.

- **Last review:** 19.08.2025
- **Reviewed by:** [Wire Web Team](https://github.com/orgs/wireapp/teams/web)
- **Review frequency:** Once per year
- **Next review:** 19.08.2026

## Levels

- **Adopt** - Proven and recommended; default for new work.
- **Trial** - Limited, production-adjacent evaluation with success criteria.
- **Assess** - Research/POCs only; not for critical paths yet.
- **Hold** - Avoid for new work; plan migration away when feasible.

---

## 🧩 UI Libraries & Frameworks

| Technology                              | Adopt | Trial | Assess | Hold |
| --------------------------------------- | :---: | :---: | :----: | :--: |
| React                                   |  ✅   |       |        |      |
| zod                                     |  ✅   |       |        |      |
| lexical                                 |  ✅   |       |        |      |
| typescript                              |  ✅   |       |        |      |
| electron                                |  ✅   |       |        |      |
| tanstack/react-table                    |  ✅   |       |        |      |
| tanstack/react-virtual                  |       |  ✅   |        |      |
| axios                                   |  ✅   |       |        |      |
| tanstack-query _(team-management only)_ |  ✅   |       |        |      |
| Axios Cache Interceptor                 |       |  ✅   |        |      |
| react-router                            |  ✅   |       |        |      |
| cmdk                                    |       |       |   ✅   |      |

---

## 🎨 Styling

| Technology                          | Adopt | Trial | Assess | Hold |
| ----------------------------------- | :---: | :---: | :----: | :--: |
| LESS                                |       |       |        |  ✅  |
| Emotion _(object styles, `styled`)_ |  ✅   |       |        |      |
| radix-ui                            |       |       |        |  ✅  |
| react-select                        |  ✅   |       |        |      |
| react-transition-group              |  ✅   |       |        |      |
| tailwind                            |       |       |   ✅   |      |

---

## 📦 Build & Tooling

| Technology | Adopt | Trial | Assess | Hold |
| ---------- | :---: | :---: | :----: | :--: |
| webpack    |  ✅   |       |        |      |
| prettier   |  ✅   |       |        |      |
| eslint     |  ✅   |       |        |      |
| husky      |  ✅   |       |        |      |
| swc        |  ✅   |       |        |      |
| lerna-lite |       |       |        |  ✅  |
| storybook  |  ✅   |       |        |      |
| vite       |       |       |   ✅   |      |
| nx         |       |       |   ✅   |      |

---

## 🧠 State Management

| Technology                     | Adopt | Trial | Assess | Hold |
| ------------------------------ | :---: | :---: | :----: | :--: |
| zustand _(Factories)_          |  ✅   |       |        |      |
| dexie.js                       |  ✅   |       |        |      |
| redux                          |       |       |        |  ✅  |
| tsyringe _(Singleton Classes)_ |  ✅   |       |        |      |
| knockout.js observables        |       |       |        |  ✅  |
| amplify                        |       |       |        |  ✅  |

---

## 🧪 Testing

| Technology      | Adopt | Trial | Assess | Hold |
| --------------- | :---: | :---: | :----: | :--: |
| Jest            |  ✅   |       |        |      |
| Playwright      |  ✅   |       |        |      |
| testing-library |  ✅   |       |        |      |
| jasmine         |       |       |        |  ✅  |

---

## Snapshot

> Quick scan of choices across all quadrants.

- **Adopt**: React; zod; lexical; typescript; electron; tanstack/react-table; axios; tanstack-query _(team-management only)_; react-router; Emotion; react-select; react-transition-group; webpack; prettier; eslint; husky; swc; storybook; zustand _(Factories)_; dexie.js; tsyringe _(Singleton Classes)_; Jest; Playwright; testing-library

- **Trial**: tanstack/react-virtual; Axios Cache Interceptor

- **Assess**: tailwind; vite; nx; cmdk

- **Hold**: LESS; radix-ui; lerna-lite; redux; knockout.js observables; amplify; jasmine

---

## Decision Log

| Date       | Change                          | Ring | Quadrant | Notes                                |
| ---------- | ------------------------------- | ---- | -------- | ------------------------------------ |
| 18.11.2025 | Annual review snapshot captured | —    | —        | Imported from team radar screenshots |
