import os
import re
from playwright.sync_api import sync_playwright, expect

def get_extension_id(context):
    """
    Retrieves the extension's ID by navigating to chrome://extensions
    and finding the extension by its name.
    """
    page = context.new_page()
    try:
        page.goto("chrome://extensions", wait_until="domcontentloaded")

        # Wait for the manager to be present
        page.wait_for_selector("extensions-manager", timeout=10000)

        # Find the extension item by name
        item_locator = page.locator("extensions-item", has_text="Highlight Bear")

        # The ID is in a span, inside a div with id 'details'
        details_locator = item_locator.locator("#details")

        # Find the div that contains the ID label and value
        id_row_locator = details_locator.locator("div.id-row")

        # The ID is in a span with the class 'id-value'
        id_value_locator = id_row_locator.locator("span.id-value")

        extension_id = id_value_locator.inner_text()

        if not extension_id:
            raise Exception("Could not find extension ID.")

        return extension_id
    finally:
        page.close()

def test_prefill_from_local_storage():
    path_to_extension = os.path.abspath('.')
    user_data_dir = "/tmp/test-user-data-dir"

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,  # Headed mode is required for chrome:// URLs
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}",
            ],
        )

        try:
            extension_id = get_extension_id(context)

            # --- 1. Setup: Manually set the data in local storage ---
            page = context.new_page()
            options_page_url = f"chrome-extension://{extension_id}/src/options/options.html"
            page.goto(options_page_url)

            test_url = "https://playwright.dev/python/"
            test_title = "Playwright for Python"
            new_rule_data = {"url": test_url, "title": test_title}

            # Use page.evaluate to set the item in chrome.storage.local
            page.evaluate(
                "data => new Promise(resolve => chrome.storage.local.set({ newRuleData: data }, resolve))",
                new_rule_data
            )

            # --- 2. Act: Reload the page to trigger the logic ---
            page.reload()

            # --- 3. Verify the result ---
            # Check if the modal is open and fields are pre-filled
            modal_title = page.locator("#modalTitle")
            expect(modal_title).to_have_text("Create New Rule")

            rule_name_input = page.locator("#ruleName")
            expect(rule_name_input).to_have_value(test_title)

            url_pattern_input = page.locator("#urlPattern")
            expect(url_pattern_input).to_have_value(test_url)

            # --- 4. Verify data is cleared from storage ---
            # Use page.evaluate to check if the data is gone
            stored_data = page.evaluate("() => chrome.storage.local.get('newRuleData')")
            # In Playwright, the result of the evaluation is the value itself
            expect(stored_data).to_be_a('dict')
            expect(stored_data).to_be_empty()

            # --- 5. Take a screenshot ---
            screenshot_path = "jules-scratch/verification/verification.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        finally:
            # --- 6. Clean up ---
            context.close()

if __name__ == "__main__":
    test_prefill_from_local_storage()