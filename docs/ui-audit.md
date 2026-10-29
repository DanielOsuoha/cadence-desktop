# UI audit and improvements

## Changes

- Reflowing desktop/sidebar and phone navigation, stacked fields on narrow windows,
  readable vocabulary card, consistent controls, and system-font fallbacks without
  external font requests.
- Higher text/hover contrast, visible keyboard focus, a skip link, linked validation
  messages, active navigation state, larger playback targets and reduced-motion support.
- Working connection settings/recheck controls, vocabulary loading and retry states,
  request-specific button labels, and clear local/cloud boundaries.
- Real session-only check counts replace invented streaks, percentages and history.
- Recording countdown, visible capture/analysis states, grouped delivery metrics,
  and navigation protection while recording or analyzing.
- Rotating pronunciation sets with local US voice selection and playback failures
  surfaced to the user; speaking topics and a scratchpad retained across tab changes.

## Verification

- Production TypeScript/Vite build and `git diff --check` pass.
- Browser checks at 320, 390, 768, 980, 1180 and 1440 pixels found no horizontal
  page overflow in Writing, Speaking or Pronunciation.
- axe WCAG 2 A/AA + 2.1 AA checks report zero violations across the three practice
  screens at 1180 and 390 pixels. This is automated coverage, not a full accessibility
  conformance claim or screen-reader audit.
- Checked settings keyboard focus, topic/set changes, scratchpad retention,
  structural validation, offline retry, a ticking recording countdown, protected
  navigation and session count updates. No browser JavaScript errors occurred.
- Recording used Chrome's synthetic microphone and a stubbed analysis response;
  backend inference was not changed or revalidated by this UI pass. Native WKWebView
  permissions and VoiceOver still need manual checks on the packaged desktop app.
