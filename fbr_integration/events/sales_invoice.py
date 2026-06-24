import frappe
from frappe.utils import flt

def validate(doc, method=None):
    # Tax descriptions
    TAXES = {
        "Further Tax": "custom_further_tax",
        "236-G": "custom_236_g",
        "236-H": "custom_236_h"
    }

    customer_tax_vals = frappe.db.get_value("Customer", doc.customer, ["custom_236_g_account", "custom_236_h_account", "custom_236_g", "custom_236_h"], as_dict=True)

    # -----------------------------------------
    # Remove previously added custom tax rows
    # -----------------------------------------
    rows_to_remove = []

    for row in doc.taxes:
        if row.description in TAXES:
            rows_to_remove.append(row)

    for row in rows_to_remove:
        doc.taxes.remove(row)

    # -----------------------------------------
    # Calculate percentages from items
    # -----------------------------------------
    tax_percentages = {
        "Further Tax": 0,
        "236-G": 0,
        "236-H": 0
    }

    for item in doc.items:
        tax_percentages["Further Tax"] += flt(item.custom_further_tax)
    tax_percentages["236-G"] = flt(doc.grand_total) * flt(customer_tax_vals.custom_236_g) / 100
    tax_percentages["236-H"] = flt(doc.grand_total) * flt(customer_tax_vals.custom_236_h) / 100

    # -----------------------------------------
    # Add tax rows
    # -----------------------------------------
    for description, amount in tax_percentages.items():

        if not amount:
            continue

        doc.append("taxes", {
            "charge_type": "Actual",
            "cost_center": doc.cost_center,
            "account_head": customer_tax_vals[f"custom_{description.lower().replace(' ', '_').replace('-', '_')}_account"],
            "description": description,
            "tax_amount": amount,
        })
        doc.calculate_taxes_and_totals()
        doc.set_total_in_words()