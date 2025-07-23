import { AjaxData, AjaxResponse } from 'datatables.net';
import jQuery from 'jquery';
import { Model } from 'mongoose';

export declare function isNaNorUndefined(...args: any[]): boolean;
export declare function buildSearchableFields(params?: AjaxData): (string | number)[];
export declare function buildSortParam(params?: AjaxData): SortParam | undefined;
export declare function buildSelectParams(params?: AjaxData): string[];
export interface SortParam {
	key: string | number;
	dir: "asc" | "desc";
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
export declare function buildParams(params?: AjaxData): TableParams;
export declare const tableParamsSchema: {
	readonly type: "object";
	readonly properties: {
		readonly draw: {
			readonly type: "number";
		};
		readonly start: {
			readonly type: "number";
		};
		readonly length: {
			readonly type: "number";
		};
		readonly searchable: {
			readonly type: "array";
			readonly items: {
				readonly anyOf: readonly [
					{
						readonly type: "string";
					},
					{
						readonly type: "number";
					}
				];
			};
		};
		readonly search: {
			readonly type: "string";
		};
		readonly sort: {
			readonly type: "object";
			readonly properties: {
				readonly key: {
					readonly type: "string";
				};
				readonly dir: {
					readonly type: "string";
					readonly enum: readonly [
						"asc",
						"desc"
					];
				};
			};
		};
		readonly select: {
			readonly type: "array";
			readonly items: {
				readonly type: "string";
			};
		};
	};
	readonly required: readonly [
		"draw",
		"start",
		"length",
		"searchable",
		"select"
	];
};
export declare function runMongo(model: Model<any>, params: TableParams): Promise<AjaxResponse>;
export declare function renderJs(inputData: any[], params: TableParams): AjaxResponse;
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
export declare function drawTable(table: Table, pagination?: PaginationParams): Promise<void>;
export declare function initTable(table: Table): void;
export type TableAjax = (params: TableParams) => Promise<AjaxResponse> | AjaxResponse;
export type RenderCard = (col: any, data?: any[]) => string;
export interface TableConstructor {
	ajax?: TableAjax;
	columns: {
		data: string;
	}[];
	tableId: string;
	selectEntries?: number[];
	cardSize?: number;
	visiblePages?: number;
	data?: any[];
	renderCard?: RenderCard;
}
export declare class Table {
	$: typeof jQuery;
	draw: number;
	ajax?: TableAjax;
	columns: {
		data: string;
		text?: string;
	}[];
	tableId: string;
	selectEntries: number[];
	cardSize?: number;
	visiblePages: number;
	data?: any[];
	renderCard?: RenderCard;
	constructor(constructor: TableConstructor);
	drawTable(pagination?: PaginationParams): Promise<void>;
	getResponse(params: TableParams): Promise<AjaxResponse> | AjaxResponse;
}

export {};
