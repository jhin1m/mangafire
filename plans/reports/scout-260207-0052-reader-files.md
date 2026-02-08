# Reader Files Scout Report

## Tóm tắt
Đã tìm và đọc đầy đủ nội dung **8 file** liên quan đến reader trang trong dự án MangaFire:
- 3 file CSS
- 1 Layout component
- 1 View component chính  
- 3 Component con (Image, LongStrip, Single, Double)

## Files Found

### 1. CSS Files

#### `/apps/web/src/assets/styles/read.css` (505 dòng)
**File CSS chính của reader** - Chứa tất cả styling cho reading mode

**Key classes & styles:**
- `body.read`: CSS variables cho header padding, styling header/footer/nav khi ở read mode
- `body.read main`: Flexbox layout, 100vh height, no padding, overflow hidden
- `body.read main .m-content`: Flex-grow 1, relative position, padding-top dùng CSS var
- `body.read main .m-content #page-wrapper`: 100% width/height, overflow auto
- `.page`: margin 0 auto, width 100%, user-select none, min-height 100%
- `.img`: relative, block, min 50px, text-align center
- `img`: object-fit contain, margin-left/right auto, transitions
- `.number-nav`: display flex, flex-direction column, **margin: 2rem 0; padding-bottom: 3rem**
- `.number-nav.abs`: position fixed, bottom 0, height transition

**Bottom margin/padding found:**
```css
body.read main .m-content .number-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
  padding-bottom: 3rem;  /* <-- KEY: 3rem bottom padding */
}
```

#### `/apps/web/src/assets/styles/app.css` (97K+ tokens)
**Global styles file** - Contains base Bootstrap-like styles

**Key findings related to reader:**
- Line 157: `.pre-scrollable { overflow-y: scroll; }`
- Lines 12145+: `.scroll-sm::-webkit-scrollbar { ... }` - Custom scrollbar styling
- Lines 10774: `padding-bottom: 7rem;` - Found in scroll-related classes
- Multiple `margin-bottom` and `overflow` rules throughout (standard Bootstrap utilities)

**Scroll-related bottom classes:**
```css
#progress-bar.bottom:hover > div,
#progress-bar.bottom:hover > div p,
#progress-bar {
  bottom: 0;      /* <-- At bottom */
  bottom: 100%;   /* <-- Above content */
  margin-bottom: 0.2rem;
}
```

#### `/apps/web/src/index.css` (9 dòng)
**Main CSS entry file** - Imports all CSS modules

```css
@import './assets/styles/app.css';
@import './assets/styles/modal.css';
@import './assets/styles/swiper.css';
@import './assets/styles/read.css';
@import './assets/styles/card.css';
@import './assets/styles/toast.css';
@import './assets/styles/footer.css';
@import './assets/styles/dropdown.css';
```

---

### 2. Layout Component

#### `/apps/web/src/components/layouts/ReadLayout.tsx` (154 dòng)
**Main layout wrapper cho reading page** - Provides ReaderContext + keyboard controls

**Structure:**
```tsx
ReadLayout (wrapper)
  └─ ReaderProvider (context provider)
       └─ ReadLayoutInner (actual layout)
            ├─ Header
            ├─ main element (className={pageType})
            │  ├─ .m-content
            │  │  ├─ #page-wrapper (pages render here)
            │  │  ├─ ProgressBar
            │  │  ├─ SubPanelChapter
            │  │  ├─ SubPanelPage
            │  │  └─ SubPanelComment
            │  └─ ControlMenu
            └─ Toast UI
```

**Key features:**
- Keyboard controls: H (header), M (menu), Arrow keys (navigate)
- Double-tap on mobile to show/hide header
- Dynamic maxHeight for SINGLE page type on mobile
- Toast notification when header/menu hidden
- Adds/removes `on-last-page` class on #page-wrapper

**Dynamic style prop:**
```tsx
const styleMaxHeight =
  pageType === PAGE_ENUM.SINGLE && isMobile
    ? { maxHeight: height }
    : {}
```

---

### 3. View Component (Pages Container)

#### `/apps/web/src/views/read/Read.tsx` (155 dòng)
**Main read view component** - Renders pages based on pageType

**Renders different UI based on `pageType`:**
1. **LONG_STRIP**: Stack of images with vertical scroll
   ```tsx
   {pages.map((page, index) => (
     <LongStripImage key={page.id} src={page.imageUrl} index={index} />
   ))}
   ```

2. **SINGLE**: Single page with swiper (mobile swipe) or pagination
   ```tsx
   <Single ref={swiperRef} />
   ```

