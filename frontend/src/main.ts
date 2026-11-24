import 'altcha';
import altchaCss from 'altcha/altcha.css?inline';

import DOMPurify from 'dompurify';
import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { marked } from 'marked';
import { CODE_OF_CONDUCT_I18N, CodeOfConductContent } from './code-of-conduct';

const altchaStyles = unsafeCSS(altchaCss);

const I18N: Record<string, Record<string, string>> = {
  en: {
    offlineMessage: "Our comment server is taking a coffee break ☕",
    retry: "Try again",
    comments: "Comments",
    teamBadge: "🛡️ Maintainer",
    writeTab: "Write",
    previewTab: "Preview",
    placeholder: "Leave a constructive comment (Markdown supported)...",
    guestNamePlaceholder: "Your Name (or leave blank for Guest)",
    submitBtn: "Post Comment",
    submittingBtn: "Submitting...",
    previewEmpty: "Nothing to preview yet.",
    charLimit: "characters",
    cocLink: "Code of Conduct",
    pendingNotice: "Your comment is being briefly reviewed by AI moderation.",
    deleteBtn: "Delete",
    deletingBtn: "Deleting...",
    deleteConfirm: "Delete this comment permanently?",
    editBtn: "Edit",
    editedLabel: "✎ edited",
    replyBtn: "Reply",
    cancelBtn: "Cancel",
    postReplyBtn: "Post Reply",
    replyPlaceholder: "Write a constructive reply...",
    pageReactionsTitle: "Article Reactions",
    reactionCountSingular: "1 reaction",
    reactionCountPlural: "{n} reactions",
    addReaction: "Add reaction",
    replyingTo: "Replying to",
    loggedInAs: "Logged in as",
    logoutBtn: "Log out",
    orSignInWith: "Or sign in with:",
    signInToPost: "Sign in to post your comment",
    continueAsGuest: "Guest",
    postAsGuest: "Post as Guest",
    guestNameLabel: "Your name",
    popupBlockedNotice: "Login popup was blocked by your browser.",
    popupOpenManual: "Open Login Window",
    popupRedirectFallback: "or continue via redirect",
    emailLinkBtn: "Email Link",
    emailLinkPlaceholder: "Enter your email address...",
    sendMagicLinkBtn: "Send Login Link",
    sendingMagicLinkBtn: "Sending...",
    magicLinkSentMessage: "Check your inbox! We've sent a magic login link to",
    magicLinkSentInstructions: "Click the link in the email to complete your login.",
    pendingReviewTitle: "Pending Editorial Review",
    pendingReviewNotice: "This comment is held for editorial review and has not been published yet.",
    assessmentReasonLabel: "Assessment / Reason:",
    reviseBtn: "Revise Comment",
    saveRevisionBtn: "Save & Resubmit",
    cancelRevisionBtn: "Cancel",
    savingRevisionBtn: "Saving...",
  },
  de: {
    offlineMessage: "Unser Kommentar-Server macht gerade Kaffeepause ☕",
    retry: "Nochmal versuchen",
    comments: "Kommentare",
    teamBadge: "🛡️ Maintainer",
    writeTab: "Schreiben",
    previewTab: "Vorschau",
    placeholder: "Schreibe einen konstruktiven Kommentar (Markdown unterstützt)...",
    guestNamePlaceholder: "Dein Name (oder leer lassen für Gast)",
    submitBtn: "Kommentar absenden",
    submittingBtn: "Wird gesendet...",
    previewEmpty: "Noch nichts zum Voranzeigen.",
    charLimit: "Zeichen",
    cocLink: "Verhaltenskodex",
    pendingNotice: "Dein Kommentar wird kurz durch die KI-Moderation geprüft.",
    deleteBtn: "Löschen",
    deletingBtn: "Wird gelöscht...",
    deleteConfirm: "Diesen Kommentar endgültig löschen?",
    editBtn: "Bearbeiten",
    editedLabel: "✎ editiert",
    replyBtn: "Antworten",
    cancelBtn: "Abbrechen",
    postReplyBtn: "Antwort senden",
    replyPlaceholder: "Schreibe eine konstruktive Antwort...",
    pageReactionsTitle: "Artikel-Reaktionen",
    reactionCountSingular: "1 Reaktion",
    reactionCountPlural: "{n} Reaktionen",
    addReaction: "Reaktion hinzufügen",
    replyingTo: "Antwort an",
    loggedInAs: "Angemeldet als",
    logoutBtn: "Abmelden",
    orSignInWith: "Oder anmelden mit:",
    signInToPost: "Anmelden, um deinen Kommentar zu senden",
    continueAsGuest: "Gast",
    postAsGuest: "Als Gast absenden",
    guestNameLabel: "Dein Name",
    popupBlockedNotice: "Login-Popup wurde vom Browser blockiert.",
    popupOpenManual: "Login-Fenster manuell öffnen",
    popupRedirectFallback: "oder per Weiterleitung anmelden",
    emailLinkBtn: "E-Mail-Link",
    emailLinkPlaceholder: "Deine E-Mail-Adresse...",
    sendMagicLinkBtn: "Login-Link senden",
    sendingMagicLinkBtn: "Wird gesendet...",
    magicLinkSentMessage: "Postfach prüfen! Wir haben einen Login-Link gesendet an",
    magicLinkSentInstructions: "Klicke auf den Link in der E-Mail, um dich anzumelden.",
    pendingReviewTitle: "In redaktioneller Prüfung",
    pendingReviewNotice: "Dieser Kommentar ist in redaktioneller Prüfung und noch nicht öffentlich sichtbar.",
    assessmentReasonLabel: "Einschätzung / Begründung:",
    reviseBtn: "Kommentar überarbeiten",
    saveRevisionBtn: "Speichern & Erneut einreichen",
    cancelRevisionBtn: "Abbrechen",
    savingRevisionBtn: "Wird gespeichert...",
  },
};

const FORMATS = {
  bold: ['**', '**', 'bold'],
  italic: ['*', '*', 'italic'],
  code: ['`', '`', 'code'],
  codeBlock: ['```python\n', '\n```', 'code block'],
  link: ['[', '](https://)', 'link'],
  quote: ['> ', '', 'quote'],
} as const;

/** Brand icons as inline SVGs (Shadow DOM friendly, no Font Awesome needed). */
const AUTH_ICONS: Record<string, ReturnType<typeof html>> = {
  github: html`
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2C6.477 2 2 6.586 2 12.253c0 4.537 2.865 8.383 6.839 9.743.5.094.682-.222.682-.493 0-.243-.01-1.05-.014-1.905-2.782.618-3.369-1.21-3.369-1.21-.454-1.179-1.11-1.492-1.11-1.492-.908-.636.069-.623.069-.623 1.004.072 1.532 1.055 1.532 1.055.892 1.566 2.341 1.114 2.91.852.091-.662.35-1.114.636-1.37-2.22-.259-4.555-1.14-4.555-5.077 0-1.122.39-2.04 1.03-2.76-.103-.26-.447-1.302.098-2.714 0 0 .84-.275 2.75 1.053A9.35 9.35 0 0 1 12 6.844a9.35 9.35 0 0 1 2.504.345c1.909-1.328 2.748-1.053 2.748-1.053.547 1.412.203 2.454.1 2.714.64.72 1.028 1.638 1.028 2.76 0 3.947-2.339 4.815-4.566 5.068.359.317.679.943.679 1.901 0 1.372-.012 2.477-.012 2.814 0 .273.18.592.688.491C19.138 20.633 22 16.787 22 12.253 22 6.586 17.523 2 12 2z"
      />
    </svg>
  `,
  linkedin_oauth2: html`
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  `,
  google: html`
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  `,
  email_link: html`
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
      />
    </svg>
  `,
};

