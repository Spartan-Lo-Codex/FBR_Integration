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

const DOCTYPE = "Sales Invoice";
const MARKER = "__fbr_bulk_send_action";
const PATCH_FLAG = "__fbr_bulk_send_patched";

function chain_onload(previous) {
    if (previous && previous[MARKER]) return previous;

    const onload = function (listview) {
        if (typeof previous === "function") {
            previous.call(this, listview);
        }

        add_bulk_send_action(listview);
    };

    onload[MARKER] = true;
    return onload;
}

// Every doctype_list_js file for a doctype is concatenated into one shared
// `__list_js` block and executed in installed-app order, so other apps load
// after us (srb_integration does, and it assigns a brand new settings object).
// Turn the key into an accessor so our onload survives those replacements
// instead of being silently dropped.
function register_bulk_send_action() {
    const registry = frappe.listview_settings;
    registry[PATCH_FLAG] = registry[PATCH_FLAG] || {};

    if (registry[PATCH_FLAG][DOCTYPE]) return;
    registry[PATCH_FLAG][DOCTYPE] = true;

    let settings = registry[DOCTYPE] || {};
    settings.onload = chain_onload(settings.onload);

    Object.defineProperty(registry, DOCTYPE, {
        configurable: true,
        enumerable: true,
        get: () => settings,
        set: (value) => {
            settings = value || {};
            settings.onload = chain_onload(settings.onload);
        },
    });
}

register_bulk_send_action();
})();
