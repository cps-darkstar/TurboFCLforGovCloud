# TurboFCL Style Guide

## 1. Philosophy and Principles

The TurboFCL design system aims to create a user experience that is:

*   **Professional and Trustworthy:** The UI should inspire confidence, reflecting the serious and secure nature of the FCL process.
*   **Clear and Intuitive:** Users should be able to navigate the application and complete complex tasks with ease and minimal friction.
*   **Modern and Efficient:** The aesthetic should be clean and up-to-date, and the application should feel responsive and performant.
*   **Consistent:** All components and layouts should adhere to the defined standards to create a cohesive and predictable experience.

## 2. Color Palette

Our color palette is defined in `tailwind.config.js` and managed through design tokens to ensure consistency.

### Primary Palette

| Name | Hex | Usage |
| :--- | :--- | :--- |
| `primary-bg` | `#F0F4F8` | Main background color for a light, clean workspace. |
| `secondary-bg` | `#FFFFFF` | Background for cards and elevated surfaces. |
| `accent-bg` | `#E2E8F0` | Subtle backgrounds for hover states or selected items. |
| `primary-text` | `#1A202C` | Default text color for high readability. |
| `secondary-text`| `#4A5568` | For secondary information and labels. |
| `accent-text` | `#2B6CB0` | For links, active navigation, and highlighted text. |
| `primary-border`| `#CBD5E0` | Standard border color for inputs and cards. |
| `accent-border` | `#2B6CB0` | Border color for focused or active elements. |

### Button Palette

| Name | Hex | Usage |
| :--- | :--- | :--- |
| `button-primary-bg` | `#3182CE` | Primary call-to-action buttons. |
| `button-primary-hover`| `#2B6CB0` | Hover state for primary buttons. |
| `button-secondary-bg` | `#E2E8F0` | Secondary or less prominent buttons. |
| `button-secondary-hover`|`#CBD5E0` | Hover state for secondary buttons. |

### Legacy Colors

The following colors are part of a previous theme and should be deprecated or mapped to the new palette over time:

*   `gulfBlue: '#7BB5FF'`
*   `gulfOrange: '#FF914D'`
*   `irishGreen: '#009e60'`
*   `onyxBlack: '#111111'`
*   `arcticWhite: '#FFFFFF'`

## 3. Typography

*   **Font Family:** The primary font is **Inter**, a clean and modern sans-serif font, defined in `tailwind.config.js`.
*   **Headings:** Headings (`h1` through `h6`) are rendered with a `font-semibold` weight to establish a clear visual hierarchy, as defined in `frontend/src/styles/global.css`.
*   **Body Text:** Standard body text uses the `primary-text` color for optimal readability.

## 4. Component Styling

Component styles are defined globally in `frontend/src/styles/global.css` and configured in `tailwind.config.js`.

### Cards

Cards are the primary containers for distinct sections of content.

*   **Class:** `.card-common`
*   **Styling:**
    *   Background: `secondary-bg` (`#FFFFFF`)
    *   Shadow: `shadow-card`
    *   Border Radius: `rounded-xl` (`0.75rem`)
    *   Padding: `p-6`

### Forms (Inputs, Selects, Textareas)

Form elements are designed for clarity and ease of use.

*   **Styling:**
    *   Shadow: `shadow-input`
    *   Border Radius: `rounded-md`
    *   Border: `border-primary-border`
    *   Focus State: `focus:ring-accent-border focus:border-accent-border`

### Buttons

Buttons have a subtle 3D effect to provide clear affordance for interaction.

*   **Class:** `.btn-3d`
*   **Styling:**
    *   Shadow: `shadow-button`
    *   Interaction: A transition is applied to all properties. On hover, the button moves up slightly (`hover:-translate-y-0.5`) and the shadow becomes more prominent (`hover:shadow-lg`).

## 5. Iconography

*   **Application Logo:** `logo.svg` is the primary logo displayed in the application header.
*   **Favicon:** `favicon.ico` is used for browser tabs.

All brand assets are stored in the `frontend/src/assets/branding/` directory.

## 6. Layout and Spacing

The application uses Tailwind CSS for its layout and spacing, which promotes a consistent and responsive design. Developers should leverage Tailwind's utility classes for margins, padding, and grid-based layouts to maintain visual consistency.