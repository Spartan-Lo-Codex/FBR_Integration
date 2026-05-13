frappe.pages["financial-dashboard"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Financial Dashboard",
        single_column: true,
    });

    frappe.require("/assets/fbr_integration/css/financial_dashboard.css");

    page.body.html(frappe.render_template("financial_dashboard"));

    let state = {
        company: frappe.defaults.get_user_default("Company") || "",
        from_date: frappe.datetime.month_start(),
        to_date: frappe.datetime.get_today(),
        trend_view: "monthly",
        analytics_group: "monthly",
        period_type: "monthly",
        vertical_analysis_view: "period",
        horizontal_analysis_view: "period",
    };
    // Store chart instances so we can destroy before re-creating (avoids removeChild DOM error)
    let charts = {
        trend: null,
        expense: null,
        cash_flow: null,
        sales_monthly: null,
        purchases_monthly: null,
        expenses_bar: null,
        sales_overview: null,
        purchases_overview: null,
    };
    function freshChartRoot(selector) {
        const oldEl = document.querySelector(selector);
        if (!oldEl || !oldEl.parentNode) return null;
        const newEl = oldEl.cloneNode(false);
        oldEl.parentNode.replaceChild(newEl, oldEl);
        return newEl;
    }
    function currencyFmt(currency) {
        return {
            fieldtype: "Float",
            precision: 0,
        };
    }
    function pctFmt(val) {
        if (val == null || val === "") return "—";
        const n = Number(val);
        return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
    }
    function valueClassAmount(val, positiveIsGood) {
        if (val == null || val === "") return "";
        const n = Number(val);
        if (n === 0) return "";
        if (positiveIsGood) return n >= 0 ? "value-good" : "value-danger";
        return n <= 0 ? "value-good" : "value-danger";
    }
    function valueClassChange(changePercent, positiveIsGood) {
        if (changePercent == null || changePercent === "") return "";
        const n = Number(changePercent);
        if (n === 0) return "";
        if (positiveIsGood) return n >= 0 ? "value-good" : "value-danger";
        return n <= 0 ? "value-good" : "value-danger";
    }

    function set_dates(period) {
        const today = frappe.datetime.get_today();
        if (period === "today") {
            state.from_date = state.to_date = today;
        } else if (period === "this_week") {
            state.from_date = frappe.datetime.week_start();
            state.to_date = today;
        } else if (period === "this_month") {
            state.from_date = frappe.datetime.month_start();
            state.to_date = today;
        } else if (period === "this_quarter") {
            state.from_date = frappe.datetime.quarter_start();
            state.to_date = today;
        } else if (period === "last_year") {
            state.from_date = frappe.datetime.add_months(
                frappe.datetime.year_start(),
                -12
            );
            state.to_date = frappe.datetime.add_days(
                frappe.datetime.year_start(),
                -1
            );
        } else {
            state.from_date = frappe.datetime.year_start();
            state.to_date = today;
        }
    }

    function period_label(period) {
        const labels = {
            today: "Today",
            this_week: "This Week",
            this_month: "This Month",
            this_quarter: "This Quarter",
            this_year: "This Year",
            last_year: "Last Year",
        };
        return labels[period] || "This Month";
    }

    function load_companies() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_companies",
            callback(r) {
                const list = r.message || [];
                const $ul = $("#companyList");
                $ul.empty();
                list.forEach((c) => {
                    $ul.append(
                        $(
                            '<li><a class="dropdown-item company-option" href="#" data-company="' +
                                c +
                                '">' +
                                c +
                                "</a></li>"
                        )
                    );
                });
                if (!state.company && list.length) state.company = list[0];
                $("#currentCompany").text(
                    state.company || __("Select Company")
                );
                load_data();
            },
        });
    }

    function load_data() {
        if (!state.company) return;
        sync_analytics_period_buttons();
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_financial_summary",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const d = r.message;
                if (!d) return;
                const fmt = currencyFmt(d.currency);
                $("#totalRevenue").html(frappe.format(d.revenue, fmt));
                $("#totalExpenses").html(frappe.format(d.expense, fmt));
                $("#netProfit").html(frappe.format(d.profit, fmt));
                $("#profitMargin").text(Number(d.margin).toFixed(1) + "%");
                const revChg = $("#revenueChange")
                    .text(pctFmt(d.revenue_change))
                    .removeClass("value-good value-danger");
                revChg.addClass(valueClassChange(d.revenue_change, true));
                const expChg = $("#expenseChange")
                    .text(pctFmt(d.expense_change))
                    .removeClass("value-good value-danger");
                expChg.addClass(valueClassChange(d.expense_change, false));
                const profitChg = $("#profitChange")
                    .text(pctFmt(d.profit_change))
                    .removeClass("value-good value-danger");
                profitChg.addClass(valueClassChange(d.profit_change, true));
                const marginChg = $("#marginChange")
                    .text(pctFmt(d.margin_change))
                    .removeClass("value-good value-danger");
                marginChg.addClass(valueClassChange(d.margin_change, true));
            },
        });
        load_trend();
        load_expense_chart();
        load_cash_flow_chart();
        load_revenue_sources();
        load_profit_loss();
        load_profit_loss_monthly();
        load_balance_sheet();
        load_balance_sheet_monthly();
        load_cash_flow_statement();
        load_trial_balance();
        load_aging_receivables();
        load_aging_payables();
        load_sales_summary();
        load_purchases_summary();
        load_expenses_summary();
        load_vertical_analysis();
        load_horizontal_analysis();
        load_ratio_analysis();
        load_invoice_kpis();
        load_sales_purchases_overview();
    }

    function load_invoice_kpis() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_invoice_kpis",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const d = r.message || {};
                const fmt = currencyFmt();
                $("#salesInvoiceCount").text(d.sales_count || 0);
                $("#purchaseInvoiceCount").text(d.purchase_count || 0);
                $("#salesInvoiceValue").html(
                    frappe.format(d.sales_total || 0, fmt)
                );
                $("#purchaseInvoiceValue").html(
                    frappe.format(d.purchase_total || 0, fmt)
                );
            },
        });
    }

    function load_sales_purchases_overview() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_sales_purchases_overview",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: state.analytics_group,
            },
            callback(r) {
                const d = r.message || {
                    labels: [],
                    sales_values: [],
                    purchases_values: [],
                    sales_counts: [],
                    purchase_counts: [],
                };
                const salesEl = freshChartRoot("#salesOverviewChart");
                const purEl = freshChartRoot("#purchasesOverviewChart");
                if (!salesEl || !purEl || typeof frappe.Chart === "undefined")
                    return;
                charts.sales_overview = new frappe.Chart(salesEl, {
                    type: "bar",
                    height: 280,
                    data: {
                        labels: d.labels,
                        datasets: [
                            { name: __("Sales Value"), values: d.sales_values },
                            {
                                name: __("Sales Invoices"),
                                values: d.sales_counts,
                            },
                        ],
                    },
                    colors: ["#16a34a", "#0ea5e9"],
                    axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
                });
                charts.purchases_overview = new frappe.Chart(purEl, {
                    type: "bar",
                    height: 280,
                    data: {
                        labels: d.labels,
                        datasets: [
                            {
                                name: __("Purchase Value"),
                                values: d.purchases_values,
                            },
                            {
                                name: __("Purchase Invoices"),
                                values: d.purchase_counts,
                            },
                        ],
                    },
                    colors: ["#dc3545", "#f59e0b"],
                    axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
                });
            },
        });
    }

    function load_trend() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_trend_data",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: state.trend_view,
            },
            callback(r) {
                const data = r.message || {
                    labels: [],
                    revenue: [],
                    expense: [],
                };
                render_trend_chart(data);
            },
        });
    }

    function render_trend_chart(data) {
        const el = freshChartRoot("#trendChart");
        if (!el || typeof frappe.Chart === "undefined") return;
        try {
            charts.trend = new frappe.Chart(el, {
                type: "line",
                height: 300,
                data: {
                    labels: data.labels || [],
                    datasets: [
                        { name: __("Revenue"), values: data.revenue || [] },
                        { name: __("Expense"), values: data.expense || [] },
                    ],
                },
                colors: ["#28a745", "#dc3545"],
                axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
            });
        } catch (e) {
            console.warn("Trend chart error:", e);
        }
    }

    function load_expense_chart() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_expense_breakdown",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const data = r.message || { labels: [], values: [] };
                const el = freshChartRoot("#expenseChart");
                if (!el || typeof frappe.Chart === "undefined") return;
                try {
                    charts.expense = new frappe.Chart(el, {
                        type: "donut",
                        height: 300,
                        data: {
                            labels: data.labels || [],
                            datasets: [{ values: data.values || [] }],
                        },
                        colors: [
                            "#007bff",
                            "#28a745",
                            "#ffc107",
                            "#dc3545",
                            "#6f42c1",
                            "#fd7e14",
                            "#20c997",
                            "#e83e8c",
                            "#6c757d",
                            "#17a2b8",
                        ],
                        maxSlices: 10,
                    });
                } catch (e) {
                    console.warn("Expense chart error:", e);
                }
            },
        });
    }

    function load_cash_flow_chart() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_cash_flow",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const data = r.message || { labels: [], values: [] };
                const el = freshChartRoot("#cashFlowChart");
                if (!el || typeof frappe.Chart === "undefined") return;
                try {
                    charts.cash_flow = new frappe.Chart(el, {
                        type: "bar",
                        height: 300,
                        data: {
                            labels: data.labels || [],
                            datasets: [
                                {
                                    name: __("Amount"),
                                    values: data.values || [],
                                },
                            ],
                        },
                        colors: ["#007bff", "#28a745", "#ffc107"],
                        axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
                    });
                } catch (e) {
                    console.warn("Cash flow chart error:", e);
                }
            },
        });
    }

    function load_revenue_sources() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_revenue_sources",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#revenueSources");
                $tb.empty();
                rows.forEach((row) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.account))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.amount, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    row.percent + "%"
                                )
                            )
                    );
                });
            },
        });
    }

    function load_profit_loss() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_profit_loss",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const fmt = currencyFmt();
                const $tb = $("#profitLossData");
                $tb.empty();
                rows.forEach((row) => {
                    const tr = $("<tr></tr>").addClass(
                        "statement-row-" + (row.row_type || "account")
                    );
                    const td1 = $("<td></td>").text(row.account);
                    if (row.indent)
                        td1.addClass(
                            "statement-indent statement-indent-" +
                                (row.indent || 1)
                        );
                    const showAmount = row.row_type !== "section_header";
                    const chg = (v) =>
                        v != null && showAmount ? pctFmt(v) : "—";
                    const curCls = valueClassAmount(row.current, true);
                    const chgCls = valueClassChange(row.change, true);
                    tr.append(td1)
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(curCls)
                                .html(
                                    showAmount
                                        ? frappe.format(
                                              Math.round(row.current),
                                              fmt
                                          )
                                        : "—"
                                )
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(curCls)
                                .html(
                                    showAmount
                                        ? frappe.format(
                                              Math.round(row.previous),
                                              fmt
                                          )
                                        : "—"
                                )
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_monthly))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_quarterly))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_yearly))
                        );
                    $tb.append(tr);
                });
            },
        });
    }

    function load_balance_sheet() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_balance_sheet",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const fmt = currencyFmt();
                const $tb = $("#balanceSheetData");
                $tb.empty();
                rows.forEach((row) => {
                    const tr = $("<tr></tr>").addClass(
                        "statement-row-" + (row.row_type || "account")
                    );
                    const td1 = $("<td></td>").text(row.account);
                    if (row.indent)
                        td1.addClass(
                            "statement-indent statement-indent-" +
                                (row.indent || 1)
                        );
                    const showAmount = row.row_type !== "section_header";
                    const chg = (v) =>
                        v != null && showAmount ? pctFmt(v) : "—";
                    const curCls = valueClassAmount(row.current, true);
                    const chgCls = valueClassChange(row.change, true);
                    tr.append(td1)
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(curCls)
                                .html(
                                    showAmount
                                        ? frappe.format(
                                              Math.round(row.current),
                                              fmt
                                          )
                                        : "—"
                                )
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(curCls)
                                .html(
                                    showAmount
                                        ? frappe.format(
                                              Math.round(row.previous),
                                              fmt
                                          )
                                        : "—"
                                )
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_monthly))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_quarterly))
                        )
                        .append(
                            $("<td class='text-right'></td>")
                                .addClass(chgCls)
                                .text(chg(row.change_yearly))
                        );
                    $tb.append(tr);
                });
            },
        });
    }

    function load_profit_loss_monthly() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_profit_loss_monthly",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const data = r.message || { months: [], rows: [] };
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $thead = $("#profitLossMonthlyThead");
                $thead.find("th:not(:first)").remove();
                (data.months || []).forEach((m) =>
                    $thead.append($("<th class='text-right'></th>").text(m))
                );
                const $tb = $("#profitLossMonthlyData");
                $tb.empty();
                const showAmount = (row) => row.row_type !== "section_header";
                (data.rows || []).forEach((row) => {
                    const tr = $("<tr></tr>").addClass(
                        "statement-row-" + (row.row_type || "account")
                    );
                    const td1 = $("<td></td>").text(row.account);
                    if (row.indent)
                        td1.addClass(
                            "statement-indent statement-indent-" +
                                (row.indent || 1)
                        );
                    tr.append(td1);
                    (row.values || []).forEach((val) => {
                        tr.append(
                            $("<td class='text-right'></td>").html(
                                showAmount(row) ? frappe.format(val, fmt) : "—"
                            )
                        );
                    });
                    $tb.append(tr);
                });
            },
        });
    }

    function load_balance_sheet_monthly() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_balance_sheet_monthly",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const data = r.message || { months: [], rows: [] };
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $thead = $("#balanceSheetMonthlyThead");
                $thead.find("th:not(:first)").remove();
                (data.months || []).forEach((m) =>
                    $thead.append($("<th class='text-right'></th>").text(m))
                );
                const $tb = $("#balanceSheetMonthlyData");
                $tb.empty();
                const showAmount = (row) => row.row_type !== "section_header";
                (data.rows || []).forEach((row) => {
                    const tr = $("<tr></tr>").addClass(
                        "statement-row-" + (row.row_type || "account")
                    );
                    const td1 = $("<td></td>").text(row.account);
                    if (row.indent)
                        td1.addClass(
                            "statement-indent statement-indent-" +
                                (row.indent || 1)
                        );
                    tr.append(td1);
                    (row.values || []).forEach((val) => {
                        tr.append(
                            $("<td class='text-right'></td>").html(
                                showAmount(row) ? frappe.format(val, fmt) : "—"
                            )
                        );
                    });
                    $tb.append(tr);
                });
            },
        });
    }

    function load_cash_flow_statement() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_cash_flow_statement",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#cashFlowData");
                $tb.empty();
                rows.forEach((row) => {
                    const tr = $("<tr></tr>").addClass(
                        "statement-row-" + (row.row_type || "account")
                    );
                    const td1 = $("<td></td>").text(
                        row.activity || row.account
                    );
                    if (row.indent)
                        td1.addClass(
                            "statement-indent statement-indent-" +
                                (row.indent || 1)
                        );
                    const showAmount = row.row_type !== "section_header";
                    tr.append(td1).append(
                        $("<td class='text-right'></td>").html(
                            showAmount
                                ? frappe.format(Math.round(row.amount), fmt)
                                : "—"
                        )
                    );
                    $tb.append(tr);
                });
            },
        });
    }

    function load_trial_balance() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_trial_balance",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#trialBalanceData");
                $tb.empty();
                rows.forEach((row) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.account))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.debit, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.credit, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.balance, fmt)
                                )
                            )
                    );
                });
            },
        });
    }

    function load_aging_receivables() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_aging_receivables",
            args: { company: state.company, report_date: state.to_date },
            callback(r) {
                const d = r.message || {};
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                $("#agingReceivablesSummary").html(
                    "<strong>Total Outstanding: </strong>" +
                        frappe.format(d.total, fmt)
                );
                const $tb = $("#agingReceivablesData");
                $tb.empty();
                (d.buckets || []).forEach((b) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(b.label || b.range))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(b.amount, fmt)
                                )
                            )
                    );
                });
            },
        });
    }

    function load_aging_payables() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_aging_payables",
            args: { company: state.company, report_date: state.to_date },
            callback(r) {
                const d = r.message || {};
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                $("#agingPayablesSummary").html(
                    "<strong>Total Outstanding: </strong>" +
                        frappe.format(d.total, fmt)
                );
                const $tb = $("#agingPayablesData");
                $tb.empty();
                (d.buckets || []).forEach((b) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(b.label || b.range))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(b.amount, fmt)
                                )
                            )
                    );
                });
            },
        });
    }

    function load_sales_summary() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_sales_summary",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: state.analytics_group,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#salesSummaryData");
                $tb.empty();
                const chg = (v) => pctFmt(v);
                rows.forEach((row) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.period))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.amount, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.previous, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_monthly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_quarterly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_yearly)
                                )
                            )
                    );
                });
                if (rows.length && typeof frappe.Chart !== "undefined") {
                    render_sales_monthly_chart(rows);
                }
            },
        });
    }

    function render_sales_monthly_chart(rows) {
        const el = freshChartRoot("#salesMonthlyChart");
        if (!el) return;
        try {
            charts.sales_monthly = new frappe.Chart(el, {
                type: "bar",
                height: 220,
                data: {
                    labels: rows.map((r) => r.period),
                    datasets: [
                        {
                            name: __("Sales"),
                            values: rows.map((r) => r.amount || 0),
                        },
                    ],
                },
                colors: ["#28a745"],
                axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
            });
        } catch (e) {
            console.warn("Sales monthly chart error:", e);
        }
    }

    function load_purchases_summary() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_purchases_summary",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: state.analytics_group,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#purchasesSummaryData");
                $tb.empty();
                const chg = (v) => pctFmt(v);
                rows.forEach((row) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.period))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.amount, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.previous, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_monthly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_quarterly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_yearly)
                                )
                            )
                    );
                });
                if (rows.length && typeof frappe.Chart !== "undefined") {
                    render_purchases_monthly_chart(rows);
                }
            },
        });
    }

    function render_purchases_monthly_chart(rows) {
        const el = freshChartRoot("#purchasesMonthlyChart");
        if (!el) return;
        try {
            charts.purchases_monthly = new frappe.Chart(el, {
                type: "bar",
                height: 220,
                data: {
                    labels: rows.map((r) => r.period),
                    datasets: [
                        {
                            name: __("Purchases"),
                            values: rows.map((r) => r.amount || 0),
                        },
                    ],
                },
                colors: ["#dc3545"],
                axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
            });
        } catch (e) {
            console.warn("Purchases monthly chart error:", e);
        }
    }

    function load_expenses_summary() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_expenses_summary",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: state.analytics_group,
            },
            callback(r) {
                const rows = r.message || [];
                const currency = frappe.defaults.get_default("currency") || "";
                const fmt = currencyFmt();
                const $tb = $("#expensesSummaryData");
                $tb.empty();
                const chg = (v) => pctFmt(v);
                rows.forEach((row) => {
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.period))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.amount, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    frappe.format(row.previous, fmt)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_monthly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_quarterly)
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    chg(row.change_yearly)
                                )
                            )
                    );
                });
                if (rows.length && typeof frappe.Chart !== "undefined") {
                    render_expenses_bar_chart(rows);
                }
            },
        });
    }

    function render_expenses_bar_chart(rows) {
        const el = freshChartRoot("#expensesBarChart");
        if (!el) return;
        try {
            charts.expenses_bar = new frappe.Chart(el, {
                type: "bar",
                height: 220,
                data: {
                    labels: rows.map((r) => r.period),
                    datasets: [
                        {
                            name: __("Expenses"),
                            values: rows.map((r) => r.amount || 0),
                        },
                    ],
                },
                colors: ["#dc3545"],
                axisOptions: { xIsSeries: 1, shortenYAxisNumbers: 1 },
            });
        } catch (e) {
            console.warn("Expenses bar chart error:", e);
        }
    }

    function load_vertical_analysis() {
        const groupBy =
            state.vertical_analysis_view === "monthly" ? "monthly" : "period";
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_vertical_analysis",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: groupBy,
            },
            callback(r) {
                const msg = r.message;
                if (groupBy === "monthly" && msg && msg.months) {
                    $("#verticalAnalysisPeriodView").hide();
                    $("#verticalAnalysisMonthlyView").show();
                    const $vHead = $("#verticalAnalysisMonthlyView thead tr");
                    $vHead.find("th:not(:first)").remove();
                    $(msg.months).each(function (i, m) {
                        $vHead.append(
                            $("<th class='text-right'></th>").text(m)
                        );
                    });
                    const $tb = $("#verticalAnalysisMonthlyData");
                    $tb.empty();
                    (msg.rows || []).forEach((row) => {
                        const tr = $("<tr></tr>");
                        const td1 = $("<td></td>").text(row.account);
                        if (row.indent)
                            td1.addClass(
                                "statement-indent statement-indent-" +
                                    (row.indent || 1)
                            );
                        tr.append(td1);
                        const showAmount = row.row_type !== "section_header";
                        (row.values || []).forEach((val) => {
                            const cls = valueClassAmount(val, true);
                            tr.append(
                                $("<td class='text-right'></td>")
                                    .addClass(cls)
                                    .text(
                                        showAmount
                                            ? Number(val).toFixed(1) + "%"
                                            : "—"
                                    )
                            );
                        });
                        $tb.append(tr);
                    });
                    return;
                }
                $("#verticalAnalysisMonthlyView").hide();
                $("#verticalAnalysisPeriodView").show();
                const rows = Array.isArray(msg) ? msg : [];
                const fmt = currencyFmt();
                const $tb = $("#verticalAnalysisData");
                $tb.empty();
                rows.forEach((row) => {
                    const showAmount = row.row_type !== "section_header";
                    const amtCls = valueClassAmount(row.amount, true);
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.account))
                            .append(
                                $("<td class='text-right'></td>")
                                    .addClass(amtCls)
                                    .html(
                                        showAmount
                                            ? frappe.format(row.amount, fmt)
                                            : "—"
                                    )
                            )
                            .append(
                                $("<td class='text-right'></td>").text(
                                    showAmount
                                        ? Number(
                                              row.percent_of_revenue
                                          ).toFixed(1) + "%"
                                        : "—"
                                )
                            )
                    );
                });
            },
        });
    }

    function load_horizontal_analysis() {
        const groupBy =
            state.horizontal_analysis_view === "monthly" ? "monthly" : "period";
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_horizontal_analysis",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
                group_by: groupBy,
            },
            callback(r) {
                const msg = r.message;
                if (groupBy === "monthly" && msg && msg.months) {
                    $("#horizontalAnalysisPeriodView").hide();
                    $("#horizontalAnalysisMonthlyView").show();
                    const $hHead = $("#horizontalAnalysisMonthlyView thead tr");
                    $hHead.find("th:not(:first)").remove();
                    $(msg.months).each(function (i, m) {
                        $hHead.append(
                            $("<th class='text-right'></th>").text(m)
                        );
                    });
                    const $tb = $("#horizontalAnalysisMonthlyData");
                    $tb.empty();
                    (msg.rows || []).forEach((row) => {
                        const tr = $("<tr></tr>");
                        const td1 = $("<td></td>").text(row.account);
                        if (row.indent)
                            td1.addClass(
                                "statement-indent statement-indent-" +
                                    (row.indent || 1)
                            );
                        tr.append(td1);
                        const showAmount = row.row_type !== "section_header";
                        (row.values || []).forEach((val) => {
                            const cls = valueClassChange(val, true);
                            tr.append(
                                $("<td class='text-right'></td>")
                                    .addClass(cls)
                                    .text(showAmount ? pctFmt(val) : "—")
                            );
                        });
                        $tb.append(tr);
                    });
                    return;
                }
                $("#horizontalAnalysisMonthlyView").hide();
                $("#horizontalAnalysisPeriodView").show();
                const rows = Array.isArray(msg) ? msg : [];
                const fmt = currencyFmt();
                const $tb = $("#horizontalAnalysisData");
                $tb.empty();
                rows.forEach((row) => {
                    const showAmount = row.row_type !== "section_header";
                    const chgCls = valueClassChange(row.change_percent, true);
                    $tb.append(
                        $("<tr></tr>")
                            .append($("<td></td>").text(row.account))
                            .append(
                                $("<td class='text-right'></td>").html(
                                    showAmount
                                        ? frappe.format(row.current, fmt)
                                        : "—"
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>").html(
                                    showAmount
                                        ? frappe.format(row.previous, fmt)
                                        : "—"
                                )
                            )
                            .append(
                                $("<td class='text-right'></td>")
                                    .addClass(chgCls)
                                    .text(
                                        showAmount
                                            ? pctFmt(row.change_percent)
                                            : "—"
                                    )
                            )
                    );
                });
            },
        });
    }

    function load_ratio_analysis() {
        frappe.call({
            method: "fbr_integration.templates.pages.financial_dashboard.financial_dashboard.get_ratio_analysis",
            args: {
                company: state.company,
                from_date: state.from_date,
                to_date: state.to_date,
            },
            callback(r) {
                const rows = r.message || [];
                const $tb = $("#ratioAnalysisData");
                $tb.empty();
                rows.forEach((row) => {
                    let val = "—";
                    if (row.value != null) {
                        const n = Number(row.value);
                        val =
                            row.name && row.name.indexOf("%") >= 0
                                ? n.toFixed(1) + "%"
                                : n;
                    }
                    $tb.append(
                        $("<tr></tr>")
                            .append(
                                $("<td></td>").text(
                                    row.category
                                        ? row.category + " – " + row.name
                                        : row.name
                                )
                            )
                            .append($("<td class='text-right'></td>").text(val))
                            .append($("<td></td>").text(row.description || ""))
                    );
                });
            },
        });
    }

    // Event bindings
    $(document).on("click", ".period-option", function (e) {
        e.preventDefault();
        const period = $(this).data("period");
        set_dates(period);
        $("#currentPeriod").text(period_label(period));
        load_data();
    });

    $("#dashboardRefreshBtn").on("click", function () {
        $(this).find(".fa-refresh").addClass("fa-spin");
        load_data();
        setTimeout(function () {
            $("#dashboardRefreshBtn .fa-refresh").removeClass("fa-spin");
        }, 800);
    });

    $(document).on("click", ".dashboard-period-type", function (e) {
        e.preventDefault();
        const periodType = $(this).data("period-type");
        $(".dashboard-period-type").removeClass("active");
        $(this).addClass("active");
        state.period_type = periodType;
        state.trend_view = periodType;
        state.analytics_group = periodType;
        sync_analytics_period_buttons();
        load_data();
    });
    function sync_analytics_period_buttons() {
        const g = state.analytics_group || "monthly";
        $(".analytics-period")
            .removeClass("active")
            .filter("[data-group='" + g + "']")
            .addClass("active");
        $(".analytics-period-purchases")
            .removeClass("active")
            .filter("[data-group='" + g + "']")
            .addClass("active");
        $(".analytics-period-expenses")
            .removeClass("active")
            .filter("[data-group='" + g + "']")
            .addClass("active");
    }

    $(document).on("click", ".company-option", function (e) {
        e.preventDefault();
        state.company = $(this).data("company");
        $("#currentCompany").text(state.company);
        load_data();
    });

    $(document).on("click", ".custom-range-btn", function (e) {
        e.preventDefault();
        $("#customFromDate").val(state.from_date);
        $("#customToDate").val(state.to_date);
        $("#customDateModal").modal("show");
    });

    $("#applyCustomRange").on("click", function () {
        const from = $("#customFromDate").val();
        const to = $("#customToDate").val();
        if (from && to) {
            state.from_date = from;
            state.to_date = to;
            $("#currentPeriod").text(from + " to " + to);
            $("#customDateModal").modal("hide");
            load_data();
        }
    });

    $(document).on("click", ".trend-view", function () {
        $(".trend-view").removeClass("active");
        $(this).addClass("active");
        state.trend_view = $(this).data("view");
        load_trend();
    });

    // Financial statement tabs: switch by JS so Frappe router doesn't treat #balanceSheetTab etc. as a page
    $(document).on(
        "click",
        ".financial-statement-tabs a[data-tab]",
        function (e) {
            e.preventDefault();
            const tab_id = $(this).data("tab");
            const $card = $(this).closest(".card");
            $card
                .find(".financial-statement-tabs .nav-link")
                .removeClass("active");
            $(this).addClass("active");
            $card.find(".tab-pane").removeClass("show active");
            $card.find("#" + tab_id).addClass("show active");
        }
    );

    $(document).on("click", ".analytics-period", function () {
        $(".analytics-period").removeClass("active");
        $(this).addClass("active");
        state.analytics_group = $(this).data("group");
        state.period_type = state.analytics_group;
        state.trend_view = state.analytics_group;
        $(".dashboard-period-type")
            .removeClass("active")
            .filter("[data-period-type='" + state.analytics_group + "']")
            .addClass("active");
        sync_analytics_period_buttons();
        load_sales_summary();
        load_trend();
    });
    $(document).on("click", ".analytics-period-purchases", function () {
        $(".analytics-period-purchases").removeClass("active");
        $(this).addClass("active");
        state.analytics_group = $(this).data("group");
        state.period_type = state.analytics_group;
        state.trend_view = state.analytics_group;
        $(".dashboard-period-type")
            .removeClass("active")
            .filter("[data-period-type='" + state.analytics_group + "']")
            .addClass("active");
        sync_analytics_period_buttons();
        load_purchases_summary();
        load_trend();
    });
    $(document).on("click", ".analytics-period-expenses", function () {
        $(".analytics-period-expenses").removeClass("active");
        $(this).addClass("active");
        state.analytics_group = $(this).data("group");
        state.period_type = state.analytics_group;
        state.trend_view = state.analytics_group;
        $(".dashboard-period-type")
            .removeClass("active")
            .filter("[data-period-type='" + state.analytics_group + "']")
            .addClass("active");
        sync_analytics_period_buttons();
        load_expenses_summary();
        load_trend();
    });

    $(document).on("click", ".analytics-vertical-view", function () {
        $(".analytics-vertical-view").removeClass("active");
        $(this).addClass("active");
        state.vertical_analysis_view = $(this).data("view");
        load_vertical_analysis();
    });

    $(document).on("click", ".analytics-horizontal-view", function () {
        $(".analytics-horizontal-view").removeClass("active");
        $(this).addClass("active");
        state.horizontal_analysis_view = $(this).data("view");
        load_horizontal_analysis();
    });

    load_companies();
};
