import 'altcha';
import altchaCss from 'altcha/altcha.css?inline';

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
    cocNotice: "By commenting, you agree to our",
    cocLink: "Code of Conduct",
    pendingNotice: "Your comment is being briefly reviewed by AI moderation.",
    deleteBtn: "Delete",
    editBtn: "Edit",
    editedLabel: "✎ edited",
    replyBtn: "Reply",
    cancelBtn: "Cancel",
    postReplyBtn: "Post Reply",
    replyPlaceholder: "Write a constructive reply...",
    pageReactionsTitle: "Article Reactions",
    replyingTo: "Replying to",
    loggedInAs: "Logged in as",
    logoutBtn: "Log out",
    orSignInWith: "Or sign in with:",
    popupBlockedNotice: "Login popup was blocked by your browser.",
    popupOpenManual: "Open Login Window",
    popupRedirectFallback: "or continue via redirect",
    emailLinkBtn: "✉️ Email Link",
    emailLinkPlaceholder: "Enter your email address...",
    sendMagicLinkBtn: "Send Login Link",
    sendingMagicLinkBtn: "Sending...",
    magicLinkSentMessage: "Check your inbox! We've sent a magic login link to",
    magicLinkSentInstructions: "Click the link in the email to complete your login.",
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
    cocNotice: "Mit deinem Kommentar stimmst du unserem",
    cocLink: "Verhaltenskodex",
    pendingNotice: "Dein Kommentar wird kurz durch die KI-Moderation geprüft.",
    deleteBtn: "Löschen",
    editBtn: "Bearbeiten",
    editedLabel: "✎ editiert",
    replyBtn: "Antworten",
    cancelBtn: "Abbrechen",
    postReplyBtn: "Antwort senden",
    replyPlaceholder: "Schreibe eine konstruktive Antwort...",
    pageReactionsTitle: "Artikel-Reaktionen",
    replyingTo: "Antwort an",
    loggedInAs: "Angemeldet als",
    logoutBtn: "Abmelden",
    orSignInWith: "Oder anmelden mit:",
    popupBlockedNotice: "Login-Popup wurde vom Browser blockiert.",
    popupOpenManual: "Login-Fenster manuell öffnen",
    popupRedirectFallback: "oder per Weiterleitung anmelden",
    emailLinkBtn: "✉️ E-Mail-Link",
    emailLinkPlaceholder: "Deine E-Mail-Adresse...",
    sendMagicLinkBtn: "Login-Link senden",
    sendingMagicLinkBtn: "Wird gesendet...",
    magicLinkSentMessage: "Postfach prüfen! Wir haben einen Login-Link gesendet an",
    magicLinkSentInstructions: "Klicke auf den Link in der E-Mail, um dich anzumelden.",
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

