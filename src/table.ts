// Mini DataTable with Cards
/* eslint-disable @typescript-eslint/no-explicit-any */
import type jQuery from 'jquery';
import type { AjaxResponse } from 'datatables.net';
import type { SortParam, TableParams } from './builder.js';
import { renderJs } from './renderJs.js';

/**
{
  "start": 10,
  "length": 10,
  "search": "",
  "sort": {
    "key": "id",
    "dir": "asc"
  }
}
**/
export interface PaginationParams {
    start?: number;
    length?: number;
    search?: string;
    sort?: SortParam;
}

export async function drawTable(table: Table, pagination?: PaginationParams) {
    try {
        const { $, tableId, visiblePages, renderCard } = table;

        // TableParams
        const draw = Number(table.draw);
        const start = pagination?.start || 0;
        const length = pagination?.length || 6;
        const searchable = table.columns.map((c) => c.data);
        const search = pagination?.search || '';
        const sort = pagination?.sort || {
            key: searchable[0],
            dir: 'asc',
        };
        const select = [...searchable];

        const tableParams: TableParams = {
            draw,
            start,
            length,
            searchable,
            search,
            sort,
            select,
        };

        table.draw++;

        const { recordsTotal, recordsFiltered, data } = await table.getResponse(tableParams);

        $(`#t_${tableId}_entries_list`).val(length);
        $(`#t_${tableId}_sort`).val(sort.key);

        /**
         * Render cards
         */
        const cardSize = table.cardSize ? table.cardSize : length === 1 ? 12 : length === 2 ? 6 : 4;

        $(`#t_${tableId}_cards`).empty();

        (data as any[]).forEach((item) => {
            const cardContext = renderCard
                ? renderCard(item, data)
                : `
                <div class="col-md-${cardSize}">
                    <div class="card">
                        <div class="card-body">
                            ${table.columns
                                .map(({ data: key, text }, i) => {
                                    if (i === 0) {
                                        return `<h5 class="card-title">${text || key}: ${item[key]}</h5>`;
                                    } else {
                                        return `<p class="card-text">${text || key}: ${item[key]}</p>`;
                                    }
                                })
                                .join('')}
                        </div>
                    </div>
                </div>
            `;

            $(`#t_${tableId}_cards`).append(cardContext);
        });

        $(`#t_${tableId}_cards`).data('start', start);
        $(`#t_${tableId}_cards`).data('end', recordsFiltered || 0);

        /**
         * Generate Pagination
         */
        const currentPage = Math.floor(start / length) + 1;
        const totalPages = Math.max(1, Math.ceil((recordsFiltered ?? 0) / length));

        // Calculate pages for pagination
        const startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
        const endPage = Math.min(totalPages, startPage + visiblePages - 1);
        const adjustedStartPage = Math.max(1, endPage - visiblePages + 1);

        $(`#t_${tableId}_pagination`).empty();
        $(`#t_${tableId}_pagination`).append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" id="prev-btn">Previous</button>
        </li>
        `);

        for (let i = adjustedStartPage; i <= endPage; ++i) {
            $(`#t_${tableId}_pagination`).append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link">${i}</button>
            </li>
            `);
        }

        $(`#t_${tableId}_pagination`).append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" id="next-btn">Next</button>
        </li>
        `);

        /**
         * Update Entries info
         */
        const endCount = Math.min(currentPage * length, recordsFiltered ?? 0);

        $(`#t_${tableId}_entries`).text(
            `Showing ${start + 1} to ${endCount} of ${recordsFiltered} entries` +
                (recordsTotal !== recordsFiltered ? ` (filtered from ${recordsTotal} total entries)` : ''),
        );

        // eslint-disable-next-line no-empty
    } catch {}
}

