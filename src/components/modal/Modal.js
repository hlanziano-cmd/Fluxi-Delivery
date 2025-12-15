/**
 * Modal Component
 * Reusable modal dialog component
 */
export class Modal {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || '';
        this.content = options.content || '';
        this.size = options.size || 'medium'; // small, medium, large
        this.onConfirm = options.onConfirm || null;
        this.onCancel = options.onCancel || null;
        this.confirmText = options.confirmText || 'Confirmar';
        this.cancelText = options.cancelText || 'Cancelar';
        this.showFooter = options.showFooter !== false;
        this.closeOnBackdrop = options.closeOnBackdrop !== false;
        this.element = null;
    }

    /**
     * Create and render modal
     */
    create() {
        const modalHTML = `
            <div class="modal-overlay" id="${this.id}">
                <div class="modal-container modal-${this.size}">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.title}</h3>
                        <button class="modal-close" aria-label="Cerrar">
                            ✕
                        </button>
                    </div>
                    <div class="modal-body">
                        ${this.content}
                    </div>
                    ${
                        this.showFooter
                            ? `
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-cancel">
                                ${this.cancelText}
                            </button>
                            <button class="btn btn-primary modal-confirm">
                                ${this.confirmText}
                            </button>
                        </div>
                    `
                            : ''
                    }
                </div>
            </div>
        `;

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.element = document.getElementById(this.id);

        // Setup event listeners
        this.setupEventListeners();

        return this;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.element.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => this.close());

        // Cancel button
        const cancelBtn = this.element.querySelector('.modal-cancel');
        cancelBtn?.addEventListener('click', () => {
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        });

        // Confirm button
        const confirmBtn = this.element.querySelector('.modal-confirm');
        confirmBtn?.addEventListener('click', () => {
            if (this.onConfirm) {
                this.onConfirm();
            }
        });

        // Close on backdrop click
        if (this.closeOnBackdrop) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.close();
                }
            });
        }

        // Close on ESC key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    /**
     * Open modal
     */
    open() {
        if (!this.element) {
            this.create();
        }
        this.element.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
        return this;
    }

    /**
     * Close modal
     */
    close() {
        this.element?.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll

        // Remove after animation
        setTimeout(() => {
            this.destroy();
        }, 300);
    }

    /**
     * Destroy modal
     */
    destroy() {
        // Remove event listeners
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }

        // Remove from DOM
        this.element?.remove();
        this.element = null;
    }

    /**
     * Update modal content
     */
    setContent(content) {
        const body = this.element?.querySelector('.modal-body');
        if (body) {
            body.innerHTML = content;
        }
        return this;
    }

    /**
     * Update modal title
     */
    setTitle(title) {
        const titleEl = this.element?.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
        return this;
    }

    /**
     * Show loading state in modal
     */
    setLoading(isLoading) {
        const confirmBtn = this.element?.querySelector('.modal-confirm');
        const cancelBtn = this.element?.querySelector('.modal-cancel');

        if (confirmBtn) {
            confirmBtn.disabled = isLoading;
            if (isLoading) {
                confirmBtn.classList.add('loading');
            } else {
                confirmBtn.classList.remove('loading');
            }
        }

        if (cancelBtn) {
            cancelBtn.disabled = isLoading;
        }

        return this;
    }

    /**
     * Static helper to create and open modal
     */
    static open(options) {
        const modal = new Modal(options);
        return modal.open();
    }

    /**
     * Static helper for confirmation dialog
     */
    static confirm(title, message, onConfirm) {
        return Modal.open({
            title,
            content: `<p>${message}</p>`,
            size: 'small',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm,
        });
    }

    /**
     * Static helper for alert dialog
     */
    static alert(title, message) {
        return Modal.open({
            title,
            content: `<p>${message}</p>`,
            size: 'small',
            showFooter: false,
        });
    }
}
