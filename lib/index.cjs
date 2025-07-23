'use strict';

function isNaNorUndefined(...args) {
  return args.some((arg) => isNaN(arg) || !arg && arg !== 0);
}
function buildSearchableFields(params) {
  if (!params?.columns) {
    return [];
  }
  return params.columns.filter((c) => typeof c.searchable === "string" ? JSON.parse(c.searchable) : c.searchable).map((c) => c.data);
}
function buildSortParam(params) {
  if (!Array.isArray(params?.order) || !params.order.length) {
    return;
  }
  const sortColumn = Number(params.order[0].column);
  const dir = params.order[0].dir;
  if (isNaNorUndefined(sortColumn) || !Array.isArray(params.columns) || sortColumn >= params.columns.length) {
    return;
  }
  const parsedOrderable = typeof params.columns[sortColumn].orderable === "string" ? JSON.parse(params.columns[sortColumn].orderable) : params.columns[sortColumn].orderable;
  if (parsedOrderable === false) {
    return;
  }
  const key = params.columns[sortColumn].data;
  if (!key) {
    return;
  }
  return {
    key,
    dir
  };
}
function buildSelectParams(params) {
  if (!Array.isArray(params?.columns)) {
    return [];
  }
  return params.columns.map((col) => String(col.data));
}
function buildParams(params) {
  return {
    draw: Number(params?.draw),
    start: Number(params?.start),
    length: Number(params?.length),
    searchable: buildSearchableFields(params),
    search: params?.search?.value,
    sort: buildSortParam(params),
    select: buildSelectParams(params)
  };
}
const tableParamsSchema = {
  type: "object",
  properties: {
    draw: { type: "number" },
    start: { type: "number" },
    length: { type: "number" },
    searchable: {
      type: "array",
      items: {
        anyOf: [{ type: "string" }, { type: "number" }]
      }
    },
    search: { type: "string" },
    sort: {
      type: "object",
      properties: {
        key: { type: "string" },
        dir: { type: "string", enum: ["asc", "desc"] }
      }
    },
    select: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["draw", "start", "length", "searchable", "select"]
};

function isFieldNumber(model, key) {
  const schemaType = model.schema.path(key);
  return schemaType && schemaType.instance === "Number";
}
async function runMongo(model, params) {
  const { draw, start, length, searchable, search, sort, select } = params;
  const searchParams = searchable.length && search ? {
    $or: searchable.map((key) => {
      if (isFieldNumber(model, String(key))) {
        const n = Number(search);
        if (!isNaN(n)) {
          return { [key]: n };
        }
        return;
      }
      return {
        [key]: new RegExp(search, "i")
      };
    }).filter((q) => q)
  } : {};
  const [recordsTotal, recordsFiltered, data] = await Promise.all([
    model.estimatedDocumentCount().exec(),
    model.countDocuments(searchParams).exec(),
    model.find(searchParams).sort(sort ? [Object.values(sort)] : {}).select(select).skip(start).limit(length).exec()
  ]);
  return {
    draw,
    recordsTotal,
    recordsFiltered,
    data
  };
}

function renderJs(inputData, params) {
  const { draw, start, length, searchable, search, sort, select } = params;
  try {
    const filteredData = inputData.filter((_data) => {
      return searchable.length && search ? searchable.some((key) => {
        return String(_data[key]).includes(search);
      }) : true;
    });
    const data = filteredData.sort((a, b) => {
      const { key, dir } = sort || {};
      if (!key || !dir || dir !== "asc" && dir !== "desc") {
        return 0;
      }
      if (dir === "asc") {
        return typeof a[key] === "string" ? a[key].localeCompare(b[key]) : a[key] - b[key];
      } else {
        return typeof b[key] === "string" ? b[key].localeCompare(a[key]) : b[key] - a[key];
      }
    }).map((_data) => {
      return select.reduce(
        (acc, key) => {
          acc[key] = _data[key];
          return acc;
        },
        {}
      );
    }).slice(start, start + length);
    return {
      draw,
      recordsTotal: inputData.length,
      recordsFiltered: filteredData.length,
      data
    };
  } catch (error) {
    return {
      draw,
      recordsTotal: inputData.length,
      recordsFiltered: inputData.length,
      data: void 0,
      error: error.message
    };
  }
}

async function drawTable(table, pagination) {
  try {
    const { $, tableId, visiblePages, renderCard } = table;
    const draw = Number(table.draw);
    const start = pagination?.start || 0;
    const length = pagination?.length || 6;
    const searchable = table.columns.map((c) => c.data);
    const search = pagination?.search || "";
    const sort = pagination?.sort || {
      key: searchable[0],
      dir: "asc"
    };
    const select = [...searchable];
    const tableParams = {
      draw,
      start,
      length,
      searchable,
      search,
      sort,
      select
    };
    table.draw++;
    const { recordsTotal, recordsFiltered, data } = await table.getResponse(tableParams);
    $(`#t_${tableId}_entries_list`).val(length);
    $(`#t_${tableId}_sort`).val(sort.key);
    const cardSize = table.cardSize ? table.cardSize : length === 1 ? 12 : length === 2 ? 6 : 4;
    $(`#t_${tableId}_cards`).empty();
    data.forEach((item) => {
      const cardContext = renderCard ? renderCard(item, data) : `
                <div class="col-md-${cardSize}">
                    <div class="card">
                        <div class="card-body">
                            ${table.columns.map(({ data: key, text }, i) => {
        if (i === 0) {
          return `<h5 class="card-title">${text || key}: ${item[key]}</h5>`;
        } else {
          return `<p class="card-text">${text || key}: ${item[key]}</p>`;
        }
      }).join("")}
                        </div>
                    </div>
                </div>
            `;
      $(`#t_${tableId}_cards`).append(cardContext);
    });
    $(`#t_${tableId}_cards`).data("start", start);
    $(`#t_${tableId}_cards`).data("end", recordsFiltered || 0);
    const currentPage = Math.floor(start / length) + 1;
    const totalPages = Math.max(1, Math.ceil((recordsFiltered ?? 0) / length));
    const startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    const endPage = Math.min(totalPages, startPage + visiblePages - 1);
    const adjustedStartPage = Math.max(1, endPage - visiblePages + 1);
    $(`#t_${tableId}_pagination`).empty();
    $(`#t_${tableId}_pagination`).append(`
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" id="prev-btn">Previous</button>
        </li>
        `);
    for (let i = adjustedStartPage; i <= endPage; ++i) {
      $(`#t_${tableId}_pagination`).append(`
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link">${i}</button>
            </li>
            `);
    }
    $(`#t_${tableId}_pagination`).append(`
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" id="next-btn">Next</button>
        </li>
        `);
    const endCount = Math.min(currentPage * length, recordsFiltered ?? 0);
    $(`#t_${tableId}_entries`).text(
      `Showing ${start + 1} to ${endCount} of ${recordsFiltered} entries` + (recordsTotal !== recordsFiltered ? ` (filtered from ${recordsTotal} total entries)` : "")
    );
  } catch {
  }
}
function initTable(table) {
  const { $, tableId, selectEntries, columns } = table;
  $(`#${tableId}`).empty();
  $(`#${tableId}`).append(`
        <!-- Controls above the cards -->
        <div class="row gy-2 mb-4 align-items-center">
    
            <!-- Entries Dropdown -->
            <div class="col-12 col-md-4 d-flex align-items-center justify-content-center justify-content-md-start">
                <label class="me-2">Show</label>
                <select id="t_${tableId}_entries_list" class="form-select w-auto me-2">
                    ${selectEntries.map((e, i) => {
    return `<option value="${e}" ${i === 0 ? "selected" : ""}>${e}</option>`;
  }).join("")}
                </select>
                <span>entries</span>
            </div>

            <!-- Sort Dropdown -->
            <div class="col-12 col-md-8 d-flex align-items-center justify-content-center justify-content-md-end gap-2">
                <label>Sort by</label>
                <select id="t_${tableId}_sort" class="form-select w-auto">
                    ${columns.map(({ data, text }, i) => {
    return `<option value="${data}" ${i === 0 ? "selected" : ""}>${text || data}</option>`;
  }).join("")}
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
  $(`#t_${tableId}_entries_list`).on("change", async function(e) {
    e.preventDefault();
    await drawTable(table, {
      start: 0,
      // Reset to the first page
      length: parseInt($(this).val()),
      search: $(`#t_${tableId}_search`).val(),
      sort: {
        key: $(`#t_${tableId}_sort`).val(),
        dir: "asc"
      }
    });
  });
  $(`#t_${tableId}_sort`).on("change", async function(e) {
    e.preventDefault();
    await drawTable(table, {
      start: 0,
      // Reset to the first page
      length: parseInt($(`#t_${tableId}_entries_list`).val()),
      search: $(`#t_${tableId}_search`).val(),
      sort: {
        key: $(this).val(),
        dir: "asc"
      }
    });
  });
  $(`#t_${tableId}_search`).on("input", async function(e) {
    e.preventDefault();
    await drawTable(table, {
      start: 0,
      // Reset to the first page
      length: parseInt($(`#t_${tableId}_entries_list`).val()),
      search: $(this).val(),
      sort: {
        key: $(`#t_${tableId}_sort`).val(),
        dir: "asc"
      }
    });
  });
  $(`#t_${tableId}_pagination`).on("click", ".page-link", async function(e) {
    e.preventDefault();
    const pagination = $(this).text();
    const currStart = parseInt($(`#t_${tableId}_cards`).data("start"));
    const end = parseInt($(`#t_${tableId}_cards`).data("end"));
    const length = parseInt($(`#t_${tableId}_entries_list`).val());
    const start = pagination === "Previous" ? Math.max(0, currStart - length) : pagination === "Next" ? Math.min(currStart + length, end) : (parseInt(pagination) - 1) * length;
    await drawTable(table, {
      start,
      length,
      search: $(`#t_${tableId}_search`).val(),
      sort: {
        key: $(`#t_${tableId}_sort`).val(),
        dir: "asc"
      }
    });
  });
}
class Table {
  $;
  draw;
  // Inherit from DataTables
  ajax;
  columns;
  // Our settings
  tableId;
  selectEntries;
  cardSize;
  visiblePages;
  data;
  renderCard;
  constructor(constructor) {
    const { ajax, columns, tableId, selectEntries, cardSize, data, renderCard } = constructor;
    const JQuery = globalThis?.$;
    if (!JQuery) {
      throw new Error("Does not have jQuery");
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
  async drawTable(pagination) {
    return drawTable(this, pagination);
  }
  getResponse(params) {
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
      data: []
    };
  }
}

exports.Table = Table;
exports.buildParams = buildParams;
exports.buildSearchableFields = buildSearchableFields;
exports.buildSelectParams = buildSelectParams;
exports.buildSortParam = buildSortParam;
exports.drawTable = drawTable;
exports.initTable = initTable;
exports.isNaNorUndefined = isNaNorUndefined;
exports.renderJs = renderJs;
exports.runMongo = runMongo;
exports.tableParamsSchema = tableParamsSchema;
