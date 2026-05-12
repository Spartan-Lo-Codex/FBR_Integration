frappe.pages["fbr-usage-guide"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("FBR Usage Guide"),
        single_column: true,
    });

    $(wrapper).find(".layout-main-section").html(`
        <div style="max-width: 1120px; margin: 0 auto; padding: 14px 10px 28px 10px; line-height: 1.6;">
            <div style="background: linear-gradient(135deg, #1f4e79 0%, #2b6da8 55%, #4f8fcc 100%); border-radius: 14px; padding: 18px 18px; margin-bottom: 16px; color: #fff; box-shadow: 0 10px 25px rgba(22, 69, 112, 0.2);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
                    <div>
                        <div style="font-size: 20px; font-weight: 700; margin-bottom: 4px; letter-spacing:0.2px;">FBR Pakistan Guide Center</div>
                        <div style="font-size: 13px; opacity:0.95;">Central place for onboarding, scenarios, logs, doctypes, and operational shortcuts.</div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <a href="/app/workspace/fbr-pakistan" style="background:#fff;color:#1f4e79;font-size:12px;padding:6px 10px;border-radius:999px;font-weight:700;text-decoration:none;">Open Workspace</a>
                        <a href="/app/sales-invoice" style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.35);color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;font-weight:700;text-decoration:none;">Open Sales Invoice</a>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:16px;">
                <div style="border:1px solid #dbe4ee;border-radius:12px;padding:13px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,0.04);">
                    <div style="font-weight:700;margin-bottom:8px;color:#1f2937;">1) Select Scenario</div>
                    <ol style="padding-left:18px;margin:0;font-size:13px;color:#334155;">
                        <li>Open <b>Sales Invoice</b></li>
                        <li>Click <b>Scenario Index</b></li>
                        <li>Search by SN code/title</li>
                        <li>Click <b>Use</b> to apply</li>
                    </ol>
                </div>
                <div style="border:1px solid #dbe4ee;border-radius:12px;padding:13px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,0.04);">
                    <div style="font-weight:700;margin-bottom:8px;color:#1f2937;">2) Send to FBR</div>
                    <ol style="padding-left:18px;margin:0;font-size:13px;color:#334155;">
                        <li>Verify customer + tax fields</li>
                        <li>Save and Submit invoice</li>
                        <li>Click <b>Send to FBR</b></li>
                        <li>Use QR/status popup for confirmation</li>
                    </ol>
                </div>
                <div style="border:1px solid #dbe4ee;border-radius:12px;padding:13px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,0.04);">
                    <div style="font-weight:700;margin-bottom:8px;color:#1f2937;">3) Rebuild Scenario Files</div>
                    <pre style="background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;font-size:11px;white-space:pre-wrap;">cd ~/frappe-bench/apps/fbr_integration
fbr-build-scenarios
cd ~/frappe-bench
bench build --app fbr_integration
bench --site site1.local clear-cache
bench restart</pre>
                </div>
            </div>

            <div style="border:1px solid #dbe4ee;border-radius:12px;padding:13px;background:#fff;margin-bottom:16px;box-shadow:0 2px 8px rgba(16,24,40,0.04);">
                <div style="font-weight:700;margin-bottom:8px;color:#1f2937;">Quick Access</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;font-size:13px;">
                    <a href="/app/sales-invoice" target="_blank">Sales Invoice</a>
                    <a href="/app/fbr-usage-guide" target="_blank">FBR Usage Guide</a>
                    <a href="/app/fbr-home" target="_blank">FBR Home</a>
                    <a href="/app/financial-dashboard" target="_blank">Financial Dashboard</a>
                    <a href="/app/error-log" target="_blank">Error Log</a>
                    <a href="/app/scheduled-job-log" target="_blank">Scheduled Job Log</a>
                    <a href="/app/scenario-id" target="_blank">Scenario ID</a>
                    <a href="/app/fbr-invoice-settings" target="_blank">FBR Invoice Settings</a>
                    <a href="/app/query-report/FBR%20Sales%20Detail" target="_blank">FBR Sales Detail Report</a>
                    <a href="/app/query-report/FBR%20Sales%20Summary" target="_blank">FBR Sales Summary Report</a>
                </div>
            </div>

            <div style="border:1px solid #dbe4ee;border-radius:12px;padding:13px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,0.04);">
                <div style="font-weight:700;margin-bottom:8px;color:#1f2937;">Debug & Reference</div>
                <div style="font-size:13px;color:#334155;margin-bottom:8px;">
                    Full written guide is available in repository file <b>USAGE_GUIDE.md</b>.
                </div>
                <div style="font-size:13px;color:#475569;">
                    Browser console helper: <code>clear_fbr_scenario_cache()</code>
                </div>
            </div>
        </div>
    `);
};
