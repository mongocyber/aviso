# Issue 007: V1 Core UI Manual QA Checklist

Status: internal QA checklist. Not a public release gate.

Date: 2026-06-07

2026-06-05 scope update: v1.0 basic launch is BYOK direct-provider only. Login, subscription, payment, anonymous quota, hosted Aviso AI, provider proxy, remote link-body fetching, and web search are not part of this QA checklist. Screenshot ordinary-user entry is paused; screenshot QA should move behind a hide/remove/internal-only decision instead of blocking the basic UI QA path.

2026-06-07 focused QA update: Popup settings / AI 服务 card polish passed loaded-extension focused QA, but this is not release approval for the whole v1 Popup surface. Command Palette, double-click, native context menu, history/conversation restore, and custom template sync still keep their own pending/retest status below.

## Scope

This file records the current manual QA state for the V1 core UI slices that were recently merged into the main project workspace but not yet committed:

- V1-004 Command Palette search panel
- V1 Popup settings panel draft update
- V1-005 Screenshot local action toolbar, now paused for ordinary-user entry decision
- V1-006 Inline selection translation routing plan
- V1-007 Double-click dropdown shortcut
- V1-011 Result panel title cleanup, conversation autosave, and follow-up input polish
- V1-012 Custom template context-menu sync

Non-scope:

- No hosted Aviso AI implementation.
- No anonymous quota implementation.
- No login, subscription, pricing, payment, or checkout implementation.
- No Chrome Web Store submission or public release claim.
- No real provider API validation in this checklist.

## Current User Feedback

| Area | User feedback | Current status |
|---|---|---|
| Screenshot toolbar buttons | After selecting a screenshot region, clicking Copy image or Download image made the screen flash, but there was no success feedback or clear result. | Failed in loaded-extension QA; fixed in this thread and pending reload/retest. |
| Screenshot copy exit | After Copy image succeeds, screenshot mode should exit so the user can paste elsewhere. Current loaded-extension QA stayed in screenshot mode. | Fixed in this thread and pending reload/retest. |
| Screenshot double-click gestures | Double-click inside the selected region should copy image; double-click outside the selected region should exit screenshot mode. | Fixed in this thread and pending reload/retest. |
| Screenshot file-page permission | Copy image on the local `file://` QA page showed Chrome's raw `activeTab` / `<all_urls>` permission error. | Error copy normalized. If testing on `file://`, user may need to enable Chrome extension setting `Allow access to file URLs` and trigger screenshot from extension/right-click entry. No permission expansion. |
| Screenshot activeTab entry model | Normal webpages still failed when screenshot was started from an in-page quick menu. This is Chrome MV3 `activeTab` behavior: content-script UI clicks do not grant screenshot permission. | v1.0 basic-launch ordinary-user UI now hides those page-internal screenshot quick entries. Authorized extension entries, especially the context-menu screenshot path, remain the internal-only screenshot route. |
| Screenshot overlay double-click propagation | Double-click outside the selected screenshot region exited screenshot mode but also opened the double-click shortcut menu. | Fixed in this thread and pending reload/retest. |
| Screenshot toolbar placement | Toolbar should sit near the bottom center of the selected region and remain clamped inside the viewport. | Fixed in this thread and pending reload/retest. |
| Screenshot toolbar visuals | Buttons should be icon-leading, visually low-border, equal weight, vertically centered in the dark toolbar container, and the dark container should not be too tall. Copy should not have primary emphasis. | Fixed in this thread and pending reload/retest. |
| Selection translation expectation | User expected selected text to translate automatically. | Fixed in V1-006 P0. Inline instant translation is default-off; when enabled, short normal selections show an inline card. Existing toolbar click `翻译` flow remains available. |
| Result panel title | User wanted the header to show only `Aviso`, not `Aviso 结果面板`. | Fixed in V1-011; action pill such as `翻译文本` remains visible. |
| Conversation autosave | User reported unsaved results / conversations appear to be overwritten by a new result, and later clarified the expected model is automatic conversation saving. | Fixed in V1-011 with local-only `chrome.storage.local/contextai_history` conversation autosave, limited to the most recent 20 conversations. |
| Same-panel toolbar action overwrite | User reproduced that doing another toolbar `翻译` while the result panel was still open overwrote the prior conversation. | Fixed in V1-011 by appending new AI actions to the visible panel's active conversation until the panel is closed. |
| Save loses multiple rounds | User found that a two-round panel conversation became only one Q/A after clicking Save. | Fixed in V1-011 by saving/restoring the full `messages` array for the conversation. |
| New result appears pre-saved | User reported that opening a fresh result panel could immediately look like it was already saved. | Fixed in V1-011 P1. New panel conversations no longer render as saved unless the restored history entry was already pinned/saved. |
| Follow-up input height | User wanted the bottom follow-up input to support more than one fixed-height line. | Fixed in V1-011 with auto-growing multiline input, Enter to send, Shift+Enter for newline, and internal scroll after the max height. |
| Custom template context menu sync | Custom templates saved in Popup did not reliably appear in the native Chrome right-click menu until the menu was rebuilt. | Fixed in V1-012 by detecting `contextai_settings.templates` changes and serially rebuilding context menus; pending reload/retest. |
| Double-click and selection-toolbar overlap | User reported double-click actions could flash the selection toolbar or leave both surfaces visible together. | Fixed in V1-007 P1 by suppressing the selection toolbar earlier and using cached settings/template state; pending reload/retest. |
| Global theme sync | Popup theme switching changed Popup only, while command palette and page-level panels stayed dark. | Fixed in code; pending loaded-extension focused manual QA across Popup, command palette, result panel, toolbar, double-click menu, and screenshot overlay. |
| Post-reload non-selection triggers | After refreshing the extension, user reported that selection/toolbar still worked but other actions did not appear to trigger. | Hotfixed by ensuring context menus are registered on service-worker startup and adding model-menu sync error logging; pending reload/retest. |
| Context menu selection title length | User reported native Chrome right-click selection submenu titles showed long selected text instead of staying near the intended 20-character preview. | Fixed in code by replacing `%s` selection titles with static short labels; pending reload/retest. |
| Popup language mini dropdown clipping | User reported the inline translation language dropdown was only partially visible and could be clipped by the settings card. | Passed focused QA. Dropdown now chooses down/up based on available space and opening it prevents `settingList overflow: hidden` from clipping the menu. |
| Popup AI service card status placement | User reported title-row states like `默认` mixed with second-line status pills. | Passed focused QA. Title row only keeps icon/name/actions; all service states render as second-line pills. |
| Popup AI service input focus | User reported the browser focus appeared on the inner input/password box instead of the whole rounded field. | Passed focused QA. Focus is now shown on the outer icon+field container; inner inputs do not show independent focus chrome. |
| Popup AI service title/action alignment | User reported service card title and right-side buttons were vertically misaligned. | Passed focused QA. Title icon/text and action buttons are vertically centered in add/edit/view states. |
| Popup AI service saved delete confirmation | User wanted saved configs to require confirmation before deletion. | Passed focused QA. First click shows only `确定删除` / `取消`; cancel restores normal actions; confirm performs deletion. Unsaved drafts can still be removed directly. Final delete was not clicked during QA. |
| Translation card / result panel send wording | User wanted the result-panel handoff copy unified. | Passed focused QA. Relevant inline translation card / result panel button copy uses `发给 AI`. |
| Command palette auxiliary copy placement | User wanted bottom helper copy moved away from the footer area. | Fixed in code and covered by focused review; broader Command Palette visual QA remains pending. |

