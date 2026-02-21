# 🧪 Known Issues: Testing Lexical with Playwright

A curated list of research sources documenting integration issues when testing [Lexical](https://lexical.dev/) (Meta's text editor framework) using [Playwright](https://playwright.dev/).

---

## 🔹 Common Issues & References

### 1. `locator.fill()` fails due to missing `role="textbox"`
- **Problem**: Lexical briefly renders in a read-only state without `contenteditable` or the correct ARIA role, causing Playwright to reject `fill()` calls.
- **Workaround**: Wait for editor to mount or use `keyboard.type()` instead.
- **Source**: [GitHub Issue #7500](https://github.com/facebook/lexical/issues/7500)

---

### 2. Text not updating correctly in Safari / WebKit
- **Problem**: In some versions, text entered in WebKit-based browsers (via Playwright or manually) doesn't update the DOM properly.
- **Cause**: DOM-to-internal-node sync issues in Lexical.
- **Fix**: Upgrade Lexical to ≥ 0.7.0.
- **Source**: [GitHub Issue #3460](https://github.com/facebook/lexical/issues/3460)

---

### 3. Keyboard input fails when placeholder is only content
- **Problem**: Simulated typing fails when the editor only contains a `<br>` or placeholder element.
- **Workaround**: Inject starter content using `editor.update()` before typing.
- **Source**: [GitHub Issue #4595](https://github.com/facebook/lexical/issues/4595)

---

### 4. Official Lexical Testing Guide
- **Covers**:
  - Unit and end-to-end testing best practices
  - Browser-specific quirks
  - Setup examples for Playwright
- **Source**: [Lexical Testing Docs](https://lexical.dev/docs/testing)

---

### 5. Community Discussion on Playwright Integration
- **Topic**: Strategies, timing bugs, and alternatives to `fill()`
- **Participants**: Lexical maintainers and external devs
- **Source**: [GitHub Discussion #2659](https://github.com/facebook/lexical/discussions/2659)

---

### 6. `fill()` inconsistency due to dynamic mounting
- **Problem**: Race condition between Playwright actions and Lexical's delayed editable state.
- **Source**: [GitHub Issue #7871](https://github.com/facebook/lexical/issues/7871)

---

## ✅ Summary of Workarounds

| Issue                                  | Suggested Fix |
|----------------------------------------|---------------|
| `fill()` fails due to role issues      | Wait for `role=textbox` or use `keyboard.type()` |
| Safari/WebKit sync bugs                | Upgrade to Lexical ≥ 0.7 |
| Typing fails on placeholder editors    | Inject initial content with `editor.update()` |
| General flaky timing                   | Use Playwright's `waitFor()` or retries |

---

## 📎 Related Tools

- [Playwright Docs](https://playwright.dev/)
- [Lexical Docs](https://lexical.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
