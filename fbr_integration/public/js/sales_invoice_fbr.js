function esc(s) {
    return frappe.utils.escape_html((s || "").toString());
}

function sync_qr_field_on_form(frm) {
    const fbrNo = (frm.doc.custom_fbr_invoice_no || "").trim();
    if (!fbrNo) return;

    const updates = {};
    if (
        "custom_fbr_qr_code" in frm.doc &&
        (frm.doc.custom_fbr_qr_code || "") !== fbrNo
    ) {
        updates.custom_fbr_qr_code = fbrNo;
    }
    if (
        "custom_qr_code" in frm.doc &&
        (frm.doc.custom_qr_code || "") !== fbrNo
    ) {
        updates.custom_qr_code = fbrNo;
    }
    if (Object.keys(updates).length) {
        frm.set_value(updates);
    }
}

function render_qr_preview(frm) {
    if (!frm.fields_dict.custom_qr_code) return;
    const fbrNo = (frm.doc.custom_fbr_invoice_no || "").trim();
    if (!fbrNo) {
        frm.set_df_property(
            "custom_qr_code",
            "options",
            "<div class='text-muted'>QR will appear after FBR Invoice No is generated.</div>"
        );
        return;
    }

    const showHtml = (src) => {
        frm.set_df_property(
            "custom_qr_code",
            "options",
            `<div style="padding:6px 0;"><img src="${src}" style="width:170px;height:170px;border:1px solid #e5e7eb;padding:6px;border-radius:8px;background:#fff;" /><div style="margin-top:6px;font-size:12px;color:#6b7280;">${esc(
                fbrNo
            )}</div></div>`
        );
    };

    if (frm.doc.name && !frm.is_new()) {
        frappe.call({
            method: "fbr_integration.handler.get_fbr_codes",
            args: { name: frm.doc.name },
            callback: function (r) {
                const msg = r.message || {};
                if (msg.ok && msg.qr_data_url) {
                    showHtml(msg.qr_data_url);
                    return;
                }
                const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                    fbrNo
                )}`;
                showHtml(fallback);
            },
        });
    } else {
        const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
            fbrNo
        )}`;
        showHtml(fallback);
    }
}

function get_print_url(frm) {
    // Standard print view
    return `/printview?doctype=Sales%20Invoice&name=${encodeURIComponent(
        frm.doc.name
    )}&trigger_print=1&format=Standard&no_letterhead=0`;
}

function get_pdf_url(frm) {
    // Standard PDF download
    return `/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Invoice&name=${encodeURIComponent(
        frm.doc.name
    )}&format=Standard&no_letterhead=0`;
}

async function show_success_popup_with_qr_barcode(frm) {
    const r = await frappe.call({
        method: "fbr_integration.handler.get_fbr_codes",
        args: { name: frm.doc.name },
    });

    const data = r.message || {};
    const fbrNo = (frm.doc.custom_fbr_invoice_no || "").trim();

    const print_url = get_print_url(frm);
    const pdf_url = get_pdf_url(frm);

    frappe.msgprint({
        title: __("Invoice Sent"),
        message: `
      <div style="font-size:14px; line-height:1.6;">
        <p>?? <b>Invoice Sent</b></p>
        <p>?? <b>Congratulations!</b></p>
        <p>
          Your Sales Invoice <b>${esc(
              frm.doc.name
          )}</b> has been successfully submitted
          to the <b>IRIS Portal - FBR</b>.
        </p>
        <p><b>FBR Invoice No:</b> ${esc(fbrNo)}</p>

        <p style="color:green;">
          ? Thank you for staying compliant and digital by Tech Craft Pvt Ltd ERP-Pakistan!
        </p>

        <hr/>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
          <a class="btn btn-default btn-sm" href="${print_url}" target="_blank">
            ?? Print
          </a>
          <a class="btn btn-default btn-sm" href="${pdf_url}" target="_blank">
            ?? Download PDF
          </a>
          <button class="btn btn-default btn-sm" id="btn_open_invoice">
            ?? Open Invoice
          </button>
        </div>

        <div style="margin-top:10px;">
          <div><b>Sales Invoice:</b> ${esc(frm.doc.name)}</div>
          <div><b>FBR Invoice No:</b> ${esc(fbrNo)}</div>
        </div>

        ${
            data.ok
                ? `
        <div style="display:flex; gap:16px; align-items:flex-start; margin-top:12px;">
          <div style="min-width:170px;">
            <div style="font-weight:600; margin-bottom:6px;">QR Code</div>
            <img src="${
                data.qr_data_url
            }" style="width:140px;height:140px;border:1px solid #eee;padding:6px;border-radius:8px;" />
          </div>

          <div style="flex:1;">
            <div style="font-weight:600; margin-bottom:6px;">Barcode</div>
            <div style="border:1px solid #eee;padding:8px;border-radius:8px;">
              <img src="${
                  data.barcode_data_url
              }" style="max-width:360px; width:100%; height:auto; display:block;" />
              <div style="margin-top:6px; font-size:12px; color:#666; text-align:center;">
                ${esc(data.value)}
              </div>
            </div>
          </div>
        </div>
        `
                : `<div style="margin-top:10px;color:#666;">QR/Barcode not generated.</div>`
        }
      </div>
    `,
        indicator: "green",
    });

    // attach open invoice action
    setTimeout(() => {
        const btn = document.getElementById("btn_open_invoice");
        if (btn) {
            btn.onclick = () =>
                frappe.set_route("Form", "Sales Invoice", frm.doc.name);
        }
    }, 200);
}

frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        sync_qr_field_on_form(frm);
        render_qr_preview(frm);
        // Purple Send button
        const btn = frm.add_custom_button(__("Send to FBR"), function () {
            // If already sent -> block
            if ((frm.doc.custom_fbr_invoice_no || "").trim()) {
                frappe.msgprint({
                    title: __("Already Submitted"),
                    indicator: "red",
                    message: `
            <div style="font-size:14px; line-height:1.6;">
              <p><b>Invoice already sent to IRIS Portal - FBR</b></p>
              <p><b>FBR Invoice No:</b> ${esc(
                  frm.doc.custom_fbr_invoice_no
              )}</p>
            </div>
          `,
                });
                return;
            }

            frappe.call({
                method: "fbr_integration.handler.send_to_fbr_si",
                args: { name: frm.doc.name },
                freeze: true,
                callback: function (r) {
                    const resp = r.message || {};
                    if (resp.already_sent) {
                        frm.reload_doc();
                        return;
                    }

                    frm.reload_doc().then(() => {
                        setTimeout(async () => {
                            await show_success_popup_with_qr_barcode(frm);
                        }, 400);
                    });
                },
            });
        });

        try {
            btn.removeClass(
                "btn-default btn-primary btn-danger btn-success"
            ).addClass("btn-purple");
        } catch (e) {
            // ignore style application errors
        }
    },
});