## Expected Behavior By Slice

### V1-004 Command Palette Search Panel

Expected:

- Command palette opens as a search-first control panel, not a grid of action cards.
- The input placeholder reads like `搜索浏览历史、书签、AI 对话...`.
- Browser history, bookmarks, and saved AI conversation records remain searchable.
- Selected page text is shown only as a grey suggestion; it is not automatically used as the real query. Pressing Tab may fill it into the input.
- Compact AI status shows only `AI 可用 · {provider}` or `AI 未连接`; it should not show long model names, BYOK jargon, quota, login, or subscription states.
- If no result is selected and the user presses Enter with AI connected, the existing command-palette AI path may run. If AI is not connected, the panel must show a clear connection hint instead of implying a model call will happen.
- Command palette and double-click shortcut menu must not expose screenshot as an ordinary-user v1.0 basic action.

Status: code updated; pending loaded-extension focused manual QA.

### V1 Popup Settings Panel Draft Update

Expected:

- Popup tabs are `设置`、`AI 服务`、`记录`、`指令`.
- Header shows Aviso brand, global `浅色` / `深色` / `跟随系统` theme switcher, and version number.
- Theme switching persists to non-secret `chrome.storage.sync/contextai_settings.appearanceTheme`, defaults to `system`, and now drives all Aviso UI surfaces: Popup, command palette, result panel, selection toolbar, inline translation card, double-click menu, and screenshot overlay / toolbar.
- The first `设置` screen shows a high-fidelity current model card with `当前模型`, status badge, manual test control, model dropdown, configured-service options, and `添加 AI 服务`.
- Common entry switches are compact rows with icon, two-line title/helper copy, and right-side controls: `划词工具栏`, `划词翻译`, `命令面板`, `剪贴板提示`, `双击入口`.
- `划词工具栏` and `划词翻译` are mutually exclusive. Turning one on turns the other off; if old settings had both enabled, Popup should render and save back only one enabled state.
- Inline translation keeps its language selector on the same row and the selector must show the existing target-language options.
- `本地可用` shows compact cards for `复制上下文`, `搜索记录`, and `恢复对话`.
- Footer shows autosave state and `隐私说明`.
- User-facing copy avoids `BYOK` jargon and does not present Aviso AI, login, quota, subscription, payment, or hosted-AI entry points as available features.
- The `AI 服务` tab shows `配置和连通测试`, `服务配置`, an `添加` dropdown with `豆包 / 火山引擎`, `OpenAI`, and `Anthropic`, provider configuration instance cards, status pills, test/save/cancel/delete/default controls, config status, test status, and privacy boundary card.
- The default model dropdown should show configured service instances, not only provider names, plus an `添加 AI 服务` entry; unconfigured providers must not look available.
- The `记录` tab shows `最近对话会自动保存`, clear-all, row title, summary, time, restore-on-click, and delete.
- The `指令` tab uses 常用指令 wording, instruction cards with title/summary/edit/delete, and `添加常用指令`, while preserving the existing template data model.