/** Allowed tags/attrs aligned with comments.utils.render_and_sanitize_markdown. */
const MARKDOWN_ALLOWED_TAGS = [
  'p',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'a',
  'br',
  'span',
];
const MARKDOWN_ALLOWED_ATTR = ['href', 'class', 'rel'];

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdownPreview(markdownText: string): string {
  if (!markdownText) return '';
  const rawHtml = marked.parse(markdownText, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
    ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  });
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('rel', 'nofollow ugc');
    node.setAttribute('target', '_blank');
  }
});

const REACTION_KINDS = [
  { kind: 'like', emoji: '👍' },
  { kind: 'love', emoji: '❤️' },
  { kind: 'rocket', emoji: '🚀' },
  { kind: 'celebrate', emoji: '🎉' },
  { kind: 'insightful', emoji: '💡' },
];

const OAUTH_SIGNAL_KEY = 'blueshoe_oauth';

type OAuthSignal = { type?: string; error?: string; ts?: number };
type OAuthSignalHandler = (data: OAuthSignal) => void;

const oauthSignalHandlers = new Set<OAuthSignalHandler>();
let oauthSignalBusReady = false;

function dispatchOAuthSignal(data: OAuthSignal) {
  for (const handler of oauthSignalHandlers) {
    try {
      handler(data);
    } catch (_) {}
  }
}

/**
 * Window-level bus so Lit remounts cannot drop oauth_success.
 * Prefer localStorage (survives COOP browsing-context splits); BroadcastChannel
 * and postMessage are best-effort extras.
 *
 * oauthSignalBusReady is set only after listeners are attached. Init is fully
 * synchronous (no await), so concurrent callers cannot observe a half-ready bus.
 */
function ensureOAuthSignalBus() {
  if (oauthSignalBusReady || typeof window === 'undefined') return;

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as OAuthSignal | undefined;
    if (data?.type !== 'oauth_success' && data?.type !== 'oauth_error') return;
    // Do not require same-origin: the API error page may postMessage from
    // community.* while the widget runs on www.*. The payload is only a nudge
    // to refetch /api/auth/session/ with credentials — it is not trusted for identity.
    dispatchOAuthSignal(data);
  });

  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== OAUTH_SIGNAL_KEY || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue) as OAuthSignal;
      // Keep the key if no widget is mounted yet (pending consume on subscribe).
      if (oauthSignalHandlers.size === 0) return;
      try {
        localStorage.removeItem(OAUTH_SIGNAL_KEY);
      } catch (_) {}
      dispatchOAuthSignal(data);
    } catch (_) {}
  });

  try {
    const channel = new BroadcastChannel(OAUTH_SIGNAL_KEY);
    channel.addEventListener('message', (event: MessageEvent) => {
      dispatchOAuthSignal(event.data as OAuthSignal);
    });
  } catch (_) {}

  oauthSignalBusReady = true;
}