export function initTable(table: Table) {
    const { $, tableId, selectEntries, columns } = table;

    $(`#${tableId}`).empty();

    // Init table
    $(`#${tableId}`).append(`
        <!-- Controls above the cards -->
        <div class="row gy-2 mb-4 align-items-center">
    
            <!-- Entries Dropdown -->
            <div class="col-12 col-md-4 d-flex align-items-center justify-content-center justify-content-md-start">
                <label class="me-2">Show</label>
                <select id="t_${tableId}_entries_list" class="form-select w-auto me-2">
                    ${selectEntries
                        .map((e, i) => {
                            return `<option value="${e}" ${i === 0 ? 'selected' : ''}>${e}</option>`;
                        })
                        .join('')}
                </select>
                <span>entries</span>
            </div>

            <!-- Sort Dropdown -->
            <div class="col-12 col-md-8 d-flex align-items-center justify-content-center justify-content-md-end gap-2">
                <label>Sort by</label>
                <select id="t_${tableId}_sort" class="form-select w-auto">
                    ${columns
                        .map(({ data, text }, i) => {
                            return `<option value="${data}" ${i === 0 ? 'selected' : ''}>${text || data}</option>`;
                        })
                        .join('')}
                </select>
                <!-- Search Bar -->
                <input id="t_${tableId}_search" type="text" class="form-control" style="max-width: 150px" placeholder="Search by">
            </div>

        </div>

        <!-- Data cards row -->
        <div id="t_${tableId}_cards" class="row gy-4 mb-4" data-start="0", data-end="0">
        </div>

        <!-- Bottom controls -->
        <div class="row gy-2 mb-4 align-items-center">
            <!-- Showing info, center on xs, left on md+ -->
            <div id="t_${tableId}_entries" class="col-12 col-md-6 d-flex align-items-center justify-content-center justify-content-md-start">
                Showing 0 to 0 of 0 entries
            </div>
            
            <!-- Pagination, center on xs, right on md+ -->
            <div class="col-12 col-md-6 d-flex align-items-center justify-content-center justify-content-md-end">
                <nav aria-label="Page navigation">
                    <ul id="t_${tableId}_pagination" class="pagination mb-0">
                        <li class="page-item disabled">
                            <a class="page-link" href="#">Previous</a>
                        </li>
                        <li class="page-item active">
                            <a class="page-link" href="#">1</a>
                        </li>
                        <li class="page-item ">
                            <a class="page-link" href="#">Next</a>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    `);

    drawTable(table);

    $(`#t_${tableId}_entries_list`).on('change', async function (e) {
        e.preventDefault();
        await drawTable(table, {
            start: 0, // Reset to the first page
            length: parseInt($(this).val() as string),
            search: $(`#t_${tableId}_search`).val() as string,
            sort: {
                key: $(`#t_${tableId}_sort`).val() as string,
                dir: 'asc',
            },
        });
    });

    $(`#t_${tableId}_sort`).on('change', async function (e) {
        e.preventDefault();
        await drawTable(table, {
            start: 0, // Reset to the first page
            length: parseInt($(`#t_${tableId}_entries_list`).val() as string),
            search: $(`#t_${tableId}_search`).val() as string,
            sort: {
                key: $(this).val() as string,
                dir: 'asc',
            },
        });
    });

    $(`#t_${tableId}_search`).on('input', async function (e) {
        e.preventDefault();
        await drawTable(table, {
            start: 0, // Reset to the first page
            length: parseInt($(`#t_${tableId}_entries_list`).val() as string),
            search: $(this).val() as string,
            sort: {
                key: $(`#t_${tableId}_sort`).val() as string,
                dir: 'asc',
            },
        });
    });

    $(`#t_${tableId}_pagination`).on('click', '.page-link', async function (e) {
        e.preventDefault();

        const pagination = $(this).text();
        const currStart = parseInt($(`#t_${tableId}_cards`).data('start'));
        const end = parseInt($(`#t_${tableId}_cards`).data('end'));
        const length = parseInt($(`#t_${tableId}_entries_list`).val() as string);

        const start =
            pagination === 'Previous'
                ? Math.max(0, currStart - length)
                : pagination === 'Next'
                  ? Math.min(currStart + length, end)
                  : (parseInt(pagination) - 1) * length;

        await drawTable(table, {
            start,
            length,
            search: $(`#t_${tableId}_search`).val() as string,
            sort: {
                key: $(`#t_${tableId}_sort`).val() as string,
                dir: 'asc',
            },
        });
    });
}

export type TableAjax = (params: TableParams) => Promise<AjaxResponse> | AjaxResponse;

export type RenderCard = (col: any, data?: any[]) => string;

export interface TableConstructor {
    // Inherit from DataTables
    ajax?: TableAjax;
    columns: {
        data: string;
    }[];

    // Our settings
    tableId: string;
    selectEntries?: number[];
    cardSize?: number;
    visiblePages?: number;
    data?: any[];
    renderCard?: RenderCard;
}

export class Table {
    $: typeof jQuery;
    draw: number;

    // Inherit from DataTables
    ajax?: TableAjax;
    columns: {
        data: string;
        text?: string;
    }[];

    // Our settings
    tableId: string;
    selectEntries: number[];
    cardSize?: number;
    visiblePages: number;
    data?: any[];
    renderCard?: RenderCard;

    constructor(constructor: TableConstructor) {
        const { ajax, columns, tableId, selectEntries, cardSize, data, renderCard } = constructor;

        const JQuery = (globalThis as { $?: typeof jQuery })?.$;

        if (!JQuery) {
            throw new Error('Does not have jQuery');
        }

        this.$ = JQuery;
        this.draw = 0;

        this.ajax = ajax;
        this.columns = columns;

        this.tableId = tableId;
        this.selectEntries = selectEntries ?? [3, 6, 12];
        this.cardSize = cardSize;
        this.visiblePages = 5;
        this.data = data;
        this.renderCard = renderCard;

        initTable(this);
    }

    async drawTable(pagination?: PaginationParams) {
        return drawTable(this, pagination);
    }

    getResponse(params: TableParams): Promise<AjaxResponse> | AjaxResponse {
        if (this.data) {
            return renderJs(this.data, params);
        }
        if (this.ajax) {
            return this.ajax(params);
        }
        return {
            draw: params.draw,
            recordsTotal: 0,
            recordsFiltered: 0,
            data: [],
        };
    }
}