Status: latest Popup focused settings polish passed loaded-extension focused QA for language dropdown clipping, AI service status pills, input focus, title/action alignment, saved-delete confirmation, and `发给 AI` copy. Broader Popup/Command/History/Context-menu regression remains pending where listed in the QA Matrix.

### V1-005 Screenshot Local Action Toolbar

Current product truth:

- Screenshot code exists, but the ordinary-user entry is paused for the v1.0 basic launch.
- Do not treat screenshot as a public store selling point or required basic-version QA item until the owner decides hidden / removed / internal-only.
- If kept internal-only, use this checklist only as internal dogfood QA.

Expected:

- After selecting a visible screenshot region, the toolbar appears near the bottom center of the selected region.
- If there is not enough room below the selection, the toolbar stays bottom-centered inside the selected region when possible; otherwise it is clamped upward inside the viewport.
- Screenshot toolbar buttons are icon-leading, visually borderless / low-border, and have equal visual weight. Copy image is not primary.
- The button row is vertically centered inside the dark toolbar container. The dark toolbar container stays compact when no error message is shown.
- If an error message appears inside the toolbar, it should stay compact, wrap within a controlled max width, and not stretch the toolbar across the screen. The button row should remain visually centered.
- Copy image shows `复制中...` on the Copy button. On success, it copies the selected image and exits screenshot mode without briefly flashing the selected-region border back onto the page. On failure, it keeps the selection and shows a readable error near the selection.
- Download image shows `保存中...` on the Download button and then shows a readable success or error near the selection.
- Retry clears the current selection and lets the user drag a new screenshot region.
- Cancel closes the overlay without capturing, calling a provider, or saving anything.
- Send to AI shows `发送中...` on the Send button and continues to use the existing BYOK `image_explain` path and unsupported-model guard.
- Double-click inside the selected region triggers the same copy-image flow as Copy image.
- Double-click outside the selected region exits screenshot mode without capturing, copying, calling a provider, writing storage/history, or opening the double-click shortcut menu.
- On local `file://` QA pages, screenshot capture may require enabling `Allow access to file URLs` in Chrome extension details and starting screenshot from the extension/right-click entry. This must be handled as an environment permission note, not by adding `<all_urls>` or `downloads` permission.
- Command palette quick actions and the double-click shortcut menu should not show screenshot as an ordinary-user action in the v1.0 basic launch path.
- Authorized screenshot entry for this thread: right-click menu `截图提问（内部试用）` / context-menu screenshot path. Extension action or browser command entry may be used only when it grants the current tab `activeTab` permission.

Local-only boundaries:

- Copy image and Download image do not call any provider.
- Copy image and Download image do not consume quota.
- Copy image and Download image do not require login.
- Download image does not use `chrome.downloads` and does not require a new `downloads` permission.
- Screenshot/base64 data is not written to history, `chrome.storage`, docs, console, telemetry, cache, or release artifacts.
- Clipboard image write can still fail if Chrome rejects asynchronous image clipboard writes; the expected fallback is a readable error telling the user to use Download image.

Status: fixed in code, but ordinary-user QA is paused pending screenshot entry decision.

### V1-006 Inline Selection Translation

Current product truth:

- `docs/issues/006-v1-inline-translation-routing-plan.md` has moved from docs-only plan to P0 implementation record.
- V1-006 inline automatic/instant translation card is implemented in the current workspace and passed loaded-extension user QA.
- Owner decision on 2026-06-04 is satisfied for P0: V1-006 has a user-facing enable/disable switch and a target-language option.
- Existing V2-007 paths remain available: right-click, selection toolbar click, and command-palette translation still use the existing translation flow.
- Inline translation remains default-off and does not replace full-page translation, third-party fallback, or editable-text replacement.

