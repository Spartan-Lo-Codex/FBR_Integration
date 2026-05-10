frappe.query_reports["FBR Expenses GL Dynamic"] = {
    filters: [
        {
            fieldname: "company",
            label: __("Company"),
            fieldtype: "Link",
            options: "Company",
            default: frappe.defaults.get_user_default("Company"),
        },
        {
            fieldname: "periodicity",
            label: __("Period"),
            fieldtype: "Select",
            options: ["Custom", "Monthly", "Quarterly", "Yearly"],
            default: "Custom",
        },
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
            default: frappe.datetime.month_start(),
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
            default: frappe.datetime.get_today(),
        },
        {
            fieldname: "expense_account",
            label: __("Expense Account"),
            fieldtype: "Link",
            options: "Account",
            get_query: () => {
                const company = frappe.query_report.get_filter_value("company");
                return {
                    filters: {
                        root_type: "Expense",
                        is_group: 0,
                        company: company,
                    },
                };
            },
        },
    ],
};
