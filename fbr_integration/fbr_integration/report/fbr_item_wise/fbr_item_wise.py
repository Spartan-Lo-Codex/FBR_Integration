# Copyright (c) 2026, Taimoor and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Posting Date", "fieldname": "posting_date", "fieldtype": "Date", "width": 110},
		{"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
		{"label": "Qty", "fieldname": "qty", "fieldtype": "Float", "width": 90},
		{"label": "Rate", "fieldname": "rate", "fieldtype": "Currency", "width": 110},
		{"label": "Sales Tax", "fieldname": "custom_sales_tax", "fieldtype": "Currency", "width": 110},
		{"label": "Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 130},
		{
			"label": "Sales Invoice",
			"fieldname": "sales_invoice",
			"fieldtype": "Link",
			"options": "Sales Invoice",
			"width": 160,
		},
		{
			"label": "Customer",
			"fieldname": "customer",
			"fieldtype": "Link",
			"options": "Customer",
			"width": 170,
		},
		{
			"label": "Item Code",
			"fieldname": "item_code",
			"fieldtype": "Link",
			"options": "Item",
			"width": 170,
		},
		{
			"label": "Item Group",
			"fieldname": "item_group",
			"fieldtype": "Link",
			"options": "Item Group",
			"width": 150,
		},
		{"label": "Sale Type", "fieldname": "custom_sale_type", "fieldtype": "Data", "width": 120},
		{"label": "HS Code", "fieldname": "custom_hs_code", "fieldtype": "Data", "width": 120},
		{"label": "SRO Schedule", "fieldname": "custom_sro_schedule_no", "fieldtype": "Data", "width": 130},
		{"label": "SRO Item", "fieldname": "custom_sro_item_sno", "fieldtype": "Data", "width": 100},
		{"label": "FBR UOM", "fieldname": "custom_fbr_uom", "fieldtype": "Data", "width": 90},
	]


def get_data(filters):
	conditions = ["si.docstatus = 1"]
	values = {}

	if filters.get("company"):
		conditions.append("si.company = %(company)s")
		values["company"] = filters.get("company")
	if filters.get("from_date"):
		conditions.append("si.posting_date >= %(from_date)s")
		values["from_date"] = filters.get("from_date")
	if filters.get("to_date"):
		conditions.append("si.posting_date <= %(to_date)s")
		values["to_date"] = filters.get("to_date")
	if filters.get("item_group"):
		conditions.append("i.item_group = %(item_group)s")
		values["item_group"] = filters.get("item_group")
	if filters.get("item_code"):
		conditions.append("sii.item_code = %(item_code)s")
		values["item_code"] = filters.get("item_code")

	return frappe.db.sql(
		f"""
		SELECT
			si.posting_date,
			si.name AS sales_invoice,
			si.customer,
			sii.item_code,
			sii.item_name,
			i.item_group,
			sii.qty,
			sii.rate,
			sii.amount,
			sii.custom_sale_type,
			sii.custom_hs_code,
			sii.custom_sro_schedule_no,
			sii.custom_sro_item_sno,
			sii.custom_fbr_uom,
			sii.custom_sales_tax
		FROM `tabSales Invoice` si
		INNER JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
		LEFT JOIN `tabItem` i ON i.name = sii.item_code
		WHERE {" AND ".join(conditions)}
		ORDER BY si.posting_date DESC, si.name DESC, sii.idx ASC
		""",
		values,
		as_dict=True,
	)