Manual QA should verify:

- Default-off switch and target-language options are visible in Popup.
- Short normal selections can show the inline translation card after the switch is enabled.
- Copy, retry, and open result panel actions work from the inline card.
- Long or multiline selections avoid crowded inline output and offer result-panel routing.
- The translation request does not include page URL, link URL, page body, screenshot, clipboard content, prior context, or full DOM as translation input.

Status: inline automatic/instant translation P0 passed user QA on 2026-06-04.

### V1-007 Double-Click Dropdown Shortcut

Expected:

- The setting is default-off.
- When enabled, double-clicking safe page text shows a compact dropdown menu.
- The menu does not open in password fields, inputs, textareas, contenteditable regions, common code editors, or Aviso's own UI.
- Menu actions reuse existing paths for copy current context, page summary, custom templates, and selected-text AI actions. Screenshot is no longer exposed here in the ordinary-user v1.0 basic path.
- Opening the menu alone does not call a provider.
- When the double-click menu is triggered, the selection toolbar is suppressed early enough that the two surfaces do not flash or coexist.

Status: code fix completed; pending loaded-extension focused manual QA.

### V1-011 Result Panel Title, Conversation Autosave, And Input

Expected:

- Result panel header shows `Aviso` plus the existing action pill, not `Aviso 结果面板`.
- Result-panel AI output is automatically saved as a local conversation in `chrome.storage.local/contextai_history`.
- Only the most recent 20 conversations are retained; creating the 21st removes the oldest conversation.
- One result-panel lifecycle equals one conversation record.
- Initial prompt/result starts the conversation; follow-ups in the same panel append to the same conversation `messages`.
- While the result panel is visible, any new AI action that reuses the panel, including selection-toolbar explain/translate/polish/summarize/send-to-AI, double-click selection actions, and command-panel asks, appends a new user turn plus assistant turn to the current conversation instead of resetting messages.
- Closing the panel ends that conversation; the next AI invocation creates a new conversation even on the same page or selection.
- Clicking the existing Save button saves/marks the full conversation, not only the last Q/A pair.
- Popup History restores full multi-turn messages.
- Freshly opened result-panel conversations do not show the saved state unless they came from an already pinned/saved history entry.
- Screenshot/base64 data and raw provider responses are not retained in conversation history.
- The bottom follow-up input is multiline and auto-growing; Enter sends, Shift+Enter inserts a newline; after the max height, the input scrolls internally and the send button remains fixed on the right.

Status: code fix completed; pending loaded-extension focused manual QA.

### V1-012 Custom Template Context-Menu Sync

Expected:

- Adding a custom template in Popup updates the native Chrome right-click menu without reloading the extension.
- Editing a custom template updates the visible native right-click menu title without reloading the extension.
- Deleting the last custom template removes the custom template submenu instead of leaving an empty submenu.
- Default model changes still only update the model radio menu selection and do not force an unnecessary template refresh.
- Menu rebuilds are serialized so simultaneous Popup messages and storage-change notifications do not interleave `removeAll` and `create` operations.

Local-only boundaries:

- Custom template settings remain non-secret `chrome.storage.sync/contextai_settings` data.
- API Keys remain encrypted in `chrome.storage.local/contextai_api_keys`.
- No new permission, dependency, provider, backend, hosted AI, telemetry, auth, quota, subscription, payment, or provider API validation is introduced.

Status: fixed in code; pending loaded-extension manual retest.

## QA Matrix