function consumePendingOAuthSignal(handler: OAuthSignalHandler) {
  try {
    const raw = localStorage.getItem(OAUTH_SIGNAL_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as OAuthSignal;
    localStorage.removeItem(OAUTH_SIGNAL_KEY);
    queueMicrotask(() => handler(data));
  } catch (_) {}
}

function subscribeOAuthSignals(handler: OAuthSignalHandler) {
  ensureOAuthSignalBus();
  oauthSignalHandlers.add(handler);
  consumePendingOAuthSignal(handler);
  return () => {
    oauthSignalHandlers.delete(handler);
  };
}

@customElement('community-comments')
export class CommunityComments extends LitElement {
  static styles = [
    altchaStyles,
    css`
    :host {
      display: block;
      font-family: var(--community-font, system-ui, sans-serif);
      color: var(--community-color, #1e293b);
      background: var(--community-bg, #ffffff);
      border-radius: var(--community-radius, 8px);
    }

    * {
      box-sizing: border-box;
    }

    .comments-widget {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .comments-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .widget-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }

    .widget-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    /* Page Reactions (giscus-style) */
    .page-reactions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0 0.15rem;
    }

    .page-reactions-summary {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 500;
    }

    .page-reactions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .page-reaction-trigger-wrap {
      position: relative;
      display: inline-flex;
      flex-shrink: 0;
    }

    .page-reaction-trigger,
    .page-reaction-pill {
      box-sizing: border-box;
      height: 28px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }

    .page-reaction-trigger {
      width: 28px;
      padding: 0;
      border-radius: 50%;
      color: #64748b;
    }

    .page-reaction-trigger:hover,
    .page-reaction-trigger[aria-expanded='true'] {
      border-color: var(--community-accent, #3b82f6);
      color: var(--community-accent, #3b82f6);
      background: #e0f2fe;
    }

    .page-reaction-trigger svg {
      width: 16px;
      height: 16px;
      display: block;
    }

    .page-reaction-pill {
      gap: 0.3rem;
      border-radius: 20px;
      padding: 0 10px;
      font-size: 0.85rem;
      color: #334155;
      line-height: 1;
    }

    .page-reaction-pill:hover {
      border-color: var(--community-accent, #3b82f6);
      background: #e0f2fe;
    }

    .page-reaction-pill.active {
      border-color: var(--community-accent, #3b82f6);
      background: #e0f2fe;
      color: var(--community-accent, #3b82f6);
      font-weight: 600;
    }

    .page-reaction-picker {
      position: absolute;
      top: calc(100% + 10px);
      left: 0;
      z-index: 40;
      min-width: 180px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: var(--community-radius, 8px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      padding: 0.45rem;
    }

    .page-reaction-picker::before {
      content: '';
      position: absolute;
      top: -7px;
      left: 14px;
      width: 12px;
      height: 12px;
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      border-top: 1px solid #e2e8f0;
      transform: translateX(-50%) rotate(45deg);
    }

    .page-reaction-picker-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.2rem;
    }

    .page-reaction-option {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 4px;
      background: transparent;
      font-size: 1.15rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .page-reaction-option:hover {
      background: #f1f5f9;
    }

    .page-reaction-option.active {
      background: #e0f2fe;
      box-shadow: inset 0 0 0 1px var(--community-accent, #3b82f6);
    }

    .editor-submit {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .footer-user {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .footer-user strong {
      color: #334155;
    }

    .submit-wrap {
      position: relative;
      display: inline-flex;
    }

    .auth-picker {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      z-index: 50;
      width: max-content;
      max-width: 90vw;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: var(--community-radius, 8px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      padding: 0.7rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .auth-picker::after {
      content: '';
      position: absolute;
      bottom: -7px;
      right: 22px;
      width: 12px;
      height: 12px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      transform: rotate(45deg);
    }

    .auth-picker-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      margin: 0;
    }

    .auth-picker-providers {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: nowrap;
    }

    .auth-provider-btn {
      width: 40px;
      height: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }

    .auth-provider-btn:hover,
    .auth-provider-btn.active {
      border-color: var(--community-accent, #3b82f6);
      background: #e0f2fe;
      color: var(--community-accent, #3b82f6);
    }

    .auth-provider-btn svg {
      width: 20px;
      height: 20px;
      display: block;
    }

    .auth-guest-btn {
      height: 40px;
      padding: 0 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      line-height: 1;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }

    .auth-guest-btn:hover,
    .auth-guest-btn.active {
      border-color: var(--community-accent, #3b82f6);
      background: #e0f2fe;
      color: var(--community-accent, #3b82f6);
    }

    .auth-picker-panel {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding-top: 0.15rem;
      border-top: 1px solid #f1f5f9;
      min-width: 220px;
    }

    .auth-picker-panel .name-input,
    .auth-picker-panel .magic-email-input {
      width: 100%;
      max-width: none;
      min-width: 0;
    }

    .auth-picker-panel .magic-link-form {
      width: 100%;
      margin-top: 0;
    }

    .logout-btn {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.8rem;
      text-decoration: underline;
      padding: 0;
    }

    .popup-blocked-banner {
      width: 100%;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--community-radius, 8px);
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .popup-retry-link {
      color: var(--community-accent, #3b82f6);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
    }

    .redirect-fallback-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 0.8rem;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }

    .magic-link-form {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.35rem;
      flex-wrap: wrap;
    }

    .magic-email-input {
      padding: 0.35rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.85rem;
      flex: 1;
      min-width: 200px;
      max-width: 280px;
    }

    .magic-email-input:focus {
      outline: none;
      border-color: var(--community-accent, #3b82f6);
    }

    .magic-send-btn {
      background: var(--community-accent, #3b82f6);
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .magic-send-btn:hover {
      background: #1d4ed8;
    }

    .magic-send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .magic-cancel-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 2px 6px;
    }

    .magic-sent-banner {
      width: 100%;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: var(--community-radius, 8px);
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
      color: #065f46;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }

    .close-banner-btn {
      background: transparent;
      border: none;
      color: #065f46;
      font-weight: 700;
      cursor: pointer;
      padding: 0 4px;
    }

    .pending-review-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #92400e;
      border-radius: var(--community-radius, 8px);
      padding: 0.65rem 0.85rem;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      color: #92400e;
    }

    .pending-review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      margin-bottom: 0.25rem;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .pending-review-reason {
      margin: 0.35rem 0 0.6rem;
      font-size: 0.85rem;
      color: #92400e;
      line-height: 1.45;
      background: rgba(254, 243, 199, 0.6);
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      border: 1px dashed #fde68a;
    }

    .owner-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-left: auto;
    }

    .revise-btn {
      background: #f59e0b;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 3px 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s;
    }

    .revise-btn:hover {
      filter: brightness(0.92);
    }

    .delete-btn {
      background: transparent;
      color: #dc2626;
      border: 1px solid #fca5a5;
      border-radius: 4px;
      padding: 3px 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s, color 0.15s;
    }

    .delete-btn:hover:not(:disabled) {
      background: #fef2f2;
      color: #b91c1c;
    }

    .delete-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .revision-editor {
      margin-top: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .revision-textarea {
      width: 100%;
      min-height: 85px;
      padding: 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: var(--community-radius, 8px);
      font-family: inherit;
      font-size: 0.9rem;
      background: #ffffff;
      resize: vertical;
    }

    .revision-textarea:focus {
      outline: none;
      border-color: var(--community-accent, #3b82f6);
    }

    .revision-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    /* Editor */
    .editor-box {
      border: 1px solid #cbd5e1;
      border-radius: var(--community-radius, 8px);
      overflow: hidden;
      background: #f8fafc;
      transition: border-color 0.2s;
    }

    .editor-box:focus-within {
      border-color: var(--community-accent, #3b82f6);
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .toolbar-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .toolbar-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
      color: #334155;
    }

    .toolbar-btn:hover {
      background: #e2e8f0;
    }

    .tab-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      color: #64748b;
    }

    .tab-btn.active {
      background: #ffffff;
      color: var(--community-accent, #3b82f6);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .editor-textarea {
      width: 100%;
      min-height: 120px;
      padding: 0.75rem;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: 0.95rem;
      resize: vertical;
      background: #ffffff;
    }

    .editor-preview {
      min-height: 120px;
      padding: 0.75rem;
      background: #ffffff;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .editor-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 0.75rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .editor-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .name-input {
      padding: 0.35rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .coc-link {
      color: var(--community-accent, #3b82f6);
      text-decoration: underline;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      font-weight: 600;
    }

    .submit-btn {
      background: var(--community-accent, #3b82f6);
      color: #ffffff;
      border: none;
      border-radius: var(--community-radius, 8px);
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .submit-btn:hover {
      background: #1d4ed8;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Comment List */
    .comment-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .comment-card {
      border: 1px solid #e2e8f0;
      border-radius: var(--community-radius, 8px);
      padding: 1rem;
      background: #ffffff;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .comment-author {
      font-weight: 700;
    }

    .team-badge {
      background: var(--community-accent, #3b82f6);
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .comment-date {
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .comment-body {
      font-size: 0.95rem;
      line-height: 1.6;
      word-break: break-word;
    }

    .comment-body p {
      margin: 0.4rem 0;
    }

    .comment-body p:first-child {
      margin-top: 0;
    }

    .comment-body p:last-child {
      margin-bottom: 0;
    }

    .comment-body pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 0.85rem 1.1rem;
      border-radius: var(--community-radius, 8px);
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.85rem;
      line-height: 1.55;
      margin: 0.65rem 0;
      white-space: pre;
      tab-size: 4;
      border: 1px solid #1e293b;
    }

    .comment-body pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border-radius: 0;
      font-size: inherit;
      font-family: inherit;
      white-space: pre;
    }

    .comment-body code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.88em;
      border: 1px solid #e2e8f0;
      white-space: pre-wrap;
    }

    .comment-body blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: #64748b;
      font-style: italic;
    }

    .comment-body ul,
    .comment-body ol {
      margin: 0.4rem 0;
      padding-left: 1.4rem;
    }

    .comment-body li {
      margin: 0.2rem 0;
    }

    .comment-body a {
      color: var(--community-accent, #3b82f6);
      text-decoration: underline;
    }

    .comment-body a:hover {
      color: #1d4ed8;
    }

    /* Comment Reactions Bar (same controls as page reactions) */
    .reactions-bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }

    .reactions-bar .page-reactions-row {
      justify-content: flex-start;
    }

    .reply-action-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 8px;
      border-radius: 20px;
      transition: all 0.15s ease-in-out;
    }

    .reply-action-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: var(--community-accent, #3b82f6);
    }

    /* 1-Level Replies Container */
    .replies-list {
      margin-top: 0.85rem;
      margin-left: 1.5rem;
      padding-left: 1rem;
      border-left: 2px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .reply-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: var(--community-radius, 8px);
      padding: 0.75rem;
    }

    /* Inline Reply Form */
    .inline-reply-box {
      margin-top: 0.85rem;
      margin-left: 1.5rem;
      padding: 0.85rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: var(--community-radius, 8px);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      animation: replyFadeIn 0.15s ease-out;
    }

    @keyframes replyFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .inline-reply-box h6 {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    .reply-textarea {
      width: 100%;
      min-height: 75px;
      padding: 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: var(--community-radius, 8px);
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;
      background: #ffffff;
    }

    .reply-textarea:focus {
      outline: none;
      border-color: var(--community-accent, #3b82f6);
    }

    .reply-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .reply-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      flex-wrap: wrap;
      width: 100%;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: var(--community-radius, 8px);
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      color: #64748b;
    }

    .cancel-btn:hover {
      background: #e2e8f0;
      color: #334155;
    }

    /* Modal for Code of Conduct */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
    }

    .modal-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #334155;
    }

    .close-icon {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: #64748b;
      line-height: 1;
    }

    .close-icon:hover {
      color: #334155;
    }

    .modal-content {
      padding: 1.25rem;
      overflow-y: auto;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #334155;
    }

    .modal-content h5 {
      margin: 1.2rem 0 0.4rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #334155;
    }

    .modal-content h5:first-child {
      margin-top: 0;
    }

    .modal-content ul {
      margin: 0.4rem 0;
      padding-left: 1.2rem;
    }

    .modal-content li {
      margin-bottom: 0.3rem;
    }

    .modal-footer {
      padding: 0.75rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      background: #f8fafc;
    }

    .status-card {
      padding: 1.5rem;
      border: 1px solid var(--community-accent, #3b82f6);
      border-radius: var(--community-radius, 8px);
      text-align: center;
      background: #f8fafc;
    }
  `,
  ];

  @property({ type: String, attribute: 'api-base' })
  apiBase = '';

  get resolvedApiBase(): string {
    if (this.apiBase) {
      return this.apiBase.replace(/\/+$/, '');
    }
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return `${protocol}//${host}:8079`;
    }
    if (host.startsWith('community.')) {
      return `${protocol}//${host}`;
    }
    const rootDomain = host.replace(/^www\./, '');
    return `https://community.${rootDomain}`;
  }

  @property({ type: String, attribute: 'thread-slug' })
  threadSlug = '';

  get resolvedThreadSlug(): string {
    const raw = this.threadSlug || (typeof window !== 'undefined' ? window.location.pathname : '');
    const trimmed = (raw || 'default').trim().replace(/^\/+/, '').replace(/\/+$/, '');
    return trimmed || 'root';
  }

  @property({ type: String })
  lang = typeof document !== 'undefined' && document.documentElement.lang.startsWith('de') ? 'de' : 'en';

  @state()
  private comments: any[] = [];

  @state()
  private pageReactions: { counts: Record<string, number>; active: string[] } = { counts: {}, active: [] };

  @state()
  private isOffline = false;

  @state()
  private isSubmitting = false;

  @state()
  private isSubmittingReply = false;

  @state()
  private activeReplyParentId: number | null = null;

  @state()
  private replyBody = '';

  @state()
  private replyGuestName = '';

  @state()
  private replyAltchaPayload = '';

  @state()
  private activeTab: 'write' | 'preview' = 'write';

  @state()
  private commentBody = '';

  @state()
  private guestName = '';

  @state()
  private showCocModal = false;

  @state()
  private showAuthPicker = false;

  /** Which submit action opened the auth picker. */
  @state()
  private authPickerContext: 'comment' | 'reply' = 'comment';

  /** Sub-view inside the auth picker tooltip. */
  @state()
  private authPickerMode: 'providers' | 'guest' | 'email' = 'providers';

  /** 'page' for article reactions, or `comment:${id}` for comment/reply reactions. */
  @state()
  private openReactionPickerKey: string | null = null;

  @state()
  private authProviders: { id: string; name: string }[] = [];

  @state()
  private currentUser: { id: number; name: string; email: string; is_team: boolean } | null = null;

  @state()
  private blockedPopupUrl: string | null = null;

  @state()
  private blockedProviderId: string | null = null;

  private authPopup: Window | null = null;

  private oauthLoginSettled = false;

  private unsubscribeOAuth: (() => void) | null = null;

  private _onDocPointerDown: ((e: Event) => void) | null = null;

  @state()
  private altchaPayload = '';

  @state()
  private magicLinkEmail = '';

  @state()
  private isSendingMagicLink = false;

  @state()
  private magicLinkSentTo = '';

  @state()
  private editingCommentId: number | null = null;

  @state()
  private editingBody = '';

  @state()
  private isSavingRevision = false;

  @state()
  private isDeletingCommentId: number | null = null;

  startEditingComment(commentId: number, rawMarkdown: string) {
    this.editingCommentId = commentId;
    this.editingBody = rawMarkdown;
  }

  cancelEditingComment() {
    this.editingCommentId = null;
    this.editingBody = '';
  }

  async handleDeleteComment(commentId: number) {
    if (this.isDeletingCommentId !== null) return;
    if (!confirm(this.t('deleteConfirm'))) return;

    this.isDeletingCommentId = commentId;
    try {
      const res = await fetch(`${this.resolvedApiBase}/api/comments/${commentId}/`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      if (res.ok || res.status === 204) {
        if (this.editingCommentId === commentId) {
          this.editingCommentId = null;
          this.editingBody = '';
        }
        if (this.activeReplyParentId === commentId) {
          this.activeReplyParentId = null;
        }
        await this.fetchComments();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.detail || err?.error || 'Failed to delete comment.');
      }
    } catch (e) {
      console.error('Failed to delete comment', e);
    } finally {
      this.isDeletingCommentId = null;
    }
  }

  private renderDeleteButton(commentId: number) {
    const isDeleting = this.isDeletingCommentId === commentId;
    return html`
      <button
        class="delete-btn"
        ?disabled=${isDeleting}
        @click=${() => this.handleDeleteComment(commentId)}
      >
        ${isDeleting ? this.t('deletingBtn') : this.t('deleteBtn')}
      </button>
    `;
  }

  async handleSaveRevision(commentId: number) {
    if (!this.editingBody.trim() || this.isSavingRevision) return;
    this.isSavingRevision = true;
    try {
      const res = await fetch(`${this.resolvedApiBase}/api/comments/${commentId}/`, {
        method: 'PATCH',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ body_markdown: this.editingBody }),
      });
      if (res.ok) {
        this.editingCommentId = null;
        this.editingBody = '';
        await this.fetchComments();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || 'Failed to update comment.');
      }
    } catch (e) {
      console.error('Failed to update comment', e);
    } finally {
      this.isSavingRevision = false;
    }
  }

  async handleRequestMagicLink() {
    if (!this.magicLinkEmail.trim() || this.isSendingMagicLink) return;
    this.saveDraft(this.commentBody);
    this.isSendingMagicLink = true;
    try {
      const res = await fetch(`${this.resolvedApiBase}/api/auth/magic-link/request/`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: this.magicLinkEmail,
          next_url: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        this.magicLinkSentTo = this.magicLinkEmail;
        this.magicLinkEmail = '';
      } else {
        alert(data?.error || 'Failed to send magic link.');
      }
    } catch (err) {
      console.error('Magic link error', err);
    } finally {
      this.isSendingMagicLink = false;
    }
  }

  private t(key: string): string {
    const dict = I18N[this.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  private get coc(): CodeOfConductContent {
    return CODE_OF_CONDUCT_I18N[this.lang] || CODE_OF_CONDUCT_I18N.en;
  }

  private getVisitorId(): string {
    let vid = '';
    try {
      vid = localStorage.getItem('community_vid') || '';
      if (!vid) {
        vid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'vid_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('community_vid', vid);
      }
    } catch (_) {
      vid = 'fallback_vid';
    }
    return vid;
  }

  private getHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'X-Visitor-Id': this.getVisitorId(),
      ...extra,
    };
  }

  async connectedCallback() {
    super.connectedCallback();
    this.loadDraft();
    this.fetchComments();
    this.fetchPageReactions();
    this.fetchAuth();

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.showCocModal) this.showCocModal = false;
        if (this.openReactionPickerKey !== null) this.openReactionPickerKey = null;
        if (this.showAuthPicker) this.closeAuthPicker();
        if (this.activeReplyParentId !== null) this.activeReplyParentId = null;
      }
    });

    if (this._onDocPointerDown) {
      document.removeEventListener('pointerdown', this._onDocPointerDown, true);
    }
    this._onDocPointerDown = (e: Event) => {
      const path = e.composedPath();
      if (this.openReactionPickerKey !== null) {
        const hitReactionUi = path.some(
          (node) =>
            node instanceof Element &&
            (node.classList.contains('page-reaction-picker') ||
              node.classList.contains('page-reaction-trigger') ||
              node.classList.contains('page-reaction-trigger-wrap'))
        );
        if (!hitReactionUi) this.openReactionPickerKey = null;
      }
      if (this.showAuthPicker) {
        const hitAuthUi = path.some(
          (node) =>
            node instanceof Element &&
            (node.classList.contains('auth-picker') || node.classList.contains('submit-wrap'))
        );
        if (!hitAuthUi) this.closeAuthPicker();
      }
    };
    document.addEventListener('pointerdown', this._onDocPointerDown, true);

    this.unsubscribeOAuth?.();
    this.unsubscribeOAuth = subscribeOAuthSignals((data) => {
      if (!this.isConnected) return;
      this.handleOAuthSignal(data);
    });
  }

  disconnectedCallback() {
    this.unsubscribeOAuth?.();
    this.unsubscribeOAuth = null;
    if (this._onDocPointerDown) {
      document.removeEventListener('pointerdown', this._onDocPointerDown, true);
      this._onDocPointerDown = null;
    }
    // Leave the popup open; auth-callback / finishOAuthLogin close it.
    // localStorage pending signal is consumed again on the next subscribe.
    super.disconnectedCallback();
  }

  private handleOAuthSignal(data: OAuthSignal) {
    if (data.type === 'oauth_success') {
      this.finishOAuthLogin();
    } else if (data.type === 'oauth_error') {
      this.closeAuthPopup();
    }
  }

  private closeAuthPopup() {
    const popup = this.authPopup;
    this.authPopup = null;
    if (!popup || popup.closed) return;
    try {
      popup.close();
    } catch (_) {}
  }

  private finishOAuthLogin() {
    this.closeAuthPopup();
    if (this.oauthLoginSettled) return;
    this.oauthLoginSettled = true;
    this.blockedPopupUrl = null;
    this.blockedProviderId = null;
    void this.refreshAuthAfterOAuth();
  }

  /** Refresh UI after a known oauth_success signal (not session polling). */
  private async refreshAuthAfterOAuth() {
    await this.fetchAuth();
    if (!this.currentUser) {
      // Cookie from the popup redirect can lag a tick behind the storage signal.
      await new Promise((r) => setTimeout(r, 500));
      await this.fetchAuth();
    }
    // Draft stays in commentBody / localStorage; just close the auth tooltip.
    this.closeAuthPicker();
    await Promise.all([this.fetchComments(), this.fetchPageReactions()]);
  }

  private openAuthPicker(context: 'comment' | 'reply') {
    this.openReactionPickerKey = null;
    const sameContext = this.showAuthPicker && this.authPickerContext === context;
    this.authPickerContext = context;
    if (!sameContext) {
      this.authPickerMode = 'providers';
    }
    this.showAuthPicker = true;
  }

  private closeAuthPicker() {
    this.showAuthPicker = false;
    this.authPickerMode = 'providers';
  }

  async fetchAuth() {
    try {
      const [provRes, sessRes] = await Promise.all([
        fetch(`${this.resolvedApiBase}/api/auth/providers/`, { credentials: 'include', cache: 'no-store' }),
        fetch(`${this.resolvedApiBase}/api/auth/session/`, { credentials: 'include', cache: 'no-store' }),
      ]);
      if (provRes.ok) {
        this.authProviders = await provRes.json();
      }
      if (sessRes.ok) {
        const data = await sessRes.json();
        this.currentUser = data.is_authenticated ? data.user : null;
      }
    } catch (_) {}
  }

  loginWith(providerId: string) {
    // Keep typed comment across the OAuth popup round-trip.
    this.saveDraft(this.commentBody);
    this.blockedPopupUrl = null;
    this.blockedProviderId = null;
    this.oauthLoginSettled = false;
    this.closeAuthPopup();
    try {
      localStorage.removeItem(OAUTH_SIGNAL_KEY);
    } catch (_) {}

    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth-callback.html`);
    const authUrl = `${this.resolvedApiBase}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${callbackUrl}&process=login`;

    // Must stay synchronous inside the click handler so the popup is not blocked.
    const popup = window.open(authUrl, 'auth-popup', 'width=600,height=700,scrollbars=yes');

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      this.blockedPopupUrl = authUrl;
      this.blockedProviderId = providerId;
      return;
    }

    this.authPopup = popup;
  }

  loginWithRedirect(providerId: string) {
    this.saveDraft(this.commentBody);
    const directCallback = encodeURIComponent(window.location.href);
    window.location.href = `${this.resolvedApiBase}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${directCallback}&process=login`;
  }

  async handleLogout() {
    try {
      await fetch(`${this.resolvedApiBase}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
      this.currentUser = null;
      this.fetchComments();
      this.fetchPageReactions();
    } catch (_) {}
  }

  private loadDraft() {
    try {
      const saved = localStorage.getItem(`comment-draft:${this.resolvedThreadSlug}`);
      if (saved) {
        this.commentBody = saved;
      }
    } catch (_) {}
  }

  private saveDraft(text: string) {
    this.commentBody = text;
    try {
      localStorage.setItem(`comment-draft:${this.resolvedThreadSlug}`, text);
    } catch (_) {}
  }

  async fetchPageReactions() {
    if (!this.resolvedThreadSlug) return;
    try {
      const res = await fetch(`${this.resolvedApiBase}/api/reactions/?thread_slug=${this.resolvedThreadSlug}`, {
        headers: this.getHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        this.pageReactions = await res.json();
      }
    } catch (_) {}
  }

  private applyLocalPageReactionToggle(kind: string, action: 'added' | 'removed') {
    const counts = { ...(this.pageReactions?.counts || {}) };
    let active = [...(this.pageReactions?.active || [])];
    if (action === 'added') {
      counts[kind] = (counts[kind] || 0) + 1;
      if (!active.includes(kind)) active.push(kind);
    } else {
      counts[kind] = Math.max(0, (counts[kind] || 1) - 1);
      if (counts[kind] === 0) delete counts[kind];
      active = active.filter((k) => k !== kind);
    }
    this.pageReactions = { counts, active };
  }

  async fetchComments() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.resolvedApiBase}/api/comments/?thread_slug=${this.resolvedThreadSlug}`, {
        signal: controller.signal,
        headers: this.getHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Server error');
      this.comments = await response.json();
      this.isOffline = false;
    } catch (err) {
      console.error('Failed to fetch comments', err);
      this.isOffline = true;
    }
  }

  private insertFormat(before: string, after: string = before, placeholder: string = '') {
    const textarea = this.shadowRoot?.querySelector('textarea.editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end) || placeholder;

    const replacement = `${before}${selected}${after}`;
    const nextValue = current.substring(0, start) + replacement + current.substring(end);

    this.saveDraft(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  private requestPostComment() {
    if (!this.commentBody.trim() || this.isSubmitting) return;

    if (!this.currentUser) {
      // Guests must pick an identity first (OAuth / email / guest name).
      if (this.authPickerMode === 'guest' && this.altchaPayload) {
        void this.handlePostComment();
        return;
      }
      this.openAuthPicker('comment');
      return;
    }

    void this.handlePostComment();
  }

  async handlePostComment() {
    if (!this.commentBody.trim() || this.isSubmitting) return;
    if (!this.currentUser && !this.altchaPayload) {
      this.openAuthPicker('comment');
      this.authPickerMode = 'guest';
      return;
    }

    this.isSubmitting = true;
    try {
      const payload: Record<string, any> = {
        thread_slug: this.resolvedThreadSlug,
        body_markdown: this.commentBody,
        guest_name: this.currentUser ? undefined : this.guestName || undefined,
        altcha: this.currentUser ? undefined : this.altchaPayload || undefined,
      };

      const res = await fetch(`${this.resolvedApiBase}/api/comments/`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.commentBody = '';
        this.altchaPayload = '';
        this.guestName = '';
        this.closeAuthPicker();
        const altchaEl = this.shadowRoot?.querySelector('altcha-widget') as any;
        if (altchaEl?.reset) {
          altchaEl.reset();
        }
        try {
          localStorage.removeItem(`comment-draft:${this.resolvedThreadSlug}`);
        } catch (_) {}
        await this.fetchComments();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData?.error) {
          alert(`Error: ${errData.error}`);
        }
        const altchaEl = this.shadowRoot?.querySelector('altcha-widget') as any;
        if (altchaEl?.reset) {
          altchaEl.reset();
        }
        this.altchaPayload = '';
      }
    } catch (err) {
      console.error('Submit comment error', err);
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleReplyBox(parentId: number) {
    this.openReactionPickerKey = null;
    this.closeAuthPicker();
    if (this.activeReplyParentId === parentId) {
      this.activeReplyParentId = null;
    } else {
      this.activeReplyParentId = parentId;
      this.replyBody = '';
      this.replyAltchaPayload = '';
    }
  }

  private requestPostReply(parentId: number) {
    if (!this.replyBody.trim() || this.isSubmittingReply) return;

    if (!this.currentUser) {
      if (this.authPickerMode === 'guest' && this.replyAltchaPayload) {
        void this.handlePostReply(parentId);
        return;
      }
      this.openAuthPicker('reply');
      return;
    }

    void this.handlePostReply(parentId);
  }

  async handlePostReply(parentId: number) {
    if (!this.replyBody.trim() || this.isSubmittingReply) return;
    if (!this.currentUser && !this.replyAltchaPayload) {
      this.openAuthPicker('reply');
      this.authPickerMode = 'guest';
      return;
    }

    this.isSubmittingReply = true;
    try {
      const payload: Record<string, any> = {
        thread_slug: this.resolvedThreadSlug,
        parent_id: parentId,
        body_markdown: this.replyBody,
        guest_name: this.currentUser ? undefined : this.replyGuestName || undefined,
        altcha: this.currentUser ? undefined : this.replyAltchaPayload || undefined,
      };

      const res = await fetch(`${this.resolvedApiBase}/api/comments/`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.replyBody = '';
        this.replyGuestName = '';
        this.replyAltchaPayload = '';
        this.activeReplyParentId = null;
        this.closeAuthPicker();
        await this.fetchComments();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData?.error) {
          alert(`Error: ${errData.error}`);
        }
      }
    } catch (err) {
      console.error('Submit reply error', err);
    } finally {
      this.isSubmittingReply = false;
    }
  }

  async toggleReaction(commentId: number | null, kind: string) {
    try {
      const res = await fetch(`${this.resolvedApiBase}/api/reactions/`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          thread_slug: this.resolvedThreadSlug,
          comment_id: commentId,
          kind: kind,
        }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Too many reactions. Please slow down.');
        return;
      }
      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));
      if (commentId === null) {
        if (data?.action === 'added' || data?.action === 'removed') {
          this.applyLocalPageReactionToggle(kind, data.action);
        }
        await this.fetchPageReactions();
      } else {
        await this.fetchComments();
      }
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  }

  renderCocModal() {
    if (!this.showCocModal) return nothing;

    const coc = this.coc;

    return html`
      <div class="modal-overlay" @click=${() => (this.showCocModal = false)}>
        <div class="modal-card" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <h4>${coc.title} – ${coc.subtitle}</h4>
            <button class="close-icon" @click=${() => (this.showCocModal = false)}>✕</button>
          </div>
          <div class="modal-content">
            <h5>${coc.valuesTitle}</h5>
            <p>${coc.values}</p>

            <h5>${coc.behaviorTitle}</h5>
            <ul>
              ${coc.behaviors.map((b) => html`<li>${b}</li>`)}
            </ul>

            <h5>${coc.moderationTitle}</h5>
            <p><strong>Comments will be removed if they include:</strong></p>
            <ul>
              ${coc.removalReasons.map((r) => html`<li>${r}</li>`)}
            </ul>

            <h5>${coc.positiveTitle}</h5>
            <ul>
              ${coc.positives.map((p) => html`<li>${p}</li>`)}
            </ul>

            <h5>${coc.contactTitle}</h5>
            <p>${coc.contactText}</p>
          </div>
          <div class="modal-footer">
            <button class="submit-btn" @click=${() => (this.showCocModal = false)}>${coc.closeBtn}</button>
          </div>
        </div>
      </div>
    `;
  }

  private reactionTotal(counts: Record<string, number>): number {
    return Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
  }

  private reactionSummaryLabel(total: number): string {
    if (total === 1) return this.t('reactionCountSingular');
    return this.t('reactionCountPlural').replace('{n}', String(total));
  }

  private reactionPickerKey(commentId: number | null): string {
    return commentId === null ? 'page' : `comment:${commentId}`;
  }

  private toggleReactionPicker(key: string) {
    this.closeAuthPicker();
    this.openReactionPickerKey = this.openReactionPickerKey === key ? null : key;
  }

  private authProviderIcon(providerId: string) {
    return AUTH_ICONS[providerId] || nothing;
  }

  private selectAuthProvider(providerId: string) {
    if (providerId === 'email_link') {
      this.authPickerMode = 'email';
      return;
    }
    this.loginWith(providerId);
  }

  private selectGuestAuth() {
    this.authPickerMode = 'guest';
  }

  renderAuthPicker() {
    if (!this.showAuthPicker || this.currentUser) return nothing;

    const isReply = this.authPickerContext === 'reply';
    const guestName = isReply ? this.replyGuestName : this.guestName;
    const altchaReady = isReply ? !!this.replyAltchaPayload : !!this.altchaPayload;
    const isSubmitting = isReply ? this.isSubmittingReply : this.isSubmitting;
    const canPostAsGuest = this.authPickerMode === 'guest' && altchaReady && !isSubmitting;

    return html`
      <div class="auth-picker" role="dialog" aria-label=${this.t('signInToPost')}>
        <p class="auth-picker-title">${this.t('signInToPost')}</p>

        <div class="auth-picker-providers">
          ${this.authProviders.map((p) =>
            p.id === 'email_link'
              ? html`
                  <button
                    type="button"
                    class="auth-provider-btn ${this.authPickerMode === 'email' ? 'active' : ''}"
                    title=${p.name || this.t('emailLinkBtn')}
                    aria-label=${p.name || this.t('emailLinkBtn')}
                    @click=${() => this.selectAuthProvider('email_link')}
                  >
                    ${this.authProviderIcon('email_link')}
                  </button>
                `
              : html`
                  <button
                    type="button"
                    class="auth-provider-btn"
                    title=${p.name}
                    aria-label=${p.name}
                    @click=${() => this.selectAuthProvider(p.id)}
                  >
                    ${this.authProviderIcon(p.id)}
                  </button>
                `
          )}
          <button
            type="button"
            class="auth-guest-btn ${this.authPickerMode === 'guest' ? 'active' : ''}"
            @click=${() => this.selectGuestAuth()}
          >
            ${this.t('continueAsGuest')}
          </button>
        </div>

        ${this.authPickerMode === 'guest'
          ? html`
              <div class="auth-picker-panel">
                <input
                  type="text"
                  class="name-input"
                  placeholder=${this.t('guestNamePlaceholder')}
                  aria-label=${this.t('guestNameLabel')}
                  .value=${guestName}
                  @input=${(e: any) => {
                    if (isReply) this.replyGuestName = e.target.value;
                    else this.guestName = e.target.value;
                  }}
                />
                <altcha-widget
                  challenge="${this.resolvedApiBase}/api/captcha/challenge/"
                  auto="onload"
                  spamfilter="false"
                  display="invisible"
                  hidefooter
                  hidelogo
                  @statechange=${(e: CustomEvent) => {
                    const payload =
                      e.detail?.state === 'verified' ? e.detail?.payload || '' : '';
                    if (isReply) {
                      this.replyAltchaPayload =
                        e.detail?.state === 'verified' ? payload : '';
                    } else {
                      this.altchaPayload =
                        e.detail?.state === 'verified' ? payload : '';
                    }
                  }}
                ></altcha-widget>
                <button
                  class="submit-btn"
                  ?disabled=${!canPostAsGuest}
                  @click=${() => {
                    if (isReply && this.activeReplyParentId !== null) {
                      void this.handlePostReply(this.activeReplyParentId);
                    } else {
                      void this.handlePostComment();
                    }
                  }}
                >
                  ${isSubmitting ? this.t('submittingBtn') : this.t('postAsGuest')}
                </button>
              </div>
            `
          : nothing}

        ${this.authPickerMode === 'email'
          ? html`
              <div class="auth-picker-panel">
                <div class="magic-link-form">
                  <input
                    type="email"
                    class="magic-email-input"
                    placeholder=${this.t('emailLinkPlaceholder')}
                    .value=${this.magicLinkEmail}
                    @input=${(e: any) => (this.magicLinkEmail = e.target.value)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') this.handleRequestMagicLink();
                    }}
                  />
                  <button
                    class="magic-send-btn"
                    ?disabled=${!this.magicLinkEmail.trim() || this.isSendingMagicLink}
                    @click=${this.handleRequestMagicLink}
                  >
                    ${this.isSendingMagicLink ? this.t('sendingMagicLinkBtn') : this.t('sendMagicLinkBtn')}
                  </button>
                </div>
                ${this.magicLinkSentTo
                  ? html`
                      <div class="magic-sent-banner">
                        <span>
                          ${this.t('magicLinkSentMessage')} <strong>${this.magicLinkSentTo}</strong>.
                          ${this.t('magicLinkSentInstructions')}
                        </span>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}

        ${this.blockedPopupUrl
          ? html`
              <div class="popup-blocked-banner">
                <span>${this.t('popupBlockedNotice')}</span>
                <a
                  href="${this.blockedPopupUrl}"
                  target="_blank"
                  class="popup-retry-link"
                  @click=${() => (this.blockedPopupUrl = null)}
                >
                  ${this.t('popupOpenManual')}
                </a>
                ${this.blockedProviderId
                  ? html`
                      <button
                        class="redirect-fallback-btn"
                        @click=${() => this.loginWithRedirect(this.blockedProviderId!)}
                      >
                        (${this.t('popupRedirectFallback')})
                      </button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  /** Shared giscus-style trigger + active pills + emoji picker. */
  renderReactionControls(
    reactions: { counts?: Record<string, number>; active?: string[] } | undefined,
    commentId: number | null
  ) {
    const counts = reactions?.counts || {};
    const active = reactions?.active || [];
    const visible = REACTION_KINDS.filter(({ kind }) => (counts[kind] || 0) > 0);
    const pickerKey = this.reactionPickerKey(commentId);
    const pickerOpen = this.openReactionPickerKey === pickerKey;

    return html`
      <div class="page-reactions-row">
        <div class="page-reaction-trigger-wrap">
          <button
            type="button"
            class="page-reaction-trigger"
            aria-label=${this.t('addReaction')}
            aria-expanded=${pickerOpen ? 'true' : 'false'}
            title=${this.t('addReaction')}
            @click=${(e: Event) => {
              e.stopPropagation();
              this.toggleReactionPicker(pickerKey);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
              <circle cx="8" cy="8" r="6.25"></circle>
              <path d="M5.2 9.4c.7 1 1.7 1.5 2.8 1.5s2.1-.5 2.8-1.5" stroke-linecap="round"></path>
              <circle cx="5.8" cy="6.4" r="0.7" fill="currentColor" stroke="none"></circle>
              <circle cx="10.2" cy="6.4" r="0.7" fill="currentColor" stroke="none"></circle>
            </svg>
          </button>

          ${pickerOpen
            ? html`
                <div class="page-reaction-picker" role="menu" aria-label=${this.t('addReaction')}>
                  <div class="page-reaction-picker-grid">
                    ${REACTION_KINDS.map(({ kind, emoji }) => {
                      const isActive = active.includes(kind);
                      return html`
                        <button
                          type="button"
                          class="page-reaction-option ${isActive ? 'active' : ''}"
                          role="menuitem"
                          title=${kind}
                          @click=${async () => {
                            await this.toggleReaction(commentId, kind);
                            this.openReactionPickerKey = null;
                          }}
                        >
                          ${emoji}
                        </button>
                      `;
                    })}
                  </div>
                </div>
              `
            : nothing}
        </div>

        ${visible.map(({ kind, emoji }) => {
          const count = counts[kind] || 0;
          const isActive = active.includes(kind);
          return html`
            <button
              type="button"
              class="page-reaction-pill ${isActive ? 'active' : ''}"
              @click=${() => this.toggleReaction(commentId, kind)}
            >
              <span aria-hidden="true">${emoji}</span>
              <span>${count}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  renderPageReactions() {
    const counts = this.pageReactions?.counts || {};
    const total = this.reactionTotal(counts);

    return html`
      <div class="page-reactions">
        ${total > 0
          ? html`<div class="page-reactions-summary">${this.reactionSummaryLabel(total)}</div>`
          : nothing}
        ${this.renderReactionControls(this.pageReactions, null)}
      </div>
    `;
  }

  renderReactionsBar(
    reactions: { counts?: Record<string, number>; active?: string[] } | undefined,
    commentId: number | null,
    allowReply = false
  ) {
    return html`
      <div class="reactions-bar">
        ${this.renderReactionControls(reactions, commentId)}
        ${allowReply && commentId !== null
          ? html`
              <button class="reply-action-btn" @click=${() => this.toggleReplyBox(commentId)}>
                💬 ${this.t('replyBtn')}
              </button>
            `
          : nothing}
      </div>
    `;
  }

  renderInlineReplyBox(parentComment: any) {
    if (this.activeReplyParentId !== parentComment.id) return nothing;

    return html`
      <div class="inline-reply-box">
        <h6>💬 ${this.t('replyingTo')} <strong>${parentComment.author_name}</strong></h6>
        <textarea
          class="reply-textarea"
          placeholder=${this.t('replyPlaceholder')}
          .value=${this.replyBody}
          @input=${(e: any) => (this.replyBody = e.target.value)}
          @keydown=${(e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              this.requestPostReply(parentComment.id);
            }
          }}
        ></textarea>

        <div class="reply-footer">
          <div class="reply-actions">
            <button class="cancel-btn" @click=${() => {
              this.activeReplyParentId = null;
              this.closeAuthPicker();
            }}>
              ${this.t('cancelBtn')}
            </button>
            ${this.currentUser
              ? html`
                  <span class="footer-user">
                    <strong>${this.currentUser.name}</strong>
                    <button class="logout-btn" @click=${this.handleLogout}>${this.t('logoutBtn')}</button>
                  </span>
                `
              : nothing}
            <div class="submit-wrap">
              <button
                class="submit-btn"
                ?disabled=${!this.replyBody.trim() || this.isSubmittingReply}
                @click=${() => this.requestPostReply(parentComment.id)}
              >
                ${this.isSubmittingReply ? this.t('submittingBtn') : this.t('postReplyBtn')}
              </button>
              ${this.authPickerContext === 'reply' ? this.renderAuthPicker() : nothing}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (this.isOffline) {
      return html`
        <div class="status-card">
          <p>${this.t('offlineMessage')}</p>
          <button class="submit-btn" @click=${this.fetchComments}>${this.t('retry')}</button>
        </div>
      `;
    }

    return html`
      <div class="comments-widget">
        <!-- Page Reactions (giscus-style) -->
        ${this.renderPageReactions()}

        <!-- Editor Area -->
        <div class="editor-box">
          <div class="editor-toolbar">
            <div class="toolbar-buttons">
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.bold[0], FORMATS.bold[1], FORMATS.bold[2])} title="Bold"><strong>B</strong></button>
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.italic[0], FORMATS.italic[1], FORMATS.italic[2])} title="Italic"><em>I</em></button>
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.code[0], FORMATS.code[1], FORMATS.code[2])} title="Inline Code">&lt;/&gt;</button>
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.codeBlock[0], FORMATS.codeBlock[1], FORMATS.codeBlock[2])} title="Code Block">{ }</button>
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.link[0], FORMATS.link[1], FORMATS.link[2])} title="Link">🔗</button>
              <button class="toolbar-btn" @click=${() => this.insertFormat(FORMATS.quote[0], FORMATS.quote[1], FORMATS.quote[2])} title="Quote">”</button>
            </div>
            <div class="tab-buttons">
              <button
                class="tab-btn ${this.activeTab === 'write' ? 'active' : ''}"
                @click=${() => (this.activeTab = 'write')}
              >
                ${this.t('writeTab')}
              </button>
              <button
                class="tab-btn ${this.activeTab === 'preview' ? 'active' : ''}"
                @click=${() => (this.activeTab = 'preview')}
              >
                ${this.t('previewTab')}
              </button>
            </div>
          </div>

          ${this.activeTab === 'write'
            ? html`
                <textarea
                  class="editor-textarea"
                  placeholder=${this.t('placeholder')}
                  .value=${this.commentBody}
                  @input=${(e: any) => this.saveDraft(e.target.value)}
                  @keydown=${(e: KeyboardEvent) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      this.requestPostComment();
                    }
                  }}
                ></textarea>
              `
            : html`
                <div class="editor-preview">
                  ${this.commentBody
                    ? html`<div class="comment-body" .innerHTML=${renderMarkdownPreview(this.commentBody)}></div>`
                    : html`<span style="color: #94a3b8;">${this.t('previewEmpty')}</span>`}
                </div>
              `}

          <div class="editor-footer">
            <div class="editor-meta">
              <span>${this.commentBody.length} / 5,000 ${this.t('charLimit')}</span>
              <span>
                <button class="coc-link" @click=${() => (this.showCocModal = true)}>
                  📜 ${this.t('cocLink')}
                </button>
              </span>
            </div>

            <div class="editor-submit">
              ${this.currentUser
                ? html`
                    <span class="footer-user">
                      <strong>${this.currentUser.name}</strong>
                      ${this.currentUser.is_team
                        ? html`<span class="team-badge">${this.t('teamBadge')}</span>`
                        : nothing}
                      <button class="logout-btn" @click=${this.handleLogout}>${this.t('logoutBtn')}</button>
                    </span>
                  `
                : nothing}
              <div class="submit-wrap">
                <button
                  class="submit-btn"
                  ?disabled=${!this.commentBody.trim() || this.isSubmitting}
                  @click=${() => this.requestPostComment()}
                >
                  ${this.isSubmitting ? this.t('submittingBtn') : this.t('submitBtn')}
                </button>
                ${this.authPickerContext === 'comment' ? this.renderAuthPicker() : nothing}
              </div>
            </div>
          </div>
        </div>

        <!-- Comments List -->
        <div class="comments-section">
          <div class="widget-header">
            <h3>${this.t('comments')} (${this.comments.length})</h3>
          </div>
          <div class="comment-list">
          ${this.comments.map(
            (c) => html`
              <div class="comment-card" id="comment-${c.id}">
                <div class="comment-header">
                  <span class="comment-author">${c.author_name}</span>
                  ${c.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                  ${c.edited_at ? html`<span class="comment-date">${this.t('editedLabel')}</span>` : nothing}
                  <span class="comment-date">• ${new Date(c.created_at).toLocaleDateString()}</span>
                  ${c.can_edit && c.status !== 'pending'
                    ? html`<span class="owner-actions">${this.renderDeleteButton(c.id)}</span>`
                    : nothing}
                </div>

                ${c.status === 'pending'
                  ? html`
                      <div class="pending-review-box">
                        <div class="pending-review-header">
                          <span>⏳ ${this.t('pendingReviewTitle')}</span>
                          ${c.can_edit
                            ? html`
                                <span class="owner-actions">
                                  ${this.editingCommentId !== c.id
                                    ? html`
                                        <button
                                          class="revise-btn"
                                          @click=${() => this.startEditingComment(c.id, c.raw_markdown)}
                                        >
                                          ✎ ${this.t('reviseBtn')}
                                        </button>
                                      `
                                    : nothing}
                                  ${this.renderDeleteButton(c.id)}
                                </span>
                              `
                            : nothing}
                        </div>
                        <p class="pending-review-notice">${this.t('pendingReviewNotice')}</p>
                        ${c.moderation_reason
                          ? html`
                              <div class="pending-review-reason">
                                <strong>${this.t('assessmentReasonLabel')}</strong> ${c.moderation_reason}
                              </div>
                            `
                          : nothing}
                      </div>
                    `
                  : nothing}

                ${this.editingCommentId === c.id
                  ? html`
                      <div class="revision-editor">
                        <textarea
                          class="revision-textarea"
                          .value=${this.editingBody}
                          @input=${(e: any) => (this.editingBody = e.target.value)}
                        ></textarea>
                        <div class="revision-actions">
                          <button class="cancel-btn" @click=${this.cancelEditingComment}>
                            ${this.t('cancelRevisionBtn')}
                          </button>
                          <button
                            class="submit-btn"
                            ?disabled=${!this.editingBody.trim() || this.isSavingRevision}
                            @click=${() => this.handleSaveRevision(c.id)}
                          >
                            ${this.isSavingRevision ? this.t('savingRevisionBtn') : this.t('saveRevisionBtn')}
                          </button>
                        </div>
                      </div>
                    `
                  : html`<div class="comment-body" .innerHTML=${c.body_html}></div>`}

                <!-- Top-Level Comment Reactions & Reply Button -->
                ${c.status === 'approved' ? this.renderReactionsBar(c.reactions, c.id, true) : nothing}

                <!-- Inline Reply Form for this comment -->
                ${this.renderInlineReplyBox(c)}

                <!-- 1-Level Replies -->
                ${c.replies && c.replies.length > 0
                  ? html`
                      <div class="replies-list">
                        ${c.replies.map(
                          (r: any) => html`
                            <div class="comment-card reply-card" id="comment-${r.id}">
                              <div class="comment-header">
                                <span class="comment-author">${r.author_name}</span>
                                ${r.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                                <span class="comment-date">• ${new Date(r.created_at).toLocaleDateString()}</span>
                                ${r.can_edit && r.status !== 'pending'
                                  ? html`<span class="owner-actions">${this.renderDeleteButton(r.id)}</span>`
                                  : nothing}
                              </div>

                              ${r.status === 'pending'
                                ? html`
                                    <div class="pending-review-box">
                                      <div class="pending-review-header">
                                        <span>⏳ ${this.t('pendingReviewTitle')}</span>
                                        ${r.can_edit
                                          ? html`
                                              <span class="owner-actions">
                                                ${this.editingCommentId !== r.id
                                                  ? html`
                                                      <button
                                                        class="revise-btn"
                                                        @click=${() => this.startEditingComment(r.id, r.raw_markdown)}
                                                      >
                                                        ✎ ${this.t('reviseBtn')}
                                                      </button>
                                                    `
                                                  : nothing}
                                                ${this.renderDeleteButton(r.id)}
                                              </span>
                                            `
                                          : nothing}
                                      </div>
                                      <p class="pending-review-notice">${this.t('pendingReviewNotice')}</p>
                                      ${r.moderation_reason
                                        ? html`
                                            <div class="pending-review-reason">
                                              <strong>${this.t('assessmentReasonLabel')}</strong> ${r.moderation_reason}
                                            </div>
                                          `
                                        : nothing}
                                    </div>
                                  `
                                : nothing}

                              ${this.editingCommentId === r.id
                                ? html`
                                    <div class="revision-editor">
                                      <textarea
                                        class="revision-textarea"
                                        .value=${this.editingBody}
                                        @input=${(e: any) => (this.editingBody = e.target.value)}
                                      ></textarea>
                                      <div class="revision-actions">
                                        <button class="cancel-btn" @click=${this.cancelEditingComment}>
                                          ${this.t('cancelRevisionBtn')}
                                        </button>
                                        <button
                                          class="submit-btn"
                                          ?disabled=${!this.editingBody.trim() || this.isSavingRevision}
                                          @click=${() => this.handleSaveRevision(r.id)}
                                        >
                                          ${this.isSavingRevision ? this.t('savingRevisionBtn') : this.t('saveRevisionBtn')}
                                        </button>
                                      </div>
                                    </div>
                                  `
                                : html`<div class="comment-body" .innerHTML=${r.body_html}></div>`}

                              <!-- Reply-Level Reactions -->
                              ${r.status === 'approved' ? this.renderReactionsBar(r.reactions, r.id, false) : nothing}
                            </div>
                          `
                        )}
                      </div>
                    `
                  : nothing}
              </div>
            `
          )}
          </div>
        </div>
      </div>

      <!-- Code of Conduct Modal -->
      ${this.renderCocModal()}
    `;
  }
}