3. **DOUBLE**: Two images side-by-side
   ```tsx
   <div className={classNames('page', fitClassName[fitType])}>
     {pages.map((page, index) => (
       <DoubleImage key={page.id} src={page.imageUrl} index={index + 1} />
     ))}
   </div>
   ```

**Navigation element:**
```tsx
<div className={classNames('number-nav ltr', pageType !== PAGE_ENUM.LONG_STRIP && 'abs show')}>
  {/* Previous chapter link */}
  {/* Next chapter link */}
</div>
```

**Click handlers:**
- `handleChangePage()`: Click on left/right 30% of page to navigate
- Loading & error states with Spinner component

---

### 4. Sub-Components

#### `/apps/web/src/views/read/components/Image.tsx` (26 dòng)
**Reusable image wrapper component**

```tsx
<div data-number={number} className={classNames('img', wrapperClassName)}>
  <img data-number={number} className={imageClassName} src={src} alt={`Page ${number}`} />
</div>
```

#### `/apps/web/src/views/read/components/PageType/LongStripImage.tsx` (54 dòng)
**Long strip image component** - Single image in vertical scroll

**KEY FINDING - Bottom margin:**
```tsx
<div
  className={classNames('page', fitClassName[fitType])}
  style={{ marginBottom: '30px' }}  /* <-- 30px margin-bottom */
  ref={imageRef}
  id={`page-${index + 1}`}
>
```

**Features:**
- Memo wrapped for performance
- `useOnScreen()` hook to detect when image enters viewport
- Updates `pageIndex` when image scrolls into view
- Auto-scrolls to first page on mount

#### `/apps/web/src/views/read/components/PageType/Single.tsx` (87 dòng)
**Single page component** - Can render as Swiper (mobile) or static div

**Two render modes:**
1. **With Swiper (isSwiping = true):**
   ```tsx
   <Swiper
     ref={ref}
     modules={[EffectFade]}
     speed={500}
     grabCursor={true}
     slidesPerView="auto"
     className="pages singlepage"
     wrapperClass="page fit-w"
   >
   ```

2. **Without Swiper (isSwiping = false):**
   ```tsx
   <div className={classNames('page', fitClassName[fitType])}>
     {pages.map((page, index) => (
       <Image {...} />
     ))}
   </div>
   ```

#### `/apps/web/src/views/read/components/PageType/DoubleImage.tsx` (34 dòng)
**Double page image component** - Shows 2 images side-by-side

```tsx
<Image
  key={index}
  src={src}
  number={index + 1}
  wrapperClassName={classNames(
    pageIndex + 4 > index + 1 && 'loaded',
    left && 'left',
    right && 'right',
    index + 1 === pageIndex ? 'd-block' : 'd-none'
  )}
  imageClassName={fitClassName[fitType]}
/>
```

---

## Bottom Margin/Padding Summary

### Where margin-bottom/padding-bottom is set:

| Location | Property | Value | Purpose |
|----------|----------|-------|---------|
| read.css line 296-297 | `.number-nav` margin & padding | `2rem 0` + `3rem` bottom | Navigation buttons area spacing |
| read.css line 351 | `.number-nav.abs.show` height | `var(--number-nav-height)` | Absolute positioned nav height |
| LongStripImage.tsx line 37 | Image wrapper style | `marginBottom: '30px'` | Space between long-strip images |
| app.css (various) | Bootstrap utilities | Various | Global base styles |

### Key findings:
1. **Navigation element** (`.number-nav`) has **3rem padding-bottom** (60px at 1rem=20px)
2. **Long-strip images** have **30px margin-bottom** between them
3. **No excessive padding on main container** - `#page-wrapper` has no padding or margin-bottom
4. **CSS variable system** uses `--header-padding` and `--number-nav-height` for responsive sizing

---

## File Paths (Absolute)

```
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/assets/styles/read.css
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/assets/styles/app.css
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/index.css
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/components/layouts/ReadLayout.tsx
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/read/Read.tsx
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/read/components/Image.tsx
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/read/components/PageType/LongStripImage.tsx
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/read/components/PageType/Single.tsx
/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/read/components/PageType/DoubleImage.tsx
```

---

## Unresolved Questions

1. **Is there a specific issue with bottom spacing?** - The current setup appears intentional with `.number-nav` having 3rem padding-bottom for navigation buttons
2. **Mobile responsive behavior** - Need clarification if there's an issue with mobile rendering of bottom navigation