| Item | Status | Notes |
|---|---|---|
| Screenshot Copy image | Paused | Verify only if screenshot is kept internal-only or returned to public scope. |
| Screenshot Download image | Paused | Verify only if screenshot is kept internal-only or returned to public scope. |
| Screenshot Retry | Paused | Verify only if screenshot is kept internal-only or returned to public scope. |
| Screenshot Cancel | Paused | Verify only if screenshot is kept internal-only or returned to public scope. |
| Screenshot Send to AI | Paused | Verify only if screenshot is kept internal-only or returned to public scope; not a public store claim. |
| Screenshot double-click inside selection | Fixed, pending retest | Verify it triggers Copy image, exits screenshot mode on success, and keeps the selection with an error on failure. |
| Screenshot double-click outside selection | Fixed, pending retest | Verify it exits screenshot mode without capture/copy/provider/storage/history writes and without opening the double-click shortcut menu. |
| Screenshot file-page permission guidance | Fixed, pending retest | On `file://` QA pages, verify permission errors are Chinese actionable guidance about file URL access and extension/right-click trigger, not raw Chrome English. |
| Screenshot page-internal quick entry | Fixed | Verify command palette quick actions and double-click shortcut menu no longer expose screenshot in the ordinary-user v1.0 basic path. |
| Screenshot authorized entry | Pending retest | Verify right-click menu `截图提问（内部试用）` starts screenshot selection and can capture with activeTab grant. |
| Screenshot toolbar placement | Fixed, pending retest | Verify bottom-centered placement near the selected region bottom edge; when below space is tight, it should stay near the selection bottom, not drift to the middle. |
| Screenshot toolbar visuals | Fixed, pending retest | Verify icon-leading, borderless / low-border buttons with equal visual weight; Copy image is not primary; the button row is vertically centered and the dark container is not too tall. Error state should be compact and should not span the screen. |
| Selection toolbar translate click | Pending retest | Existing click `翻译` flow should still work. When V1-006 is enabled, short normal selections may also show the inline translation card. |
| V1-006 inline automatic translation | Passed | User verified the loaded extension after V1-006 P0 implementation. |
| V1-006 setting and target language | Passed | User verified the loaded extension after V1-006 P0 implementation. |
| Default model dropdown config state | Passed | User verified the dropdown shows status and unconfigured options are disabled. Configured but untested models still show `未测试` and remain selectable. |
| Command palette search panel | Fixed, pending retest | Verify it is a search-first panel, no quick action cards, no mock access states, no screenshot ordinary-user entry, and selected text fills only after Tab. |
| Popup settings panel draft update | Fixed, pending retest | Verify tabs, AI service status, default model availability, compact translation target selector, records wording, and 常用指令 wording. |
| Popup high-fidelity settings tab | Fixed, pending retest | Verify header, theme switcher, current model card, configured-service dropdown, common feature rows, inline language selector, local-available cards, autosave footer, privacy link, and increased height reducing scroll pressure. Common feature titles and helper text must be two lines and must not collide with right-side controls. |
| Popup language mini dropdown clipping | Passed | Focused QA passed: menu is not clipped by the settings list and can open down/up based on available space. |
| Popup common feature mutual exclusion | Fixed, pending retest | Verify `划词工具栏` and `划词翻译` cannot both be on. Turning `划词翻译` on turns `划词工具栏` off; turning `划词工具栏` on turns `划词翻译` off. Language selector remains on the `划词翻译` row. |
| Popup high-fidelity AI service tab | Fixed, pending retest | Verify intro card, service configuration toolbar, add-provider dropdown creates a new provider config instance, model dropdown `添加 AI 服务` opens AI service editing, config cards default to collapsed view, masked Key display, test/save/cancel/delete/default feedback, config/test status, and privacy boundary. |
| Popup scroll container | Fixed third pass, pending retest | Verify Popup itself does not show an outer panel scrollbar after switching to runtime adaptive height from `window.innerHeight` with a 580px safe max. Header and tabs stay fixed; only the tab content area scrolls on `AI 服务`, `记录`, and `指令`. |
| Popup AI service card states | Fixed, pending retest | Verify provider cards have clear view / edit / add states: view is collapsed, edit/add expands inputs, save exits to view, cancel restores saved values, delete returns to unconfigured view, and masked Keys are never saved back over real Keys. |
| Popup AI service multiple configs | Fixed, pending retest | Verify multiple configs can be added for the same provider, such as two 豆包 / 火山方舟 configs with different names and endpoints, and that the current model dropdown can choose the intended default config. |
| Popup AI service status pill placement | Passed | Focused QA passed: title row no longer mixes `默认` / add/edit state copy; second-line pill area carries the service status labels. |
| Popup AI service input focus | Passed | Focused QA passed: config name, API Key, and model/endpoint fields show focus on the outer rounded container, not an inner browser input frame. |
| Popup AI service title/action alignment | Passed | Focused QA passed: title icon/text and right-side buttons are vertically centered in add/edit/view states. |
| Popup AI service delete confirmation | Passed | Focused QA passed: saved config delete first enters `确定删除` / `取消`; cancel restores normal actions. Final confirm-delete was intentionally not clicked in QA; unsaved draft deletion remains direct. |
| Popup AI service delete semantics | Fixed, partial focused QA passed | Unsaved draft deletion and saved delete confirmation UI passed. Real final-delete effects, including clearing encrypted key/metadata and default fallback, still need a safe dedicated retest if the owner wants destructive QA. |
| Popup inline translation language labels | Fixed, pending retest | Verify `划词翻译` language labels show target-language names: `自动`, `中文`, `English`, `日本語`, `한국어`, `Español`, `Français`, `Deutsch`. |
| Translation card / result panel `发给 AI` copy | Passed | Focused QA passed: relevant handoff button copy is unified as `发给 AI`. |
| Command palette auxiliary copy placement | Fixed, pending broader retest | Helper copy moved to the input-area right-side auxiliary text. Broader command palette behavior and visual polish remain pending/backlog. |
| Global theme setting boundary | Fixed, pending retest | Verify `浅色` / `深色` / `跟随系统` persists without creating a new storage key and changes only Aviso-owned surfaces: Popup, command palette, result panel, selection toolbar, inline translation card, double-click menu, and screenshot overlay / toolbar. Host webpage `body/html` should not be restyled. In light mode, hover, dropdown, pill, footer, privacy, input, scrollbar, disabled, warning, danger, panel, button, and border states should not retain dark-theme colors. |
| Popup AI service missing-field feedback | Fixed, pending retest | Click `测试连接` with missing Key or missing豆包接入点 and verify it shows a readable not-started summary instead of silently doing nothing or running a provider call. |
| Popup local available cards | Fixed, pending retest | Verify `复制上下文` copies current page context on normal pages or shows a readable restricted-page hint, `搜索记录` opens the command palette, and `恢复对话` opens the records tab with restore guidance. |
| Command palette visual polish | Backlog | User reported the panel needs later visual adjustment for information density, contrast, and hierarchy. Do not handle in this V1-005A screenshot thread. |
| Double-click dropdown shortcut | Fixed, pending retest | Confirm default-off setting, safe target exclusions, early suppression of the selection toolbar, and no duplicate surfaces when the double-click menu appears. |
| Result panel title | Fixed, pending retest | Verify the title reads `Aviso` and the action pill remains visible. |
| Fresh result saved-state badge | Fixed, pending retest | Open a brand-new result panel and verify it does not immediately show as saved; then restore a previously pinned/saved history entry and verify that one still shows saved. |
| Conversation autosave restore | Fixed, pending retest | Create a result, do not click Save, start another result, then open Popup History and restore the earlier conversation. |
| Multi-turn Save retention | Fixed, pending retest | Add at least one follow-up, click Save, restore from history, and verify all rounds are visible. |
| Same-panel toolbar action append | Fixed, pending retest | Keep a result panel open, use the selection toolbar `翻译` on new text, then verify prior messages remain and the translation is appended. |
| Conversation max count | Fixed, automated coverage | Unit tests cover most-recent-20 trimming; loaded-extension QA can spot-check if needed. |
| New panel creates new conversation | Fixed, pending retest | Close the panel, invoke AI again from the same page/selection, and verify it appears as a separate history conversation. |
| Follow-up multiline input | Fixed, pending retest | Verify Enter sends, Shift+Enter creates a newline, longer text grows the input, and very long text scrolls inside the input without pushing the send button offscreen. |
| Custom template add sync | Fixed, pending retest | Add a template in Popup and verify it appears in the native right-click menu without reloading the extension. |
| Custom template edit sync | Fixed, pending retest | Rename a template in Popup and verify the native right-click menu title updates without reloading the extension. |
| Custom template delete sync | Fixed, pending retest | Delete the last template and verify the custom template submenu disappears. |
| Post-reload trigger recovery | Hotfixed, pending retest | Reload `build/chrome-mv3-prod`, refresh the test page, then verify right-click, command palette, double-click menu, and Popup template sync all trigger. |

