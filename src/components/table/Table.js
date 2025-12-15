/**
 * Table Component
 * Reusable data table component with pagination, sorting, and search
 */
export class Table {
    constructor(options = {}) {
        this.containerId = options.containerId;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.actions = options.actions || [];
        this.pagination = options.pagination !== false;
        this.pageSize = options.pageSize || 10;
        this.currentPage = 1;
        this.searchable = options.searchable !== false;
        this.sortable = options.sortable !== false;
        this.onRowClick = options.onRowClick || null;
        this.emptyMessage = options.emptyMessage || 'No hay datos para mostrar';

        // Sorting state
        this.sortColumn = null;
        this.sortDirection = 'asc';

        // Search state
        this.searchTerm = '';

        this.container = document.getElementById(this.containerId);
    }

    /**
     * Initialize table
     */
    init() {
        if (!this.container) {
            console.error(`[Table] Container #${this.containerId} not found`);
            return;
        }

        this.render();
        return this;
    }

    /**
     * Render complete table
     */
    render() {
        const tableHTML = `
            <div class="table-wrapper">
                ${this.searchable ? this.renderSearch() : ''}
                <div class="table-container">
                    ${this.renderTable()}
                </div>
                ${this.pagination ? this.renderPagination() : ''}
            </div>
        `;

        this.container.innerHTML = tableHTML;
        this.setupEventListeners();
    }

    /**
     * Render search bar
     */
    renderSearch() {
        return `
            <div class="table-search">
                <input
                    type="text"
                    class="table-search-input"
                    placeholder="Buscar..."
                    value="${this.searchTerm}"
                >
            </div>
        `;
    }

    /**
     * Render table
     */
    renderTable() {
        const filteredData = this.getFilteredData();
        const paginatedData = this.getPaginatedData(filteredData);

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        ${this.columns.map((col) => this.renderHeaderCell(col)).join('')}
                        ${this.actions.length > 0 ? '<th class="table-actions-header">Acciones</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${paginatedData.length > 0 ? paginatedData.map((row, index) => this.renderRow(row, index)).join('') : this.renderEmptyRow()}
                </tbody>
            </table>
        `;
    }

    /**
     * Render header cell
     */
    renderHeaderCell(column) {
        const sortIcon = this.getSortIcon(column.key);
        const sortClass = this.sortable && column.sortable !== false ? 'sortable' : '';

        return `
            <th class="${sortClass}" data-column="${column.key}">
                ${column.label}
                ${sortClass ? `<span class="sort-icon">${sortIcon}</span>` : ''}
            </th>
        `;
    }

    /**
     * Get sort icon for column
     */
    getSortIcon(columnKey) {
        if (this.sortColumn !== columnKey) {
            return '⇅';
        }
        return this.sortDirection === 'asc' ? '↑' : '↓';
    }

    /**
     * Render table row
     */
    renderRow(row, index) {
        const clickableClass = this.onRowClick ? 'clickable' : '';

        return `
            <tr class="${clickableClass}" data-index="${index}">
                ${this.columns.map((col) => this.renderCell(row, col)).join('')}
                ${this.actions.length > 0 ? this.renderActionsCell(row) : ''}
            </tr>
        `;
    }

    /**
     * Render table cell
     */
    renderCell(row, column) {
        let value = row[column.key];

        // Apply custom render function if provided
        if (column.render) {
            value = column.render(value, row);
        }

        return `<td>${value !== null && value !== undefined ? value : '-'}</td>`;
    }

    /**
     * Render actions cell
     */
    renderActionsCell(row) {
        const actionButtons = this.actions
            .map((action) => {
                const isVisible = action.visible ? action.visible(row) : true;
                if (!isVisible) return '';

                return `
                <button
                    class="btn btn-sm btn-${action.variant || 'primary'} table-action-btn"
                    data-action="${action.name}"
                    data-id="${row.id}"
                    title="${action.label}"
                >
                    ${action.icon || action.label}
                </button>
            `;
            })
            .join('');

        return `<td class="table-actions">${actionButtons}</td>`;
    }

    /**
     * Render empty row
     */
    renderEmptyRow() {
        const colSpan = this.columns.length + (this.actions.length > 0 ? 1 : 0);
        return `
            <tr>
                <td colspan="${colSpan}" class="table-empty">
                    ${this.emptyMessage}
                </td>
            </tr>
        `;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.pageSize);

        if (totalPages <= 1) {
            return '';
        }

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }

        return `
            <div class="table-pagination">
                <button
                    class="btn btn-sm btn-secondary pagination-btn"
                    data-page="prev"
                    ${this.currentPage === 1 ? 'disabled' : ''}
                >
                    ← Anterior
                </button>

                <div class="pagination-pages">
                    ${pages
                        .map(
                            (page) => `
                        <button
                            class="btn btn-sm ${page === this.currentPage ? 'btn-primary' : 'btn-secondary'} pagination-btn"
                            data-page="${page}"
                        >
                            ${page}
                        </button>
                    `
                        )
                        .join('')}
                </div>

                <button
                    class="btn btn-sm btn-secondary pagination-btn"
                    data-page="next"
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                >
                    Siguiente →
                </button>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = this.container.querySelector('.table-search-input');
        searchInput?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            this.render();
        });

