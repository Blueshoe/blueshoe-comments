import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CODE_OF_CONDUCT_I18N, CodeOfConductContent } from './code-of-conduct';

const I18N: Record<string, Record<string, string>> = {
  en: {
    offlineMessage: "Our comment server is taking a coffee break ☕",
    retry: "Try again",
    comments: "Comments",
    teamBadge: "🛡️ Team",
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
    loggedInAs: "Logged in as",
    logoutBtn: "Log out",
    orSignInWith: "Or sign in with:",
  },
  de: {
    offlineMessage: "Unser Kommentar-Server macht gerade Kaffeepause ☕",
    retry: "Nochmal versuchen",
    comments: "Kommentare",
    teamBadge: "🛡️ Team",
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
    loggedInAs: "Angemeldet als",
    logoutBtn: "Abmelden",
    orSignInWith: "Oder anmelden mit:",
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

@customElement('community-comments')
export class CommunityComments extends LitElement {
  static styles = css`
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

    /* Auth Banner */
    .auth-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.4rem 0.75rem;
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
      background: #0284c7;
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

    .replies-list {
      margin-top: 1rem;
      margin-left: 1.5rem;
      padding-left: 1rem;
      border-left: 2px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Reactions Bar */
    .reactions-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
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
    }

    .reaction-pill:hover,
    .reaction-pill.active {
      background: #e0f2fe;
      border-color: #38bdf8;
      color: #0369a1;
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
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
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
  `;

  @property({ type: String, attribute: 'api-base' })
  apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8079' : `https://community.${window.location.hostname}`;

  @property({ type: String, attribute: 'thread-slug' })
  threadSlug = '';

  @property({ type: String })
  lang = typeof document !== 'undefined' && document.documentElement.lang.startsWith('de') ? 'de' : 'en';

  @state()
  private comments: any[] = [];

  @state()
  private isOffline = false;

  @state()
  private isSubmitting = false;

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

  private t(key: string): string {
    const dict = I18N[this.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  private get coc(): CodeOfConductContent {
    return CODE_OF_CONDUCT_I18N[this.lang] || CODE_OF_CONDUCT_I18N.en;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.loadDraft();
    this.fetchComments();
    this.fetchAuth();

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.showCocModal) {
        this.showCocModal = false;
      }
    });

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success') {
        this.fetchAuth();
        this.fetchComments();
      }
    });
  }

  async fetchAuth() {
    try {
      const [provRes, sessRes] = await Promise.all([
        fetch(`${this.apiBase}/api/auth/providers/`),
        fetch(`${this.apiBase}/api/auth/session/`, { credentials: 'include' }),
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
    const callbackUrl = encodeURIComponent(`${window.location.origin}/auth-callback.html`);
    const authUrl = `${this.apiBase}/_allauth/browser/v1/auth/provider/redirect?provider=${providerId}&callback_url=${callbackUrl}`;
    window.open(authUrl, 'auth-popup', 'width=600,height=700,scrollbars=yes');
  }

  async handleLogout() {
    try {
      await fetch(`${this.apiBase}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
      this.currentUser = null;
      this.fetchComments();
    } catch (_) {}
  }

  private loadDraft() {
    try {
      const saved = localStorage.getItem(`comment-draft:${this.threadSlug}`);
      if (saved) {
        this.commentBody = saved;
      }
    } catch (_) {}
  }

  private saveDraft(text: string) {
    this.commentBody = text;
    try {
      localStorage.setItem(`comment-draft:${this.threadSlug}`, text);
    } catch (_) {}
  }

  async fetchComments() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.apiBase}/api/comments/?thread_slug=${this.threadSlug}`, {
        signal: controller.signal,
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
    const textarea = this.shadowRoot?.querySelector('textarea');
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
        thread_slug: this.threadSlug,
        body_markdown: this.commentBody,
        guest_name: this.guestName || undefined,
        altcha: 'dummy_bypass',
      };

      const res = await fetch(`${this.apiBase}/api/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.commentBody = '';
        try {
          localStorage.removeItem(`comment-draft:${this.threadSlug}`);
        } catch (_) {}
        await this.fetchComments();
      }
    } catch (err) {
      console.error('Submit comment error', err);
    } finally {
      this.isSubmitting = false;
    }
  }

  async toggleReaction(commentId: number | null, kind: string) {
    try {
      const res = await fetch(`${this.apiBase}/api/reactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          thread_slug: this.threadSlug,
          comment_id: commentId,
          kind: kind,
        }),
      });
      if (res.ok) {
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
                  ${this.authProviders.map(
                    (p) => html`
                      <button class="social-btn" @click=${() => this.loginWith(p.id)}>
                        ${p.name}
                      </button>
                    `
                  )}
                </div>
              `}
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
              ?disabled=${!this.commentBody.trim() || this.isSubmitting}
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
              <div class="comment-card">
                <div class="comment-header">
                  <span class="comment-author">${c.author_name}</span>
                  ${c.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                  ${c.edited_at ? html`<span class="comment-date">${this.t('editedLabel')}</span>` : nothing}
                  <span class="comment-date">• ${new Date(c.created_at).toLocaleDateString()}</span>
                </div>

                <div class="comment-body" .innerHTML=${c.body_html}></div>

                <!-- Comment Reactions -->
                <div class="reactions-bar">
                  ${['like', 'love', 'rocket', 'celebrate', 'insightful'].map((kind) => {
                    const count = c.reactions?.counts?.[kind] || 0;
                    const isActive = c.reactions?.active?.includes(kind);
                    const emojiMap: Record<string, string> = {
                      like: '👍',
                      love: '❤️',
                      rocket: '🚀',
                      celebrate: '🎉',
                      insightful: '💡',
                    };
                    return html`
                      <button
                        class="reaction-pill ${isActive ? 'active' : ''}"
                        @click=${() => this.toggleReaction(c.id, kind)}
                      >
                        ${emojiMap[kind]} ${count > 0 ? count : ''}
                      </button>
                    `;
                  })}
                </div>

                <!-- 1-Level Replies -->
                ${c.replies && c.replies.length > 0
                  ? html`
                      <div class="replies-list">
                        ${c.replies.map(
                          (r: any) => html`
                            <div class="comment-card reply-card">
                              <div class="comment-header">
                                <span class="comment-author">${r.author_name}</span>
                                ${r.is_team ? html`<span class="team-badge">${this.t('teamBadge')}</span>` : nothing}
                                <span class="comment-date">• ${new Date(r.created_at).toLocaleDateString()}</span>
                              </div>
                              <div class="comment-body" .innerHTML=${r.body_html}></div>
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