## Visual Polish Backlog

- Command Palette panel: user reported visual/style issues in the browser screenshot, especially information density, contrast, and hierarchy. This is recorded for a follow-up visual polish thread only. Current V1-005A thread must not change Command Palette layout or styles.

## Reloaded Extension Retest Steps

1. Run the extension build and load `build/chrome-mv3-prod` in Chrome.
2. Open a normal test webpage, not a private or sensitive page.
3. Skip screenshot steps unless the owner has decided to keep screenshot internal-only or public. If skipped, start with selection toolbar / translation / command palette / result panel / templates.
4. Select a medium region near the center and verify toolbar placement.
5. Click Copy image and verify screenshot mode exits after success; paste the image elsewhere.
6. If Copy image fails on the local `file://` QA page, verify the selection remains and the error is readable Chinese guidance about enabling file URL access / retriggering from extension or right-click entry.
7. Select again and double-click inside the selected region; verify it copies and exits on success.
8. Select again and double-click outside the selected region; verify it exits without copying, capturing, or opening the double-click shortcut menu.
9. Click Download image and verify browser-native PNG download behavior.
10. Click Retry and verify a new region can be selected.
11. Click Cancel and verify the overlay closes.
12. Select a region again, click Send to AI, and verify existing BYOK or unsupported-model behavior is shown.
13. Select normal text, verify the selection toolbar appears, then click `翻译`.
14. Enable the double-click shortcut setting and double-click safe page text; verify the double-click menu appears and the selection toolbar is suppressed early enough that it does not flash or appear at the same time.
15. Double-click unsafe targets such as input, password, textarea, code editor, contenteditable, and Aviso UI; verify the double-click menu does not appear and normal selection behavior is not incorrectly suppressed.
16. Close the double-click menu, then do a normal drag selection; verify the selection toolbar can appear again.
17. Open command palette and verify the default view is a search input, compact AI status, optional selected-text Tab suggestion, and result list only; it should not show quick action cards, mock access states, quota, login, or subscription preview chips.
18. Open the command palette and double-click shortcut menu, then verify neither surface exposes screenshot in the ordinary-user v1.0 basic path.
19. From the right-click menu `截图提问（内部试用）`, verify screenshot overlay still starts as the authorized internal capture path.
20. Trigger a result-panel AI action and verify the title reads `Aviso` with the action pill still present.
21. On that fresh result panel, verify it does not immediately appear as `已保存` unless it was restored from an already saved/pinned history entry.
22. Without clicking Save, trigger a second result; open Popup History and verify the first conversation appears as a normal conversation entry.
23. Open the first conversation entry and verify the full conversation is restored in the result panel.
24. Add a follow-up to a result, click Save, restore the conversation from history, and verify the initial exchange plus follow-up exchange are all preserved.
25. Keep that result panel open, select another piece of text, click the selection toolbar `翻译`, and verify the previous content remains while the new translation appears as a later turn in the same panel and same history conversation.
26. Close the panel, invoke AI again from the same page/selection, then verify this creates a separate conversation entry.
27. In the follow-up input, type multiple lines; verify Enter sends, Shift+Enter adds a newline, the input auto-grows, and very long content scrolls inside the input without pushing the send button offscreen.
28. In Popup, add a custom template with `{{selection}}`, save it, then select text and right-click without reloading the extension; verify the template appears under `自定义模板 ▸`.
29. Rename that template in Popup, save it, then select text and right-click again; verify the native menu title updates immediately.
30. Delete the template in Popup, save it, then select text and right-click again; verify the template item is gone and no empty custom-template submenu remains.
31. Open Popup and verify the tabs read `设置`、`AI 服务`、`记录`、`指令`.
32. In the Popup header, switch `浅色`, `深色`, and `跟随系统`; verify Popup, command palette, result panel, selection toolbar, inline translation card, double-click menu, and screenshot overlay / toolbar all follow the selected theme while the host webpage itself does not change, and reopening Popup keeps the selected mode.
33. On `设置`, verify the `当前模型` card, status badge, test button, model dropdown, configured-service options, and `添加 AI 服务` entry.
34. On `设置`, verify unconfigured providers do not look available in the model dropdown.
35. On `设置`, verify `划词工具栏`, `划词翻译`, `命令面板`, `剪贴板提示`, and `双击入口` are compact rows with title above helper text and right-side controls.
36. Turn `划词翻译` on and verify `划词工具栏` turns off; then turn `划词工具栏` on and verify `划词翻译` turns off.
37. On `设置`, verify the inline translation language selector is on the `划词翻译` row and includes the existing target-language options.
38. On `设置`, verify `复制上下文`, `搜索记录`, and `恢复对话` local cards are visible and do not imply an AI provider call.
39. On `AI 服务`, verify the `配置和连通测试` card, `服务配置` title, and `添加` dropdown with `豆包 / 火山引擎`, `OpenAI`, and `Anthropic`.
40. On `AI 服务`, verify configured service cards default to collapsed view with title, provider/model summary, status pill, config status, test status, and `测试连接` / `设为默认` / `编辑配置` / `删除配置` controls; inputs should not be visible in view mode.
41. On `AI 服务`, add two configs for the same provider and verify they appear as separate cards with separate names and model/endpoint values.
42. On `AI 服务`, verify deleting an unsaved draft removes the draft card without leaving an empty input block.
43. On `AI 服务`, verify deleting a saved config removes that card, clears its encrypted key and non-secret metadata, and if it was default the next available config becomes default.
44. On `AI 服务`, verify deleting the last config leaves an empty/disconnected state and the add dropdown can create a new config again.
45. Use `添加` to choose `豆包 / 火山引擎`, `OpenAI`, and `Anthropic`; verify each choice creates a separate add-state config card with `新增中` / `未保存`, dashed/emphasized border, API Key and model/endpoint inputs, and test/save/cancel/delete-draft controls.
46. In edit/add state, verify `保存配置` saves and collapses back to view, `取消编辑` restores the saved values or removes an unsaved draft, and `删除配置` removes the target config.
47. Verify `测试连接` with missing Key or missing豆包接入点 shows a readable not-started summary and does not silently do nothing or run a provider call.
48. On `AI 服务`, verify no full real API Key is displayed after reload and no login, quota, subscription, payment, or hosted AI entry appears.
49. On `AI 服务`, verify the privacy boundary card states the no-project-server direct-provider model.
50. On `AI 服务`, `记录`, and `指令`, verify the Popup outer panel has no scrollbar; only the content area below the fixed header and tabs scrolls.
51. On `划词翻译`, verify the language select and row helper use `自动`, `中文`, `English`, `日本語`, `한국어`, `Español`, `Français`, `Deutsch` without changing stored setting values.
50. On `记录`, verify `最近对话会自动保存`, clear-all, row title, summary, time, restore-on-click, and delete.
51. On `指令`, verify custom template management is presented as 常用指令 cards with title/summary/edit/delete, and `添加常用指令` still uses the existing template behavior.

