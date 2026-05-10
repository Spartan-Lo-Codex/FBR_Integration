import frappe
from frappe.utils import get_first_day, get_last_day, getdate


def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"fieldname": "posting_date", "label": "Posting Date", "fieldtype": "Date", "width": 110},
		{"fieldname": "voucher_type", "label": "Voucher Type", "fieldtype": "Data", "width": 120},
		{
			"fieldname": "voucher_no",
			"label": "Voucher No",
			"fieldtype": "Dynamic Link",
			"options": "voucher_type",
			"width": 170,
		},
		{"fieldname": "parent_group", "label": "Parent Group", "fieldtype": "Data", "width": 180},
		{
			"fieldname": "account",
			"label": "Expense Account",
			"fieldtype": "Link",
			"options": "Account",
			"width": 230,
		},
		{"fieldname": "party_type", "label": "Party Type", "fieldtype": "Data", "width": 100},
		{
			"fieldname": "party",
			"label": "Party",
			"fieldtype": "Dynamic Link",
			"options": "party_type",
			"width": 160,
		},
		{"fieldname": "remarks", "label": "Remarks", "fieldtype": "Data", "width": 220},
		{"fieldname": "debit", "label": "Debit", "fieldtype": "Currency", "width": 120},
		{"fieldname": "credit", "label": "Credit", "fieldtype": "Currency", "width": 120},
		{"fieldname": "expense", "label": "Expense", "fieldtype": "Currency", "width": 130},
	]


def get_data(filters):
	from_date, to_date = get_period_dates(filters)
	conditions = [
		"gle.is_cancelled = 0",
		"acc.root_type = 'Expense'",
		"gle.posting_date BETWEEN %(from_date)s AND %(to_date)s",
	]

	values = {"from_date": from_date, "to_date": to_date}

	if filters.get("company"):
		conditions.append("gle.company = %(company)s")
		values["company"] = filters.company

	if filters.get("expense_account"):
		conditions.append("gle.account = %(expense_account)s")
		values["expense_account"] = filters.expense_account

	query = f"""
        SELECT
            gle.posting_date,
            gle.voucher_type,
            gle.voucher_no,
            IFNULL(pacc.account_name, acc.account_name) AS parent_group,
            gle.account,
            gle.party_type,
            gle.party,
            gle.remarks,
            gle.debit,
            gle.credit,
            (gle.debit - gle.credit) AS expense
        FROM `tabGL Entry` gle
        INNER JOIN `tabAccount` acc ON acc.name = gle.account
        LEFT JOIN `tabAccount` pacc ON pacc.name = acc.parent_account
        WHERE {' AND '.join(conditions)}
        ORDER BY gle.posting_date DESC, parent_group, gle.account, gle.name DESC
    """
	return frappe.db.sql(query, values, as_dict=True)


def get_period_dates(filters):
	periodicity = (filters.get("periodicity") or "Custom").lower()
	from_date = filters.get("from_date")
	to_date = filters.get("to_date")

	if from_date and to_date:
		return getdate(from_date), getdate(to_date)

	today = getdate()
	if periodicity == "monthly":
		return get_first_day(today), get_last_day(today)
	if periodicity == "quarterly":
		month = ((today.month - 1) // 3) * 3 + 1
		quarter_start = today.replace(month=month, day=1)
		return get_first_day(quarter_start), get_last_day(quarter_start.replace(month=month + 2))
	if periodicity == "yearly":
		year_start = today.replace(month=1, day=1)
		year_end = today.replace(month=12, day=31)
		return year_start, year_end

	return get_first_day(today), today
