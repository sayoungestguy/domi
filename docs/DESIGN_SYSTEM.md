# Domi Design System

**Working name:** Domi Home  
**Design intent:** calm, warm, quick, and trustworthy

## 1. Experience principles

1. **Attention, not alarm.** Show what needs action without making a normal home
   feel like an incident dashboard.
2. **One-handed speed.** Frequent actions sit within comfortable reach and need
   few decisions.
3. **State is unmistakable.** Labels, icons, and position reinforce colour; no
   meaning depends on colour alone.
4. **Shared actions feel human.** Use member names and plain verbs: “Maya added
   Eggs,” not “Inventory entity created.”
5. **Complexity arrives when requested.** Advanced fields and preferences stay
   behind progressive disclosure.

## 2. Brand character and voice

Domi should feel like a capable housemate: warm, direct, never scolding. Copy is
sentence case, concise, and specific.

| Prefer | Avoid |
|---|---|
| “Milk was added to shopping.” | “Operation successful.” |
| “You’re offline. Showing the last update.” | “Network error 1009.” |
| “3 items left” | “3 incomplete inventory list entities” |
| “Remove Alex from this home?” | “Are you sure?” |

Use “home” in the interface when it is more natural; use “household” in legal,
permission, and data contexts. Emoji may appear in friendly onboarding or empty
states but must not be the only icon or status cue.

## 3. Foundations

### Colour

These semantic tokens are the source of truth; platform tokens may map to system
dynamic colours. All text/background combinations must meet WCAG 2.2 AA.

| Token | Light value | Purpose |
|---|---:|---|
| `color.brand.600` | `#35745A` | primary actions, active navigation |
| `color.brand.700` | `#285A45` | pressed primary action |
| `color.brand.100` | `#DDEDE4` | selected/soft brand surface |
| `color.canvas` | `#FAF9F6` | app background |
| `color.surface` | `#FFFFFF` | cards, sheets, inputs |
| `color.text.primary` | `#1D2520` | primary text |
| `color.text.secondary` | `#58635C` | supporting text |
| `color.border` | `#D8DED9` | separators and controls |
| `color.status.ok` | `#35745A` | stocked/complete |
| `color.status.low` | `#9A6700` | running low/attention |
| `color.status.out` | `#B42318` | out/strong attention |
| `color.focus` | `#246BCE` | keyboard/accessibility focus |

Dark-mode semantic values must be defined and contrast-tested before dark mode
ships; do not mechanically invert the palette.

### Typography

Use the platform system font for performance, localization, and accessibility.
Support Dynamic Type/font scaling without clipping.

| Style | Size / line height | Weight | Use |
|---|---|---|---|
| Display | 32 / 38 | 700 | rare welcome/hero text |
| Heading 1 | 28 / 34 | 700 | screen title |
| Heading 2 | 22 / 28 | 700 | major section |
| Heading 3 | 18 / 24 | 600 | card/section title |
| Body | 16 / 24 | 400 | default content |
| Body strong | 16 / 24 | 600 | item name/action |
| Small | 14 / 20 | 400 | metadata |
| Label | 13 / 16 | 600 | badges and compact labels |

### Spacing, shape, and elevation

- Base spacing unit: 4; scale: 4, 8, 12, 16, 24, 32, 40, 48.
- Default screen gutter: 16 on phones; 24 on tablets/web.
- Control height: 48; compact control: 40 only where the touch target remains 44.
- Radius scale: 8 for controls, 12 for cards, 16 for sheets, pill for badges.
- Prefer borders and surface contrast to shadows. Use one restrained card shadow
  only when elevation communicates layering.

### Iconography and motion

Use one platform-consistent rounded line icon family. Pair unfamiliar icons with
labels. Standard icon sizes are 20 and 24.

Motion explains state change, never delays it: 120–180 ms for control feedback,
200–280 ms for sheets/navigation. Respect reduced-motion settings. Checked
shopping entries may move after immediate feedback; never animate the target
away before acknowledging the tap.

## 4. Core components

### Buttons

- **Primary:** filled brand colour; one per decision area.
- **Secondary:** neutral/brand outline for alternatives.
- **Tertiary:** text/icon for low-emphasis actions.
- **Destructive:** red only for genuinely destructive actions.

Every state includes default, pressed, disabled, focus, and loading. Loading
preserves button width and prevents duplicate submission.

### Status badge

Inventory status is always uppercase or otherwise visually distinct and includes
text plus an icon/shape:

- `OK`: green, check icon;
- `LOW`: amber, downward/attention icon;
- `OUT`: red, empty/alert icon.

Changing status is a segmented control or bottom sheet with all three labeled
choices. Do not cycle an unlabeled colour on tap.

### Household item row

Minimum height 56. Leading area may show category icon; center shows item name
and optional quantity/note; trailing area shows status or checkbox. The whole
row may open details, while checkbox/status remains a distinct accessible action.

### Input

Persistent visible label, optional helper/error message, and clear focus state.
Placeholder text never replaces a label. Validate after blur or submit unless
immediate feedback prevents an invalid action.

### Card, banner, toast, and empty state

- Cards group related content, not every row.
- Banners communicate persistent offline, invitation, or sync state.
- Toasts confirm reversible low-risk actions and should offer Undo when useful.
- Empty states name the benefit and present one next action, such as “Add your
  first item.”

### Navigation

MVP mobile tabs: **Home**, **Inventory**, **Shopping**, and **Settings**.
Shopping displays a numeric badge only for active entries. Creation is
contextual rather than a fifth ambiguous tab.

## 5. Screen patterns

### Home

Order content by actionability: greeting/home switcher, needs-attention summary,
shopping preview, low/out inventory, recent activity. A sticky or reachable Add
item action is present without obscuring content.

### Inventory

Search and status filters sit above a sectioned list. Default grouping is
category; users can switch to attention-first sorting later. Inline status
changes are optimized, while editing optional fields opens item details.

### Shopping mode

Use high contrast, 56–64 point rows, a persistent remaining count, and a clear
Finish shopping action. Checked entries move to a collapsed Purchased section
after feedback. The finish confirmation states exactly how many linked inventory
items will update and permits review.

### Errors and degraded states

Preserve entered data when submission fails. Explain what happened, what remains
safe, and the next action. Offline cached content carries “Updated [time]” and
never pretends to be current. Conflicts show the server value and allow the user
to retry their intended edit.

## 6. Accessibility and inclusivity

- Minimum 44×44 pt targets with adequate separation.
- Screen reader name, role, state, and hint for custom controls.
- Logical focus order and focus restoration after sheets/dialogs.
- Status communicated through text and semantics, not colour alone.
- 200% text scaling supported for critical flows without loss of function.
- Plain language suitable for varied household structures; avoid assuming roles
  such as mother/father.
- Dates, numbers, units, and names use locale-aware formatting.
- Destructive and financial actions require explicit confirmation; routine
  shopping toggles do not.

## 7. Design governance

Tokens live in `packages/design-tokens`; components consume semantic tokens, not
raw hex values. Every component requires documented variants, interaction
states, accessibility behavior, and visual regression coverage where practical.
New raw colours, arbitrary spacing, or duplicate component variants require a
design-system review.

Before implementation handoff, each critical flow needs loading, empty, error,
offline, permission-denied, and large-text designs—not only the happy path.