## Pass Criteria For This Checklist

- The screenshot toolbar no longer flashes without readable feedback.
- Copy, Download, Retry, Cancel, and Send to AI each produce a visible result or readable error.
- Copy success exits screenshot mode; Copy failure keeps the selected region and shows a readable error.
- If `file://` permission blocks screenshot capture, the user sees Chinese actionable guidance instead of raw Chrome permission text.
- Command palette and double-click shortcut menu do not expose screenshot in the ordinary-user v1.0 basic path.
- Command palette does not show quick action cards, mock access states, quota/login/subscription states, or `UI-only` development labels.
- Command palette keeps selected text as a suggestion until Tab fills it into the input.
- Popup does not show BYOK jargon or hosted AI / login / quota / subscription / payment entry points.
- Popup high-fidelity settings panel visibly matches the draft structure across `设置`, `AI 服务`, `记录`, and `指令`, not only the tab labels.
- Popup header and tabs remain fixed, with no outer panel scrollbar; long tab bodies scroll only inside the content area.
- AI Service provider cards have distinct collapsed view, edit, and add states, with save/cancel/delete/test behavior visible and functional.
- AI Service card status text belongs in the second-line pill area; the title row keeps only icon, name, and action buttons.
- AI Service card input focus appears on the outer rounded field container, not as an independent inner input/password browser focus frame.
- Saved AI Service config deletion requires a `确定删除` / `取消` confirmation state; unsaved drafts may still be deleted directly.
- Inline translation language dropdown is not clipped by the Popup setting list and can open down/up based on available space.
- Inline translation/result-panel handoff copy uses `发给 AI`.
- Inline translation language labels use target-language display names in the Popup while preserving existing stored setting values.
- Popup theme preference is stored as non-secret `appearanceTheme` in existing `contextai_settings`, with no new storage key and no API Key migration.
- Popup theme switching does not affect webpage UI, content scripts, result panel, command palette, or page styles.
- AI Service cards mask stored API Keys and never expose full real keys.
- The right-click/context-menu screenshot entry remains the recommended internal-only authorized screenshot path and is visibly marked `内部试用`.
- Double-click inside the selected region copies the image; double-click outside the selected region exits screenshot mode without opening the double-click shortcut menu.
- The screenshot toolbar placement is close to the selected region bottom edge and center-aligned; tight space keeps it near the bottom rather than the middle.
- Screenshot toolbar buttons are icon-leading, visually low-border, equal weight, and vertically centered in a compact dark container; Copy image is not primary.
- Screenshot toolbar error state is constrained in width, wraps cleanly, and does not make the dark toolbar stretch across the screen.
- Selection translation covers both the existing click `翻译` flow and the new default-off inline instant translation flow.
- V1-006 inline automatic/instant translation P0 is implemented and passed user QA.
- When the double-click menu is triggered and shown, the selection toolbar is suppressed for that interaction only.
- The double-click menu should not flash together with the selection toolbar before settling.
- If the double-click menu is blocked by an unsafe target, normal selection behavior is not incorrectly suppressed.
- Result panel header no longer includes `结果面板`.
- Freshly opened result panels do not show a saved-state badge unless the conversation was already pinned/saved in history.
- Result-panel conversations are automatically recoverable from Popup History without requiring Save.
- Clicking Save on a multi-turn conversation preserves and restores all messages, not only the last Q/A pair.
- Any new AI action routed into an already visible result panel appends to the active conversation instead of overwriting previous messages.
- Conversation history stays local-only in `chrome.storage.local/contextai_history`, keeps only the most recent 20 conversations, does not use sync storage, and does not persist screenshot/base64 content or raw provider responses.
- The follow-up input supports multiline text without breaking the panel on narrow screens.
- Custom template add/edit/delete changes are reflected in the native Chrome right-click menu without reloading the extension.
- No new permission, dependency, provider route, backend, hosted AI, quota, login, subscription, payment, telemetry, analytics, or public release claim is introduced.