const REACTION_KINDS = [
  { kind: 'like', emoji: '👍' },
  { kind: 'love', emoji: '❤️' },
  { kind: 'rocket', emoji: '🚀' },
  { kind: 'celebrate', emoji: '🎉' },
  { kind: 'insightful', emoji: '💡' },
];

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

    .widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }

    .widget-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    /* Page Reactions Bar */
    .page-reactions-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .page-reactions-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    /* Auth Banner */
    .auth-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .social-buttons {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .social-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .social-btn:hover {
      background: #e2e8f0;
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
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .popup-retry-link {
      color: #00458b;
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
      border-color: #00458b;
    }

    .magic-send-btn {
      background: #00458b;
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
      background: #003366;
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
      border-radius: 6px;
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

    /* Editor */
    .editor-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
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

    .coc-notice {
      font-size: 0.8rem;
      color: #64748b;
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
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .submit-btn:hover {
      filter: brightness(0.9);
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
      border-radius: 8px;
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
      background: #00458b;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 3px;
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
    }

    /* Reactions Bar */
    .reactions-bar {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }

    .reaction-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 0.8rem;
      cursor: pointer;
      color: #334155;
      transition: all 0.15s ease-in-out;
    }

    .reaction-pill:hover,
    .reaction-pill.active {
      background: #e0f2fe;
      border-color: #38bdf8;
      color: #0369a1;
      transform: scale(1.05);
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
      padding: 2px 8px;
      border-radius: 20px;
      margin-left: 0.4rem;
      transition: all 0.15s ease-in-out;
    }

    .reply-action-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #00458b;
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
      border-radius: 6px;
      padding: 0.75rem;
    }

    /* Inline Reply Form */
    .inline-reply-box {
      margin-top: 0.85rem;
      margin-left: 1.5rem;
      padding: 0.85rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
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
      color: #475569;
    }

    .reply-textarea {
      width: 100%;
      min-height: 75px;
      padding: 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;
      background: #ffffff;
    }

    .reply-textarea:focus {
      outline: none;
      border-color: #00458b;
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
      gap: 0.5rem;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      color: #64748b;
    }

    .cancel-btn:hover {
      background: #e2e8f0;
      color: #1e293b;
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
      color: #0f172a;
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
      color: #0f172a;
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
      color: #0f172a;
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
  private authProviders: { id: string; name: string }[] = [];

  @state()
  private currentUser: { id: number; name: string; email: string; is_team: boolean } | null = null;

  @state()
  private blockedPopupUrl: string | null = null;

  @state()
  private blockedProviderId: string | null = null;

  @state()
  private altchaPayload = '';

  @state()
  private showMagicLinkInput = false;

  @state()
  private magicLinkEmail = '';

  @state()
  private isSendingMagicLink = false;

  @state()
  private magicLinkSentTo = '';

  async handleRequestMagicLink() {
    if (!this.magicLinkEmail.trim() || this.isSendingMagicLink) return;
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
        this.showMagicLinkInput = false;
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
        if (this.activeReplyParentId !== null) this.activeReplyParentId = null;
      }
    });

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success') {
        this.blockedPopupUrl = null;
        this.blockedProviderId = null;
        this.fetchAuth();
        this.fetchComments();
        this.fetchPageReactions();
      }
    });
  }

  async fetchAuth() {
    try {
      const [provRes, sessRes] = await Promise.all([
        fetch(`${this.resolvedApiBase}/api/auth/providers/`),
        fetch(`${this.resolvedApiBase}/api/auth/session/`, { credentials: 'include' }),
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
    this.blockedPopupUrl = null;
    this.blockedProviderId = null;
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth-callback.html`);
    const authUrl = `${this.resolvedApiBase}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${callbackUrl}&process=login`;

    // Direct synchronous call on click event
    const popup = window.open(authUrl, 'auth-popup', 'width=600,height=700,scrollbars=yes');

    // Detect if browser blocked the popup window
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      this.blockedPopupUrl = authUrl;
      this.blockedProviderId = providerId;
    }
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
      });
      if (res.ok) {
        this.pageReactions = await res.json();
      }
    } catch (_) {}
  }

  async fetchComments() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.resolvedApiBase}/api/comments/?thread_slug=${this.resolvedThreadSlug}`, {
        signal: controller.signal,
        headers: this.getHeaders(),
        credentials: 'include',
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

  async handlePostComment() {
    if (!this.commentBody.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    try {
      const payload: Record<string, any> = {
        thread_slug: this.resolvedThreadSlug,
        body_markdown: this.commentBody,
        guest_name: this.guestName || undefined,
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
    if (this.activeReplyParentId === parentId) {
      this.activeReplyParentId = null;
    } else {
      this.activeReplyParentId = parentId;
      this.replyBody = '';
      this.replyAltchaPayload = '';
    }
  }

  async handlePostReply(parentId: number) {
    if (!this.replyBody.trim() || this.isSubmittingReply) return;

    this.isSubmittingReply = true;
    try {
      const payload: Record<string, any> = {
        thread_slug: this.resolvedThreadSlug,
        parent_id: parentId,
        body_markdown: this.replyBody,
        guest_name: this.replyGuestName || undefined,
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
        this.replyAltchaPayload = '';
        this.activeReplyParentId = null;
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
      if (res.ok) {
        if (commentId === null) {
          await this.fetchPageReactions();
        } else {
          await this.fetchComments();
        }
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

  renderReactionsBar(reactions: { counts?: Record<string, number>; active?: string[] } | undefined, commentId: number | null, allowReply = false) {
    const counts = reactions?.counts || {};
    const active = reactions?.active || [];

    return html`
      <div class="reactions-bar">
        ${REACTION_KINDS.map(({ kind, emoji }) => {
          const count = counts[kind] || 0;
          const isActive = active.includes(kind);
          return html`
            <button
              class="reaction-pill ${isActive ? 'active' : ''}"
              @click=${() => this.toggleReaction(commentId, kind)}
            >
              ${emoji} ${count > 0 ? count : ''}
            </button>
          `;
        })}
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
              this.handlePostReply(parentComment.id);
            }
          }}
        ></textarea>

        <div class="reply-footer">
          <div class="editor-meta">
            ${!this.currentUser
              ? html`
                  <input
                    type="text"
                    class="name-input"
                    placeholder=${this.t('guestNamePlaceholder')}
                    .value=${this.replyGuestName}
                    @input=${(e: any) => (this.replyGuestName = e.target.value)}
                  />
                  <altcha-widget
                    challenge="${this.resolvedApiBase}/api/captcha/challenge/"
                    auto="onload"
                    spamfilter="false"
                    display="invisible"
                    @statechange=${(e: CustomEvent) => {
                      if (e.detail?.state === 'verified') {
                        this.replyAltchaPayload = e.detail?.payload || '';
                      } else if (e.detail?.state === 'expired' || e.detail?.state === 'error') {
                        this.replyAltchaPayload = '';
                      }
                    }}
                  ></altcha-widget>
                `
              : nothing}
          </div>

          <div class="reply-actions">
            <button class="cancel-btn" @click=${() => (this.activeReplyParentId = null)}>
              ${this.t('cancelBtn')}
            </button>
            <button
              class="submit-btn"
              ?disabled=${!this.replyBody.trim() || this.isSubmittingReply || (!this.currentUser && !this.replyAltchaPayload)}
              @click=${() => this.handlePostReply(parentComment.id)}
            >
              ${this.isSubmittingReply ? this.t('submittingBtn') : this.t('postReplyBtn')}
            </button>
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
        <div class="widget-header">
          <h3>${this.t('comments')} (${this.comments.length})</h3>
          <span class="coc-notice">
            ${this.t('cocNotice')}
            <button class="coc-link" @click=${() => (this.showCocModal = true)}>${this.t('cocLink')}</button>
          </span>
        </div>

        <!-- Page Reactions Bar (Reacting to the article itself) -->
        <div class="page-reactions-container">
          <span class="page-reactions-label">⭐ ${this.t('pageReactionsTitle')}:</span>
          ${this.renderReactionsBar(this.pageReactions, null, false)}
        </div>

        <!-- Auth Status Bar -->
        <div class="auth-bar">
          ${this.currentUser
            ? html`
                <span>
                  ${this.t('loggedInAs')} <strong>${this.currentUser.name}</strong>
                  ${this.currentUser.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                </span>
                <button class="logout-btn" @click=${this.handleLogout}>${this.t('logoutBtn')}</button>
              `
            : html`
                <span>${this.t('orSignInWith')}</span>
                <div class="social-buttons">
                  ${this.authProviders.map((p) =>
                    p.id === 'email_link'
                      ? html`
                          <button
                            class="social-btn"
                            @click=${() => (this.showMagicLinkInput = !this.showMagicLinkInput)}
                          >
                            ${this.t('emailLinkBtn')}
                          </button>
                        `
                      : html`
                          <button class="social-btn" @click=${() => this.loginWith(p.id)}>
                            ${p.name}
                          </button>
                        `
                  )}
                </div>

                ${this.showMagicLinkInput
                  ? html`
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
                        <button class="magic-cancel-btn" @click=${() => (this.showMagicLinkInput = false)}>✕</button>
                      </div>
                    `
                  : nothing}

                ${this.magicLinkSentTo
                  ? html`
                      <div class="magic-sent-banner">
                        <span>
                          ✉️ ${this.t('magicLinkSentMessage')} <strong>${this.magicLinkSentTo}</strong>.
                          ${this.t('magicLinkSentInstructions')}
                        </span>
                        <button class="close-banner-btn" @click=${() => (this.magicLinkSentTo = '')}>✕</button>
                      </div>
                    `
                  : nothing}
              `}

          <!-- Popup Blocked Fallback Banner -->
          ${this.blockedPopupUrl
            ? html`
                <div class="popup-blocked-banner">
                  <span>⚠️ ${this.t('popupBlockedNotice')}</span>
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
                      this.handlePostComment();
                    }
                  }}
                ></textarea>
              `
            : html`
                <div class="editor-preview">
                  ${this.commentBody
                    ? html`<div style="white-space: pre-wrap;">${this.commentBody}</div>`
                    : html`<span style="color: #94a3b8;">${this.t('previewEmpty')}</span>`}
                </div>
              `}

          <div class="editor-footer">
            <div class="editor-meta">
              ${!this.currentUser
                ? html`
                    <input
                      type="text"
                      class="name-input"
                      placeholder=${this.t('guestNamePlaceholder')}
                      .value=${this.guestName}
                      @input=${(e: any) => (this.guestName = e.target.value)}
                    />
                    <altcha-widget
                      challenge="${this.resolvedApiBase}/api/captcha/challenge/"
                      auto="onload"
                      spamfilter="false"
                      display="invisible"
                      hidefooter
                      hidelogo
                      @statechange=${(e: CustomEvent) => {
                        if (e.detail?.state === 'verified') {
                          this.altchaPayload = e.detail?.payload || '';
                        } else if (e.detail?.state === 'expired' || e.detail?.state === 'error') {
                          this.altchaPayload = '';
                        }
                      }}
                    ></altcha-widget>
                  `
                : nothing}
              <span>${this.commentBody.length} / 5,000 ${this.t('charLimit')}</span>
              <span>
                <button class="coc-link" @click=${() => (this.showCocModal = true)}>
                  📜 ${this.t('cocLink')}
                </button>
              </span>
            </div>

            <button
              class="submit-btn"
              ?disabled=${!this.commentBody.trim() || this.isSubmitting || (!this.currentUser && !this.altchaPayload)}
              @click=${this.handlePostComment}
            >
              ${this.isSubmitting ? this.t('submittingBtn') : this.t('submitBtn')}
            </button>
          </div>
        </div>

        <!-- Comments List -->
        <div class="comment-list">
          ${this.comments.map(
            (c) => html`
              <div class="comment-card" id="comment-${c.id}">
                <div class="comment-header">
                  <span class="comment-author">${c.author_name}</span>
                  ${c.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                  ${c.edited_at ? html`<span class="comment-date">${this.t('editedLabel')}</span>` : nothing}
                  <span class="comment-date">• ${new Date(c.created_at).toLocaleDateString()}</span>
                </div>

                <div class="comment-body" .innerHTML=${c.body_html}></div>

                <!-- Top-Level Comment Reactions & Reply Button -->
                ${this.renderReactionsBar(c.reactions, c.id, true)}

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
                              </div>
                              <div class="comment-body" .innerHTML=${r.body_html}></div>

                              <!-- Reply-Level Reactions -->
                              ${this.renderReactionsBar(r.reactions, r.id, false)}
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

      <!-- Code of Conduct Modal -->
      ${this.renderCocModal()}
    `;
  }
}
