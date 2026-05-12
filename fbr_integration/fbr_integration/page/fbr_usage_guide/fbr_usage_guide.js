frappe.pages["fbr-usage-guide"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("FBR Usage Guide"),
        single_column: true,
    });

    $(wrapper).find(".layout-main-section").html(`
        <div style="max-width: 1000px; margin: 0 auto; padding: 12px 8px 24px 8px; line-height: 1.6;">
            <div style="background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">FBR Pakistan - Quick Guide</div>
                <div style="color: #4a5568; font-size: 13px;">Use this page to quickly access scenarios, logs, doctypes, and tools related to FBR Integration.</div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px;">
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                    <div style="font-weight: 700; margin-bottom: 8px;">1) Scenario Selection</div>
                    <ol style="padding-left: 18px; margin: 0; font-size: 13px; color: #2d3748;">
                        <li>Open Sales Invoice</li>
                        <li>Click Scenario Index</li>
                        <li>Search and click Use</li>
                        <li>Submit and click Send to FBR</li>
                    </ol>
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                    <div style="font-weight: 700; margin-bottom: 8px;">2) Rebuild Scenario Files</div>
                    <pre style="background:#111827;color:#e5e7eb;padding:8px;border-radius:6px;font-size:11px;white-space:pre-wrap;">cd ~/frappe-bench/apps/fbr_integration\nfbr-build-scenarios\ncd ~/frappe-bench\nbench build --app fbr_integration\nbench --site site1.local clear-cache\nbench restart</pre>
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <div style="font-weight: 700; margin-bottom: 8px;">Quick Links</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 13px;">
                    <a href="/app/sales-invoice" target="_blank">Sales Invoice</a>
                    <a href="/app/error-log" target="_blank">Error Log</a>
                    <a href="/app/doctype/Scenario%20ID" target="_blank">Scenario ID</a>
                    <a href="/app/doctype/FBR%20Invoice%20Settings" target="_blank">FBR Invoice Settings</a>
                    <a href="/app/query-report/FBR%20Sales%20Detail" target="_blank">FBR Sales Detail Report</a>
                    <a href="/app/query-report/FBR%20Sales%20Summary" target="_blank">FBR Sales Summary Report</a>
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <div style="font-weight: 700; margin-bottom: 8px;">Where Full Guide Is</div>
                <div style="font-size: 13px; color: #2d3748; margin-bottom: 8px;">
                    Full repository guide file: <b>USAGE_GUIDE.md</b> in app root.
                </div>
                <div style="font-size: 13px; color: #4a5568;">
                    For scenario loading debug in browser console: <code>clear_fbr_scenario_cache()</code>
                </div>
            </div>
        </div>
    `);
};