        // Sort headers
        const sortableHeaders = this.container.querySelectorAll('th.sortable');
        sortableHeaders.forEach((header) => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.handleSort(column);
            });
        });

        // Pagination buttons
        const paginationBtns = this.container.querySelectorAll('.pagination-btn');
        paginationBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.handlePagination(page);
            });
        });

        // Action buttons
        const actionBtns = this.container.querySelectorAll('.table-action-btn');
        actionBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionName = btn.dataset.action;
                const id = btn.dataset.id;
                const action = this.actions.find((a) => a.name === actionName);
                if (action && action.handler) {
                    action.handler(
                        id,
                        this.data.find((row) => row.id === id)
                    );
                }
            });
        });

        // Row click
        if (this.onRowClick) {
            const rows = this.container.querySelectorAll('tr.clickable');
            rows.forEach((row) => {
                row.addEventListener('click', () => {
                    const index = parseInt(row.dataset.index);
                    const filteredData = this.getFilteredData();
                    const paginatedData = this.getPaginatedData(filteredData);
                    this.onRowClick(paginatedData[index]);
                });
            });
        }
    }

    /**
     * Handle sort
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.render();
    }

    /**
     * Handle pagination
     */
    handlePagination(page) {
        const filteredData = this.getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.pageSize);

        if (page === 'prev' && this.currentPage > 1) {
            this.currentPage--;
        } else if (page === 'next' && this.currentPage < totalPages) {
            this.currentPage++;
        } else if (!isNaN(page)) {
            this.currentPage = parseInt(page);
        }

        this.render();
    }

    /**
     * Get filtered data
     */
    getFilteredData() {
        let filtered = [...this.data];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter((row) => {
                return this.columns.some((col) => {
                    const value = row[col.key];
                    if (value === null || value === undefined) return false;
                    return value.toString().toLowerCase().includes(this.searchTerm.toLowerCase());
                });
            });
        }

        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aVal = a[this.sortColumn];
                const bVal = b[this.sortColumn];

                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;

                const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return filtered;
    }

    /**
     * Get paginated data
     */
    getPaginatedData(data) {
        if (!this.pagination) {
            return data;
        }

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return data.slice(start, end);
    }

    /**
     * Update table data
     */
    setData(data) {
        this.data = data;
        this.currentPage = 1;
        this.render();
        return this;
    }

    /**
     * Update table data (alias for setData)
     */
    updateData(data) {
        return this.setData(data);
    }

    /**
     * Refresh table
     */
    refresh() {
        this.render();
        return this;
    }

    /**
     * Destroy table
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
