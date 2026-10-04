frappe.provide("frappe.fbr_integration");

// Wrapped in an IIFE: every doctype_list_js file is concatenated into a single
// shared script scope, so top-level declarations here would collide with the
// identically named helpers from other installed apps (srb_integration).
(function () {
frappe.fbr_integration.bulk_send_to_fbr = function (listview) {
    const docnames = listview.get_checked_items(true);

    if (!docnames.length) {
        frappe.show_alert({
            message: __("Select at least one invoice to send to FBR."),
            indicator: "orange",
        });
        return;
    }

    frappe.confirm(
        __("Send {0} selected invoice(s) to FBR?", [docnames.length]),
        () => {
            listview.disable_list_update = true;
            frappe
                .call({
                    method: "fbr_integration.handler.send_to_fbr_bulk",
                    args: {
                        names: docnames,
                    },
                    freeze: true,
                    freeze_message: __("Sending invoices to FBR..."),
                })
                .then((r) => show_bulk_result(r.message))
                .catch((e) => {
                    frappe.msgprint({
                        title: __("FBR Submission Failed"),
                        message: [
                            __("Unable to send the selected invoices to FBR."),
                            e.message,
                        ],
                        as_list: true,
                        indicator: "red",
                    });
                })
                .finally(() => {
                    listview.disable_list_update = false;
                    listview.clear_checked_items();
                    listview.refresh();
                });
        }
    );
};

function show_bulk_result(result) {
    var problems = (result.results || []).filter(
        (row) => row.status === "Failed"
    );

    if (!problems.length) {
        frappe.show_alert(
            __("Sent {0} invoice(s) to FBR.", [result.sent]),
            "green"
        );
        return;
    }

    var lines = problems.map((row) => {
        var reason = row.error || __("Unknown error");
        return (
            frappe.utils.escape_html(row.invoice) +
            ": " +
            frappe.utils.escape_html(reason)
        );
    });

    frappe.msgprint({
        title: __("FBR Submission Summary"),
        message: [
            __("Sent {0} of {1} invoice(s).", [result.sent, result.total]),
            ...lines,
        ],
        as_list: true,
        indicator: result.sent ? "orange" : "red",
    });
}

function add_bulk_send_action(listview) {
    if (!frappe.perm.has_perm(listview.doctype, 0, "write")) return;

    listview.page.add_actions_menu_item(__("Send to FBR"), () =>
        frappe.fbr_integration.bulk_send_to_fbr(listview)
    );
}

// Append our action to the doctype's listview settings, keeping whatever
// ERPNext or other apps already registered (onload, get_indicator, add_fields...).
function register_bulk_send_action() {
    const settings = (frappe.listview_settings["Sales Invoice"] =
        frappe.listview_settings["Sales Invoice"] || {});
    const previous_onload = settings.onload;

    if (previous_onload && previous_onload.__fbr_bulk_send_action) return;

    const onload = function (listview) {
        if (typeof previous_onload === "function") {
            previous_onload.call(this, listview);
        }

        add_bulk_send_action(listview);
    };

    onload.__fbr_bulk_send_action = true;
    settings.onload = onload;
}

register_bulk_send_action();
})();
