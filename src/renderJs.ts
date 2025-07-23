/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AjaxResponse } from 'datatables.net';
import type { TableParams } from './builder.js';

export function renderJs(inputData: any[], params: TableParams): AjaxResponse {
    const { draw, start, length, searchable, search, sort, select } = params;

    try {
        const filteredData = inputData
            // Find
            .filter((_data) => {
                return searchable.length && search
                    ? searchable.some((key) => {
                          return String(_data[key]).includes(search);
                      })
                    : true;
            });

        const data = filteredData
            // Sort
            .sort((a, b) => {
                const { key, dir } = sort || {};

                if (!key || !dir || (dir !== 'asc' && dir !== 'desc')) {
                    return 0;
                }

                if (dir === 'asc') {
                    return typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key];
                } else {
                    return typeof b[key] === 'string' ? b[key].localeCompare(a[key]) : b[key] - a[key];
                }
            })
            // Select
            .map((_data) => {
                return select.reduce(
                    (acc, key) => {
                        acc[key] = _data[key];
                        return acc;
                    },
                    {} as Record<string, any>,
                );
            })
            // Slice
            .slice(start, start + length);

        return {
            draw,
            recordsTotal: inputData.length,
            recordsFiltered: filteredData.length,
            data,
        };
    } catch (error: any) {
        return {
            draw,
            recordsTotal: inputData.length,
            recordsFiltered: inputData.length,
            data: undefined,
            error: error.message,
        };
    }
}
