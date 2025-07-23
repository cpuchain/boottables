import type { AjaxData } from 'datatables.net';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNaNorUndefined(...args: any[]): boolean {
    return args.some((arg) => isNaN(arg) || (!arg && arg !== 0));
}

export function buildSearchableFields(params?: AjaxData): (string | number)[] {
    if (!params?.columns) {
        return [];
    }

    return params.columns
        .filter((c) => (typeof c.searchable === 'string' ? JSON.parse(c.searchable) : c.searchable))
        .map((c) => c.data);
}

export function buildSortParam(params?: AjaxData): SortParam | undefined {
    if (!Array.isArray(params?.order) || !params.order.length) {
        return;
    }

    const sortColumn = Number(params.order[0].column);
    const dir = params.order[0].dir;

    if (
        isNaNorUndefined(sortColumn) ||
        !Array.isArray(params.columns) ||
        sortColumn >= params.columns.length
    ) {
        return;
    }

    const parsedOrderable =
        typeof params.columns[sortColumn].orderable === 'string'
            ? (JSON.parse(params.columns[sortColumn].orderable) as boolean)
            : params.columns[sortColumn].orderable;

    if (parsedOrderable === false) {
        return;
    }

    const key = params.columns[sortColumn].data;

    if (!key) {
        return;
    }

    return {
        key,
        dir,
    } as SortParam;
}

export function buildSelectParams(params?: AjaxData): string[] {
    if (!Array.isArray(params?.columns)) {
        return [];
    }

    return params.columns.map((col) => String(col.data));
}

export interface SortParam {
    key: string | number;
    dir: 'asc' | 'desc';
}

export interface TableParams {
    draw: number;
    start: number;
    length: number;
    searchable: (string | number)[];
    search?: string;
    sort?: SortParam;
    select: string[];
}

export function buildParams(params?: AjaxData): TableParams {
    return {
        draw: Number(params?.draw),
        start: Number(params?.start),
        length: Number(params?.length),
        searchable: buildSearchableFields(params),
        search: params?.search?.value,
        sort: buildSortParam(params),
        select: buildSelectParams(params),
    };
}

export const tableParamsSchema = {
    type: 'object',
    properties: {
        draw: { type: 'number' },
        start: { type: 'number' },
        length: { type: 'number' },
        searchable: {
            type: 'array',
            items: {
                anyOf: [{ type: 'string' }, { type: 'number' }],
            },
        },
        search: { type: 'string' },
        sort: {
            type: 'object',
            properties: {
                key: { type: 'string' },
                dir: { type: 'string', enum: ['asc', 'desc'] },
            },
        },
        select: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    required: ['draw', 'start', 'length', 'searchable', 'select'],
} as const;
