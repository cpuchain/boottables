/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AjaxResponse } from 'datatables.net';
import type { Model, SortOrder } from 'mongoose';
import type { TableParams } from './builder.js';

function isFieldNumber(model: Model<any>, key: string): boolean {
    const schemaType = model.schema.path(key);
    return schemaType && schemaType.instance === 'Number';
}

// Based on https://github.com/vinicius0026/datatables-query/blob/master/index.js
export async function runMongo(model: Model<any>, params: TableParams): Promise<AjaxResponse> {
    const { draw, start, length, searchable, search, sort, select } = params;

    const searchParams =
        searchable.length && search
            ? {
                  $or: searchable
                      .map((key) => {
                          // https://github.com/vinicius0026/datatables-query/issues/10
                          // https://github.com/vinicius0026/datatables-query/issues/4
                          if (isFieldNumber(model, String(key))) {
                              const n = Number(search);
                              if (!isNaN(n)) {
                                  return { [key]: n };
                              }
                              return;
                          }
                          return {
                              [key]: new RegExp(search, 'i'),
                          };
                      })
                      .filter((q) => q) as Record<string, number | RegExp>[],
              }
            : {};

    const [recordsTotal, recordsFiltered, data] = await Promise.all([
        model.estimatedDocumentCount().exec(),
        model.countDocuments(searchParams).exec(),
        model
            .find(searchParams)
            .sort(sort ? ([Object.values(sort)] as [string, SortOrder][]) : {})
            .select(select)
            .skip(start)
            .limit(length)
            .exec(),
    ]);

    return {
        draw,
        recordsTotal,
        recordsFiltered,
        data,
    };
}
